import type { WidgetAsset } from "@apps-sdk/widget-runtime";
import { renderWidgetHtml } from "@apps-sdk/widget-runtime";
import fs from "fs/promises";
import path from "path";

const isDev = process.env.NODE_ENV !== "production";

// Base URL for dev widget assets (from labs/apps-sdk dev server)
const devWidgetOrigin =
  process.env.DEV_WIDGET_BASE_URL ?? "https://apps-sdk-dev-3.tunnelto.dev";

/**
 * Load widget asset (JS + CSS) from built files
 * Each widget is built as assets/${widgetName}.js and assets/${widgetName}.css
 */
async function loadWidgetAsset(widgetName: string): Promise<WidgetAsset> {
  const distRoot = path.join(process.cwd(), ".widget-assets");

  // Load JS (required)
  const jsPath = path.join(distRoot, "assets", `${widgetName}.js`);
  const js = await fs.readFile(jsPath, "utf-8");

  // Load CSS (optional, but should exist for all widgets)
  let css: string | undefined;
  try {
    const cssPath = path.join(distRoot, "assets", `${widgetName}.css`);
    css = await fs.readFile(cssPath, "utf-8");
  } catch (_err) {
    // CSS file not found - that's okay
    console.warn(`CSS not found for widget: ${widgetName}`);
  }

  return { js, css };
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
  const asset = await loadWidgetAsset(widgetName);
  return renderWidgetHtml(widgetName, asset);
}
