# infra

## Terraform

- Terraform の操作は常に `./infra/tf.sh <command>` を使用してください。利用する Terraform のバージョンは `infra/.terraform-version` で管理されています。
- 基本的なフローは `./infra/tf.sh init` → `./infra/tf.sh plan` → `./infra/tf.sh apply` です。`apply` 実行時は想定どおりの差分か必ず確認してください。
- 差分のみ確認したい場合は `./infra/tf.sh plan -out plan.out` と `./infra/tf.sh apply plan.out` のように `plan` の結果をファイルに保存して適用できます。
- 出力値を取得する際は `./infra/tf.sh output` を利用します。`.env` へ転記する場合は、例えば `./infra/tf.sh output -raw supabase_production_anon_key` の結果をコピーして `SUPABASE_ANON_KEY=` のように記述してください。JSON が必要な場合は `-json` オプションも使用できます。

## TFLint

- Terraform の静的解析は `./infra/tflint.sh <command>` から実行してください。初回は自動的に `tflint --init` まで実行されます。
- 例: `./infra/tflint.sh`（全体 lint）、`./infra/tflint.sh --module supabase`（モジュール単位の lint）。

## Modules

- `infra/modules/stripe-subscription` に Stripe のプロダクト・プライス・Webhook をまとめた共通モジュールがあります。環境ごとの設定は `enviroments/*/main.tf` からこのモジュールを呼び出してください。
