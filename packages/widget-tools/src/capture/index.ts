import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import type { CaptureResult } from "./worker.js";

export type { CaptureResult } from "./worker.js";

const DEFAULT_TIMEOUT_MS = 30_000;

/**
 * Load a built bundle in an isolated jsdom process and return the manifest
 * of every component it registered.
 */
export async function captureManifest(
  bundlePath: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<CaptureResult> {
  const workerPath = fileURLToPath(new URL("./worker.js", import.meta.url));
  const tempDir = mkdtempSync(join(tmpdir(), "teacharium-capture-"));
  const outPath = join(tempDir, "result.json");

  try {
    await new Promise<void>((resolve, reject) => {
      const child = spawn(process.execPath, [workerPath, bundlePath, outPath], {
        stdio: ["ignore", "ignore", "pipe"],
        env: { ...process.env, NODE_ENV: "production" },
      });
      let stderr = "";
      child.stderr.on("data", (chunk) => {
        stderr += chunk;
      });
      const timer = setTimeout(() => {
        child.kill("SIGKILL");
        reject(new Error(`Timed out loading the bundle after ${timeoutMs}ms`));
      }, timeoutMs);
      child.on("error", (error) => {
        clearTimeout(timer);
        reject(error);
      });
      child.on("exit", (code) => {
        clearTimeout(timer);
        if (code === 0) resolve();
        else
          reject(
            new Error(
              `Loading the bundle failed:\n${stderr.trim() || `exit code ${code}`}`,
            ),
          );
      });
    });
    return JSON.parse(readFileSync(outPath, "utf8")) as CaptureResult;
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}
