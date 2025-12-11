import { readFile } from "node:fs/promises";
import { join } from "node:path";

export interface WidgetAsset {
  js?: string; // JS file content (inlined in production)
  css?: string; // CSS file content if exists (inlined in production)
  scriptSrc?: string; // Dev server script URL (Vite serves the file)
}

/**
 * Asset map interface
 */
export interface AssetMap {
  [entryName: string]: WidgetAsset;
}

interface ViteManifestChunk {
  file: string;
  name?: string;
  src?: string;
  isEntry?: boolean;
  css?: string[];
}

interface ViteManifest {
  [key: string]: ViteManifestChunk;
}

let cachedManifest: ViteManifest | null = null;

/**
 * Loads the Vite manifest.json from disk (production only)
 */
async function loadManifest(
  manifestPath: string = "dist/manifest.json",
): Promise<ViteManifest> {
  if (cachedManifest) return cachedManifest;

  const content = await readFile(manifestPath, "utf-8");
  cachedManifest = JSON.parse(content) as ViteManifest;
  return cachedManifest;
}

/**
 * Resolves and reads asset files, always returning inline content
 */
async function resolveAssets(
  manifestPath: string,
  entryName: string,
): Promise<WidgetAsset> {
  const manifest = await loadManifest(manifestPath);

  // Find the entry in the manifest
  const entryPath = `src/widgets/${entryName}/index.tsx`;
  const chunk = manifest[entryPath];

  if (!chunk) {
    throw new Error(
      `Entry "${entryName}" not found in manifest. Available entries: ${Object.keys(manifest).join(", ")}`,
    );
  }

  // Read the JS file content
  const distDir = join(process.cwd(), "dist");
  const jsPath = join(distDir, chunk.file);
  const jsContent = await readFile(jsPath, "utf-8");

  // Read CSS file content if it exists
  let cssContent: string | undefined;
  if (chunk.css && chunk.css.length > 0) {
    const cssPath = join(distDir, chunk.css[0]);
    cssContent = await readFile(cssPath, "utf-8");
  }

  return {
    js: jsContent,
    css: cssContent,
  };
}

/**
 * Main function to load asset map for all widgets
 * Always reads from dist/manifest.json and inlines the content
 * Automatically discovers all widget entries from the manifest
 */
export async function loadAssetMap(): Promise<AssetMap> {
  const manifestPath =
    process.env.VITE_MANIFEST_PATH ?? join(process.cwd(), "dist/manifest.json");

  const manifest = await loadManifest(manifestPath);
  const assetMap: AssetMap = {};

  // Find all widget entries in the manifest
  for (const [key, chunk] of Object.entries(manifest)) {
    if (key.startsWith("src/widgets/") && chunk.isEntry) {
      // Extract widget name from path: src/widgets/{name}/index.tsx
      const match = key.match(/^src\/widgets\/([^/]+)\/index\.tsx$/);
      if (match) {
        const widgetName = match[1];
        assetMap[widgetName] = await resolveAssets(manifestPath, widgetName);
      }
    }
  }

  return assetMap;
}
