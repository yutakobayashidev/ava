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

# Service Account for batch-jobs Cloud Run
module "batch_jobs_service_account" {
  source = "../../modules/cloud-run-service-account"

  gcp_project_id     = var.gcp_project_id
  service_account_id = "batch-jobs-runner"
  display_name       = "Cloud Run Batch Jobs Service Account"
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
