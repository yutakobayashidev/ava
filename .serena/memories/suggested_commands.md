# 推奨コマンド

## セットアップ

```bash
# corepack を有効化
npm run setup

# 依存関係をインストール
pnpm install

# .env ファイルを作成
cp .env.example .env
```

## 開発

```bash
# PostgreSQL コンテナを起動
pnpm db:up

# マイグレーションを実行
pnpm db:migrate

# 開発サーバーを起動 (HTTPS)
pnpm dev

# 開発サーバーを起動 (HTTP)
pnpm dev:http

# Stripe Webhook ローカルテスト
pnpm dev:stripe

# Slack トンネル (ngrok 代替)
pnpm dev:slack
```

## データベース

```bash
pnpm db:up        # PostgreSQL コンテナを起動
pnpm db:down      # PostgreSQL コンテナを停止
pnpm db:migrate   # マイグレーションを実行
pnpm db:generate  # スキーマからマイグレーションファイルを生成
pnpm db:push      # スキーマを直接DBにプッシュ (開発用)
pnpm db:studio    # Drizzle Studio を起動
pnpm db:reset     # データベースをリセット
```

## テスト

```bash
# ユニットテスト
pnpm test
pnpm test:watch
pnpm test:coverage

# E2Eテスト (Playwright)
pnpm exec playwright install chrome
pnpm build
pnpm test:e2e
pnpm test:e2e:ui
```

## ビルドと型チェック

```bash
pnpm build              # 本番ビルド
pnpm build:analyze      # バンドルサイズ分析
pnpm typecheck          # 型チェック
```

## リンティングとフォーマット

```bash
pnpm fmt                # Prettier でフォーマット
pnpm lint               # Knip で未使用コードをチェック
pnpm lint:claude        # Claude でタイポチェック
```

## Terraform (Stripe料金プラン管理)

```bash
cd infra/enviroments/dev  # または prod

# Terraform を初期化（初回のみ）
../../../infra/tf.sh init

# 変更内容を確認
../../../infra/tf.sh plan

# Stripe にデプロイ
../../../infra/tf.sh apply

# 出力を確認
../../../infra/tf.sh output
```

## その他

```bash
# パッケージマネージャーの検証
npx only-allow pnpm

# Lefthook のセットアップ
lefthook install
```
