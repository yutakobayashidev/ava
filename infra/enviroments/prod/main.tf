# Stripe Subscription Plans

resource "stripe_product" "basic_product" {
  name        = "Basic Plan"
  description = "Basic subscription plan"
  active      = true
}

resource "stripe_price" "basic_monthly_price" {
  product     = stripe_product.basic_product.id
  currency    = "jpy"
  unit_amount = 500
  lookup_key  = "basic_monthly"
  recurring {
    interval       = "month"
    interval_count = 1
  }
}

# Stripe Webhook Endpoint
resource "stripe_webhook_endpoint" "webhook" {
  url         = "${var.webhook_base_url}/api/stripe/webhook"
  description = "Webhook endpoint for subscription and customer events"
  enabled_events = [
    "customer.subscription.created",
    "customer.subscription.updated",
    "customer.subscription.deleted",
    "customer.deleted"
  ]
}
