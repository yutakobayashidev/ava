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

# Example: Firestore backup job (commented out by default)
# module "firestore_backup_job" {
#   source = "../../modules/cloud-run-job"
#
#   gcp_project_id  = var.gcp_project_id
#   job_name        = "firestore-backup"
#   location        = var.primary_region
#   container_image = "${module.artifact-registry.registry_uri}/firestore-backup:latest"
#
#   container_command = ["gcloud", "firestore", "export"]
#   container_args    = ["gs://your-backup-bucket"]
#
#   timeout = "1800s"
#
#   resource_limits = {
#     cpu    = "1000m"
#     memory = "1Gi"
#   }
#
#   # Schedule: Daily at 3:00 AM JST
#   schedule  = "0 3 * * *"
#   time_zone = "Asia/Tokyo"
#
#   # Additional IAM roles for Firestore and Cloud Storage access
#   additional_iam_roles = [
#     "roles/datastore.importExportAdmin",
#     "roles/storage.objectAdmin"
#   ]
# }
