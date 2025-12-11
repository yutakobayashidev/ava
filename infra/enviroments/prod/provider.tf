terraform {
  required_version = "1.13.5"
  required_providers {
    stripe = {
      source  = "lukasaron/stripe"
      version = "~> 1.0"
    }
    axiom = {
      source = "axiomhq/axiom"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "5.10.1"
    }
  }
}

provider "stripe" {
  api_key = var.stripe_api_key
}

provider "axiom" {
  api_token = var.axiom_api_key
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

provider "google" {
  project = var.gcp_project_id
  region  = var.primary_region
}

provider "google-beta" {
  project = var.gcp_project_id
  region  = var.primary_region
}
