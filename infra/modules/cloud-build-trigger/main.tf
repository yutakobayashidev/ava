resource "google_project_service" "cloudbuild" {
  project = var.gcp_project_id
  service = "cloudbuild.googleapis.com"

  disable_on_destroy = false
}

# Cloud Build サービスアカウント
resource "google_service_account" "cloudbuild_service_account" {
  project      = var.gcp_project_id
  account_id   = "cloudbuild-sa"
  display_name = "Cloud Build Service Account"
  description  = "Cloud build service account"
}

resource "google_project_iam_member" "act_as" {
  project = var.gcp_project_id
  role    = "roles/iam.serviceAccountUser"
  member  = "serviceAccount:${google_service_account.cloudbuild_service_account.email}"
}

resource "google_project_iam_member" "logs_writer" {
  project = var.gcp_project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.cloudbuild_service_account.email}"
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

  # これがないと400エラーになる
  service_account = google_service_account.cloudbuild_service_account.id

  depends_on = [google_project_service.cloudbuild]
}
