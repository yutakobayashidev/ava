output "secret_ids" {
  description = "Map of secret IDs"
  value = {
    database_user     = google_secret_manager_secret.database_user.secret_id
    database_password = google_secret_manager_secret.database_password.secret_id
    database_host     = google_secret_manager_secret.database_host.secret_id
    database_port     = google_secret_manager_secret.database_port.secret_id
    database_db       = google_secret_manager_secret.database_db.secret_id
  }
}
