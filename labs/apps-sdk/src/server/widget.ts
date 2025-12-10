import type { AssetMap } from "./assets.js";

/**
 * Renders the HTML shell for a widget with proper script tags
 * In dev mode: includes Vite HMR client and direct module import
 * In prod mode: includes bundled JS (with inlined Tailwind CSS)
 */
export function renderWidgetHtml(assets: AssetMap): string {
  const todoAsset = assets.todo;
  if (!todoAsset) {
    throw new Error("Todo widget assets not found");
  }

  const isDev = todoAsset.js.startsWith("http");

  // In development, we need to include the Vite client for HMR
  const viteClient = isDev
    ? `<script type="module" src="${new URL(todoAsset.js).origin}/@vite/client"></script>`
    : "";

  // Script tag: in dev use type="module", in prod use regular script (IIFE bundle)
  // CSS (Tailwind) is automatically included in the JS bundle by @tailwindcss/vite
  const scriptTag = isDev
    ? `<script type="module" src="${todoAsset.js}"></script>`
    : `<script src="${todoAsset.js}"></script>`;

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Task List Widget</title>
    ${viteClient}
  </head>
  <body>
    <div id="root"></div>
    ${scriptTag}
  </body>
</html>
`;
}
