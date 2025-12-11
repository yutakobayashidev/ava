import type { WidgetAsset } from "@apps-sdk/widget-runtime";
import { renderWidgetHtml } from "@apps-sdk/widget-runtime";
import fs from "fs/promises";
import path from "path";

const isDev = process.env.NODE_ENV !== "production";

// Base URL for dev widget assets (from labs/apps-sdk dev server)
const devWidgetOrigin =
  process.env.DEV_WIDGET_BASE_URL ?? "https://apps-sdk-dev-3.tunnelto.dev";

/**
 * Load asset manifest from built widget
 */
async function loadAssetMap(): Promise<Record<string, WidgetAsset>> {
  // production では .widget-assets にコピーされたアセットを読み込む
  // process.cwd() は Next.js のプロジェクトルート (apps/www) を指す
  const distRoot = path.join(process.cwd(), ".widget-assets");
  const manifestPath = path.join(distRoot, "manifest.json");

  // manifest.json がトレースされる
  const manifestContent = await fs.readFile(manifestPath, "utf-8");
  const manifest = JSON.parse(manifestContent);

  const assets: Record<string, WidgetAsset> = {};

  for (const [key, value] of Object.entries(manifest) as [
    string,
    { file: string; css?: string[]; name?: string },
  ][]) {
    // Use the name field from manifest if available, otherwise extract from key
    const widgetName = value.name || key.replace(/\.tsx?$/, "");

    // distRoot を静的パスとして結合する
    const jsPath = path.join(distRoot, value.file);
    const js = await fs.readFile(jsPath, "utf-8");

    let css: string | undefined;
    if (value.css && value.css.length > 0) {
      const cssPath = path.join(distRoot, value.css[0]);
      css = await fs.readFile(cssPath, "utf-8");
    }

    assets[widgetName] = { js, css };
  }

  return assets;
}

/**
 * Render widget HTML for MCP resource
 */
export async function renderWidget(widgetName: string): Promise<string> {
  // In dev mode, use external script from labs/apps-sdk dev server
  if (isDev) {
    return renderWidgetHtml(widgetName, {
      scriptSrc: `${devWidgetOrigin}/${widgetName}.js`,
    });
  }

  // In production, use built assets with inline JS/CSS
  const assets = await loadAssetMap();
  return renderWidgetHtml(widgetName, assets[widgetName]);
}
