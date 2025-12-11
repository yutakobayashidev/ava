variable "gcp_project_id" {
  type        = string
  description = "GCP Project ID"
}

variable "trigger_name" {
  type        = string
  description = "Cloud Build Trigger の名前"
}

variable "description" {
  type        = string
  description = "Cloud Build Trigger の説明"
}

variable "github_owner" {
  type        = string
  description = "GitHub のオーナー名（organization または user）"
}

variable "github_repo_name" {
  type        = string
  description = "GitHub リポジトリ名"
}

variable "branch_pattern" {
  type        = string
  description = "トリガーするブランチのパターン（正規表現）"
  default     = "^main$"
}

variable "included_files" {
  type        = list(string)
  description = "変更を監視するファイルパターンのリスト"
  default     = []
}

variable "cloudbuild_file_path" {
  type        = string
  description = "cloudbuild.yaml ファイルのパス"
}

variable "substitutions" {
  type        = map(string)
  description = "Cloud Build の置換変数"
  default     = {}
}
