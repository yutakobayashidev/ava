import { renderToString } from "hono/jsx/dom/server";
import { WidgetShell } from "./widget-shell.js";
import type { WidgetAsset } from "./types.js";

/**
 * Renders the HTML shell for a widget
 *
 * @param widgetName - Name of the widget (e.g., "tasks")
 * @param widgetAsset - Widget asset configuration (CSS, JS, scriptSrc)
 * @returns HTML string
 *
 * @example
 * // Development mode (external script)
 * const html = renderWidgetHtml("tasks", {
 *   scriptSrc: "/tasks.js"
 * });
 *
 * @example
 * // Production mode (inline JS and CSS)
 * const html = renderWidgetHtml("tasks", {
 *   css: "body { margin: 0; }",
 *   js: "console.log('widget loaded');"
 * });
 */
export function renderWidgetHtml(
  widgetName: string,
  widgetAsset: WidgetAsset,
): string {
  if (!widgetAsset) {
    throw new Error(`Widget "${widgetName}" assets not found.`);
  }

  return renderToString(
    <WidgetShell
      widgetName={widgetName}
      css={widgetAsset.css}
      inlineJs={widgetAsset.js}
      scriptSrc={widgetAsset.scriptSrc}
    />,
  );
}
