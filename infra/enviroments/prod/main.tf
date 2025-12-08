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
