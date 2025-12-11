import {
  buildWidgetEntries,
  multiWidgetDevEndpoints,
} from "@apps-sdk/vite-plugin-widget";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import Inspect from "vite-plugin-inspect";

const widgetEntries = buildWidgetEntries();
const devWidgetBase =
  process.env.DEV_WIDGET_BASE_URL ?? "https://apps-sdk-dev-3.tunnelto.dev";
const devWidgetHost = (() => {
  try {
    return new URL(devWidgetBase).hostname;
  } catch {
    return undefined;
  }
})();

export default defineConfig({
  esbuild: {
    jsxImportSource: "hono/jsx/dom",
  },
  server: {
    origin: devWidgetBase,
    allowedHosts: [
      ".oaiusercontent.com",
      devWidgetHost && devWidgetHost !== "localhost" ? devWidgetHost : null,
    ].filter(Boolean) as string[],
    cors: {
      origin: [
        "https://chatgpt.com",
        "https://*.oaiusercontent.com",
        devWidgetBase,
      ],
      methods: ["GET", "OPTIONS"],
    },
    port: 5173,
    strictPort: true,
  },
  plugins: [
    Inspect(),
    multiWidgetDevEndpoints({
      entries: widgetEntries,
    }),
    tailwindcss(),
  ],
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
        format: "es", // Use ES modules instead of IIFE for multi-entry builds
        manualChunks: undefined,
      },
    },
  },
});
