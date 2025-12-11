import { raw } from "hono/html";
import { renderToString } from "hono/jsx/dom/server";

import type { WidgetAsset } from "./assets.js";

const WidgetShell = ({
  widgetName,
  css,
  inlineJs,
  scriptSrc,
}: {
  widgetName: string;
  css?: string;
  inlineJs?: string;
  scriptSrc?: string;
}) => {
  if (!inlineJs && !scriptSrc) {
    throw new Error(`No script provided for widget "${widgetName}"`);
  }

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
        {inlineJs ? <script>{raw(inlineJs)}</script> : null}
        {scriptSrc ? <script type="module" src={scriptSrc}></script> : null}
      </body>
    </html>
  );
};

// Renders the HTML shell for a widget using either inline JS (prod) or a dev server script
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
