output "stripe_price_id" {
  description = "Stripe Price ID for Basic Plan (monthly subscription)"
  value       = module.stripe_subscription.price_id
  sensitive   = false
}

output "stripe_product_id" {
  description = "Stripe Product ID for Basic Plan"
  value       = module.stripe_subscription.product_id
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

output "axiom_dataset_id" {
  description = "Axiom Dataset ID"
  value       = axiom_dataset.ava_otel_traces.id
}

output "axiom_dataset_name" {
  description = "Axiom Dataset Name"
  value       = axiom_dataset.ava_otel_traces.name
}

output "account_id" {
  value = var.cloudflare_account_id
  description = "The ID of cloudflare account id"
}
output "kv_namespace_id" {
  value       = cloudflare_workers_kv_namespace.forwarding_list.id
  description = "The ID of the KV namespace for email forwarding."
}

output "worker_name" {
  value       = cloudflare_workers_script.email_forwarder.script_name
  description = "The name of the deployed email worker."
}
