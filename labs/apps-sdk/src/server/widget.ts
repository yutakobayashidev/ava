import type { AssetMap } from "./assets.js";

/**
 * Renders the HTML shell for a widget with inlined JS and CSS
 * Always inlines the bundled assets
 */
export function renderWidgetHtml(assets: AssetMap): string {
  const todoAsset = assets.todo;
  if (!todoAsset) {
    throw new Error("Todo widget assets not found");
  }

  // Always inline the JS content
  const scriptTag = `<script>${todoAsset.js}</script>`;

  // Inline CSS if it exists
  const styleTag = todoAsset.css ? `<style>${todoAsset.css}</style>` : "";

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Task List Widget</title>
    ${styleTag}
  </head>
  <body>
    <div id="root"></div>
    ${scriptTag}
  </body>
</html>
`;
}
