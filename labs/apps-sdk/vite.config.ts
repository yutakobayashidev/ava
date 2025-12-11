import { defineConfig } from "vite";

import tailwindcss from "@tailwindcss/vite";
import {
  buildWidgetEntries,
  multiWidgetDevEndpoints,
} from "./vite-plugin-multi-widget";

const widgetEntries = buildWidgetEntries();

export default defineConfig({
  plugins: [
    multiWidgetDevEndpoints({
      entries: widgetEntries,
    }),
    tailwindcss(),
  ],
  esbuild: {
    jsxImportSource: "hono/jsx/dom",
  },
  server: {
    allowedHosts: [".oaiusercontent.com"],
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: "dist",
    assetsDir: "assets",
    emptyOutDir: true,
    manifest: "manifest.json",
    sourcemap: true,
    rollupOptions: {
      input: widgetEntries,
      output: {
        entryFileNames: "assets/[name].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name][extname]",
        format: "iife",
      },
    },
  },
});
