#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")/.."
docker compose -f compose.yaml -f compose.prod-local.yaml config --quiet
pnpm test:security
pnpm audit --prod --audit-level high
if git ls-files --error-unmatch .env >/dev/null 2>&1; then
  echo "ERROR: .env está versionado" >&2
  exit 1
fi
if docker scout version >/dev/null 2>&1; then
  for service in api admin; do
    image=$(docker compose -f compose.yaml -f compose.prod-local.yaml images -q "$service")
    test -n "$image"
    docker scout cves --exit-code --only-severity critical,high "$image"
  done
else
  echo "Escaneo de imágenes pendiente: Docker Scout no está disponible." >&2
  exit 1
fi
