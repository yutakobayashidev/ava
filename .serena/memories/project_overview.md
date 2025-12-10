# Ava プロジェクト概要

## プロジェクトの目的

進捗の共有やチームとのコミュニケーションが苦手な人でも、AI が自動で外部化と情報共有を手伝ってくれる世界をつくる。

- ハイパーフォーカスでも黙り込んでも信頼が落ちない
- プロセスごと公平に評価される
- チームは透明性に支えられる
- マイクロマネジメントが不要になる

## 技術スタック

- **フレームワーク**: Next.js 16 (App Router), React 19
- **API**: Hono 4.10
- **データベース**: PostgreSQL + Drizzle ORM
- **認証**: Arctic (OAuth 2.1), Slack OpenID Connect
- **MCP**: @hono/mcp, @modelcontextprotocol/sdk
- **AI**: Vercel AI SDK + OpenAI
- **決済**: Stripe
- **Infrastructure**: Terraform
- **Observability**: OpenTelemetry, Axiom
- **UI**: Tailwind CSS v4, Radix UI, shadcn/ui
- **型安全**: TypeScript 5, Zod
- **テスト**: Vitest, Playwright
- **開発ツール**: pnpm, Lefthook, ESLint, Prettier

## プロジェクト構造

Monorepo構成（pnpm workspace）:

```
ava/
├── apps/
│   ├── www/              # Next.js アプリケーション (MCP サーバー、API、ダッシュボード)
│   └── mcp-server/       # (未使用？)
├── packages/
│   ├── database/         # Drizzle ORM スキーマと DB ユーティリティ
│   ├── integrations/     # 外部サービス連携 (Slack, Stripe など)
│   └── widget/           # (未確認)
└── infra/                # Terraform による Infrastructure as Code
```

## コードベースの構造 (apps/www/src)

- `app/` - Next.js App Router (pages, layouts)
- `handlers/` - API ハンドラー (Hono)
  - `api/` - 各種API (oauth, auth, slack, stripe, tasks, health)
  - `mcp-server.ts` - MCP サーバー
  - `wellknown.ts` - OAuth メタデータ
- `usecases/` - ビジネスロジック (taskSessions, auth, slack, stripe, reports)
- `objects/` - ドメインオブジェクト (task decider, types)
- `repos/` - リポジトリパターン (task-sessions, event-store)
- `projections/` - イベントソーシングプロジェクション
- `policies/` - ドメインポリシー
- `middleware/` - Hono ミドルウェア (session, oauth, slack)
- `services/` - サービス層
- `clients/` - 外部クライアント
- `components/` - React コンポーネント
- `lib/` - ユーティリティ
- `utils/` - ヘルパー関数
- `config/` - 設定
- `types/` - 型定義

## アーキテクチャパターン

1. **Event Sourcing + DDD**: タスク管理にEvent Sourcingパターンを採用
   - `objects/task/decider.ts`: evolve, decide, apply, replay 関数
   - `task_events` テーブルでイベントを保存
   - `task_sessions` テーブルで現在の状態を保持

2. **Clean Architecture**: ドメインロジックとインフラを分離
   - usecases: ビジネスロジック
   - objects: ドメインモデル
   - repos: データアクセス
   - handlers: HTTPインターフェース

3. **Result型 (neverthrow)**: エラーハンドリングに使用

4. **Outbox Pattern**: `task_policy_outbox` テーブルでポリシー実行を管理
