import { raw } from "hono/html";
import type { WidgetShellProps } from "./types.js";

/**
 * Widget HTML shell component
 *
 * Renders the basic HTML structure for a widget with optional CSS and JS.
 * Used by MCP server to serve widget HTML.
 */
export const WidgetShell = ({
  widgetName,
  css,
  inlineJs,
  scriptSrc,
}: WidgetShellProps) => {
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
