variable "project_name" {
  description = "リソースの接頭辞として使用されるプロジェクト名"
  type        = string
  validation {
    condition     = can(regex("^[a-z0-9-]+$", var.project_name))
    error_message = "プロジェクト名には小文字のアルファベット、数字、ハイフンのみを使用してください。"
  }
}

variable "stripe_api_key" {
  description = "Stripe APIキー (環境変数 TF_VAR_stripe_api_key で設定)"
  type        = string
  sensitive   = true
}

variable "webhook_base_url" {
  description = "Webhook のベース URL (例: https://yourdomain.com)"
  type        = string
}

variable "axiom_api_key" {
  description = "Axiom API キー (環境変数 TF_VAR_axiom_api_key で設定)"
  type        = string
  sensitive   = true
}

variable "cloudflare_account_id" {
  type        = string
  description = "Cloudflare Account ID"
}

variable "cloudflare_zone_id" {
  type        = string
  description = "Cloudflare Zone ID for your domain"
}

variable "domain_name" {
  type        = string
  description = "The domain name for email routing (e.g., fujiba.net)"
}
