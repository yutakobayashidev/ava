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

  cleanup_policy_dry_run = false

  cleanup_policies {
    id     = "keep-recent-5"
    action = "KEEP"

    most_recent_versions {
      package_name_prefixes = ["batch-jobs"]
      keep_count            = 5
    }
  }

  depends_on = [google_project_service.artifact_registry]
}
