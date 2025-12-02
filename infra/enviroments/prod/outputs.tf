output "stripe_price_id" {
  description = "Stripe Price ID for Basic Plan (monthly subscription)"
  value       = stripe_price.basic_monthly_price.id
  sensitive   = false
}

output "stripe_product_id" {
  description = "Stripe Product ID for Basic Plan"
  value       = stripe_product.basic_product.id
  sensitive   = false
}

output "stripe_webhook_id" {
  description = "Stripe Webhook Endpoint ID"
  value       = stripe_webhook_endpoint.webhook.id
  sensitive   = false
}

output "stripe_webhook_secret" {
  description = "Stripe Webhook Secret (use this for STRIPE_WEBHOOK_SECRET env variable)"
  value       = stripe_webhook_endpoint.webhook.secret
  sensitive   = true
}
