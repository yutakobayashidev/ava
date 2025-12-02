#!/bin/bash

set -eu

script_dir="$(cd "$(dirname "$0")" && pwd)"
terraform_version="$(cat "$script_dir/.terraform-version")"

docker run -it --rm \
  -v "$PWD":/work \
  -w /work \
  hashicorp/terraform:"$terraform_version" \
  "$@"
