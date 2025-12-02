#!/bin/bash

set -eu

image="quay.io/terraform-docs/terraform-docs:0.20.0"

if [ "$#" -eq 0 ]; then
  set -- markdown /terraform-docs
fi

docker run --rm \
  -v "$PWD":/terraform-docs \
  -w /terraform-docs \
  -u "$(id -u)" \
  "$image" \
  "$@"
