## Requirements

| Name | Version |
|------|---------|
| <a name="requirement_terraform"></a> [terraform](#requirement\_terraform) | >= 1.13.5 |
| <a name="requirement_cloudflare"></a> [cloudflare](#requirement\_cloudflare) | 5.10.1 |

## Providers

| Name | Version |
|------|---------|
| <a name="provider_cloudflare"></a> [cloudflare](#provider\_cloudflare) | 5.10.1 |

## Modules

No modules.

## Resources

| Name | Type |
|------|------|
| [cloudflare_r2_bucket.main](https://registry.terraform.io/providers/cloudflare/cloudflare/5.10.1/docs/resources/r2_bucket) | resource |
| [cloudflare_r2_custom_domain.example_r2_custom_domain](https://registry.terraform.io/providers/cloudflare/cloudflare/5.10.1/docs/resources/r2_custom_domain) | resource |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_account_id"></a> [account\_id](#input\_account\_id) | Cloudflare アカウント ID | `string` | n/a | yes |
| <a name="input_custom_domain"></a> [custom\_domain](#input\_custom\_domain) | Cloudflare R2 のカスタムドメイン | `string` | n/a | yes |
| <a name="input_environment"></a> [environment](#input\_environment) | 環境名（dev, prod） | `string` | n/a | yes |
| <a name="input_project_name"></a> [project\_name](#input\_project\_name) | リソースの接頭辞として使用されるプロジェクト名 | `string` | n/a | yes |
| <a name="input_r2_location"></a> [r2\_location](#input\_r2\_location) | R2 バケットのリージョン | `string` | `"apac"` | no |

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_main_bucket_id"></a> [main\_bucket\_id](#output\_main\_bucket\_id) | メインのR2バケットのID |
| <a name="output_main_bucket_name"></a> [main\_bucket\_name](#output\_main\_bucket\_name) | メインのR2バケットの名前 |
