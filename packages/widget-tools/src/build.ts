/**
 * `teacharium build`: Vite build, then contract checks and manifest capture.
 */
import { existsSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import type { WidgetVersionManifest } from "@teacharium/widget/manifest";
import type { Plugin } from "vite";

import { captureManifest } from "./capture/index.js";
import { checkBundle, checkManifest } from "./checks/contract.js";
import { findTailwindProblems } from "./checks/no-tailwind.mjs";
import { log } from "./log.js";
import { bundlePaths, type LoadedWidgetProject } from "./project.js";
import { teachariumWidget } from "./vite-plugin.js";

const VITE_CONFIG_FILES = [
  "vite.config.ts",
  "vite.config.mts",
  "vite.config.js",
  "vite.config.mjs",
];

export interface BuildResult {
  manifest: WidgetVersionManifest;
  paths: ReturnType<typeof bundlePaths>;
  warnings: string[];
}

export interface BuildOptions {
  watch?: boolean;
  /** Skip the Tailwind source check. */
  allowTailwind?: boolean;
  /** Called after every successful build (each rebuild in watch mode). */
  onBuilt?: (result: BuildResult) => Promise<void> | void;
  /** Called when a watch-mode build fails its checks. */
  onFailed?: (error: unknown) => void;
}

export class BuildError extends Error {
  constructor(public readonly problems: string[]) {
    super(problems.join("\n"));
    this.name = "BuildError";
  }
}

/** Use the project's own Vite, so its config and plugins behave as in `vite build`. */
async function loadVite(root: string): Promise<typeof import("vite")> {
  try {
    const require = createRequire(join(root, "package.json"));
    return (await import(
      pathToFileURL(require.resolve("vite")).href
    )) as typeof import("vite");
  } catch {
    return import("vite");
  }
}

/** Checks and manifest capture for a finished build. Throws BuildError. */
export async function verifyBuild(
  project: LoadedWidgetProject,
  options: Pick<BuildOptions, "allowTailwind"> = {},
): Promise<BuildResult> {
  const paths = bundlePaths(project.root);
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!existsSync(paths.js)) {
    throw new BuildError([
      `Expected ${paths.js} after the build. Add teachariumWidget() to the ` +
        `plugins in your vite.config (import it from "@teacharium/widget-tools").`,
    ]);
  }

  if (!options.allowTailwind) {
    for (const problem of findTailwindProblems(project.root)) {
      errors.push(
        `${problem.file.slice(project.root.length + 1)}:${problem.line}  ${problem.message} ` +
          `(widgets ship without Tailwind; use your own CSS classes)`,
      );
    }
  }

  const bundleReport = checkBundle(paths);
  errors.push(...bundleReport.errors);
  warnings.push(...bundleReport.warnings);
  if (errors.length > 0) throw new BuildError(errors);

  const { manifest, problems } = await captureManifest(paths.js);
  errors.push(...problems);
  const manifestReport = checkManifest(manifest);
  errors.push(...manifestReport.errors);
  warnings.push(...manifestReport.warnings);
  if (errors.length > 0) throw new BuildError(errors);

  writeFileSync(paths.manifest, `${JSON.stringify(manifest, null, 2)}\n`);
  return { manifest, paths, warnings };
}

export function reportBuild(result: BuildResult) {
  for (const warning of result.warnings) log.warn(warning);
  const names = result.manifest.components.map((c) => c.name);
  log.success(
    `Built ${names.length} component${names.length === 1 ? "" : "s"}: ${names.join(", ")}`,
  );
}

export async function buildProject(
  project: LoadedWidgetProject,
  options: BuildOptions = {},
): Promise<BuildResult | undefined> {
  const vite = await loadVite(project.root);
  const hasConfig = VITE_CONFIG_FILES.some((file) =>
    existsSync(join(project.root, file)),
  );

  let lastResult: BuildResult | undefined;
  let lastError: unknown;

  const afterBuild: Plugin = {
    name: "teacharium-after-build",
    apply: "build",
    async closeBundle() {
      try {
        lastResult = await verifyBuild(project, options);
        lastError = undefined;
        reportBuild(lastResult);
        await options.onBuilt?.(lastResult);
      } catch (error) {
        lastError = error;
        if (!options.watch) return;
        options.onFailed?.(error);
        log.error(error instanceof Error ? error.message : String(error));
        log.info("Waiting for changes…");
      }
    },
  };

  const output = await vite.build({
    root: project.root,
    configFile: hasConfig ? undefined : false,
    mode: "production",
    plugins: hasConfig ? [afterBuild] : [teachariumWidget(), afterBuild],
    build: { watch: options.watch ? {} : null },
  });

  if (options.watch) {
    // Compile errors (e.g. a syntax error) never reach closeBundle.
    const watcher = output as {
      on?: (event: "event", listener: (e: { code: string; error?: unknown }) => void) => void;
    };
    watcher.on?.("event", (event) => {
      if (event.code === "ERROR") options.onFailed?.(event.error);
    });
    return undefined;
  }
  if (lastError) throw lastError;
  return lastResult;
}
