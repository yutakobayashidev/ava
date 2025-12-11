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
