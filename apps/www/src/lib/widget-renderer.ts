import { renderWidgetHtml } from "@apps-sdk/widget-runtime";
import type { WidgetAsset } from "@apps-sdk/widget-runtime";
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
  const manifestPath = path.resolve(
    process.cwd(),
    "../../labs/apps-sdk/dist/manifest.json",
  );
  const manifestContent = await fs.readFile(manifestPath, "utf-8");
  const manifest = JSON.parse(manifestContent);

  const assets: Record<string, WidgetAsset> = {};

  for (const [key, value] of Object.entries(manifest) as [
    string,
    { file: string; css?: string[] },
  ][]) {
    const widgetName = key.replace(/\.tsx?$/, "");
    const assetPath = path.resolve(
      process.cwd(),
      `../../labs/apps-sdk/dist/${value.file}`,
    );
    const js = await fs.readFile(assetPath, "utf-8");

    let css: string | undefined;
    if (value.css && value.css.length > 0) {
      const cssPath = path.resolve(
        process.cwd(),
        `../../labs/apps-sdk/dist/${value.css[0]}`,
      );
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
  if (isDev || devWidgetOrigin) {
    return renderWidgetHtml(widgetName, {
      scriptSrc: `${devWidgetOrigin}/${widgetName}.js`,
    });
  }

  // In production, use built assets with inline JS/CSS
  const assets = await loadAssetMap();
  return renderWidgetHtml(widgetName, assets[widgetName]);
}
