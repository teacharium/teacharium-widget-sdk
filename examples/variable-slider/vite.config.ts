import { defineConfig } from "vite";
import { teachariumWidget } from "@teacharium/widget-tools";

export default defineConfig({
  plugins: [teachariumWidget()],
});
