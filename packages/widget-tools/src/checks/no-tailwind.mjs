/**
 * Finds Tailwind in learner-facing widget code.
 *
 * Widgets ship to places without Teacharium's Tailwind build (SCORM exports,
 * the self-hosted player, other hosts), so a Tailwind class there renders
 * unstyled. Style widgets with your own CSS classes instead.
 *
 * It checks .ts/.tsx source (not tests) for:
 *   1. Tailwind utility classes in class strings: className/class attributes,
 *      cn()/clsx()/classNames() arguments, and variables or properties whose
 *      name contains "class" (e.g. `const sizeClasses = { sm: "w-20" }`).
 *   2. Imports from @teacharium/ui other than `cn`: those shadcn components
 *      get their whole look from Tailwind.
 *
 * Plain JavaScript so the Teacharium monorepo's own check script can import
 * it without a build step.
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ALLOWED_UI_IMPORTS = new Set(["cn"]);

// Utility prefixes and bare utilities. A token is Tailwind when, after its
// variant prefixes (hover:, sm:, data-[state=open]:, ...) and a leading "-"
// are removed, it is one of the bare utilities or starts with "<prefix>-".
const BARE_UTILITIES = new Set(
  (
    "flex grid block inline inline-block inline-flex inline-grid hidden contents " +
    "table absolute relative fixed sticky static visible invisible truncate italic " +
    "underline uppercase lowercase capitalize grow shrink border rounded shadow " +
    "transition transform container isolate sr-only not-sr-only antialiased " +
    "outline ring resize"
  ).split(" "),
);
const UTILITY_PREFIXES = (
  "p px py pt pb pl pr ps pe m mx my mt mb ml mr ms me gap space w h min-w min-h " +
  "max-w max-h size inset top left right bottom z text bg border rounded shadow " +
  "ring outline font leading tracking items justify self place content order col " +
  "row flex grid basis grow shrink overflow cursor transition duration ease delay " +
  "opacity aspect object whitespace break select pointer-events animate scale " +
  "rotate translate origin fill stroke divide decoration list align backdrop blur " +
  "from via to line-clamp columns float clear box indent"
).split(" ");
const VARIANT = /^(?:[a-z0-9-]+|\[[^\]]*\]|[a-z-]+-\[[^\]]*\]|\*):/;

function isTailwindToken(token) {
  let base = token.replace(/^!/, "");
  while (VARIANT.test(base)) base = base.replace(VARIANT, "");
  base = base.replace(/^-/, "");
  if (!base || base.startsWith("tp-")) return false;
  if (BARE_UTILITIES.has(base)) return true;
  return UTILITY_PREFIXES.some((prefix) => base.startsWith(`${prefix}-`));
}

/** Index just past the bracket that closes the one at `start`. */
function matchClose(src, start) {
  const open = src[start];
  const close = { "(": ")", "{": "}", "[": "]" }[open];
  let depth = 0;
  for (let i = start; i < src.length; i++) {
    const ch = src[i];
    if (ch === '"' || ch === "'" || ch === "`") {
      i = skipString(src, i) - 1;
      continue;
    }
    if (ch === open) depth++;
    else if (ch === close && --depth === 0) return i + 1;
  }
  return src.length;
}

function skipString(src, start) {
  const quote = src[start];
  for (let i = start + 1; i < src.length; i++) {
    if (src[i] === "\\") i++;
    else if (src[i] === quote) return i + 1;
  }
  return src.length;
}

/** String literals in a code fragment, with template expressions removed. */
function stringLiterals(fragment, offset) {
  const out = [];
  for (let i = 0; i < fragment.length; i++) {
    const ch = fragment[i];
    if (ch === '"' || ch === "'" || ch === "`") {
      const end = skipString(fragment, i);
      let text = fragment.slice(i + 1, end - 1);
      if (ch === "`") text = text.replace(/\$\{[^}]*\}/g, " ");
      out.push({ text, index: offset + i });
      i = end - 1;
    }
  }
  return out;
}

/** Code fragments whose string literals are class names. */
function classFragments(src) {
  const fragments = [];
  const push = (start, end) =>
    fragments.push({ text: src.slice(start, end), index: start });

  // className="..." / className={...} (also class= and *ClassName= props)
  for (const m of src.matchAll(/\b(?:class|[A-Za-z]*[cC]lassName)\s*=\s*/g)) {
    const at = m.index + m[0].length;
    if (src[at] === '"' || src[at] === "'") push(at, skipString(src, at));
    else if (src[at] === "{") push(at, matchClose(src, at));
  }
  // cn(...), clsx(...), classNames(...)
  for (const m of src.matchAll(/\b(?:cn|clsx|classNames)\(/g)) {
    const at = m.index + m[0].length - 1;
    push(at, matchClose(src, at));
  }
  // const fooClasses = ... / fooClassName: ... (value up to the end of the
  // statement or property)
  for (const m of src.matchAll(
    /\b(?:const|let|var)\s+\w*[cC]lass\w*\s*=\s*|\b\w*[cC]lass\w*\s*:\s*(?=["'`{([])/g,
  )) {
    const at = m.index + m[0].length;
    const ch = src[at];
    if (ch === '"' || ch === "'" || ch === "`") push(at, skipString(src, at));
    else if (ch === "{" || ch === "(" || ch === "[")
      push(at, matchClose(src, at));
  }
  return fragments;
}

function lineOf(src, index) {
  return src.slice(0, index).split("\n").length;
}

/**
 * Tailwind problems in one source file.
 * @param {string} file
 * @returns {{ line: number, message: string }[]}
 */
export function checkFile(file) {
  const src = readFileSync(file, "utf8");
  const problems = [];

  const seen = new Set();
  for (const fragment of classFragments(src)) {
    for (const literal of stringLiterals(fragment.text, fragment.index)) {
      if (seen.has(literal.index)) continue;
      seen.add(literal.index);
      // Class lists are lowercase; skip prose such as the descriptions in a
      // widget's cssClasses list ("Image container").
      if (/[A-Z]/.test(literal.text)) continue;
      const tokens = literal.text.split(/\s+/).filter(Boolean);
      const tailwind = tokens.filter(isTailwindToken);
      if (tailwind.length > 0) {
        problems.push({
          line: lineOf(src, literal.index),
          message: `Tailwind classes: ${tailwind.join(" ")}`,
        });
      }
    }
  }

  for (const m of src.matchAll(
    /import\s+(?:type\s+)?\{([^}]*)\}\s+from\s+["']@teacharium\/ui["']/g,
  )) {
    const names = m[1]
      .split(",")
      .map(
        (n) =>
          n
            .trim()
            .replace(/^type\s+/, "")
            .split(/\s+as\s+/)[0],
      )
      .filter(Boolean);
    const banned = names.filter((n) => !ALLOWED_UI_IMPORTS.has(n));
    if (banned.length > 0) {
      problems.push({
        line: lineOf(src, m.index),
        message: `@teacharium/ui components are styled with Tailwind: ${banned.join(", ")}`,
      });
    }
  }
  return problems;
}

/**
 * .ts/.tsx source files under `dir`, excluding tests and declarations.
 * @param {string} dir
 * @returns {string[]}
 */
export function sourceFiles(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === "dist") continue;
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) files.push(...sourceFiles(path));
    else if (
      /\.(ts|tsx)$/.test(entry) &&
      !/\.(test|spec)\.tsx?$/.test(entry) &&
      !entry.endsWith(".d.ts")
    ) {
      files.push(path);
    }
  }
  return files;
}

/**
 * Every Tailwind problem in a package's `src` directory.
 * @param {string} packageDir
 * @returns {{ file: string, line: number, message: string }[]}
 */
export function findTailwindProblems(packageDir) {
  const srcDir = join(packageDir, "src");
  if (!existsSync(srcDir)) return [];
  const problems = [];
  for (const file of sourceFiles(srcDir)) {
    for (const problem of checkFile(file)) {
      problems.push({ file, ...problem });
    }
  }
  return problems;
}
