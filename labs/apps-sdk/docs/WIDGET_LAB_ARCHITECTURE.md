# Widget Lab - アーキテクチャ設計

パッケージベースのモノレポ構成による ChatGPT Widget 開発フレームワーク

## ディレクトリ構成

```
widget-lab/
├── packages/                       # 再利用可能なパッケージ
│   ├── core/                      # 共通型・ユーティリティ・Widget runtime
│   ├── playground/                # Widget Playground (Storybook的UI)
│   ├── testing/                   # window.openai mock + Test helpers
│   ├── mcp-client/                # MCP クライアント (SDK)
│   ├── mcp-server/                # MCP server toolkit (Honoベース)
│   ├── vite-plugin-widgets/       # マルチWidget + HMR + Live Mode plugin
│   ├── vite-plugin-playground/    # Playground用Viteプラグイン
│   └── cli/                       # widget-lab CLI (init, dev, build, test)
│
├── apps/                          # アプリケーション
│   ├── example-widgets/           # 実例ウィジェットプロジェクト
│   │   ├── src/widgets/...        # widgets
│   │   ├── widget.config.ts       # widget-lab設定
│   │   ├── playground.config.ts   # playground設定
│   │   ├── mcp.config.ts          # MCPサーバ設定
│   │   └── vite.config.ts         # dev/buildの統合設定
│   │
│   └── docs/                      # ドキュメンテーションサイト
│
├── scripts/                       # CI, deploy, repo scripts
├── tsconfig.base.json
├── package.json
└── pnpm-workspace.yaml
```

---

## パッケージ詳細

### `packages/core/`

**役割:** Widget Lab の中核となる型定義・ユーティリティ・ランタイム

```
packages/core/
├── src/
│   ├── types/
│   │   ├── widget.ts              # Widget型定義
│   │   ├── openai.ts              # OpenAI Widget API型定義
│   │   ├── mcp.ts                 # MCP Protocol型定義
│   │   └── story.ts               # Story型定義
│   │
│   ├── runtime/
│   │   ├── widget-loader.ts       # Widget動的ロード
│   │   ├── global-injector.ts     # window.openai注入
│   │   └── event-bus.ts           # Widget間通信
│   │
│   └── utils/
│       ├── deep-merge.ts
│       ├── validate-story.ts
│       └── serialize-openai.ts
│
├── package.json
└── tsconfig.json
```

**主要エクスポート:**

```typescript
// 型定義
export type {
  Widget,
  WidgetProps,
  WidgetStory,
  OpenAiGlobals,
  MCPResource,
  MCPTool,
};

// ランタイム
export { loadWidget, injectGlobals, createEventBus };

// ユーティリティ
export { deepMerge, validateStory, serializeOpenAI };
```

**依存パッケージ:** なし（純粋な型とユーティリティ）

---

### `packages/playground/`

**役割:** Storybook風のPlayground UI

```
packages/playground/
├── src/
│   ├── ui/
│   │   ├── App.tsx                # メインアプリ
│   │   ├── Sidebar.tsx            # Story一覧
│   │   ├── Canvas.tsx             # ウィジェットプレビュー
│   │   ├── WidgetFrame.tsx        # iframe wrapper
│   │   ├── Controls.tsx           # インタラクティブコントロール
│   │   ├── Toolbar.tsx            # テーマ・デバイス切り替え
│   │   └── CodePanel.tsx          # Story code表示
│   │
│   ├── state/
│   │   ├── story-store.ts         # Story state管理
│   │   ├── viewport-store.ts      # Viewport state
│   │   └── theme-store.ts         # Theme state
│   │
│   ├── hooks/
│   │   ├── use-stories.ts
│   │   ├── use-viewport.ts
│   │   └── use-mcp-live.ts        # MCP Live接続
│   │
│   └── index.tsx                  # Entry point
│
├── public/
│   └── playground.html            # Playground HTML template
│
├── package.json
└── tsconfig.json
```

**主要機能:**

- Story一覧表示
- ウィジェットプレビュー (iframe分離)
- テーマ・デバイス・SafeArea切り替え
- インタラクティブコントロール
- MCP Live接続
- URL直リンク

**依存パッケージ:**

- `@widget-lab/core`
- `@widget-lab/testing` (mock globals)
- `hono` (JSX)

---

### `packages/testing/`

**役割:** window.openai モック + テストヘルパー

```
packages/testing/
├── src/
│   ├── mocks/
│   │   ├── create-mock-openai.ts  # window.openai モック生成
│   │   ├── mock-tool-output.ts    # toolOutput モック
│   │   └── mock-widget-state.ts   # widgetState モック
│   │
│   ├── helpers/
│   │   ├── render-widget.ts       # Widget テストレンダリング
│   │   ├── user-event.ts          # ユーザーイベントシミュレーション
│   │   └── find-by.ts             # 要素検索ヘルパー
│   │
│   ├── matchers/
│   │   ├── to-have-rendered.ts    # カスタムマッチャー
│   │   └── to-have-called-tool.ts
│   │
│   └── index.ts
│
├── package.json
└── tsconfig.json
```

**使用例:**

```typescript
import { createMockOpenAI, renderWidget } from "@widget-lab/testing";

describe("TaskWidget", () => {
  it("should render empty state", async () => {
    const mockOpenAI = createMockOpenAI({
      toolOutput: { structuredContent: { tasks: [], total: 0 } },
    });

    const { canvas } = renderWidget("tasks", { globals: mockOpenAI });

    expect(await canvas.findByText("No tasks found")).toBeInTheDocument();
  });
});
```

**依存パッケージ:**

- `@widget-lab/core`

---

### `packages/mcp-client/`

**役割:** MCP クライアント SDK

```
packages/mcp-client/
├── src/
│   ├── client.ts                  # MCP Client class
│   ├── transport/
│   │   ├── http.ts                # HTTP transport
│   │   ├── sse.ts                 # SSE transport
│   │   └── websocket.ts           # WebSocket transport
│   │
│   ├── types.ts                   # MCP Protocol types
│   └── index.ts
│
├── package.json
└── tsconfig.json
```

**使用例:**

```typescript
import { MCPClient } from "@widget-lab/mcp-client";

const client = new MCPClient({
  transport: "http",
  url: "http://localhost:5173/mcp",
});

// List resources
const resources = await client.listResources();

// Call tool
const result = await client.callTool("task-list", {});
```

**依存パッケージ:**

- `@modelcontextprotocol/sdk`
- `@widget-lab/core`

---

### `packages/mcp-server/`

**役割:** MCP server toolkit (Honoベース)

```
packages/mcp-server/
├── src/
│   ├── server.ts                  # MCP Server wrapper
│   ├── resource-registry.ts       # Resource登録管理
│   ├── tool-registry.ts           # Tool登録管理
│   ├── widget-renderer.ts         # Widget HTML生成
│   ├── middleware/
│   │   ├── cors.ts
│   │   └── auth.ts
│   │
│   └── index.ts
│
├── package.json
└── tsconfig.json
```

**使用例:**

```typescript
import { createMCPServer } from "@widget-lab/mcp-server";

const server = createMCPServer({
  name: "my-widget-server",
  version: "1.0.0",
});

// Register widget
server.registerWidget("tasks", {
  title: "Task List Widget",
  render: async () => renderTaskWidget(),
});

// Register tool
server.registerTool("get-tasks", async () => {
  return { tasks: await fetchTasks() };
});

export default server.app; // Hono app
```

**依存パッケージ:**

- `@hono/mcp`
- `@modelcontextprotocol/sdk`
- `hono`
- `@widget-lab/core`

---

### `packages/vite-plugin-widgets/`

**役割:** マルチWidget + HMR + Live Mode plugin

```
packages/vite-plugin-widgets/
├── src/
│   ├── index.ts                   # Plugin entry
│   ├── widget-collector.ts        # src/widgets/* 自動検出
│   ├── virtual-modules.ts         # 仮想モジュールシステム
│   ├── dev-endpoints.ts           # /tasks.html 配信
│   ├── hmr-handler.ts             # HMR処理
│   └── types.ts
│
├── package.json
└── tsconfig.json
```

**使用例:**

```typescript
// vite.config.ts
import { widgetPlugin } from "@widget-lab/vite-plugin-widgets";

export default defineConfig({
  plugins: [
    widgetPlugin({
      widgetsDir: "src/widgets",
      devWidgetBase: process.env.DEV_WIDGET_BASE_URL,
    }),
  ],
});
```

**依存パッケージ:**

- `vite`
- `fast-glob`
- `@widget-lab/core`

---

### `packages/vite-plugin-playground/`

**役割:** Playground用Viteプラグイン

```
packages/vite-plugin-playground/
├── src/
│   ├── index.ts                   # Plugin entry
│   ├── story-collector.ts         # *.stories.tsx 収集
│   ├── api-routes.ts              # /__playground/api/* 配信
│   ├── ui-server.ts               # /__playground/ UI配信
│   └── types.ts
│
├── package.json
└── tsconfig.json
```

**使用例:**

```typescript
// vite.config.ts
import { playgroundPlugin } from "@widget-lab/vite-plugin-playground";

export default defineConfig({
  plugins: [
    playgroundPlugin({
      storiesPattern: "src/widgets/**/*.stories.tsx",
      mcpEndpoint: "http://localhost:5173/mcp",
    }),
  ],
});
```

**依存パッケージ:**

- `vite`
- `fast-glob`
- `@widget-lab/core`
- `@widget-lab/playground` (UI)
- `@widget-lab/testing` (mock)

---

### `packages/cli/`

**役割:** widget-lab CLI (init, dev, build, test)

```
packages/cli/
├── src/
│   ├── index.ts                   # CLI entry
│   ├── commands/
│   │   ├── init.ts                # プロジェクト初期化
│   │   ├── dev.ts                 # 開発サーバー起動
│   │   ├── build.ts               # ビルド
│   │   ├── test.ts                # テスト実行
│   │   └── playground.ts          # Playground起動
│   │
│   ├── templates/
│   │   ├── widget.tsx.hbs         # Widget template
│   │   ├── story.tsx.hbs          # Story template
│   │   └── mcp.ts.hbs             # MCP server template
│   │
│   └── utils/
│       ├── logger.ts
│       └── config-loader.ts
│
├── bin/
│   └── widget-lab.js              # CLI executable
│
├── package.json
└── tsconfig.json
```

**使用例:**

```bash
# プロジェクト初期化
npx @widget-lab/cli init my-widgets

# 開発サーバー起動
widget-lab dev

# Playground起動
widget-lab playground

# ビルド
widget-lab build

# テスト
widget-lab test
```

**依存パッケージ:**

- `commander`
- `inquirer`
- `vite`
- すべての `@widget-lab/*` パッケージ

---

## アプリケーション

### `apps/example-widgets/`

**役割:** 実例ウィジェットプロジェクト

```
apps/example-widgets/
├── src/
│   ├── widgets/
│   │   ├── tasks/
│   │   │   ├── index.tsx          # Task widget
│   │   │   ├── controller.tsx
│   │   │   ├── components/
│   │   │   └── tasks.stories.tsx
│   │   │
│   │   └── hello/
│   │       ├── index.tsx
│   │       └── hello.stories.tsx
│   │
│   ├── server/
│   │   └── mcp.ts                 # MCP server
│   │
│   └── types.ts                   # 共有型
│
├── widget.config.ts               # Widget Lab設定
├── playground.config.ts           # Playground設定
├── mcp.config.ts                  # MCP server設定
├── vite.config.ts                 # Vite設定
├── package.json
└── tsconfig.json
```

**設定ファイル例:**

```typescript
// widget.config.ts
import { defineConfig } from "@widget-lab/core";

export default defineConfig({
  widgetsDir: "src/widgets",
  outDir: "dist",
  devWidgetBase: process.env.DEV_WIDGET_BASE_URL,
});

// playground.config.ts
import { defineConfig } from "@widget-lab/playground";

export default defineConfig({
  storiesPattern: "src/widgets/**/*.stories.tsx",
  mcpEndpoint: "http://localhost:5173/mcp",
  theme: {
    brandColor: "#4F46E5",
  },
});

// mcp.config.ts
import { defineConfig } from "@widget-lab/mcp-server";

export default defineConfig({
  name: "example-widgets",
  version: "1.0.0",
  widgets: ["tasks", "hello"],
});

// vite.config.ts
import { defineConfig } from "vite";
import { widgetPlugin } from "@widget-lab/vite-plugin-widgets";
import { playgroundPlugin } from "@widget-lab/vite-plugin-playground";

export default defineConfig({
  plugins: [widgetPlugin(), playgroundPlugin()],
});
```

---

### `apps/docs/`

**役割:** ドキュメンテーションサイト

```
apps/docs/
├── src/
│   ├── pages/
│   │   ├── index.md
│   │   ├── getting-started.md
│   │   ├── concepts/
│   │   ├── guides/
│   │   └── api/
│   │
│   └── components/
│       ├── CodeBlock.tsx
│       └── InteractiveDemo.tsx
│
├── package.json
└── vite.config.ts (or nextra/vitepress)
```

**技術スタック候補:**

- VitePress
- Nextra (Next.js)
- Docusaurus

---

## 依存関係グラフ

```
cli
 ├─→ core
 ├─→ playground
 ├─→ testing
 ├─→ mcp-client
 ├─→ mcp-server
 ├─→ vite-plugin-widgets
 └─→ vite-plugin-playground

vite-plugin-playground
 ├─→ core
 ├─→ playground
 └─→ testing

vite-plugin-widgets
 └─→ core

playground
 ├─→ core
 └─→ testing

mcp-server
 └─→ core

mcp-client
 └─→ core

testing
 └─→ core

core
 └─→ (no dependencies)
```

---

## ビルド・開発フロー

### 開発時

```bash
# Root でモノレポ全体のインストール
pnpm install

# すべてのパッケージをウォッチビルド
pnpm -r --parallel dev

# example-widgets で開発
cd apps/example-widgets
pnpm dev                    # Live Mode
pnpm playground             # Playground Mode
```

### ビルド時

```bash
# すべてのパッケージをビルド
pnpm -r build

# 依存順序に従ってビルド
pnpm -r --workspace-concurrency=1 build
```

### テスト時

```bash
# すべてのパッケージをテスト
pnpm -r test

# 特定のパッケージをテスト
pnpm --filter @widget-lab/core test
```

---

## バージョニング戦略

### モノレポ全体

- すべてのパッケージを同じバージョンで管理
- Changesets を使用してリリース管理

```bash
# 変更を記録
pnpm changeset

# バージョンアップ
pnpm changeset version

# パブリッシュ
pnpm changeset publish
```

### パッケージ独立バージョン

- 各パッケージが独立したバージョンを持つ
- 破壊的変更時のみメジャーバージョンアップ

---

## パブリッシュ戦略

### npmパッケージとして公開

```json
// package.json
{
  "name": "@widget-lab/core",
  "version": "1.0.0",
  "publishConfig": {
    "access": "public"
  }
}
```

### スコープ

- `@widget-lab/core`
- `@widget-lab/playground`
- `@widget-lab/testing`
- `@widget-lab/mcp-client`
- `@widget-lab/mcp-server`
- `@widget-lab/vite-plugin-widgets`
- `@widget-lab/vite-plugin-playground`
- `@widget-lab/cli`

---

## CI/CD

### GitHub Actions

```yaml
name: CI

on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4

      - name: Install
        run: pnpm install

      - name: Build
        run: pnpm -r build

      - name: Test
        run: pnpm -r test

      - name: Lint
        run: pnpm -r lint

  publish:
    needs: build
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - name: Publish to npm
        run: pnpm changeset publish
```

---

## まとめ

### アーキテクチャの特徴

1. **モノレポ構成**
   - パッケージ間の依存関係が明確
   - コードの再利用性が高い

2. **レイヤー分離**
   - `core`: 型・ユーティリティ
   - `playground`, `testing`: UI・テスト
   - `mcp-*`: MCP関連
   - `vite-plugin-*`: Vite統合
   - `cli`: ユーザーインターフェース

3. **プラグインアーキテクチャ**
   - Viteプラグインで機能拡張
   - 最小限の設定で動作

4. **型安全**
   - すべてのパッケージがTypeScript
   - 共通の型定義を `@widget-lab/core` で管理

5. **拡張可能**
   - 新しいウィジェット・プラグインを簡単に追加
   - カスタムコントロール・マッチャーの追加が可能

---

**Widget Lab = モノレポベースのフルスタック ChatGPT Widget 開発フレームワーク**
