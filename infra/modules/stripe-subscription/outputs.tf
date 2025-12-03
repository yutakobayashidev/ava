output "product_id" {
  description = "Stripe Product ID"
  value       = stripe_product.product.id
}

output "price_id" {
  description = "Stripe Price ID"
  value       = stripe_price.price.id
}
