# TFLint configuration file

tflint {
  required_version = ">= 0.58.1"
}

# Enable the Terraform language plugin (bundled with TFLint)
plugin "terraform" {
  enabled = true
  preset  = "recommended"
}

rule "terraform_unused_declarations" {
  enabled = true
}

rule "terraform_comment_syntax" {
  enabled = true
}

rule "terraform_documented_outputs" {
  enabled = true
}

rule "terraform_documented_variables" {
  enabled = true
}

rule "terraform_typed_variables" {
  enabled = true
}

rule "terraform_naming_convention" {
  enabled = true
}

rule "terraform_required_version" {
  enabled = true
}

rule "terraform_required_providers" {
  enabled = true
}

# Module inspection settings
config {
  call_module_type = "local"
}

# Currently, there's no official TFLint plugin for Cloudflare provider
# When it becomes available, you can add it like this:
# plugin "cloudflare" {
#   enabled = true
#   version = "0.1.0"
#   source  = "github.com/terraform-linters/tflint-ruleset-cloudflare"
# }
