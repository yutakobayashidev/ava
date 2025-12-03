terraform {
  required_version = ">= 1.13.5"
  required_providers {
    stripe = {
      source  = "lukasaron/stripe"
      version = "~> 1.0"
    }
  }
}
