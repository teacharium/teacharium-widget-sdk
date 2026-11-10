/**
 * `teacharium dev`: watch-build the project and serve the preview harness.
 *
 *   /                      the harness (built into dist/harness)
 *   /__teacharium/*        harness assets, React shims
 *   /__teacharium/events   server-sent build status (reload trigger)
 *   /bundle/*              the project's dist/ (widget.js, widget.css, manifest.json)
 */
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer, type ServerResponse } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { BuildError, buildProject } from "../build.js";
import { log } from "../log.js";
import { bundlePaths, type LoadedWidgetProject } from "../project.js";

const DEFAULT_PORT = 5199;

const CONTENT_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".woff2": "font/woff2",
};

export interface DevServerOptions {
  port?: number;
  allowTailwind?: boolean;
}

interface Status {
  version: number;
  error: string | null;
}

/** Resolve `path` inside `root`, refusing anything that escapes it. */
function safeJoin(rootDir: string, path: string): string | null {
  const root = resolve(rootDir);
  const full = normalize(join(root, decodeURIComponent(path)));
  return full === root || full.startsWith(root + sep) ? full : null;
}

function sendFile(res: ServerResponse, file: string | null) {
  if (!file || !existsSync(file) || !statSync(file).isFile()) {
    res.writeHead(404, { "Content-Type": "text/plain" }).end("Not found");
    return;
  }
  res.writeHead(200, {
    "Content-Type": CONTENT_TYPES[extname(file)] ?? "application/octet-stream",
    "Cache-Control": "no-store",
  });
  createReadStream(file).pipe(res);
}

function describeError(error: unknown): string {
  if (error instanceof BuildError) return error.problems.join("\n");
  if (error instanceof Error) return error.message;
  return String(error);
}

export async function startDevServer(
  project: LoadedWidgetProject,
  options: DevServerOptions = {},
): Promise<void> {
  const harnessDir = fileURLToPath(new URL("../harness/", import.meta.url));
  if (!existsSync(join(harnessDir, "index.html"))) {
    throw new Error(
      `The preview harness is missing (${harnessDir}). Reinstall @teacharium/widget-tools.`,
    );
  }
  const distDir = bundlePaths(project.root).dir;
  const shimDir = resolve(harnessDir, "__teacharium");

  let status: Status = { version: 0, error: null };
  const clients = new Set<ServerResponse>();
  const broadcast = () => {
    const payload = `event: status\ndata: ${JSON.stringify(status)}\n\n`;
    for (const client of clients) client.write(payload);
  };

  const server = createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    const path = url.pathname;

    if (path === "/__teacharium/events") {
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-store",
        Connection: "keep-alive",
      });
      res.write(`event: status\ndata: ${JSON.stringify(status)}\n\n`);
      clients.add(res);
      req.on("close", () => clients.delete(res));
      return;
    }
    if (path.startsWith("/bundle/")) {
      sendFile(res, safeJoin(distDir, path.slice("/bundle/".length)));
      return;
    }
    if (path.startsWith("/__teacharium/")) {
      sendFile(res, safeJoin(shimDir, path.slice("/__teacharium/".length)));
      return;
    }
    if (path.startsWith("/assets/")) {
      sendFile(res, safeJoin(harnessDir, path.slice(1)));
      return;
    }
    sendFile(res, join(harnessDir, "index.html"));
  });

  const port = options.port ?? DEFAULT_PORT;
  await new Promise<void>((resolveListen, reject) => {
    server.once("error", (error: NodeJS.ErrnoException) =>
      reject(
        error.code === "EADDRINUSE"
          ? new Error(`Port ${port} is in use. Pick another with --port.`)
          : error,
      ),
    );
    server.listen(port, "127.0.0.1", resolveListen);
  });
  log.success(`Preview running at http://localhost:${port}`);

  await buildProject(project, {
    watch: true,
    allowTailwind: options.allowTailwind,
    onBuilt: () => {
      status = { version: status.version + 1, error: null };
      broadcast();
    },
    onFailed: (error) => {
      status = { ...status, error: describeError(error) };
      broadcast();
    },
  });

  // Keep running until interrupted.
  await new Promise<void>(() => {});
}
