output "scheduler_job_id" {
  description = "Cloud Scheduler Job の ID"
  value       = google_cloud_scheduler_job.job.id
}

output "scheduler_job_name" {
  description = "Cloud Scheduler Job の名前"
  value       = google_cloud_scheduler_job.job.name
}

output "service_account_email" {
  description = "Cloud Scheduler で使用するサービスアカウントのメールアドレス"
  value       = google_service_account.scheduler_sa.email
}
