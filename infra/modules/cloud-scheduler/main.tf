resource "google_project_service" "cloud_scheduler" {
  project = var.gcp_project_id
  service = "cloudscheduler.googleapis.com"

  disable_on_destroy = false
}

# Cloud Scheduler用サービスアカウント
resource "google_service_account" "scheduler_sa" {
  project      = var.gcp_project_id
  account_id   = var.service_account_id
  display_name = var.service_account_display_name
  description  = "Service Account for Cloud Scheduler"
}

resource "google_project_iam_member" "run_jobs_executor" {
  project = var.gcp_project_id
  role    = "roles/run.jobsExecutorWithOverrides"
  member  = google_service_account.scheduler_sa.member
}

resource "google_cloud_scheduler_job" "job" {
  project          = var.gcp_project_id
  region           = var.region
  name             = var.job_name
  description      = var.description
  schedule         = var.schedule
  time_zone        = var.time_zone
  attempt_deadline = var.attempt_deadline

  retry_config {
    retry_count = var.retry_count
  }

  http_target {
    uri         = "https://${var.region}-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/${var.gcp_project_id}/jobs/${var.cloud_run_job_name}:run"
    http_method = "POST"
    headers = {
      "Content-Type" = "application/json"
    }
    body = base64encode(jsonencode(
      var.container_overrides != null ? {
        "overrides" : {
          "containerOverrides" : var.container_overrides
        }
      } : {}
    ))

    oauth_token {
      service_account_email = google_service_account.scheduler_sa.email
    }
  }

  depends_on = [google_project_service.cloud_scheduler]
}
