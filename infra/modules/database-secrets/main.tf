# Enable Secret Manager API
resource "google_project_service" "secret_manager" {
  project = var.gcp_project_id
  service = "secretmanager.googleapis.com"

  disable_on_destroy = false
}

# DATABASE_USER secret
resource "google_secret_manager_secret" "database_user" {
  project   = var.gcp_project_id
  secret_id = "DATABASE_USER"

  replication {
    auto {}
  }

  depends_on = [google_project_service.secret_manager]
}

resource "google_secret_manager_secret_version" "database_user" {
  secret      = google_secret_manager_secret.database_user.id
  secret_data = var.database_user
}

# DATABASE_PASSWORD secret
resource "google_secret_manager_secret" "database_password" {
  project   = var.gcp_project_id
  secret_id = "DATABASE_PASSWORD"

  replication {
    auto {}
  }

  depends_on = [google_project_service.secret_manager]
}

resource "google_secret_manager_secret_version" "database_password" {
  secret      = google_secret_manager_secret.database_password.id
  secret_data = var.database_password
}

# DATABASE_HOST secret
resource "google_secret_manager_secret" "database_host" {
  project   = var.gcp_project_id
  secret_id = "DATABASE_HOST"

  replication {
    auto {}
  }

  depends_on = [google_project_service.secret_manager]
}

resource "google_secret_manager_secret_version" "database_host" {
  secret      = google_secret_manager_secret.database_host.id
  secret_data = var.database_host
}

# DATABASE_PORT secret
resource "google_secret_manager_secret" "database_port" {
  project   = var.gcp_project_id
  secret_id = "DATABASE_PORT"

  replication {
    auto {}
  }

  depends_on = [google_project_service.secret_manager]
}

resource "google_secret_manager_secret_version" "database_port" {
  secret      = google_secret_manager_secret.database_port.id
  secret_data = var.database_port
}

# DATABASE_DB secret
resource "google_secret_manager_secret" "database_db" {
  project   = var.gcp_project_id
  secret_id = "DATABASE_DB"

  replication {
    auto {}
  }

  depends_on = [google_project_service.secret_manager]
}

resource "google_secret_manager_secret_version" "database_db" {
  secret      = google_secret_manager_secret.database_db.id
  secret_data = var.database_db
}
