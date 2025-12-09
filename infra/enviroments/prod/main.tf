module "stripe_subscription" {
  source = "../../modules/stripe-subscription"
}

resource "stripe_webhook_endpoint" "webhook" {
  url         = "${var.webhook_base_url}/api/stripe/webhook"
  description = "Webhook endpoint for subscription and customer events"
  enabled_events = [
    "customer.subscription.created",
    "customer.subscription.updated",
    "customer.subscription.deleted",
    "customer.deleted",
  ]
}

resource "axiom_dataset" "ava_otel_traces" {
  name        = "ava"
  description = "ava's otel traces"
}

resource "cloudflare_workers_kv_namespace" "forwarding_list" {
  account_id = var.cloudflare_account_id
  title      = "Email-Forwarding-List"
}

resource "cloudflare_workers_script" "email_forwarder" {
  account_id        = var.cloudflare_account_id
  script_name       = "email-forwarder-worker"
  content           = file("${path.module}/../worker/src/worker.js")
  main_module       = "worker.js"

  bindings  = [
    {
        name         = "FORWARDING_LIST_KV"
        type         = "kv_namespace"
        namespace_id = cloudflare_workers_kv_namespace.forwarding_list.id
    }
  ]
  observability = {
    enabled = true
    head_sampling_rate = 1
    logs = {
      enabled = true
      head_sampling_rate = 1
      invocation_logs = true
    }
  }
}

resource "cloudflare_email_routing_catch_all" "example_email_routing_catch_all" {
  zone_id = var.cloudflare_zone_id
  actions = [{
    type = "worker"
    value = [cloudflare_workers_script.email_forwarder.script_name]
  }]
  matchers = [{
    type = "all"
  }]
  enabled = true
  name = "Send to catch all this domain rule."
}
