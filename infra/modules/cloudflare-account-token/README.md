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
| [cloudflare_api_token.default](https://registry.terraform.io/providers/cloudflare/cloudflare/5.10.1/docs/resources/api_token) | resource |
| [cloudflare_api_token_permission_groups_list.this](https://registry.terraform.io/providers/cloudflare/cloudflare/5.10.1/docs/data-sources/api_token_permission_groups_list) | data source |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_bucket_name"></a> [bucket\_name](#input\_bucket\_name) | R2バケット名 | `string` | n/a | yes |
| <a name="input_cloudflare_account_id"></a> [cloudflare\_account\_id](#input\_cloudflare\_account\_id) | Cloudflare アカウント ID | `string` | n/a | yes |
| <a name="input_environment"></a> [environment](#input\_environment) | 環境名（dev, prod） | `string` | n/a | yes |
| <a name="input_project_name"></a> [project\_name](#input\_project\_name) | リソースの接頭辞として使用されるプロジェクト名 | `string` | n/a | yes |
| <a name="input_token_name"></a> [token\_name](#input\_token\_name) | トークンの名前 | `string` | n/a | yes |

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_access_key_id"></a> [access\_key\_id](#output\_access\_key\_id) | Access Key ID |
| <a name="output_name"></a> [name](#output\_name) | Name of the API Token |
| <a name="output_secret_access_key"></a> [secret\_access\_key](#output\_secret\_access\_key) | Secret Access Key |
| <a name="output_token"></a> [token](#output\_token) | Token value |
