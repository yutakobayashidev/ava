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
