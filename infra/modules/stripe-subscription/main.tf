resource "stripe_product" "product" {
  name        = var.product_name
  description = var.product_description
  active      = var.product_active
}

resource "stripe_price" "price" {
  product     = stripe_product.product.id
  currency    = var.price_currency
  unit_amount = var.price_unit_amount
  lookup_key  = var.price_lookup_key

  recurring {
    interval       = var.price_interval
    interval_count = var.price_interval_count
  }
}
