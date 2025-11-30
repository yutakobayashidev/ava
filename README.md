# Ava

Ava は、進捗の共有やチームとのコミュニケーションが苦手な人でも、AI が自動で外部化と情報共有を手伝ってくれる世界をつくるプロジェクトです。

作業に集中しすぎて進捗報告を忘れてしまう、詰まっているのになかなか相談できない、定期的な進捗確認ミーティングでコーディングが中断される。こんな悩みはありませんか？

## Ava ができること

### 自動で進捗をSlackに報告

Claude Code や Cursor などの AI コーディングエージェントで作業を進めると、自動的に Slack の指定チャンネルに進捗が投稿されます。

- **タスク開始**: 何に取り組み始めたかを報告
- **進捗更新**: 作業の進み具合を随時共有
- **詰まり報告**: 困っていることを自動で相談
- **休止・再開**: 別タスク優先時や中断時の状況を共有
- **完了報告**: 完了内容を共有

### プライバシーに配慮した設計

Slack に送られるのは、抽象的なサマリのみです。コードの全文、秘密鍵やトークン、エラーログの詳細は送信されません。送信されるのは作業内容の要約、詰まり・休止の理由の概要、完了サマリのみです。

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
- `update_task` - 進捗を更新（詰まり・休止を自動解消）
- `report_blocked` - 詰まりを報告
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
- 開始・進捗・詰まり・休止・再開・完了をリアルタイムで投稿
- コードや機密情報は送信せず、抽象的なサマリのみ

**日次レポート:**

- `/daily-report` コマンドで AI による日次サマリを生成
- 実行ユーザーのみに表示される ephemeral message

### ダッシュボード

Web UI でタスクの可視化：

- 進行中・詰まり・休止・完了のステータス別表示
- タスクの詳細履歴（更新・詰まり・休止の記録）
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
└────────┬───────────────────┬────────┘
         │                   │
         ▼                   ▼
  ┌─────────────┐    ┌──────────────┐
  │ PostgreSQL  │    │  Slack API   │
  │  (Drizzle)  │    │ (Bot, OIDC)  │
  └─────────────┘    └──────────────┘
```

**ルーティング構成:**

- `/mcp` - MCP サーバー（Hono、単独ルート）
- `/api/*` - API エンドポイント（Hono、catch-all ルート）
  - `/api/oauth/*` - OAuth 2.1 認可サーバー
  - `/api/auth/*` - Slack OIDC 認証
  - `/api/slack/*` - Slack 連携（ボットインストール、コマンド）
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

1. [Slack API](https://api.slack.com/apps) で新しいアプリを作成

2. **OAuth & Permissions** で Bot Token Scopes を追加:
   - `chat:write` - メッセージ投稿
   - `chat:write.public` - パブリックチャンネルへの投稿
   - `channels:read` - チャンネル一覧取得
   - `groups:read` - プライベートチャンネル一覧取得
   - `commands` - Slash Command 実行

3. **OAuth & Permissions** で Redirect URLs を追加:

   ```
   https://<YOUR_BASE_URL>/api/auth/slack/callback
   https://<YOUR_BASE_URL>/api/slack/install/callback
   ```

4. **Slash Commands** で `/daily-report` を作成:
   - Request URL: `https://<YOUR_BASE_URL>/api/slack/commands`
   - Description: `本日のタスクサマリを生成`

5. **App Credentials** から `Client ID`、`Client Secret`、`Signing Secret` を取得

- **OpenAI API キー** - [OpenAI Platform](https://platform.openai.com/api-keys) で取得

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

### ステップ 4: MCP クライアントの設定

1. `/onboarding/setup-mcp` にアクセス
2. 表示される設定をコピー
3. プロジェクトルートに `.mcp.json` ファイルを作成して貼り付け:

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
- 未解決の詰まりや休止を自動的に解消
- Slack スレッドに進捗を投稿

### `report_blocked`

タスクで詰まったことを報告します。

**パラメータ:**

- `task_session_id`: タスクセッション ID
- `reason`: 詰まりの理由
- `raw_context`: 詳細なコンテキスト（オプション）

**動作:**

- ステータスを `blocked` に更新
- Slack スレッドに詰まりを通知

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
- タスクセッション、更新履歴、詰まり報告、休止報告
- OAuth クライアント情報、認可コード、アクセストークン

### Slack に送信されるもの

- タスクの抽象的なサマリ（開始・進捗・詰まり・休止・完了）
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

1. `/onboarding/connect-slack` で通知チャンネルを選択済みか確認
2. Slack ボットがワークスペースにインストールされているか確認
3. ボットが通知チャンネルに参加しているか確認（自動参加のはず）

### データベース接続エラー

**症状:** `ECONNREFUSED` や `database "ai_task" does not exist` エラー

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
