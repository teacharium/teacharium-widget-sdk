import { parseArgs } from "node:util";

import { TeachariumApi } from "./api.js";
import { deleteSession, getSession } from "./auth/credentials.js";
import { login, resolveApiUrl } from "./auth/oauth.js";
import { BuildError, buildProject, type BuildResult } from "./build.js";
import { log } from "./log.js";
import { loadProject } from "./project.js";
import { ensureWidget, publishBuild } from "./publish.js";

const HELP = `teacharium — build, preview and publish Teacharium widgets

Usage: teacharium <command> [options]

Commands:
  dev                 Preview your components locally (rebuilds on change)
    --port <n>          Port for the preview (default 5199)

  build               Build dist/widget.js, check it, write dist/manifest.json
    --watch             Rebuild on changes
    --publish           Publish after every successful build (with --watch)

  publish             Build and publish to your Teacharium organization
    --org <id|name>     Organization for a new widget (first publish only)
    --no-build          Publish the existing dist/ without rebuilding

  login               Log in (opens your browser)
  logout              Forget the stored login
  whoami              Show who you're logged in as and your organizations
    --offline           Only check that credentials are stored
  widgets             List your organizations' widgets

Common options:
  --api-url <url>     Teacharium server (default https://app.teacharium.io,
                      or TEACHARIUM_API_URL)
  --allow-tailwind    Skip the Tailwind source check (build, publish, dev)

Environment:
  TEACHARIUM_TOKEN    Organization API token with "Can publish widgets"
                      (for CI; used instead of a login)
`;

const WATCH_PUBLISH_ATTEMPTS = 20;
const WATCH_PUBLISH_RETRY_MS = 3000;

const COMMON_OPTIONS = {
  "api-url": { type: "string" },
  "allow-tailwind": { type: "boolean" },
  help: { type: "boolean", short: "h" },
} as const;

function reportBuildError(error: unknown): never {
  if (error instanceof BuildError) {
    for (const problem of error.problems) log.error(problem);
    throw new Error("Build failed.");
  }
  throw error;
}

export async function main(argv: string[]): Promise<void> {
  const [command, ...rest] = argv;

  switch (command) {
    case "build": {
      const { values } = parseArgs({
        args: rest,
        options: {
          ...COMMON_OPTIONS,
          watch: { type: "boolean" },
          publish: { type: "boolean" },
        },
      });
      if (values.publish && !values.watch) {
        throw new Error("Use `teacharium publish` to build and publish once.");
      }
      let project = loadProject();
      const api = values.publish
        ? new TeachariumApi(resolveApiUrl(values["api-url"]))
        : null;
      if (api) project = await ensureWidget(project, api, {});

      try {
        await buildProject(project, {
          watch: values.watch,
          allowTailwind: values["allow-tailwind"],
          onBuilt: api
            ? async (result: BuildResult) => {
                // The server may still be starting (e.g. alongside `pnpm dev`).
                for (let attempt = 1; ; attempt++) {
                  try {
                    await publishBuild(project, api, result);
                    return;
                  } catch (error) {
                    const message =
                      error instanceof Error ? error.message : String(error);
                    if (
                      attempt < WATCH_PUBLISH_ATTEMPTS &&
                      message.startsWith("Could not reach")
                    ) {
                      await new Promise((r) => setTimeout(r, WATCH_PUBLISH_RETRY_MS));
                      continue;
                    }
                    log.error(message);
                    return;
                  }
                }
              }
            : undefined,
        });
      } catch (error) {
        reportBuildError(error);
      }
      return;
    }

    case "publish": {
      const { values } = parseArgs({
        args: rest,
        options: {
          ...COMMON_OPTIONS,
          org: { type: "string" },
          "no-build": { type: "boolean" },
        },
      });
      const api = new TeachariumApi(resolveApiUrl(values["api-url"]));
      let project = loadProject();
      project = await ensureWidget(project, api, { org: values.org });

      let result: BuildResult | undefined;
      try {
        if (values["no-build"]) {
          const { verifyBuild } = await import("./build.js");
          result = await verifyBuild(project, {
            allowTailwind: values["allow-tailwind"],
          });
        } else {
          result = await buildProject(project, {
            allowTailwind: values["allow-tailwind"],
          });
        }
      } catch (error) {
        reportBuildError(error);
      }
      if (!result) throw new Error("Build produced no result.");
      await publishBuild(project, api, result);
      return;
    }

    case "dev": {
      const { values } = parseArgs({
        args: rest,
        options: { ...COMMON_OPTIONS, port: { type: "string" } },
      });
      const { startDevServer } = await import("./dev/server.js");
      await startDevServer(loadProject(), {
        port: values.port ? Number(values.port) : undefined,
        allowTailwind: values["allow-tailwind"],
      });
      return;
    }

    case "login": {
      const { values } = parseArgs({
        args: rest,
        options: { ...COMMON_OPTIONS, "no-browser": { type: "boolean" } },
      });
      const apiUrl = resolveApiUrl(values["api-url"]);
      log.info(`Logging in to ${apiUrl}…`);
      await login(apiUrl, {
        openBrowser: !values["no-browser"],
        onUrl: (url) =>
          log.dim(`If your browser didn't open, visit:\n${url}\n`),
      });
      const me = await new TeachariumApi(apiUrl).whoami();
      log.success(
        `Logged in as ${me.user?.email ?? me.user?.id} (${me.organizations
          .map((org) => org.name)
          .join(", ")})`,
      );
      return;
    }

    case "logout": {
      const { values } = parseArgs({ args: rest, options: COMMON_OPTIONS });
      const apiUrl = resolveApiUrl(values["api-url"]);
      log.info(
        deleteSession(apiUrl)
          ? `Logged out of ${apiUrl}`
          : `You weren't logged in to ${apiUrl}`,
      );
      return;
    }

    case "whoami": {
      const { values } = parseArgs({
        args: rest,
        options: { ...COMMON_OPTIONS, offline: { type: "boolean" } },
      });
      if (values.offline) {
        // Credentials check without calling the server (for release scripts).
        const apiUrl = resolveApiUrl(values["api-url"]);
        if (process.env.TEACHARIUM_TOKEN?.trim()) {
          log.info(`TEACHARIUM_TOKEN is set (used for ${apiUrl})`);
          return;
        }
        const session = getSession(apiUrl);
        if (!session) {
          throw new Error(
            `Not logged in to ${apiUrl}. Run \`teacharium login --api-url ${apiUrl}\`.`,
          );
        }
        log.info(`Stored login for ${apiUrl}${session.email ? ` (${session.email})` : ""}`);
        return;
      }
      const api = new TeachariumApi(resolveApiUrl(values["api-url"]));
      const me = await api.whoami();
      log.info(
        me.kind === "user"
          ? `${me.user?.email ?? me.user?.id} on ${api.apiUrl} (${me.environment})`
          : `API token "${me.token?.name}" on ${api.apiUrl} (${me.environment})`,
      );
      for (const org of me.organizations) {
        log.info(
          `  ${org.name}  ${org.id}${org.role ? `  ${org.role}` : ""}${org.isDefault ? "  (default)" : ""}`,
        );
      }
      return;
    }

    case "widgets": {
      const { values } = parseArgs({ args: rest, options: COMMON_OPTIONS });
      const api = new TeachariumApi(resolveApiUrl(values["api-url"]));
      const widgets = await api.listWidgets();
      if (widgets.length === 0) log.info("No widgets yet.");
      for (const widget of widgets) {
        log.info(
          `${widget.id}  ${widget.name}  [${widget.source}${widget.isPublic ? ", public" : ""}]`,
        );
      }
      return;
    }

    case undefined:
    case "help":
    case "--help":
    case "-h":
      console.log(HELP);
      return;

    default:
      console.log(HELP);
      throw new Error(`Unknown command: ${command}`);
  }
}
