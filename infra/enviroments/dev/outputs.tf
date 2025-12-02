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
