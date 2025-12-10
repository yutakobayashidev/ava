# タスク完了時のチェックリスト

## コミット前

1. **型チェック**

   ```bash
   pnpm typecheck
   ```

2. **リンティング**

   ```bash
   pnpm lint
   ```

3. **フォーマット**

   ```bash
   pnpm fmt
   ```

4. **テスト実行**

   ```bash
   # ユニットテスト
   pnpm test

   # E2Eテスト (必要に応じて)
   pnpm test:e2e
   ```

## Lefthook による自動チェック

このプロジェクトでは Lefthook が設定されているため、`git commit` 時に自動的に以下が実行されます:

- 型チェック
- リンティング
- テスト

## PR作成前

1. **ビルドの確認**

   ```bash
   pnpm build
   ```

2. **データベースマイグレーションの確認**
   - スキーマを変更した場合は `pnpm db:generate` でマイグレーションファイルを生成
   - `pnpm db:migrate` でマイグレーションが正常に実行されるか確認

3. **環境変数の確認**
   - 新しい環境変数を追加した場合は `.env.example` を更新
   - README.md の環境変数セクションを更新

4. **ドキュメントの更新**
   - 新機能を追加した場合は README.md を更新
   - API変更がある場合は CLAUDE.md / AGENTS.md を更新

## デプロイ前 (本番環境)

1. **Terraform の確認** (Stripe料金プラン変更時)

   ```bash
   cd infra/enviroments/prod
   ../../../infra/tf.sh plan
   ../../../infra/tf.sh apply
   ```

2. **環境変数の確認**
   - Vercel / ホスティング環境で環境変数が正しく設定されているか確認
   - `AXIOM_API_TOKEN`, `AXIOM_DATASET_NAME` (本番環境のみ)

3. **データベースマイグレーション**
   - 本番環境でマイグレーションを実行

## セキュリティチェック

- [ ] 秘密鍵やトークンがコードに含まれていないか
- [ ] Slack に送信されるデータが抽象的なサマリのみか
- [ ] OAuth実装でPKCE検証が正しく行われているか
- [ ] トークンがハッシュ化されて保存されているか
