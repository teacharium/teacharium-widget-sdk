import { resolve } from "path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
  plugins: [
    dts({ insertTypesEntry: true, tsconfigPath: "./tsconfig.app.json" }),
  ],
  build: {
    sourcemap: true,
    lib: {
      entry: {
        "teacharium-widget": resolve(__dirname, "src/main.ts"),
        // Pure (no React) entry for servers and build tools
        manifest: resolve(__dirname, "src/manifest.ts"),
      },
      fileName: (format, entryName) => `${entryName}.${format}.js`,
      formats: ["es"],
    },
    rollupOptions: {
      // Externalize dependencies that should not be bundled
      external: [
        "react",
        "react-dom",
        "@teacharium/widget",
        "@measured/puck",
        "lucide-react",
      ],
    },
  },
});
