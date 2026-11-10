import { resolve } from "node:path";
import { defineConfig } from "vite";

// Builds the preview harness that `teacharium dev` serves. Everything is
// bundled (React, the player); only the widget bundle under preview is
// loaded at runtime, through the import map in index.html.
export default defineConfig({
  root: __dirname,
  base: "/",
  esbuild: { jsx: "automatic" },
  define: { "process.env.NODE_ENV": JSON.stringify("production") },
  build: {
    outDir: resolve(__dirname, "../dist/harness"),
    emptyOutDir: true,
    sourcemap: false,
    chunkSizeWarningLimit: 4000,
    rollupOptions: {
      onwarn(warning, warn) {
        // "use client" directives in dependencies are harmless here.
        if (warning.code === "MODULE_LEVEL_DIRECTIVE") return;
        if (warning.message.includes("Error when using sourcemap")) return;
        warn(warning);
      },
    },
  },
});
