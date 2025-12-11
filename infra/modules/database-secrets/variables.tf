variable "gcp_project_id" {
  description = "GCP project ID"
  type        = string
}

variable "database_user" {
  description = "Database user"
  type        = string
  sensitive   = true
}

variable "database_password" {
  description = "Database password"
  type        = string
  sensitive   = true
}

variable "database_host" {
  description = "Database host"
  type        = string
  sensitive   = true
}

variable "database_port" {
  description = "Database port"
  type        = string
  sensitive   = true
}

variable "database_db" {
  description = "Database name"
  type        = string
  sensitive   = true
}
