# Apps SDK

ChatGPT Widget 開発用の実験的なSDKプロジェクト。Hono + MCP + Vite で構築されたウィジェットフレームワーク。

## 特徴

- **MCP Server統合**: Model Context Protocol を使用してChatGPTにウィジェットを配信
- **Hono JSX**: Reactを使わず軽量なHono JSXでウィジェットを構築
- **HMR開発環境**: Vite + tunnelto でChatGPT内のウィジェットをリアルタイム更新
- **マルチウィジェット対応**: `src/widgets/*` にウィジェットを追加するだけで自動認識
- **Tailwind CSS 4.x**: 最新のTailwind CSSをサポート

## アーキテクチャ解説

### 全体の仕組み

このプロジェクトは、**ChatGPT内でインタラクティブなウィジェットをHMRで開発できる**という一見不可能に見えることを実現しています。以下がその仕組みです。

#### 1. デュアルビルドシステム

Viteの設定で2つのモードを切り替え可能:

```typescript
// vite.config.ts
export default defineConfig(({ mode }) => {
  const isClientMode = mode === "client";

  if (isClientMode) {
    // ウィジェットJSのみをIIFE形式でビルド (本番用)
    return { plugins: [...], build: { format: "iife" } };
  }

  // 開発モード: Honoサーバー + Vite dev server が共存
  return { plugins: [devServer(), multiWidgetDevEndpoints()] };
});
```

**開発時の動作:**

- Vite dev server (port 5173) が起動
- `/mcp` エンドポイント → Honoサーバーが処理 (MCP protocol)
- その他のリクエスト (`.js`, `.css`, `.html`) → Vite dev serverが処理 (HMR対応)

#### 2. MCP経由でのウィジェット配信

```typescript
// src/server/app.ts
server.registerResource(
  "task-list-widget",
  "ui://widget/task-list.html",
  async (uri) => ({
    contents: [
      {
        mimeType: "text/html+skybridge",
        text: await renderWidget("tasks"),
        _meta: {
          "openai/widgetCSP": {
            connect_domains: ["https://chatgpt.com", devWidgetOrigin],
            resource_domains: ["https://*.oaistatic.com", devWidgetOrigin],
          },
        },
      },
    ],
  }),
);
```

**ポイント:**

- `ui://widget/task-list.html` という仮想URIでウィジェットを登録
- ChatGPTがMCP経由でこのHTMLを取得
- HTMLには `<script src="/tasks.js">` が含まれる (相対パス)

#### 3. tunnelto によるローカル公開

```bash
tunnelto --subdomain apps-sdk-dev-3 --port 5173
```

これにより:

- `https://apps-sdk-dev-3.tunnelto.dev` → `localhost:5173` にトンネル
- ChatGPTからローカルのVite dev serverに直接アクセス可能

#### 4. HMRが動作する理由

**通常の問題:**
ChatGPTは外部ドメインで動作するため、ローカル開発サーバーのHMRは動かない

**この実装の解決策:**

1. **CSPで開発用ドメインを許可**

   ```typescript
   "openai/widgetCSP": {
     connect_domains: [devWidgetOrigin],  // WebSocket接続許可
     resource_domains: [devWidgetOrigin],  // JS/CSS読み込み許可
   }
   ```

2. **Vite dev serverへの直接接続**
   - ウィジェットHTMLの `<script src="/tasks.js">` は相対パス
   - ChatGPTがこれを読み込む際、`https://apps-sdk-dev-3.tunnelto.dev/tasks.js` に解決
   - Vite dev serverがこのリクエストを処理し、HMR用のWebSocketも確立

3. **仮想モジュールシステム**

   ```typescript
   // vite-plugin-multi-widget.ts
   resolveId(id) {
     if (id === "/tasks.js") {
       return "\0multi-widget:entry:tasks";
     }
   }

   load(id) {
     if (id === "\0multi-widget:entry:tasks") {
       return `import "/absolute/path/to/src/widgets/tasks/index.tsx";`;
     }
   }
   ```

**結果:**

- ファイル変更 → Vite がHMR更新を検知
- WebSocket経由でChatGPT内のウィジェットに通知
- ウィジェットが自動リロード

#### 5. CORS/セキュリティ設定

開発環境での安全な通信を確保:

```typescript
// vite.config.ts
server: {
  cors: {
    origin: [
      "https://chatgpt.com",              // ChatGPTメインドメイン
      "https://*.oaiusercontent.com",     // サンドボックス
      devWidgetBase,                       // 開発用トンネル
    ]
  },
  allowedHosts: [".oaiusercontent.com", devWidgetHost]
}
```

### データフロー図

```
┌─────────────────────────────────────────────────────────────┐
│ ChatGPT (https://chatgpt.com)                               │
│                                                             │
│  1. User: "Show task list"                                 │
│     ↓                                                       │
│  2. MCP Request: ui://widget/task-list.html                │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ↓ HTTPS (tunnel)
┌─────────────────────────────────────────────────────────────┐
│ https://apps-sdk-dev-3.tunnelto.dev                        │
│ (tunnelto → localhost:5173)                                 │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ localhost:5173 (Vite dev server + Hono)                     │
│                                                             │
│  /mcp         → Hono (MCP Server)                          │
│  /tasks.js    → Vite (HMR enabled)                         │
│  /tasks.html  → multiWidgetDevEndpoints plugin             │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. MCP Server returns HTML:                                 │
│    <script src="/tasks.js"></script>                        │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ ChatGPT renders widget                                      │
│  ↓                                                          │
│ 4. Browser requests /tasks.js                               │
│  ↓                                                          │
│ 5. Vite serves transformed JS + establishes HMR WebSocket   │
│  ↓                                                          │
│ 6. File change detected → HMR update → Widget refreshes    │
└─────────────────────────────────────────────────────────────┘
```

### なぜこれが凄いのか

1. **本番環境とほぼ同じ環境で開発**
   - ChatGPTの実際のサンドボックス内で動作確認
   - CSP、iframe制約などを考慮した開発が可能

2. **爆速フィードバックループ**
   - コード変更 → 即座にChatGPT内で反映
   - ビルド不要、ブラウザリロード不要

3. **複数人での同時開発**
   - 各開発者が独自のトンネルサブドメインを使用可能
   - 環境変数 `DEV_WIDGET_BASE_URL` で切り替え

## 技術スタック

- **Runtime**: Hono (サーバー + ウィジェット)
- **Build**: Vite (Rolldown版)
- **MCP**: @hono/mcp + @modelcontextprotocol/sdk
- **Styling**: Tailwind CSS 4.x
- **Language**: TypeScript

## プロジェクト構成

```
src/
├── server/              # MCP Server
│   ├── app.ts          # Hono app + MCP endpoints
│   ├── assets.ts       # Production asset loader
│   └── widget.tsx      # Widget HTML shell
├── widgets/            # ウィジェット
│   └── tasks/          # タスク管理ウィジェット
│       ├── index.tsx   # エントリーポイント
│       ├── controller.tsx
│       ├── components/
│       └── lib/
├── types.ts            # 共有型定義
└── globals.css         # グローバルCSS

vite-plugin-multi-widget.ts  # カスタムViteプラグイン
vite.config.ts               # デュアルモードVite設定
```

## セットアップ

```bash
# 依存関係インストール
pnpm install

# 開発サーバー起動
pnpm dev
```

## 開発ワークフロー

### 1. ローカル開発

```bash
# Vite dev server起動 (port 5173)
pnpm dev
```

開発用エンドポイント:

- `http://localhost:5173/` - ウィジェット一覧
- `http://localhost:5173/tasks.html` - タスクウィジェット
- `http://localhost:5173/__inspect/` - Vite plugin inspector
- `http://localhost:5173/mcp` - MCP server endpoint

### 2. Tunnel経由での外部公開

```bash
# 別ターミナルでトンネル起動
pnpm dev:tunnel

# または環境変数でカスタムサブドメイン指定
DEV_WIDGET_BASE_URL=https://your-subdomain.tunnelto.dev pnpm dev
```

### 3. MCP Inspector でテスト

```bash
pnpm dev:inspector
```

ブラウザで `http://localhost:5173/mcp` のMCPサーバーをテスト可能。

### 4. ChatGPTとの接続

1. ChatGPTの設定で以下のMCP serverを追加:

   ```
   https://your-tunnel-url.tunnelto.dev/mcp
   ```

2. ChatGPTで "Show task list" などのプロンプトを実行

3. ウィジェットが表示され、コード変更がHMRで即座に反映される

## ビルド

```bash
# クライアント用ビルド (ウィジェットJSのみ)
pnpm build:client

# フルビルド (クライアント + サーバー)
pnpm build
```

ビルド成果物:

- `dist/assets/*.js` - ウィジェットJS (IIFE形式)
- `dist/manifest.json` - アセットマニフェスト

## 環境変数

| 変数名                | デフォルト                            | 説明                          |
| --------------------- | ------------------------------------- | ----------------------------- |
| `DEV_WIDGET_BASE_URL` | `https://apps-sdk-dev-3.tunnelto.dev` | 開発用ウィジェットのベースURL |
| `NODE_ENV`            | -                                     | `production` で本番ビルド     |

## Vite設定の特徴

### デュアルモード

```bash
# Client mode: ウィジェットJSのみビルド
vite build --mode client

# Server mode (default): Hono server + ウィジェット開発サーバー
vite build
```

### プラグイン構成

1. **vite-plugin-inspect**: Viteプラグインのデバッグ
2. **@hono/vite-dev-server**: HonoサーバーをVite dev serverで動かす
3. **vite-plugin-multi-widget**: マルチウィジェット対応
4. **@tailwindcss/vite**: Tailwind CSS 4.x統合

### CORS設定

開発環境では以下のオリジンを許可:

- `https://chatgpt.com`
- `https://*.oaiusercontent.com`
- `DEV_WIDGET_BASE_URL`

## ウィジェットの追加

1. `src/widgets/your-widget/index.tsx` を作成
2. `fast-glob` が自動検出してViteエントリーポイントに追加
3. `http://localhost:5173/your-widget.html` でアクセス可能

例:

```tsx
// src/widgets/hello/index.tsx
import { render } from "hono/jsx/dom";

const App = () => <h1>Hello Widget!</h1>;

const root = document.getElementById("hello-root");
if (root) {
  render(<App />, root);
}
```

## トラブルシューティング

### HMRが動かない

- tunneltoが起動しているか確認
- `DEV_WIDGET_BASE_URL` がtunneltoのURLと一致しているか確認
- ブラウザコンソールでCSPエラーが出ていないか確認

### MCPサーバーに接続できない

- `/mcp` エンドポイントが起動しているか確認: `curl http://localhost:5173/mcp`
- MCP Inspectorでテスト: `pnpm dev:inspector`

### ポート5173が使用中

`vite.config.ts` の `strictPort: true` により、ポート衝突時はエラーになります。他のプロセスを停止してください。

## 今後の拡張予定

- [ ] 本番環境デプロイ対応 (Cloudflare Workers等)
- [ ] 複数ウィジェット間の状態共有
- [ ] ウィジェットテスト環境
- [ ] ビルド最適化 (コード分割、Tree shaking)

## ライセンス

MIT
