variable "gcp_project_id" {
  type        = string
  description = "GCP Project ID"
}

variable "region" {
  type        = string
  description = "Cloud Scheduler のリージョン"
}

variable "service_account_id" {
  type        = string
  description = "サービスアカウントの ID"
  default     = "cloud-scheduler-sa"
}

variable "service_account_display_name" {
  type        = string
  description = "サービスアカウントの表示名"
  default     = "Cloud Scheduler Service Account"
}

variable "job_name" {
  type        = string
  description = "Cloud Scheduler ジョブの名前"
}

variable "description" {
  type        = string
  description = "Cloud Scheduler ジョブの説明"
  default     = ""
}

variable "schedule" {
  type        = string
  description = "Cron形式のスケジュール（例: 0 8 * * 1-5）"
}

variable "time_zone" {
  type        = string
  description = "タイムゾーン"
  default     = "Asia/Tokyo"
}

variable "attempt_deadline" {
  type        = string
  description = "試行のデッドライン"
  default     = "60s"
}

variable "retry_count" {
  type        = number
  description = "リトライ回数"
  default     = 1
}

variable "cloud_run_job_name" {
  type        = string
  description = "実行する Cloud Run Job の名前"
}

variable "container_overrides" {
  type = list(object({
    args = optional(list(string))
    env = optional(list(object({
      name  = string
      value = string
    })))
  }))
  description = "コンテナのオーバーライド設定（args、envなど）"
  default     = null
}
