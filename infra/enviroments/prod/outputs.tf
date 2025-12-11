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

output "artifact_registry_id" {
  description = "The ID of the Artifact Registry repository"
  value       = module.artifact-registry.repository_id
}

output "artifact_registry_name" {
  description = "The name of the Artifact Registry repository"
  value       = module.artifact-registry.repository_name
}

output "artifact_registry_uri" {
  description = "The URI of the Artifact Registry repository for Docker push/pull"
  value       = module.artifact-registry.registry_uri
}
