import fg from "fast-glob";
import path from "node:path";
import type { Plugin } from "vite";

/**
 * Build input entries from widget directories
 * Looks for src/widgets/star/index.tsx (star = *)
 */
export function buildWidgetEntries() {
  const files = fg.sync("src/widgets/*/index.tsx", { dot: false });
  return Object.fromEntries(
    files.map((f) => [path.basename(path.dirname(f)), path.resolve(f)]),
  );
}

export interface MultiWidgetOptions {
  entries: Record<string, string>;
}

/**
 * Vite plugin for managing multiple widget entries in development mode
 */
export function multiWidgetDevEndpoints(options: MultiWidgetOptions): Plugin {
  const { entries } = options;

  const V_PREFIX = "\0multi-widget:"; // Rollup virtual module prefix

  const renderIndexHtml = (names: string[]): string => `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Widgets</title>
</head>
<body>
  <h1>Widgets</h1>
  <ul>
    ${names
      .toSorted()
      .map((name) => `<li><a href="/${name}.html">${name}</a></li>`)
      .join("\n    ")}
  </ul>
</body>
</html>`;

  const renderWidgetHtml = (name: string): string => `<!doctype html>
  <html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${name} Widget - Development</title>
    <script type="module" src="/${name}.js"></script>
  </head>
  <body>
    <div id="${name}-root"></div>
  </body>
  </html>`;

  return {
    name: "multi-widget-dev-endpoints",
    configureServer(server) {
      const names = Object.keys(entries);
      const list = names.map((n) => `/${n}.html`).join(", ");
      server.config.logger.info(`\nWidget dev endpoints: ${list}\n`);

      server.middlewares.use((req, res, next) => {
        const run = async () => {
          if (req.method !== "GET" || !req.url) return next();
          const url = req.url.split("?")[0];
          // Index page
          if (url === "/" || url === "" || url === "/index.html") {
            const html = renderIndexHtml(names);
            res.setHeader("Content-Type", "text/html; charset=utf-8");
            res.end(html);
            return;
          }

          // Widget HTML pages
          if (url.endsWith(".html")) {
            const m = url.match(/^\/?([\w-]+)\.html$/);
            if (m && entries[m[1]]) {
              const html = renderWidgetHtml(m[1]);
              res.setHeader("Content-Type", "text/html; charset=utf-8");
              res.end(html);
              return;
            }
          }

          next();
        };

        run().catch((err) => {
          server.config.logger.error(
            `[multi-widget-dev-endpoints] Failed to serve ${req.url}:`,
            err,
          );
          next(err);
        });
      });
    },
    resolveId(id: string) {
      // Strip leading slash
      if (id.startsWith("/")) id = id.slice(1);

      // Resolve JS entry points
      if (id.endsWith(".js")) {
        const name = id.slice(0, -3);
        if (entries[name]) return `${V_PREFIX}entry:${name}`;
      }

      // Keep our virtual IDs
      if (id.startsWith(V_PREFIX)) return id;

      return null;
    },
    load(id: string) {
      if (!id.startsWith(V_PREFIX)) return null;

      const rest = id.slice(V_PREFIX.length); // "entry:foo"
      const [kind, name] = rest.split(":", 2);
      const entry = entries[name];
      if (!entry) return null;

      if (kind === "entry") {
        // Generate virtual JS entry - just import the entry point directly
        return `import ${JSON.stringify(entry)};`;
      }

      return null;
    },
  };
}
