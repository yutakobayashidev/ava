# Ava

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![GitHub Stars](https://img.shields.io/github/stars/yutakobayashidev/ava?style=social)](https://github.com/yutakobayashidev/ava/stargazers)
[![GitHub Issues](https://img.shields.io/github/issues/yutakobayashidev/ava)](https://github.com/yutakobayashidev/ava/issues)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![DeepWiki](https://img.shields.io/badge/DeepWiki-yutakobayashidev%2Fava-blue.svg?logo=data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACwAAAAyCAYAAAAnWDnqAAAAAXNSR0IArs4c6QAAA05JREFUaEPtmUtyEzEQhtWTQyQLHNak2AB7ZnyXZMEjXMGeK/AIi+QuHrMnbChYY7MIh8g01fJoopFb0uhhEqqcbWTp06/uv1saEDv4O3n3dV60RfP947Mm9/SQc0ICFQgzfc4CYZoTPAswgSJCCUJUnAAoRHOAUOcATwbmVLWdGoH//PB8mnKqScAhsD0kYP3j/Yt5LPQe2KvcXmGvRHcDnpxfL2zOYJ1mFwrryWTz0advv1Ut4CJgf5uhDuDj5eUcAUoahrdY/56ebRWeraTjMt/00Sh3UDtjgHtQNHwcRGOC98BJEAEymycmYcWwOprTgcB6VZ5JK5TAJ+fXGLBm3FDAmn6oPPjR4rKCAoJCal2eAiQp2x0vxTPB3ALO2CRkwmDy5WohzBDwSEFKRwPbknEggCPB/imwrycgxX2NzoMCHhPkDwqYMr9tRcP5qNrMZHkVnOjRMWwLCcr8ohBVb1OMjxLwGCvjTikrsBOiA6fNyCrm8V1rP93iVPpwaE+gO0SsWmPiXB+jikdf6SizrT5qKasx5j8ABbHpFTx+vFXp9EnYQmLx02h1QTTrl6eDqxLnGjporxl3NL3agEvXdT0WmEost648sQOYAeJS9Q7bfUVoMGnjo4AZdUMQku50McDcMWcBPvr0SzbTAFDfvJqwLzgxwATnCgnp4wDl6Aa+Ax283gghmj+vj7feE2KBBRMW3FzOpLOADl0Isb5587h/U4gGvkt5v60Z1VLG8BhYjbzRwyQZemwAd6cCR5/XFWLYZRIMpX39AR0tjaGGiGzLVyhse5C9RKC6ai42ppWPKiBagOvaYk8lO7DajerabOZP46Lby5wKjw1HCRx7p9sVMOWGzb/vA1hwiWc6jm3MvQDTogQkiqIhJV0nBQBTU+3okKCFDy9WwferkHjtxib7t3xIUQtHxnIwtx4mpg26/HfwVNVDb4oI9RHmx5WGelRVlrtiw43zboCLaxv46AZeB3IlTkwouebTr1y2NjSpHz68WNFjHvupy3q8TFn3Hos2IAk4Ju5dCo8B3wP7VPr/FGaKiG+T+v+TQqIrOqMTL1VdWV1DdmcbO8KXBz6esmYWYKPwDL5b5FA1a0hwapHiom0r/cKaoqr+27/XcrS5UwSMbQAAAABJRU5ErkJggg==)](https://deepwiki.com/yutakobayashidev/ava)

Ava は、進捗の共有やチームとのコミュニケーションが苦手な人でも、AI が自動で外部化と情報共有を手伝ってくれる世界をつくるプロジェクトです。

作業に集中しすぎて進捗報告を忘れてしまう、詰まっているのになかなか相談できない、定期的な進捗確認ミーティングでコーディングが中断される。こんな悩みはありませんか？

## Ava ができること

### 自動で進捗をSlackに報告

Claude Code や Cursor などの AI コーディングエージェントで作業を進めると、自動的に Slack の指定チャンネルに進捗が投稿されます。

- **タスク開始**: 何に取り組み始めたかを報告
- **進捗更新**: 作業の進み具合を随時共有
- **ブロッキング報告**: 困っていることを自動で相談
- **休止・再開**: 別タスク優先時や中断時の状況を共有
- **完了報告**: 完了内容を共有

### プライバシーに配慮した設計

Slack に送られるのは、抽象的なサマリのみです。コードの全文、秘密鍵やトークン、エラーログの詳細は送信されません。送信されるのは作業内容の要約、ブロッキング・休止の理由の概要、完了サマリのみです。

### 自分でコントロールできる自動化

いつ報告するか、どの粒度で話すか、何を共有するかは自然言語でコントロールできます。完全に自動化されたツールではなく、プロンプト次第でルーチンも自分でコントロールすることで安心感を得られます。

### ハイパーフォーカスでも安心

集中して作業しているときでも、AI が代わりにチームとコミュニケーションを取ってくれます。マイクロマネジメントが不要になり、信頼関係を保ちながら開発に集中できます。

---

## 主な機能

### MCP サーバー

Model Context Protocol (MCP) に対応した HTTP サーバーを `/mcp` エンドポイントで提供。AI Agents から直接タスク管理が可能です。

**利用可能なツール:**

- `start_task` - タスクを開始して Slack に通知
- `update_task` - 進捗を更新（ブロッキング・休止を自動解消）
- `report_blocked` - ブロッキングを報告
- `pause_task` - タスクを一時休止
- `resume_task` - 休止中のタスクを再開
- `complete_task` - タスク完了と PR を報告
- `list_tasks` - タスク一覧を取得

### OAuth 2.1 + PKCE 認証

セキュアな認証フローで MCP クライアントを保護：

- 動的クライアント登録 (`/api/oauth/register`)
- Authorization Code + PKCE フロー (`/oauth/authorize`)
- アクセストークン管理 (`/api/oauth/token`)
- Well-Known メタデータエンドポイント

### Slack 統合

**ユーザー認証:**

- Slack OpenID Connect でシームレスなログイン
- ワークスペース単位でのボットインストール

**リアルタイム通知:**

- タスクごとに専用スレッドを作成
- 開始・進捗・ブロッキング・休止・再開・完了をリアルタイムで投稿
- コードや機密情報は送信せず、抽象的なサマリのみ

**日次レポート:**

- `/daily-report` コマンドで AI による日次サマリを生成
- 実行ユーザーのみに表示される ephemeral message

### Stripe サブスクリプション

**Terraform による料金プラン管理:**

- Infrastructure as Code で料金プランを管理
- dev/prod 環境ごとに独立した設定
- lookup key を使った柔軟な価格管理
- Stripe Provider（lukasaron/stripe）を使用

**サブスクリプション API:**

- **チェックアウト** (`POST /api/stripe/checkout`): サブスクリプション購入画面へリダイレクト
- **ビリングポータル** (`POST /api/stripe/portal-session`): サブスクリプション管理画面へリダイレクト
- **サブスクリプション取得** (`GET /api/stripe/subscription`): 現在のサブスクリプション情報を取得

**Webhook 対応:**

- `customer.subscription.created/updated/deleted`: サブスクリプション変更の自動同期
- `customer.deleted`: 顧客削除時のデータクリーンアップ
- 署名検証によるセキュアな通信

**料金プラン:**

- Basic Plan: 500円/月
- lookup key `basic_monthly` で価格を動的取得
- 自動税計算対応（日本）

### ダッシュボード

Web UI でタスクの可視化：

- 進行中・ブロッキング・休止・完了のステータス別表示
- タスクの詳細履歴（更新・ブロッキング・休止の記録）
- チーム全体の作業状況を一覧で確認

### 開発者体験

- ワンストップオンボーディング（Slack 連携 → チャンネル選択 → MCP 設定）
- `.mcp.json` 自動生成
- 自己署名証明書対応の開発サーバー
- TypeScript フルサポート

---

## アーキテクチャ

```
┌─────────────────┐
│   AI Agents     │
│  (MCP Client)   │
└────────┬────────┘
         │ HTTPS + OAuth 2.1
         ▼
┌─────────────────────────────────────┐
│         Ava (Next.js 16)            │
│                                     │
│  ┌──────────┐      ┌────────────┐  │
│  │   /mcp   │      │  /api/*    │  │
│  │  (Hono)  │      │  (Hono)    │  │
│  └──────────┘      └────────────┘  │
│                                     │
│  ┌──────────────────────────────┐  │
│  │    Next.js App Router        │  │
│  │  (Dashboard, Onboarding)     │  │
│  └──────────────────────────────┘  │
└────────┬───────────────────┬────────────┬────────┘
         │                   │            │
         ▼                   ▼            ▼
  ┌─────────────┐    ┌──────────────┐ ┌─────────────┐
  │ PostgreSQL  │    │  Slack API   │ │ Stripe API  │
  │  (Drizzle)  │    │ (Bot, OIDC)  │ │ (Payments)  │
  └─────────────┘    └──────────────┘ └─────────────┘
```

**ルーティング構成:**

- `/mcp` - MCP サーバー（Hono、単独ルート）
- `/api/*` - API エンドポイント（Hono、catch-all ルート）
  - `/api/oauth/*` - OAuth 2.1 認可サーバー
  - `/api/auth/*` - Slack OIDC 認証
  - `/api/slack/*` - Slack 連携（ボットインストール、コマンド）
  - `/api/stripe/*` - Stripe サブスクリプション（チェックアウト、ビリングポータル、Webhook）
  - `/api/health` - ヘルスチェック
- その他 - Next.js App Router（ダッシュボード、オンボーディング）

---

## 技術スタック

| カテゴリ           | 技術                                     |
| ------------------ | ---------------------------------------- |
| **フレームワーク** | Next.js 16 (App Router), React 19        |
| **API**            | Hono 4.10                                |
| **データベース**   | PostgreSQL + Drizzle ORM                 |
| **認証**           | Arctic (OAuth 2.1), Slack OpenID Connect |
| **MCP**            | @hono/mcp, @modelcontextprotocol/sdk     |
| **AI**             | Vercel AI SDK + OpenAI                   |
| **決済**           | Stripe                                   |
| **Infrastructure** | Terraform, Stripe Provider (lukasaron)   |
| **UI**             | Tailwind CSS v4, Radix UI, shadcn/ui     |
| **型安全**         | TypeScript 5, Zod                        |
| **テスト**         | Vitest, Playwright                       |
| **開発ツール**     | pnpm, Lefthook, ESLint, Prettier         |

---

## 前提条件

### 必須

- **Node.js 18+** (`corepack enable pnpm` 推奨)
- **Docker & Docker Compose** (PostgreSQL 用)
- **Slack アプリ** - 以下の設定で作成:

#### Slack アプリの設定

**方法 1: App Manifest を使用（推奨）**

1. [Slack API](https://api.slack.com/apps) で「Create New App」→「From an app manifest」を選択

2. ワークスペースを選択

3. 以下の App Manifest を貼り付け（`<YOUR_BASE_URL>` を実際のベース URL に置き換えてください）:

```json
{
  "display_information": {
    "name": "Ava"
  },
  "features": {
    "bot_user": {
      "display_name": "Ava",
      "always_online": false
    },
    "slash_commands": [
      {
        "command": "/daily-report",
        "url": "https://<YOUR_BASE_URL>/api/slack/commands",
        "description": "本日のタスクサマリを生成",
        "usage_hint": "",
        "should_escape": false
      }
    ]
  },
  "oauth_config": {
    "redirect_urls": [
      "https://<YOUR_BASE_URL>/api/auth/slack/callback",
      "https://<YOUR_BASE_URL>/api/slack/install/callback"
    ],
    "scopes": {
      "user": ["openid", "profile", "email"],
      "bot": [
        "chat:write",
        "chat:write.public",
        "channels:read",
        "groups:read",
        "commands"
      ]
    }
  },
  "settings": {
    "interactivity": {
      "is_enabled": true,
      "request_url": "https://<YOUR_BASE_URL>/api/slack/interactions"
    },
    "org_deploy_enabled": false,
    "socket_mode_enabled": false,
    "token_rotation_enabled": true
  }
}
```

4. **App Credentials** から `Client ID`、`Client Secret`、`Signing Secret` を取得

**方法 2: 手動設定**

1. [Slack API](https://api.slack.com/apps) で「Create New App」→「From scratch」を選択

2. **OAuth & Permissions** で Bot Token Scopes を追加:
   - `chat:write` - メッセージ投稿
   - `chat:write.public` - パブリックチャンネルへの投稿
   - `channels:read` - チャンネル一覧取得
   - `groups:read` - プライベートチャンネル一覧取得
   - `commands` - Slash Command 実行

3. **OAuth & Permissions** で User Token Scopes を追加:
   - `openid` - OpenID Connect 認証
   - `profile` - プロフィール情報取得
   - `email` - メールアドレス取得

4. **OAuth & Permissions** で Redirect URLs を追加:

   ```
   https://<YOUR_BASE_URL>/api/auth/slack/callback
   https://<YOUR_BASE_URL>/api/slack/install/callback
   ```

5. **Slash Commands** で `/daily-report` を作成:
   - Request URL: `https://<YOUR_BASE_URL>/api/slack/commands`
   - Description: `本日のタスクサマリを生成`

6. **App Credentials** から `Client ID`、`Client Secret`、`Signing Secret` を取得

- **OpenAI API キー** - [OpenAI Platform](https://platform.openai.com/api-keys) で取得
- **Stripe アカウント** - [Stripe Dashboard](https://dashboard.stripe.com/register) でアカウントを作成
  - テスト環境で開発する場合は、テストモードの API キーと Webhook シークレットを使用
  - Webhook エンドポイント: `https://<YOUR_BASE_URL>/api/stripe/webhook`
  - Webhook イベント: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `customer.deleted`

---

## 環境変数の設定

プロジェクトルートに `.env` ファイルを作成してください。`.env.example` を参考にしてください：

```bash
cp .env.example .env
```

その後、以下の環境変数を設定します。

### 環境変数の説明

| 変数名                    | 説明                                                                                 | 必須 |
| ------------------------- | ------------------------------------------------------------------------------------ | ---- |
| `NEXT_PUBLIC_BASE_URL`    | アプリケーションのベース URL。OAuth メタデータや Slack リダイレクト URL の構築に使用 | Yes  |
| `NEXT_PUBLIC_SITE_NAME`   | サイト名（デフォルト: "Ava"）                                                        | No   |
| `DATABASE_URL`            | PostgreSQL 接続文字列                                                                | Yes  |
| `SLACK_APP_CLIENT_ID`     | Slack アプリの Client ID                                                             | Yes  |
| `SLACK_APP_CLIENT_SECRET` | Slack アプリの Client Secret                                                         | Yes  |
| `SLACK_SIGNING_SECRET`    | Slack アプリの Signing Secret（Slash Command の署名検証に使用）                      | Yes  |
| `OPENAI_API_KEY`          | OpenAI API キー（日次レポート機能に使用）                                            | Yes  |
| `STRIPE_SECRET_KEY`       | Stripe API キー（テスト環境: `sk_test_`、本番環境: `sk_live_`）                      | Yes  |
| `STRIPE_WEBHOOK_SECRET`   | Stripe Webhook 署名シークレット（Webhook イベントの検証に使用）                      | Yes  |

---

## ローカル開発

```bash
# corepack を有効化
$ npm run setup

# 依存関係をインストール
$ pnpm install

# .env としてコピー
$ cp .env.example .env
```

`.env` ファイルに環境変数を設定してください（前述の「環境変数の設定」を参照）。

```bash
# PostgreSQL コンテナを起動
$ pnpm db:up

# マイグレーションを実行
$ pnpm db:migrate

# 開発サーバーを起動
$ pnpm dev
```

サーバーが起動したら、https://localhost:3000 にアクセスしてください。

### Stripe Webhook のローカルテスト

Stripe CLI を使用してローカル環境で Webhook をテストできます：

```bash
# Stripe CLI でローカルに Webhook を転送
$ pnpm dev:stripe

# 別のターミナルで開発サーバーを起動
$ pnpm dev
```

Stripe CLI が `STRIPE_WEBHOOK_SECRET` を自動生成するので、`.env` ファイルに設定してください。

### Terraform で料金プランをデプロイ

```bash
# Stripe API キーを環境変数に設定
$ export TF_VAR_stripe_api_key=sk_test_xxxxx

# dev 環境の場合
$ cd infra/enviroments/dev

# Terraform を初期化（初回のみ）
$ ../../../infra/tf.sh init

# 変更内容を確認
$ ../../../infra/tf.sh plan

# Stripe にデプロイ
$ ../../../infra/tf.sh apply

# Price ID などの出力を確認
$ ../../../infra/tf.sh output
```

**注意:** 本番環境（`infra/enviroments/prod`）では、本番用の API キー（`sk_live_`）を使用してください。

## Testing

### Unit Test

```bash
$ pnpm test
$ pnpm test:watch
```

### E2E Test

```bash
$ pnpm exec playwright install chrome

$ pnpm build

$ pnpm test:e2e
$ pnpm test:e2e:ui
```

## Database

```bash
$ pnpm db:up        # PostgreSQL コンテナを起動
$ pnpm db:migrate   # マイグレーションを実行
$ pnpm db:studio    # Drizzle Studio を起動
$ pnpm db:down      # PostgreSQL コンテナを停止
```

---

## オンボーディング（初回セットアップ）

開発サーバー起動後、以下の手順で Slack 連携と MCP 設定を完了します。

### ステップ 1: Slack でログイン

1. ブラウザで https://localhost:3000 にアクセス
2. 「Login with Slack」をクリック
3. Slack の認証画面で許可

### ステップ 2: Slack ワークスペースにボットをインストール

1. ダッシュボードで「Slack 連携」または `/slack/install/start` にアクセス
2. ボットをインストールするワークスペースを選択
3. 必要な権限を確認して「許可する」

### ステップ 3: 通知チャンネルの選択

1. `/onboarding/connect-slack` にアクセス
2. タスクの進捗を投稿するチャンネルを選択
3. 「保存」をクリック

> **Note:** 後から変更したい場合は `/settings/channel` から変更できます。

### ステップ 4: MCP クライアントの設定

1. `/onboarding/setup-mcp` にアクセス
2. 表示される設定をコピー

> **Note:** 後から設定を確認したい場合は `/settings` から確認できます。3. プロジェクトルートに `.mcp.json` ファイルを作成して貼り付け:

```json
{
  "mcpServers": {
    "ava": {
      "type": "http",
      "url": "https://localhost:3000/mcp"
    }
  }
}
```

### ステップ 5: AI Agents から接続

```bash
# 自己署名証明書を許可して AI Agent を起動
NODE_TLS_REJECT_UNAUTHORIZED=0 claude
```

初回接続時、ブラウザで OAuth 2.1 の認可画面が開きます。「許可」をクリックすると、AI Agents から Ava の MCP ツールが使えるようになります。

---

## MCP ツールの詳細

### `start_task`

新しいタスクを開始します。

**パラメータ:**

- `issue.provider`: `"github"` または `"manual"`
- `issue.id`: GitHub Issue 番号（オプション）
- `issue.title`: タスクのタイトル
- `initial_summary`: 初期状況の説明

**動作:**

- データベースに新しいタスクセッションを作成
- Slack の通知チャンネルに新規スレッドを作成し、開始メッセージを投稿
- スレッド情報を保存

### `update_task`

タスクの進捗を更新します。

**パラメータ:**

- `task_session_id`: タスクセッション ID
- `summary`: 進捗の要約
- `raw_context`: 詳細なコンテキスト（DB 保存のみ、Slack には送信されない）

**動作:**

- ステータスを `in_progress` に戻す
- 未解決のブロッキングや休止を自動的に解消
- Slack スレッドに進捗を投稿

### `report_blocked`

タスクでブロッキングが発生したことを報告します。

**パラメータ:**

- `task_session_id`: タスクセッション ID
- `reason`: ブロッキングの理由
- `raw_context`: 詳細なコンテキスト（オプション）

**動作:**

- ステータスを `blocked` に更新
- Slack スレッドにブロッキングを通知

### `pause_task`

タスクを一時休止します。

**パラメータ:**

- `task_session_id`: タスクセッション ID
- `reason`: 休止の理由
- `raw_context`: 詳細なコンテキスト（オプション）

**動作:**

- ステータスを `paused` に更新
- Slack スレッドに休止を通知

### `resume_task`

休止中のタスクを再開します。

**パラメータ:**

- `task_session_id`: タスクセッション ID
- `summary`: 再開時の状況
- `raw_context`: 詳細なコンテキスト（オプション）

**動作:**

- ステータスを `in_progress` に戻す
- 休止レポートに `resumed_at` を記録
- Slack スレッドに再開を通知

### `complete_task`

タスクを完了します。

**パラメータ:**

- `task_session_id`: タスクセッション ID
- `summary`: 完了サマリ

**動作:**

- ステータスを `completed` に更新
- 完了情報を upsert
- Slack スレッドに完了を投稿

### `list_tasks`

タスク一覧を取得します。

**パラメータ:**

- `status`: ステータスでフィルタ（`in_progress`, `blocked`, `paused`, `completed`）（オプション）
- `limit`: 取得件数の上限（オプション）

**戻り値:**

- 認証ユーザーのタスク一覧（更新日時降順）

---

## 日次レポート機能

Slack で `/daily-report` コマンドを実行すると、AI が本日のタスクを要約します。

### 対象タスク

- 本日 `completed` になったタスク
- 本日更新された `in_progress` または `blocked` のタスク

### 動作

1. 対象タスクをデータベースから取得
2. OpenAI API を使用してタスクを要約
3. 実行したユーザーのみに表示される ephemeral message で返信

### 必要条件

- `OPENAI_API_KEY` 環境変数の設定
- Slack ボットのインストール

---

## セキュリティとプライバシー

### データベースに保存されるもの

- ユーザー情報（Slack ID、メールアドレス）
- ワークスペース情報と Bot トークン
- タスクセッション、更新履歴、ブロッキング報告、休止報告
- OAuth クライアント情報、認可コード、アクセストークン

### Slack に送信されるもの

- タスクの抽象的なサマリ（開始・進捗・ブロッキング・休止・完了）
- ステータスの変更通知

### Slack に送信されないもの

- コードの全文やスニペット
- 秘密鍵、トークン、環境変数
- 生のエラーログやスタックトレース
- リポジトリの機密情報

**`raw_context` パラメータに指定されたデータはデータベースにのみ保存され、Slack には送信されません。**

---

## トラブルシューティング

### AI Agents から接続できない

**症状:** MCP クライアントから Ava に接続できない

**解決方法:**

1. 自己署名証明書を許可して起動:
   ```bash
   NODE_TLS_REJECT_UNAUTHORIZED=0 claude
   ```
2. `.mcp.json` の URL が正しいか確認
3. 開発サーバーが起動しているか確認（`pnpm dev`）

### Slack 通知が届かない

**症状:** タスクを開始/更新しても Slack に通知が来ない

**解決方法:**

1. `/settings/channel` で通知チャンネルの設定を確認・変更
2. Slack ボットがワークスペースにインストールされているか `/settings` で確認
3. ボットが通知チャンネルに参加しているか確認（自動参加のはず）

### データベース接続エラー

**症状:** `ECONNREFUSED` や `database "ava" does not exist` エラー

**解決方法:**

```bash
# コンテナの状態を確認
docker compose ps

# コンテナを再起動
pnpm db:down
pnpm db:up

# マイグレーションを再実行
pnpm db:migrate
```

### `/daily-report` が動かない

**症状:** Slack で `/daily-report` を実行してもエラーが返る

**解決方法:**

1. `OPENAI_API_KEY` が `.env` に設定されているか確認
2. Slack アプリの Slash Commands 設定を確認
3. Request URL が正しいか確認: `<BASE_URL>/api/slack/commands`

---

## コントリビューション

コントリビューションを歓迎します！

1. このリポジトリをフォーク
2. フィーチャーブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add some amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. Pull Request を作成

詳細は [CONTRIBUTING.md](CONTRIBUTING.md) を参照してください。

---

## ライセンス

このプロジェクトは MIT ライセンスの下で公開されています。詳細は [LICENSE](LICENSE) ファイルを参照してください。

---

## 謝辞

- [Model Context Protocol](https://modelcontextprotocol.io/) - AI とツールをつなぐ標準プロトコル
- [Hono](https://hono.dev/) - 軽量で高速な Web フレームワーク
- [Next.js](https://nextjs.org/) - React フレームワーク
- [Drizzle ORM](https://orm.drizzle.team/) - TypeScript ORM
