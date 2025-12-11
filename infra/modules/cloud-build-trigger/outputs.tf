output "trigger_id" {
  description = "Cloud Build Trigger の ID"
  value       = google_cloudbuild_trigger.deploy.id
}

output "trigger_name" {
  description = "Cloud Build Trigger の名前"
  value       = google_cloudbuild_trigger.deploy.name
}
