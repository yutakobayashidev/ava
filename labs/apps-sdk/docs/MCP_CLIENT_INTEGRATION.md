# MCP Client Integration - 実装案

`multiWidgetDevEndpoints` が生成する HTML に MCP クライアントを内蔵する方法

## 課題

現状の問題:

- HTML を文字列で書くのは辛い
- React/Hono JSX で書きたい
- Vite の HMR を活かしたい
- `/mcp` 以外のルーティングを壊したくない

## 解決策: 仮想エントリーポイント方式

### アーキテクチャ

```
/__playground/          → Playground React App (仮想エントリー)
/__playground/app.js    → 仮想モジュール → src/playground/main.tsx
/tasks.html             → Widget preview (既存)
/tasks.js               → Widget bundle (既存)
/mcp                    → Hono MCP server (既存)
```

### ディレクトリ構成

```
labs/apps-sdk/
├── src/
│   ├── playground/              # 新規: Playground アプリ
│   │   ├── main.tsx            # エントリーポイント
│   │   ├── App.tsx             # メインアプリ
│   │   ├── components/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── MCPClient.tsx   # MCP クライアント UI
│   │   │   └── WidgetPreview.tsx
│   │   ├── hooks/
│   │   │   └── use-mcp.ts      # MCP 接続フック
│   │   └── styles.css
│   │
│   ├── widgets/                 # 既存
│   └── server/                  # 既存
```

---

## 実装手順

### Step 1: Playground アプリ作成

```tsx
// src/playground/main.tsx
import { render } from "hono/jsx/dom";
import { App } from "./App";
import "./styles.css";

const root = document.getElementById("playground-root");
if (root) {
  render(<App />, root);
}
```

```tsx
// src/playground/App.tsx
import { useState } from "hono/jsx";
import { Sidebar } from "./components/Sidebar";
import { MCPClient } from "./components/MCPClient";
import { WidgetPreview } from "./components/WidgetPreview";

export function App() {
  const [selectedWidget, setSelectedWidget] = useState<string | null>(null);

  return (
    <div class="playground">
      <Sidebar onSelectWidget={setSelectedWidget} />
      <div class="main">
        <MCPClient />
        <WidgetPreview widget={selectedWidget} />
      </div>
    </div>
  );
}
```

```tsx
// src/playground/components/MCPClient.tsx
import { useState } from "hono/jsx";
import { useMCP } from "../hooks/use-mcp";

export function MCPClient() {
  const { connect, disconnect, isConnected, resources, callTool } = useMCP();
  const [url, setUrl] = useState("http://localhost:5173/mcp");

  return (
    <div class="mcp-client">
      <h2>MCP Client</h2>
      <div class="connection">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="MCP Server URL"
        />
        {isConnected ? (
          <button onClick={disconnect}>Disconnect</button>
        ) : (
          <button onClick={() => connect(url)}>Connect</button>
        )}
      </div>

      {isConnected && (
        <div class="resources">
          <h3>Resources</h3>
          <ul>
            {resources.map((r) => (
              <li key={r.uri}>{r.name}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
```

```typescript
// src/playground/hooks/use-mcp.ts
import { useState, useEffect } from "hono/jsx";

export function useMCP() {
  const [isConnected, setIsConnected] = useState(false);
  const [resources, setResources] = useState([]);

  const connect = async (url: string) => {
    try {
      const res = await fetch(`${url}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "resources/list",
          id: 1,
        }),
      });
      const data = await res.json();
      setResources(data.result.resources);
      setIsConnected(true);
    } catch (err) {
      console.error("MCP connection failed:", err);
    }
  };

  const disconnect = () => {
    setIsConnected(false);
    setResources([]);
  };

  const callTool = async (name: string, args: any) => {
    // TODO: implement
  };

  return { connect, disconnect, isConnected, resources, callTool };
}
```

---

### Step 2: vite-plugin-widget 拡張

```typescript
// labs/vite-plugin-widget/src/index.ts

export interface MultiWidgetOptions {
  entries: Record<string, string>;
  playgroundEntry?: string; // 新規オプション
}

export function multiWidgetDevEndpoints(options: MultiWidgetOptions): Plugin {
  const { entries, playgroundEntry } = options;
  const V_PREFIX = "\0multi-widget:";

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
  <hr />
  <p><a href="/__playground/">Open Playground →</a></p>
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

  // 新規: Playground HTML
  const renderPlaygroundHtml = (): string => `<!doctype html>
  <html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Widget Playground</title>
    <script type="module" src="/__playground/app.js"></script>
  </head>
  <body>
    <div id="playground-root"></div>
  </body>
  </html>`;

  return {
    name: "multi-widget-dev-endpoints",

    configureServer(server) {
      const names = Object.keys(entries);
      const list = names.map((n) => `/${n}.html`).join(", ");
      server.config.logger.info(
        `\nWidget dev endpoints: ${list}, /__playground/\n`,
      );

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

          // Playground page (新規)
          if (url === "/__playground/" || url === "/__playground/index.html") {
            const html = renderPlaygroundHtml();
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

      // Playground app.js (新規)
      if (id === "__playground/app.js" && playgroundEntry) {
        return `${V_PREFIX}playground`;
      }

      // Widget entry points
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

      // Playground entry (新規)
      if (id === `${V_PREFIX}playground`) {
        if (!playgroundEntry) return null;
        return `import ${JSON.stringify(playgroundEntry)};`;
      }

      // Widget entry
      const rest = id.slice(V_PREFIX.length); // "entry:foo"
      const [kind, name] = rest.split(":", 2);
      const entry = entries[name];
      if (!entry) return null;

      if (kind === "entry") {
        return `import ${JSON.stringify(entry)};`;
      }

      return null;
    },
  };
}
```

---

### Step 3: apps-sdk の vite.config.ts 更新

```typescript
// labs/apps-sdk/vite.config.ts
import {
  buildWidgetEntries,
  multiWidgetDevEndpoints,
} from "@apps-sdk/vite-plugin-widget";
import path from "node:path";

const widgetEntries = buildWidgetEntries();

export default defineConfig({
  plugins: [
    multiWidgetDevEndpoints({
      entries: widgetEntries,
      playgroundEntry: path.resolve(__dirname, "src/playground/main.tsx"), // 新規
    }),
  ],
});
```

---

## メリット

### ✅ React/Hono JSX で書ける

- HTML 文字列地獄から解放
- コンポーネント分割可能
- TypeScript の型チェック

### ✅ HMR が効く

- Playground の変更が即座に反映
- ウィジェットと同じ開発体験

### ✅ 既存ルーティングを壊さない

- `/mcp` → Hono
- `/tasks.html` → ウィジェット
- `/__playground/` → Playground
- すべて共存可能

### ✅ MCP クライアントを自然に統合

- Playground 内で MCP Server に接続
- リソース一覧表示
- ツール呼び出し
- リアルタイムプレビュー

---

## 発展: Story 対応

```tsx
// src/playground/App.tsx
import { useState, useEffect } from "hono/jsx";
import { Sidebar } from "./components/Sidebar";
import { StoryPreview } from "./components/StoryPreview";

export function App() {
  const [stories, setStories] = useState([]);
  const [selectedStory, setSelectedStory] = useState(null);

  useEffect(() => {
    // Story を API から取得
    fetch("/__playground/api/stories")
      .then((r) => r.json())
      .then(setStories);
  }, []);

  return (
    <div class="playground">
      <Sidebar stories={stories} onSelect={setSelectedStory} />
      <StoryPreview story={selectedStory} />
    </div>
  );
}
```

---

## まとめ

**仮想エントリーポイント方式**により:

1. **HTML 文字列から解放**: React/JSX で書ける
2. **HMR 対応**: 高速イテレーション
3. **ルーティング共存**: 既存機能を壊さない
4. **MCP 統合**: クライアント UI を自然に追加

次のステップ:

1. `src/playground/` ディレクトリ作成
2. vite-plugin-widget にPlayground対応追加
3. MCP Client UI 実装
4. Story 対応

これで **Widget Lab の Playground Mode** の基礎が完成します！
