resource "google_project_service" "artifact_registry" {
  project = var.gcp_project_id
  service = "artifactregistry.googleapis.com"

  disable_on_destroy = false
}

resource "google_artifact_registry_repository" "batch-jobs-app" {
  project       = var.gcp_project_id
  location      = var.artifact_registry_location
  repository_id = "batch-jobs-app"
  description   = "Batch Jobs App"
  format        = "DOCKER"

  depends_on = [google_project_service.artifact_registry]
}
