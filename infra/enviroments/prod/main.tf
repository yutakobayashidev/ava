module "stripe_subscription" {
  source = "../../modules/stripe-subscription"
}

resource "stripe_webhook_endpoint" "webhook" {
  url         = "${var.webhook_base_url}/api/stripe/webhook"
  description = "Webhook endpoint for subscription and customer events"
  enabled_events = [
    "customer.subscription.created",
    "customer.subscription.updated",
    "customer.subscription.deleted",
    "customer.deleted",
  ]
}

resource "axiom_dataset" "ava_otel_traces" {
  name        = "ava"
  description = "ava's otel traces"
}

module "storage" {
  source       = "../../modules/cloudflare-r2"
  project_name = var.project_name
  environment  = "prod"
  account_id   = var.cloudflare_account_id
  r2_location  = "enam"
}

module "cloudflare_r2_token" {
  source                = "../../modules/cloudflare-account-token"
  project_name          = var.project_name
  environment           = "prod"
  token_name            = "r2-management"
  bucket_name           = module.storage.main_bucket_name
  cloudflare_account_id = var.cloudflare_account_id
}

module "artifact-registry" {
  source                     = "../../modules/artifact-registry"
  gcp_project_id             = var.gcp_project_id
  artifact_registry_location = var.primary_region
}

# Database secrets for batch-jobs
module "database_secrets" {
  source = "../../modules/database-secrets"

  gcp_project_id    = var.gcp_project_id
  database_user     = var.database_user
  database_password = var.database_password
  database_host     = var.database_host
  database_port     = var.database_port
  database_db       = var.database_db
}

# Service Account for batch-jobs Cloud Run
module "batch_jobs_service_account" {
  source = "../../modules/cloud-run-service-account"

  gcp_project_id     = var.gcp_project_id
  service_account_id = "batch-jobs-runner"
  display_name       = "Cloud Run Batch Jobs Service Account"
}

# Cloud Scheduler for batch-jobs periodic execution
module "batch_jobs_scheduler" {
  source = "../../modules/cloud-scheduler"

  gcp_project_id               = var.gcp_project_id
  region                       = var.primary_region
  service_account_id           = "batch-jobs-scheduler"
  service_account_display_name = "Batch Jobs Scheduler"
  job_name                     = "batch-jobs-daily"
  description                  = "Daily execution of batch-jobs at 3:00 AM JST"
  schedule                     = "0 3 * * *"
  time_zone                    = "Asia/Tokyo"
  cloud_run_job_name           = "batch-jobs"

  # 必要に応じてコンテナの引数を上書き
  # container_overrides = [
  #   {
  #     args = ["daily-task"]
  #   }
  # ]
}

# Cloud Build Trigger for batch-jobs deployment
module "batch_jobs_deploy_trigger" {
  source = "../../modules/cloud-build-trigger"

  gcp_project_id       = var.gcp_project_id
  trigger_name         = "deploy-batch-jobs"
  description          = "Batch Jobs を Cloud Run へdeployする"
  github_owner         = var.github_owner
  github_repo_name     = var.github_repo_name
  branch_pattern       = "^main$"
  included_files       = ["apps/batch-jobs/**"]
  cloudbuild_file_path = "apps/batch-jobs/cloudbuild.yaml"

  substitutions = {
    _REGION                         = var.primary_region
    _SERVICE_ACCOUNT                = module.batch_jobs_service_account.service_account_email
    _ARTIFACT_REPOSITORY_IMAGE_NAME = "${module.artifact-registry.registry_uri}/batch-jobs"
  }
}
