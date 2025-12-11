import { build, type InlineConfig } from "vite";
import { buildWidgetEntries } from "@apps-sdk/vite-plugin-widget";
import tailwindcss from "@tailwindcss/vite";
import fs from "fs";

const widgetEntries = buildWidgetEntries();
const outDir = "dist";

// Clean output directory
fs.rmSync(outDir, { recursive: true, force: true });

for (const [name, entryPath] of Object.entries(widgetEntries)) {
  const config: InlineConfig = {
    esbuild: {
      jsxImportSource: "hono/jsx/dom",
    },
    plugins: [tailwindcss()],
    build: {
      outDir,
      emptyOutDir: false,
      manifest: false,
      sourcemap: true,
      rollupOptions: {
        input: entryPath, // Single entry point for inlineDynamicImports to work
        output: {
          entryFileNames: `assets/${name}.js`,
          assetFileNames: `assets/${name}[extname]`,
          format: "es",
          inlineDynamicImports: true, // Bundle everything into one file
        },
      },
    },
  };

  console.log(`Building ${name}...`);
  await build(config);
}

console.log(`✓ Built ${Object.keys(widgetEntries).length} widgets`);
