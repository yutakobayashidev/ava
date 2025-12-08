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
  }
}

provider "stripe" {
  api_key = var.stripe_api_key
}

provider "axiom" {
  api_token = var.axiom_api_key
}
