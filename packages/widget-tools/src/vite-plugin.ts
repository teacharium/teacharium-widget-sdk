/**
 * Vite plugin that turns a project into a Teacharium widget bundle.
 *
 *   // vite.config.ts
 *   import { defineConfig } from "vite";
 *   import { teachariumWidget } from "@teacharium/widget-tools";
 *   export default defineConfig({ plugins: [teachariumWidget()] });
 *
 * The bundle contract every Teacharium host relies on (editor, player, SCORM
 * and ZIP exports, LTI, self-hosted player):
 *   - one ES module, `dist/widget.js`, that calls `registerWidget()` for each
 *     component it provides (any number of components per bundle);
 *   - `react` and `react-dom` are left as bare imports: each host resolves
 *     them to its own React through an import map, so there is exactly one
 *     React on the page;
 *   - at most one stylesheet, `dist/widget.css`.
 */
import type { Plugin, UserConfig } from "vite";

import {
  BUNDLE_CSS,
  BUNDLE_JS,
  DEFAULT_OUT_DIR,
  loadProject,
} from "./project.js";

/**
 * Imports left external. Exact names only: `react/jsx-runtime` is bundled,
 * because host import maps only provide these two specifiers.
 */
export const WIDGET_EXTERNALS = ["react", "react-dom"] as const;

export interface TeachariumWidgetOptions {
  /** Entry module. Defaults to `entry` in teacharium.json. */
  entry?: string;
  /** Output directory. Defaults to `dist`. */
  outDir?: string;
  /** Emit sourcemaps (default true). */
  sourcemap?: boolean;
}

/**
 * The plugin's public type is structural rather than Vite's `Plugin`, so it
 * is accepted by whichever copy of Vite the project uses (monorepos often
 * resolve more than one).
 */
export interface TeachariumVitePlugin {
  name: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config: (...args: any[]) => any;
}

export function teachariumWidget(
  options: TeachariumWidgetOptions = {},
): TeachariumVitePlugin {
  const plugin = {
    name: "teacharium-widget",
    config(userConfig, env): UserConfig {
      const root = userConfig.root ?? process.cwd();
      const entry = options.entry ?? loadProject(root).entry;
      const nodeEnv =
        process.env.NODE_ENV ??
        (env.mode === "development" ? "development" : "production");

      return {
        define: {
          "process.env.NODE_ENV": JSON.stringify(nodeEnv),
          global: "globalThis",
        },
        build: {
          outDir: options.outDir ?? DEFAULT_OUT_DIR,
          cssCodeSplit: false,
          sourcemap: options.sourcemap ?? true,
          lib: {
            entry,
            formats: ["es"],
            fileName: () => BUNDLE_JS,
          },
          rollupOptions: {
            external: [...WIDGET_EXTERNALS],
            output: {
              assetFileNames: (assetInfo) => {
                const names = assetInfo.names ?? [];
                if (names.some((name) => name.endsWith(".css"))) {
                  return BUNDLE_CSS;
                }
                return "[name][extname]";
              },
            },
            onwarn(warning, warn) {
              // "use client" directives in dependencies are harmless here.
              if (warning.code === "MODULE_LEVEL_DIRECTIVE") return;
              warn(warning);
            },
          },
        },
      };
    },
  } satisfies Plugin;
  return plugin;
}
