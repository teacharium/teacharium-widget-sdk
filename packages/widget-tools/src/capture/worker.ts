/**
 * Child process that loads a widget bundle in a simulated browser and writes
 * the components it registered.
 *
 *   node worker.js <bundle.js> <out.json>
 *
 * Runs in its own process so the jsdom globals never leak into the CLI and a
 * bundle that hangs or crashes can be killed. `react` and `react-dom` resolve
 * from the bundle's own project (its node_modules), as they would through a
 * host's import map.
 */
import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

import { JSDOM } from "jsdom";
import {
  buildWidgetVersionManifest,
  type WidgetVersionManifest,
} from "@teacharium/widget/manifest";

/** Delay after import for bundles that register asynchronously. */
const REGISTRATION_SETTLE_MS = 100;

export interface CaptureResult {
  manifest: WidgetVersionManifest;
  /** Problems found with individual components (empty when all is well). */
  problems: string[];
}

function installDomGlobals(dom: JSDOM) {
  const win = dom.window as unknown as Record<string, unknown>;
  const target = globalThis as unknown as Record<string, unknown>;

  for (const key of Object.getOwnPropertyNames(win)) {
    if (key in target) continue;
    try {
      target[key] = win[key];
    } catch {
      // Some window properties are read-only accessors; skip them.
    }
  }
  // These exist on Node's global but must be the DOM versions.
  for (const key of ["window", "self", "document", "navigator", "location"]) {
    Object.defineProperty(target, key, {
      value: key === "window" || key === "self" ? win : win[key],
      configurable: true,
      writable: true,
    });
  }
}

/**
 * No-op stand-ins for browser APIs jsdom lacks. Only module-level code runs
 * during capture (nothing renders), so they just need to exist.
 */
function installBrowserStubs(win: Record<string, unknown>) {
  class NoopObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  }
  const stubs: Record<string, unknown> = {
    ResizeObserver: NoopObserver,
    IntersectionObserver: NoopObserver,
    PerformanceObserver: NoopObserver,
    matchMedia: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener() {},
      removeListener() {},
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent: () => false,
    }),
    scrollTo: () => {},
    AudioContext: class {
      createGain() {
        return { connect() {}, gain: { value: 1 } };
      }
    },
  };
  const target = globalThis as unknown as Record<string, unknown>;
  for (const [key, value] of Object.entries(stubs)) {
    if (!(key in win)) win[key] = value;
    if (!(key in target)) target[key] = win[key];
  }
}

async function capture(bundlePath: string): Promise<CaptureResult> {
  const dom = new JSDOM(
    "<!doctype html><html><head></head><body></body></html>",
    { url: "http://localhost/", pretendToBeVisual: true },
  );
  installBrowserStubs(dom.window as unknown as Record<string, unknown>);
  installDomGlobals(dom);

  // Same globals every host sets before loading widget bundles.
  const requireFromBundle = createRequire(bundlePath);
  const win = dom.window as unknown as Record<string, unknown>;
  try {
    win.React = requireFromBundle("react");
    win.ReactDOM = requireFromBundle("react-dom");
  } catch {
    throw new Error(
      "Could not resolve react/react-dom from the widget project. " +
        "Add them to its dependencies.",
    );
  }

  await import(pathToFileURL(bundlePath).href);
  await new Promise((resolve) => setTimeout(resolve, REGISTRATION_SETTLE_MS));

  const registry = (win.TeachariumComponents ?? {}) as Record<string, unknown>;
  const problems: string[] = [];
  const widgets = Object.entries(registry).filter(([key, widget]) => {
    const value = widget as {
      name?: unknown;
      config?: { render?: unknown };
    };
    if (!value || typeof value !== "object") {
      problems.push(`"${key}" was registered without a widget object`);
      return false;
    }
    if (typeof value.name !== "string" || !value.name) {
      problems.push(`"${key}" has no name`);
      return false;
    }
    if (typeof value.config?.render !== "function") {
      problems.push(`"${value.name}" has no config.render function`);
    }
    return true;
  });

  if (widgets.length === 0) {
    problems.push(
      "The bundle registered no components. Call registerWidget() from your entry module.",
    );
  }

  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    manifest: buildWidgetVersionManifest(widgets.map(([, w]) => w as any)),
    problems,
  };
}

const [bundlePath, outPath] = process.argv.slice(2);
if (!bundlePath || !outPath) {
  console.error("usage: worker <bundle.js> <out.json>");
  process.exit(2);
}

capture(bundlePath)
  .then((result) => {
    writeFileSync(outPath, JSON.stringify(result));
    // Widgets may leave timers running; don't wait for them.
    process.exit(0);
  })
  .catch((error) => {
    console.error(
      error instanceof Error ? (error.stack ?? error.message) : String(error),
    );
    process.exit(1);
  });
