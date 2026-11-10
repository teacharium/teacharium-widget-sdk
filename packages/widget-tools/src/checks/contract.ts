/**
 * Checks that a built bundle follows the contract Teacharium hosts rely on.
 */
import { existsSync, readFileSync, statSync } from "node:fs";

import {
  BUILT_IN_COMPONENT_NAMES,
  type WidgetVersionManifest,
} from "@teacharium/widget/manifest";

import { WIDGET_EXTERNALS } from "../vite-plugin.js";

/** Upload limits enforced by the Teacharium publish API. */
export const MAX_JS_BYTES = 3.5 * 1024 * 1024;
export const MAX_CSS_BYTES = 512 * 1024;

export interface ContractReport {
  errors: string[];
  warnings: string[];
}

/** Bare module specifiers a bundle imports (static, re-export and dynamic). */
export function bareImports(code: string): string[] {
  const specifiers = new Set<string>();
  const patterns = [
    /\bimport\s*(?:[\w*{}\s,$]+?\s*from\s*)?["']([^"']+)["']/g,
    /\bexport\s*[\w*{}\s,$]+?\s*from\s*["']([^"']+)["']/g,
    /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
  ];
  for (const pattern of patterns) {
    for (const match of code.matchAll(pattern)) {
      const specifier = match[1];
      if (
        specifier.startsWith(".") ||
        specifier.startsWith("/") ||
        /^[a-z][a-z0-9+.-]*:/i.test(specifier)
      ) {
        continue;
      }
      specifiers.add(specifier);
    }
  }
  return [...specifiers];
}

export function checkBundle(paths: {
  js: string;
  css: string;
}): ContractReport {
  const report: ContractReport = { errors: [], warnings: [] };

  if (!existsSync(paths.js)) {
    report.errors.push(`Bundle not found: ${paths.js}`);
    return report;
  }

  const jsSize = statSync(paths.js).size;
  if (jsSize > MAX_JS_BYTES) {
    report.errors.push(
      `widget.js is ${(jsSize / 1024 / 1024).toFixed(1)}MB; the limit is ${MAX_JS_BYTES / 1024 / 1024}MB`,
    );
  }
  if (existsSync(paths.css)) {
    const cssSize = statSync(paths.css).size;
    if (cssSize > MAX_CSS_BYTES) {
      report.errors.push(
        `widget.css is ${(cssSize / 1024).toFixed(0)}KB; the limit is ${MAX_CSS_BYTES / 1024}KB`,
      );
    }
  }

  const allowed = new Set<string>(WIDGET_EXTERNALS);
  const unresolved = bareImports(readFileSync(paths.js, "utf8")).filter(
    (specifier) => !allowed.has(specifier),
  );
  if (unresolved.length > 0) {
    report.errors.push(
      `The bundle imports ${unresolved.map((s) => `"${s}"`).join(", ")}, which ` +
        `Teacharium can't provide at runtime. Only ${[...allowed]
          .map((s) => `"${s}"`)
          .join(" and ")} may stay external; bundle everything else ` +
        `(use the teachariumWidget() Vite plugin).`,
    );
  }

  return report;
}

export function checkManifest(manifest: WidgetVersionManifest): ContractReport {
  const report: ContractReport = { errors: [], warnings: [] };
  const builtIns = new Set(BUILT_IN_COMPONENT_NAMES);

  for (const component of manifest.components) {
    if (builtIns.has(component.name)) {
      report.errors.push(
        `Component "${component.name}" uses a name reserved by Teacharium.`,
      );
    }
    if (!component.category) {
      report.warnings.push(
        `Component "${component.name}" has no category; it will be listed under "Other".`,
      );
    }
    if (!component.aiPrompt && !component.usagePrompt) {
      report.warnings.push(
        `Component "${component.name}" has no aiPrompt or usagePrompt; AI lesson generation won't know when to use it.`,
      );
    }
  }
  return report;
}
