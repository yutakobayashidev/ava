# Apps SDK

ChatGPT Widget 開発用の実験的なSDKプロジェクト。Hono + MCP + Vite で構築されたウィジェットフレームワーク。

## 特徴

- **MCP Server統合**: Model Context Protocol を使用してChatGPTにウィジェットを配信
- **Hono JSX**: Reactを使わず軽量なHono JSXでウィジェットを構築
- **HMR開発環境**: Vite + tunneltoでChatGPT内のウィジェットをリアルタイム更新
- **マルチウィジェット対応**: `src/widgets/*` にウィジェットを追加するだけで自動認識
- **Tailwind CSS 4.x**: 最新のTailwind CSSをサポート

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
