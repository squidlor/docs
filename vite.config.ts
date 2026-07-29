import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 3100,
    host: true,
  },
  resolve: {
    alias: {
      "@": "/src",
    },
  },
  // Markdown lives outside src/ so it can be edited without touching app code.
  assetsInclude: ["**/*.md"],
  build: {
    // The whole markdown corpus is bundled deliberately: it makes navigation
    // instant and lets search run offline with no index server. That puts the
    // main chunk over Rollup's 500 kB advisory, which isn't a problem worth
    // code-splitting around here — splitting wouldn't help, since search needs
    // every page's text up front anyway.
    chunkSizeWarningLimit: 900,
  },
});
