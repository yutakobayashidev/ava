output "main_bucket_name" {
  description = "メインのR2バケットの名前"
  value       = cloudflare_r2_bucket.main.name
}

output "main_bucket_id" {
  description = "メインのR2バケットのID"
  value       = cloudflare_r2_bucket.main.id
}
