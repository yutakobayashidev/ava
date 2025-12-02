variable "project_name" {
  description = "リソースの接頭辞として使用されるプロジェクト名"
  type        = string
  validation {
    condition     = can(regex("^[a-z0-9-]+$", var.project_name))
    error_message = "プロジェクト名には小文字のアルファベット、数字、ハイフンのみを使用してください。"
  }
}
