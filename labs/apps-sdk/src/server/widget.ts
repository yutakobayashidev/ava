import type { AssetMap } from "./assets.js";

/**
 * Renders the HTML shell for a widget with inlined JS and CSS
 * Always inlines the bundled assets
 * @param assets - The asset map containing all widget assets
 * @param widgetName - The name of the widget to render (e.g., "todo")
 */
export function renderWidgetHtml(assets: AssetMap, widgetName: string): string {
  const widgetAsset = assets[widgetName];
  if (!widgetAsset) {
    throw new Error(
      `Widget "${widgetName}" assets not found. Available: ${Object.keys(assets).join(", ")}`,
    );
  }

  // Always inline the JS content
  const scriptTag = `<script>${widgetAsset.js}</script>`;

  // Inline CSS if it exists
  const styleTag = widgetAsset.css ? `<style>${widgetAsset.css}</style>` : "";

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${widgetName.charAt(0).toUpperCase() + widgetName.slice(1)} Widget</title>
    ${styleTag}
  </head>
  <body>
    <div id="${widgetName}-root"></div>
    ${scriptTag}
  </body>
</html>
`;
}
