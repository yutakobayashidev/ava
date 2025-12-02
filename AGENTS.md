# AGENTS.md

## 作業の開始時にやること

- ユーザーに新しいタスクを要求されたら、必ずタスクマネージャーであるavaのスキルをロードすること
- issue番号が提示されたらGitHub CLIでそれを参照すること

## Mission

進捗の共有やチームとのコミュニケーションが苦手な人でも、
AI が自動で外部化と情報共有を手伝ってくれる世界をつくる。

- ハイパーフォーカスでも黙り込んでも信頼が落ちない
- プロセスごと公平に評価される
- チームは透明性に支えられる
- マイクロマネジメントが不要になる

---

## 現在の構成

- Next.js 16 + Hono でアプリと API を統合。PostgreSQL は Drizzle で管理。
- Slack OpenID でログイン、別フローでワークスペースにボットをインストールし通知先チャンネルを保存。
- `/mcp` に HTTP で公開する MCP サーバ（`ava-mcp`）。タスク情報は DB に保持し、Slack にはサマリのみ投稿。
- Slack slash command `/daily-report` で本日のタスクを LLM 要約し、実行ユーザーのみに ephemeral message で表示（OPENAI_API_KEY が必要）。

---

## MCP サーバ / 認可

- エンドポイント: `POST/GET /mcp`（Hono でハンドル、HTTP/SSE）。
- 認可: OAuth 2.1 + PKCE。`Authorization: Bearer <access_token>` が必須。
  - 認可エンドポイント: `/oauth/authorize`（Next.js page）
  - トークンエンドポイント: `/api/oauth/token`
  - 動的クライアント登録: `/api/oauth/register`
  - メタデータ: `/.well-known/oauth-authorization-server` / `/.well-known/oauth-protected-resource`
- アクセストークンは DB（`access_tokens`）に保存し、期限切れは拒否。

### ルーティング構成

- `/mcp` - MCP サーバー（Hono、単独ルート）
- `/api/*` - その他の API エンドポイント（Hono、catch-all ルート）
  - `/api/oauth/*` - OAuth 関連
  - `/api/auth/*` - 認証フロー
  - `/api/slack/*` - Slack 連携
  - `/api/health` - ヘルスチェック
- その他 - Next.js App Router（page.tsx、not-found.tsx など）

---

## 利用できる MCP Tools

- `start_task`
  - 入力: `issue.provider ("github" | "manual")`, `issue.id?`, `issue.title`, `initial_summary`
  - 動作: `task_sessions` を作成。Slack 設定済みなら新規スレッドに開始報告を投稿し、スレッド情報を保存。
- `update_task`
  - 入力: `task_session_id`, `summary`, `raw_context?`
  - 動作: ステータスを `in_progress` に戻し、未解決の詰まり・休止を解消。`task_updates` に保存し、Slack スレッドへ進捗を投稿。
- `report_blocked`
  - 入力: `task_session_id`, `reason`, `raw_context?`
  - 動作: ステータスを `blocked` に更新し、`task_block_reports` に保存。Slack スレッドへ詰まりを通知。
- `pause_task`
  - 入力: `task_session_id`, `reason`, `raw_context?`
  - 動作: ステータスを `paused` に更新し、`task_pause_reports` に保存。Slack スレッドへ休止を通知（⏸️）。
- `resume_task`
  - 入力: `task_session_id`, `summary`, `raw_context?`
  - 動作: ステータスを `in_progress` に戻し、休止レポートの `resumed_at` を更新。Slack スレッドへ再開を通知（▶️）。
- `complete_task`
  - 入力: `task_session_id`, `summary`
  - 動作: ステータスを `completed` にして完了情報を upsert（`task_completions`）。Slack スレッドへ完了を投稿。
- `list_tasks`
  - 入力: `status?` (`in_progress` | `blocked` | `paused` | `completed`), `limit?`
  - 動作: 認証ユーザーのタスク一覧を返す（更新日時降順）。

メモ: Slack 未設定時は `delivered: false` を返すだけで DB への書き込みは継続。`raw_context` は DB 保管のみで Slack には送らない。

---

## Slack 連携

**認証とインストール:**

- ユーザーログイン: `/api/auth/slack` で Slack OpenID Connect 認証。ユーザーを作成しセッション Cookie を発行。
- ボットインストール: ダッシュボードまたは `/slack/install/start` から開始 → Slack OAuth（スコープ: `chat:write`, `chat:write.public`, `channels:read`, `groups:read`, `commands`）
- リダイレクト URI: `NEXT_PUBLIC_BASE_URL + /api/slack/install/callback`（env の個別設定は不要）

**コマンド:**

- `/daily-report` → Request URL: `NEXT_PUBLIC_BASE_URL + /api/slack/commands`

**通知:**

- 通知先チャンネル: `/onboarding/connect-slack` で選択し、`workspaces.notification_channel_id` に保存
- 投稿内容: 開始/進捗/詰まり/休止/再開/完了をチャンネルの同一スレッドに投稿
- セキュリティ: コード断片や機密情報は投稿せず、抽象的なサマリのみを送信

---

## データとセキュリティ

- 保持するデータ: ワークスペース資格情報 (`workspaces`)、タスクセッション/更新/詰まり/休止/完了 (`task_*`)、OAuth クライアント・トークン (`clients`, `auth_codes`, `access_tokens`)、ユーザーセッション (`sessions`)。
- クラウドや Slack へ送信 **禁止**:
  - コード全文 / リポジトリの機密
  - 秘密鍵・トークン・環境変数の値
  - 生のエラーログ
- 送信 **許可 / 推奨**:
  - 抽象的な進捗サマリ
  - 詰まり・休止の要約
  - 完了サマリと PR URL

---

## 開発メモ

- MCP クライアント設定例（ローカル）: `.mcp.json` に `{ "mcpServers": { "ava": { "type": "http", "url": "https://localhost:3000/mcp" } } }` を置く。初回接続時に OAuth 同意がブラウザで開く。
- 日次まとめ: Slack で `/daily-report` コマンドを実行すると、本日完了および更新されたタスクを LLM で要約し、実行ユーザーのみに ephemeral message で表示（OPENAI_API_KEY が必要、未設定なら失敗）。

Slack でリアルタイムにスレッド更新が行われます。

---
