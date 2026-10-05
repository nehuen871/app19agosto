#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")/.."
docker compose -f compose.yaml -f compose.prod-local.yaml config --quiet
docker compose -f compose.yaml -f compose.prod-local.yaml up -d --build --wait --wait-timeout 180
docker compose -f compose.yaml -f compose.prod-local.yaml ps
