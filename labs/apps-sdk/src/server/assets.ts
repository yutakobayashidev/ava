import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Asset map interface
 * In dev: uses VITE_DEV_SERVER_ORIGIN environment variable (e.g., "http://localhost:5173")
 * In prod: reads dist/manifest.json to get hashed asset paths
 */
export interface AssetMap {
  [entryName: string]: {
    js: string;
  };
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
 * Resolves asset URLs for development mode
 * Returns HMR client script and module URL for hot reloading
 */
function resolveDevAssets(origin: string, entryName: string): { js: string } {
  // In dev mode, we load the virtual entry from Vite dev server
  // The vite-plugin-multi-widget creates virtual /{name}.js endpoints
  // CSS (Tailwind) is automatically included by the Vite plugin
  return {
    js: `${origin}/${entryName}.js`,
  };
}

/**
 * Resolves asset URLs for production mode
 * Reads manifest.json to find the built JS/CSS files
 */
async function resolveProdAssets(
  manifestPath: string,
  entryName: string,
): Promise<{ js: string }> {
  const manifest = await loadManifest(manifestPath);

  // Find the entry in the manifest
  const entryPath = `src/widgets/${entryName}/index.tsx`;
  const chunk = manifest[entryPath];

  if (!chunk) {
    throw new Error(
      `Entry "${entryName}" not found in manifest. Available entries: ${Object.keys(manifest).join(", ")}`,
    );
  }

  // CSS (Tailwind) is inlined in the JS bundle by @tailwindcss/vite
  return {
    js: `/${chunk.file}`,
  };
}

/**
 * Main function to load asset map for all widgets
 * Reads from Node.js environment variables:
 * - VITE_DEV_SERVER_ORIGIN: if set, uses dev mode (e.g., "http://localhost:5173")
 * - VITE_MANIFEST_PATH: custom path to manifest.json (defaults to "dist/manifest.json")
 */
export async function loadAssetMap(): Promise<AssetMap> {
  const devOrigin = process.env.VITE_DEV_SERVER_ORIGIN;
  const isDev = !!devOrigin;

  if (isDev) {
    // For now, we only have one widget: "todo"
    // You can extend this to support multiple widgets
    return {
      todo: resolveDevAssets(devOrigin!, "todo"),
    };
  }

  // Production mode
  const manifestPath =
    process.env.VITE_MANIFEST_PATH ?? join(process.cwd(), "dist/manifest.json");

  return {
    todo: await resolveProdAssets(manifestPath, "todo"),
  };
}
