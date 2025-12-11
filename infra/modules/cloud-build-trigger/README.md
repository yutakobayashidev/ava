## Requirements

No requirements.

## Providers

| Name | Version |
|------|---------|
| <a name="provider_google"></a> [google](#provider\_google) | n/a |

## Modules

No modules.

## Resources

| Name | Type |
|------|------|
| [google_cloudbuild_trigger.deploy](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/cloudbuild_trigger) | resource |
| [google_project_service.cloudbuild](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/project_service) | resource |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_branch_pattern"></a> [branch\_pattern](#input\_branch\_pattern) | トリガーするブランチのパターン（正規表現） | `string` | `"^main$"` | no |
| <a name="input_cloudbuild_file_path"></a> [cloudbuild\_file\_path](#input\_cloudbuild\_file\_path) | cloudbuild.yaml ファイルのパス | `string` | n/a | yes |
| <a name="input_description"></a> [description](#input\_description) | Cloud Build Trigger の説明 | `string` | n/a | yes |
| <a name="input_gcp_project_id"></a> [gcp\_project\_id](#input\_gcp\_project\_id) | GCP Project ID | `string` | n/a | yes |
| <a name="input_github_owner"></a> [github\_owner](#input\_github\_owner) | GitHub のオーナー名（organization または user） | `string` | n/a | yes |
| <a name="input_github_repo_name"></a> [github\_repo\_name](#input\_github\_repo\_name) | GitHub リポジトリ名 | `string` | n/a | yes |
| <a name="input_included_files"></a> [included\_files](#input\_included\_files) | 変更を監視するファイルパターンのリスト | `list(string)` | `[]` | no |
| <a name="input_substitutions"></a> [substitutions](#input\_substitutions) | Cloud Build の置換変数 | `map(string)` | `{}` | no |
| <a name="input_trigger_name"></a> [trigger\_name](#input\_trigger\_name) | Cloud Build Trigger の名前 | `string` | n/a | yes |

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_trigger_id"></a> [trigger\_id](#output\_trigger\_id) | Cloud Build Trigger の ID |
| <a name="output_trigger_name"></a> [trigger\_name](#output\_trigger\_name) | Cloud Build Trigger の名前 |
