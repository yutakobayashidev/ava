output "service_account_email" {
  description = "作成されたサービスアカウントのメールアドレス"
  value       = google_service_account.cloud_run_sa.email
}

output "service_account_name" {
  description = "作成されたサービスアカウントの名前"
  value       = google_service_account.cloud_run_sa.name
}
