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

variable "cloudflare_api_token" {
  description = "認証用のCloudflare APIトークン"
  type        = string
  sensitive   = true
}

variable "cloudflare_account_id" {
  description = "Cloudflare アカウント ID"
  type        = string
  validation {
    condition     = can(regex("^[a-f0-9]{32}$", var.cloudflare_account_id))
    error_message = "アカウント ID は 32 文字の 16 進数文字列である必要があります。"
  }
}

variable "cloudflare_r2_custom_domain" {
  description = "Cloudflare R2 および Zero Trust で利用するカスタムドメイン"
  type        = string
  validation {
    condition     = length(trimspace(var.cloudflare_r2_custom_domain)) > 0
    error_message = "カスタムドメインは空白以外の文字を含める必要があります。"
  }
}
