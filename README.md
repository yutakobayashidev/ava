# Ava

コーディング中の進捗を MCP 経由で Slack に自動連携する Next.js アプリ。
Slack ログイン → ワークスペース連携 → MCP 接続までワンストップで用意されています。

## できること

- Slack サインイン（OpenID Connect）とワークスペースへのボットインストール
- MCP HTTP サーバ `/mcp` でタスク開始/更新/詰まり/完了/一覧を扱い、Slack スレッドへ投稿
- オンボーディングで通知チャンネル選択と `.mcp.json` 生成
- ダッシュボードでタスク一覧を表示
- Slack slash command `/daily-report` で日次サマリを生成（実行ユーザーのみに表示される ephemeral message）
- OAuth 2.1 + PKCE の認可・トークン・クライアント登録エンドポイントを同居

## 技術スタック

- Next.js 16 (App Router) + Hono（`src/app/[...route]/route.ts` で統合）
- PostgreSQL + Drizzle ORM（`compose.yml` でローカル DB を起動）
- Slack API（OpenID + Bot）、@hono/mcp、OpenAI (daily summary)
- pnpm / TypeScript / Tailwind CSS v4

## 前提

- Node.js 18+（`corepack enable pnpm` 推奨）
- Docker & Docker Compose
- Slack アプリ（OIDC と Bot の両方を有効化）
  - Bot スコープ: `chat:write`, `chat:write.public`, `channels:read`, `groups:read`
  - リダイレクト URI: `https://<BASE>/login/slack/callback`, `https://<BASE>/slack/install/callback`
  - Slash Command: `/daily-report` → Request URL: `https://<BASE>/slack/commands`

## 環境変数例 (`.env`)

```
NEXT_PUBLIC_BASE_URL=https://localhost:3000

DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
DATABASE_DB=ai_task
DATABASE_HOST=127.0.0.1
DATABASE_PORT=5432
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/ai_task

SLACK_APP_CLIENT_ID=xxx
SLACK_APP_CLIENT_SECRET=xxx

OPENAI_API_KEY=sk-... # /daily-report 用。未設定なら日次サマリは失敗します
```

- `NEXT_PUBLIC_BASE_URL` は OAuth メタデータや Slack リダイレクト URL を組み立てるため必須。
- Slack ログイン用のリダイレクト URI も Slack アプリに登録してください（`/login/slack/callback`）。
- Slack ボットインストールのリダイレクト URI は `NEXT_PUBLIC_BASE_URL + /slack/install/callback` を登録してください（環境変数の個別設定は不要）。

## ローカル開発

1. 依存インストール
   `pnpm install`

2. DB を起動 & マイグレーション適用
   `pnpm db:up`
   `pnpm db:migrate`

3. 開発サーバー（自己署名 HTTPS）
   `pnpm dev`
   MCP クライアントが自己署名証明書を信頼しない場合は、クライアント側で証明書を許可するか `NODE_TLS_REJECT_UNAUTHORIZED=0` を付けてください。

4. 片付け
   `pnpm db:down`

便利コマンド: `pnpm db:studio`（Drizzle Studio）、`pnpm lint`、`pnpm typecheck`。

## オンボーディング手順

- `https://localhost:3000/login` で Slack ログイン
- `/slack/install/start` からボットをワークスペースにインストール
- `/onboarding/connect-slack` で通知チャンネルを選択
- `/onboarding/setup-mcp` で生成される設定をプロジェクトの `.mcp.json` に保存
  ```
  {
    "mcpServers": {
      "ava": { "type": "http", "url": "https://localhost:3000/mcp" }
    }
  }
  ```
- MCP 接続の初回はブラウザで OAuth 同意が開きます（Authorization Code + PKCE）

```bash
NODE_TLS_REJECT_UNAUTHORIZED=0 claude
```

## MCP ツール概要

- `start_task`: タスクセッションを作成し Slack に開始を投稿（設定済みの場合）。スレッド情報を保存。
- `update_task`: ステータスを `in_progress` に戻して進捗を保存。未解決の詰まりを解消し、Slack へ投稿。
- `report_blocked`: ステータスを `blocked` にし詰まりを保存。Slack へ投稿。
- `complete_task`: ステータスを `completed` にし完了情報を upsert。Slack へ完了 + PR を投稿。
- `list_tasks`: 認証ユーザーのタスク一覧を返却（`status` で絞り込み可）。

## 日次サマリ

- Slack slash command: `/daily-report`
- 対象: 本日 `completed` になったタスク、および本日更新された `in_progress` / `blocked` タスク
- 振る舞い: OpenAI でまとめを生成し、実行したユーザーのみに表示される ephemeral message で返す
- 必要条件: `OPENAI_API_KEY` と Slack ボットのインストール
