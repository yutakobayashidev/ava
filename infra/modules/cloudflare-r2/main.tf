resource "cloudflare_r2_bucket" "main" {
  account_id = var.account_id
  name       = "${var.project_name}-${var.environment}"
  location   = var.r2_location
}

resource "cloudflare_r2_custom_domain" "example_r2_custom_domain" {
  account_id = var.account_id
  bucket_name = cloudflare_r2_bucket.main.name
  domain      = var.custom_domain
  enabled = true
  zone_id = "zoneId"
  ciphers = ["string"]
  min_tls = "1.0"
}
