/**
 * `teacharium.json`: the per-package widget project file.
 *
 * {
 *   "name": "My widgets",          // shown in the Teacharium widget library
 *   "description": "…",
 *   "entry": "src/main.ts",        // calls registerWidget() for each component
 *   "widgetId": "…"                // written by `teacharium publish` on first run
 * }
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

export const PROJECT_FILE = "teacharium.json";

/** Bundle file names inside `outDir`. Fixed so tools never have to guess. */
export const BUNDLE_JS = "widget.js";
export const BUNDLE_CSS = "widget.css";
export const BUNDLE_MANIFEST = "manifest.json";
export const DEFAULT_OUT_DIR = "dist";

export interface WidgetProject {
  name: string;
  description?: string;
  entry: string;
  widgetId?: string;
}

export interface LoadedWidgetProject extends WidgetProject {
  /** Directory containing `teacharium.json`. */
  root: string;
  /** Absolute path of `teacharium.json`. */
  file: string;
}

/** Find `teacharium.json` in `from` or the nearest parent directory. */
export function findProjectFile(from: string = process.cwd()): string | null {
  let dir = resolve(from);
  for (;;) {
    const candidate = join(dir, PROJECT_FILE);
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

export function parseProject(raw: unknown, file: string): WidgetProject {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error(`${file}: expected a JSON object`);
  }
  const value = raw as Record<string, unknown>;
  if (typeof value.name !== "string" || !value.name.trim()) {
    throw new Error(`${file}: "name" is required`);
  }
  if (typeof value.entry !== "string" || !value.entry.trim()) {
    throw new Error(`${file}: "entry" is required (e.g. "src/main.ts")`);
  }
  if (value.widgetId !== undefined && typeof value.widgetId !== "string") {
    throw new Error(`${file}: "widgetId" must be a string`);
  }
  if (value.description !== undefined && typeof value.description !== "string") {
    throw new Error(`${file}: "description" must be a string`);
  }
  return {
    name: value.name,
    entry: value.entry,
    description: value.description as string | undefined,
    widgetId: value.widgetId as string | undefined,
  };
}

export function loadProject(from: string = process.cwd()): LoadedWidgetProject {
  const file = findProjectFile(from);
  if (!file) {
    throw new Error(
      `No ${PROJECT_FILE} found in ${resolve(from)} or its parents. ` +
        `Create one with: npm create teacharium-widget`,
    );
  }
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    throw new Error(
      `${file}: invalid JSON (${error instanceof Error ? error.message : error})`,
    );
  }
  return { ...parseProject(raw, file), root: dirname(file), file };
}

/** Write fields back to `teacharium.json`, keeping keys we don't know about. */
export function updateProject(
  project: LoadedWidgetProject,
  changes: Partial<WidgetProject>,
): LoadedWidgetProject {
  const raw = JSON.parse(readFileSync(project.file, "utf8")) as Record<
    string,
    unknown
  >;
  const next = { ...raw, ...changes };
  writeFileSync(project.file, `${JSON.stringify(next, null, 2)}\n`);
  return { ...project, ...changes };
}

export function bundlePaths(root: string, outDir: string = DEFAULT_OUT_DIR) {
  const dir = resolve(root, outDir);
  return {
    dir,
    js: join(dir, BUNDLE_JS),
    css: join(dir, BUNDLE_CSS),
    manifest: join(dir, BUNDLE_MANIFEST),
  };
}
