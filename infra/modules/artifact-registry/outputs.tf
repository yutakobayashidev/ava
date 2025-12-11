output "repository_id" {
  description = "The ID of the Artifact Registry repository"
  value       = google_artifact_registry_repository.batch-jobs-app.id
}

output "repository_name" {
  description = "The name of the Artifact Registry repository"
  value       = google_artifact_registry_repository.batch-jobs-app.name
}

output "registry_uri" {
  description = "The URI of the Artifact Registry repository for Docker push/pull"
  value       = "${google_artifact_registry_repository.batch-jobs-app.location}-docker.pkg.dev/${google_artifact_registry_repository.batch-jobs-app.project}/${google_artifact_registry_repository.batch-jobs-app.repository_id}"
}
