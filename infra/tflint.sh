#!/bin/bash

command=${@:1}

docker run -it --rm \
  -v $PWD:/work \
  -w /work \
  -t \
  --entrypoint "/bin/sh" \
  ghcr.io/terraform-linters/tflint:latest \
  -c "tflint --init && tflint $command"
