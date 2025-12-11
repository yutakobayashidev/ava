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
| [google_cloud_scheduler_job.job](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/cloud_scheduler_job) | resource |
| [google_project_iam_member.run_jobs_executor](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/project_iam_member) | resource |
| [google_project_service.cloud_scheduler](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/project_service) | resource |
| [google_service_account.scheduler_sa](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/service_account) | resource |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_attempt_deadline"></a> [attempt\_deadline](#input\_attempt\_deadline) | 試行のデッドライン | `string` | `"60s"` | no |
| <a name="input_cloud_run_job_name"></a> [cloud\_run\_job\_name](#input\_cloud\_run\_job\_name) | 実行する Cloud Run Job の名前 | `string` | n/a | yes |
| <a name="input_container_overrides"></a> [container\_overrides](#input\_container\_overrides) | コンテナのオーバーライド設定（args、envなど） | <pre>list(object({<br/>    args = optional(list(string))<br/>    env = optional(list(object({<br/>      name  = string<br/>      value = string<br/>    })))<br/>  }))</pre> | `null` | no |
| <a name="input_description"></a> [description](#input\_description) | Cloud Scheduler ジョブの説明 | `string` | `""` | no |
| <a name="input_gcp_project_id"></a> [gcp\_project\_id](#input\_gcp\_project\_id) | GCP Project ID | `string` | n/a | yes |
| <a name="input_job_name"></a> [job\_name](#input\_job\_name) | Cloud Scheduler ジョブの名前 | `string` | n/a | yes |
| <a name="input_region"></a> [region](#input\_region) | Cloud Scheduler のリージョン | `string` | n/a | yes |
| <a name="input_retry_count"></a> [retry\_count](#input\_retry\_count) | リトライ回数 | `number` | `1` | no |
| <a name="input_schedule"></a> [schedule](#input\_schedule) | Cron形式のスケジュール（例: 0 8 * * 1-5） | `string` | n/a | yes |
| <a name="input_service_account_display_name"></a> [service\_account\_display\_name](#input\_service\_account\_display\_name) | サービスアカウントの表示名 | `string` | `"Cloud Scheduler Service Account"` | no |
| <a name="input_service_account_id"></a> [service\_account\_id](#input\_service\_account\_id) | サービスアカウントの ID | `string` | `"cloud-scheduler-sa"` | no |
| <a name="input_time_zone"></a> [time\_zone](#input\_time\_zone) | タイムゾーン | `string` | `"Asia/Tokyo"` | no |

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_scheduler_job_id"></a> [scheduler\_job\_id](#output\_scheduler\_job\_id) | Cloud Scheduler Job の ID |
| <a name="output_scheduler_job_name"></a> [scheduler\_job\_name](#output\_scheduler\_job\_name) | Cloud Scheduler Job の名前 |
| <a name="output_service_account_email"></a> [service\_account\_email](#output\_service\_account\_email) | Cloud Scheduler で使用するサービスアカウントのメールアドレス |
