variable "product_name" {
  description = "Stripe product name"
  type        = string
  default     = "Basic Plan"
}

variable "product_description" {
  description = "Stripe product description"
  type        = string
  default     = "Basic subscription plan"
}

variable "product_active" {
  description = "Whether the Stripe product is active"
  type        = bool
  default     = true
}

variable "price_currency" {
  description = "Currency for the Stripe price"
  type        = string
  default     = "jpy"
}

variable "price_unit_amount" {
  description = "Unit amount for the Stripe price (in the smallest currency unit)"
  type        = number
  default     = 500
}

variable "price_lookup_key" {
  description = "Lookup key for the Stripe price"
  type        = string
  default     = "basic_monthly"
}

variable "price_interval" {
  description = "Recurring interval for the Stripe price"
  type        = string
  default     = "month"
  validation {
    condition     = contains(["day", "week", "month", "year"], var.price_interval)
    error_message = "Interval must be one of day, week, month, or year."
  }
}

variable "price_interval_count" {
  description = "Number of intervals between recurring payments"
  type        = number
  default     = 1
}
