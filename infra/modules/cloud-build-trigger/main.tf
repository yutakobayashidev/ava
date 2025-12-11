resource "google_project_service" "cloudbuild" {
  project = var.gcp_project_id
  service = "cloudbuild.googleapis.com"

  disable_on_destroy = false
}

resource "google_cloudbuild_trigger" "deploy" {
  name        = var.trigger_name
  description = var.description
  project     = var.gcp_project_id

  github {
    owner = var.github_owner
    name  = var.github_repo_name
    push {
      branch = var.branch_pattern
    }
  }

  included_files = var.included_files
  filename       = var.cloudbuild_file_path

  substitutions = var.substitutions

  depends_on = [google_project_service.cloudbuild]
}
