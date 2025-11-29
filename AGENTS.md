# AGENTS.md

## 作業の開始後にやること

- 新しいタスクを要求されたら、avaのスキルをロードする
- issueを作成するか尋ねる、または既存のissueがあるかリクエストする

## Mission

報告・連絡・相談が苦手な人でも、
AI が自動で「外部化」を手伝ってくれる世界をつくる。

- ハイパーフォーカスでも黙り込んでも信頼が落ちない
- プロセスごと公平に評価される
- チームは透明性に支えられる
- マイクロマネジメントが不要になる

エンジニアは、コードに集中していい。
報連相は AI に任せよう。

---

## 現在の構成

- Next.js 16 + Hono でアプリと API を統合。PostgreSQL は Drizzle で管理。
- Slack OpenID でログイン、別フローでワークスペースにボットをインストールし通知先チャンネルを保存。
- `/mcp` に HTTP で公開する MCP サーバ（`task-bridge-mcp`）。タスク情報は DB に保持し、Slack にはサマリのみ投稿。
- `/api/daily-summary` で本日完了タスクを LLM 要約し、Slack に日次報告を投稿（OPENAI_API_KEY が必要）。

---

## MCP サーバ / 認可

- エンドポイント: `POST/GET /mcp`（Hono でハンドル、HTTP/SSE）。
- 認可: OAuth 2.1 + PKCE。`Authorization: Bearer <access_token>` が必須。
  - 認可エンドポイント: `/oauth/authorize`
  - トークンエンドポイント: `/api/oauth/token`
  - 動的クライアント登録: `/api/oauth/register`
  - メタデータ: `/.well-known/oauth-authorization-server` / `/.well-known/oauth-protected-resource`
- アクセストークンは DB（`access_tokens`）に保存し、期限切れは拒否。

---

## 利用できる MCP Tools

- `start_task`
  - 入力: `issue.provider ("github" | "manual")`, `issue.id?`, `issue.title`, `initial_summary`
  - 動作: `task_sessions` を作成。Slack 設定済みなら新規スレッドに開始報告を投稿し、スレッド情報を保存。
- `update_task`
  - 入力: `task_session_id`, `summary`, `raw_context?`
  - 動作: ステータスを `in_progress` に戻し、未解決の詰まりを解消。`task_updates` に保存し、Slack スレッドへ進捗を投稿。
- `report_blocked`
  - 入力: `task_session_id`, `reason`, `raw_context?`
  - 動作: ステータスを `blocked` に更新し、`task_block_reports` に保存。Slack スレッドへ詰まりを通知。
- `complete_task`
  - 入力: `task_session_id`, `pr_url`, `summary`
  - 動作: ステータスを `completed` にして完了情報を upsert（`task_completions`）。Slack スレッドへ完了 + PR を投稿。
- `list_tasks`
  - 入力: `status?` (`in_progress` | `blocked` | `completed`), `limit?`
  - 動作: 認証ユーザーのタスク一覧を返す（更新日時降順）。

メモ: Slack 未設定時は `delivered: false` を返すだけで DB への書き込みは継続。`raw_context` は DB 保管のみで Slack には送らない。

---

## Slack 連携

- ログイン: `/login/slack` で OpenID Connect。ユーザーを作成しセッション Cookie を発行。
- ボットインストール: `/slack/install/start` → Slack OAuth（スコープ: `chat:write`, `chat:write.public`, `channels:read`, `groups:read`）。リダイレクト URI は `NEXT_PUBLIC_BASE_URL + /slack/install/callback` を利用（個別の env は不要）。
- 通知先チャンネル: オンボーディング `/onboarding/connect-slack` で選択し、`workspaces.notification_channel_id` に保存。
- 投稿内容: 開始/進捗/詰まり/完了をチャンネルの同一スレッドに流す。コード断片や機密は投稿しない。

---

## データとセキュリティ

- 保持するデータ: ワークスペース資格情報 (`workspaces`)、タスクセッション/更新/詰まり/完了 (`task_*`)、OAuth クライアント・トークン (`clients`, `auth_codes`, `access_tokens`)、ユーザーセッション (`sessions`)。
- クラウドや Slack へ送信 **禁止**:
  - コード全文 / リポジトリの機密
  - 秘密鍵・トークン・環境変数の値
  - 生のエラーログ
- 送信 **許可 / 推奨**:
  - 抽象的な進捗サマリ
  - 詰まりの要約
  - 完了サマリと PR URL

---

## 開発メモ

- MCP クライアント設定例（ローカル）: `.mcp.json` に `{ "mcpServers": { "task": { "type": "http", "url": "https://localhost:3000/mcp" } } }` を置く。初回接続時に OAuth 同意がブラウザで開く。
- 日次まとめ: `POST /api/daily-summary` で本日完了タスクを要約し、通知チャンネルに投稿（OPENAI_API_KEY が必要、未設定なら失敗）。

Slack でリアルタイムにスレッド更新が行われます。

---

## 拡張予定（後方互換）

- Slack → MCP 制御（停止／再開）
- Issue 自動推定
- LLM による進捗要約高度化
- Enterprise 向け監査証跡
- 権限スコープの細分化

---
