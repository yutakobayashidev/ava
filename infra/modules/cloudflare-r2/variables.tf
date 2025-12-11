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

variable "account_id" {
  description = "Cloudflare アカウント ID"
  type        = string
  validation {
    condition     = can(regex("^[a-f0-9]{32}$", var.account_id))
    error_message = "アカウント ID は 32 文字の 16 進数文字列である必要があります。"
  }
}

variable "r2_location" {
  description = "R2 バケットのリージョン"
  type        = string
  default     = "apac"
  validation {
    condition     = contains(["apac", "eeur", "enam", "weur", "wnam", "oc"], var.r2_location)
    error_message = "R2 のリージョンは次のいずれかである必要があります: apac, eeur, enam, weur, wnam, oc。"
  }
}

variable "custom_domain" {
  description = "Cloudflare R2 のカスタムドメイン"
  type        = string
  validation {
    condition     = length(trimspace(var.custom_domain)) > 0
    error_message = "カスタムドメインは空白以外の文字を含める必要があります。"
  }
}
