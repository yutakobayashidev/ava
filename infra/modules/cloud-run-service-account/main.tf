resource "google_service_account" "cloud_run_sa" {
  project      = var.gcp_project_id
  account_id   = var.service_account_id
  display_name = var.display_name
}

# 編集者に追加
resource "google_project_iam_member" "editor" {
  project = var.gcp_project_id
  role    = "roles/editor"
  member  = "serviceAccount:${google_service_account.cloud_run_sa.email}"
}

# Cloud Run 起動者に追加
resource "google_project_iam_member" "run_invoker" {
  project = var.gcp_project_id
  role    = "roles/run.invoker"
  member  = "serviceAccount:${google_service_account.cloud_run_sa.email}"
}

# Secret Manager アクセス権限
resource "google_project_iam_member" "secret_accessor" {
  project = var.gcp_project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.cloud_run_sa.email}"
}
