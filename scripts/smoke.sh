#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")/.."
# Test published ports from the resolved Compose model, including .env/overrides.
for service in api admin mobile; do
  address=$(docker compose -f compose.yaml -f compose.prod-local.yaml port "$service" "$(if [ "$service" = api ]; then echo 4000; elif [ "$service" = mobile ]; then echo 8081; else echo 3000; fi)")
  if [ "$service" = api ]; then
    curl -fsS "http://$address/health/live" >/dev/null
    curl -fsS "http://$address/health/ready" >/dev/null
    curl -fsS "http://$address/api/v1/news?limit=1" >/dev/null
    curl -fsS "http://$address/api/v1/push/config" >/dev/null
    curl -fsS "http://$address/api/v1/events?month=$(date +%Y-%m)&limit=1" >/dev/null
    curl -fsS "http://$address/api/v1/google-calendar/config" >/dev/null
    curl -fsS "http://$address/api/v1/auth/config" >/dev/null
  elif [ "$service" = mobile ]; then
    curl -fsS "http://$address/" >/dev/null
    curl -fsS "http://$address/api/v1/news?limit=1" >/dev/null
    curl -fsS "http://$address/api/v1/push/config" >/dev/null
    curl -fsS "http://$address/push-sw.js" >/dev/null
    curl -fsS "http://$address/calendar" >/dev/null
    curl -fsS "http://$address/account" >/dev/null
    curl -fsS "http://$address/api/v1/events?month=$(date +%Y-%m)&limit=1" >/dev/null
    curl -fsS "http://$address/api/v1/google-calendar/config" >/dev/null
    curl -fsS "http://$address/api/v1/auth/config" >/dev/null
  else
    curl -fsS "http://$address/admin/login" >/dev/null
    curl -fsS "http://$address/admin/oauth/config" >/dev/null
  fi
done
echo "Smoke tests OK"
