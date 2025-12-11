variable "project_name" {
  description = "リソースの接頭辞として使用されるプロジェクト名"
  type        = string
  validation {
    condition     = can(regex("^[a-z0-9-]+$", var.project_name))
    error_message = "プロジェクト名には小文字のアルファベット、数字、ハイフンのみを使用してください。"
  }
}

variable "environment" {
  description = "環境名（dev, prod）"
  type        = string
  validation {
    condition     = contains(["dev", "prod"], var.environment)
    error_message = "環境名は dev または prod のいずれかである必要があります。"
  }
}

variable "cloudflare_account_id" {
  description = "Cloudflare アカウント ID"
  type        = string
  validation {
    condition     = can(regex("^[a-f0-9]{32}$", var.cloudflare_account_id))
    error_message = "アカウント ID は 32 文字の 16 進数文字列である必要があります。"
  }
}

variable "token_name" {
  description = "トークンの名前"
  type        = string
}

variable "bucket_name" {
  description = "R2バケット名"
  type        = string
}
