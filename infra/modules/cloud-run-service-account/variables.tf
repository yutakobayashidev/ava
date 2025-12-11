variable "gcp_project_id" {
  description = "GCP の project_id"
  type        = string
}

variable "service_account_id" {
  description = "サービスアカウントの ID（例: batch-jobs-runner）"
  type        = string
}

variable "display_name" {
  description = "サービスアカウントの表示名"
  type        = string
}
