import devServer, { defaultOptions } from "@hono/vite-dev-server";
import nodeAdapter from "@hono/vite-dev-server/node";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

import {
  buildWidgetEntries,
  multiWidgetDevEndpoints,
} from "./vite-plugin-multi-widget";

const widgetEntries = buildWidgetEntries();

export default defineConfig(({ mode }) => {
  const isClientMode = mode === "client";

  const shared = {
    esbuild: {
      jsxImportSource: "hono/jsx/dom",
    },
    server: {
      allowedHosts: [".oaiusercontent.com", "apps-sdk-dev-3.tunn.dev"],
      port: 5173,
      strictPort: true,
    },
  };

  if (isClientMode) {
    return {
      ...shared,
      plugins: [
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
            format: "iife",
          },
        },
      },
    };
  }

  return {
    ...shared,
    plugins: [
      devServer({
        entry: "src/server/app.ts",
        adapter: nodeAdapter,
        exclude: [
          // In dev, only /mcp should hit Hono; everything else goes to Vite
          /^(?!\/mcp$).*/,
          ...defaultOptions.exclude,
        ],
      }),
      multiWidgetDevEndpoints({
        entries: widgetEntries,
      }),
      tailwindcss(),
    ],
  };
});
