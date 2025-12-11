import { raw } from "hono/html";
import { renderToString } from "hono/jsx/dom/server";

import type { AssetMap } from "./assets.js";

const WidgetShell = ({
  widgetName,
  css,
  js,
}: {
  widgetName: string;
  css?: string;
  js: string;
}) => {
  const title = widgetName.charAt(0).toUpperCase() + widgetName.slice(1);
  return (
    <html lang="ja">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title} Widget</title>
        {css ? <style>{raw(css)}</style> : null}
      </head>
      <body>
        <div id={`${widgetName}-root`}></div>
        <script>{raw(js)}</script>
      </body>
    </html>
  );
};

/**
 * Renders the HTML shell for a widget with inlined JS and CSS
 * Always inlines the bundled assets
 * @param assets - The asset map containing all widget assets
 * @param widgetName - The name of the widget to render (e.g., "tasks")
 */
export function renderWidgetHtml(assets: AssetMap, widgetName: string): string {
  const widgetAsset = assets[widgetName];
  if (!widgetAsset) {
    throw new Error(
      `Widget "${widgetName}" assets not found. Available: ${Object.keys(assets).join(", ")}`,
    );
  }

  return renderToString(
    <WidgetShell
      widgetName={widgetName}
      css={widgetAsset.css}
      js={widgetAsset.js}
    />,
  );
}
