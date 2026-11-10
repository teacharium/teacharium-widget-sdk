import { defineConfig } from "vite";
import { teachariumWidget } from "@teacharium/widget-tools";

// teachariumWidget() builds dist/widget.js and dist/widget.css the way
// Teacharium loads them. Add your own Vite plugins alongside it if you need to.
export default defineConfig({
  plugins: [teachariumWidget()],
});
