#!/usr/bin/env node
/**
 * npm create teacharium-widget [directory] [--name "Display name"]
 *
 * Copies templates/default into a new directory and fills in names and
 * package versions. Node built-ins only, so `npm create` stays fast.
 */
import {
  cpSync,
  existsSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const here = dirname(fileURLToPath(import.meta.url));
const ownPackage = JSON.parse(readFileSync(join(here, "package.json"), "utf8"));

/** Files whose contents get {{placeholders}} replaced. */
const TEXT_FILE = /\.(json|ts|tsx|md|css|html|gitignore)$|^gitignore$/;

export function toPackageName(value) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-~]+/g, "-")
      .replace(/^-+|-+$/g, "") || "teacharium-widgets"
  );
}

/** "my-widgets" -> "MyWidgets": prefix that keeps component names unique. */
export function toComponentPrefix(packageName) {
  const prefix = packageName
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join("");
  return /^[A-Z]/.test(prefix) ? prefix : `W${prefix}`;
}

export function toTitle(value) {
  return value
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

function walk(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

export function scaffold(targetDir, { displayName, template = "default" }) {
  const templateDir = join(here, "templates", template);
  if (!existsSync(templateDir)) {
    throw new Error(`Unknown template "${template}"`);
  }
  if (existsSync(targetDir) && readdirSync(targetDir).length > 0) {
    throw new Error(`${targetDir} already exists and is not empty.`);
  }

  cpSync(templateDir, targetDir, { recursive: true });
  // npm drops .gitignore from published packages, so the template ships it as "gitignore".
  if (existsSync(join(targetDir, "gitignore"))) {
    renameSync(join(targetDir, "gitignore"), join(targetDir, ".gitignore"));
  }

  const packageName = toPackageName(basename(targetDir));
  const values = {
    packageName,
    componentPrefix: toComponentPrefix(packageName),
    displayName,
    widgetVersion: ownPackage.teachariumVersions["@teacharium/widget"],
    toolsVersion: ownPackage.teachariumVersions["@teacharium/widget-tools"],
  };
  for (const file of walk(targetDir)) {
    if (!TEXT_FILE.test(basename(file))) continue;
    const text = readFileSync(file, "utf8");
    const next = text.replace(/\{\{(\w+)\}\}/g, (match, key) =>
      key in values ? values[key] : match,
    );
    if (next !== text) writeFileSync(file, next);
  }
  return values;
}

function detectPackageManager() {
  const agent = process.env.npm_config_user_agent ?? "";
  if (agent.startsWith("pnpm")) return "pnpm";
  if (agent.startsWith("yarn")) return "yarn";
  if (agent.startsWith("bun")) return "bun";
  return "npm";
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      name: { type: "string" },
      template: { type: "string" },
      help: { type: "boolean", short: "h" },
    },
  });
  if (values.help) {
    console.log(
      'Usage: npm create teacharium-widget [directory] [-- --name "My widgets"]',
    );
    return;
  }

  let directory = positionals[0];
  if (!directory) {
    if (!process.stdin.isTTY) throw new Error("Pass a directory name.");
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    directory = (await rl.question("Project directory: (my-teacharium-widgets) ")).trim() ||
      "my-teacharium-widgets";
    rl.close();
  }

  const targetDir = resolve(directory);
  const displayName = values.name ?? toTitle(basename(targetDir));
  scaffold(targetDir, { displayName, template: values.template });

  const pm = detectPackageManager();
  const run = pm === "npm" ? "npm run" : pm;
  const cd = relative(process.cwd(), targetDir) || ".";
  console.log(`
Created ${displayName} in ${targetDir}

Next steps:
  cd ${cd}
  ${pm} install
  ${run} dev        # preview your components at http://localhost:5199
  ${run} build      # bundle and check
  npx teacharium login
  ${run} deploy     # upload to your Teacharium organization

Docs: https://docs.teacharium.io/api-documentation/widget-sdk
`);
}

function isEntryPoint() {
  try {
    // Resolves the npm bin symlink to this file.
    return realpathSync(process.argv[1]) === fileURLToPath(import.meta.url);
  } catch {
    return false;
  }
}

if (isEntryPoint()) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
