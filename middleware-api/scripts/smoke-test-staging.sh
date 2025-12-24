#!/usr/bin/env bash
set -euo pipefail

if [ -z "${STAGING_URL:-}" ]; then
  echo "Please set STAGING_URL and STAGING_JWT (optional)"
  exit 2
fi

echo "Checking blockchain status at ${STAGING_URL}..."
curl -sS "${STAGING_URL}/api/blockchain/status" | jq .

echo "Checking patients route (expect 401 without auth)..."
curl -sS -i "${STAGING_URL}/api/v1/healthcare/patients"

if [ -n "${STAGING_JWT:-}" ]; then
  echo "Checking authenticated patients route with provided JWT..."
  curl -sS -i -H "Authorization: Bearer ${STAGING_JWT}" "${STAGING_URL}/api/v1/healthcare/patients" | jq .
fi

echo "Smoke test completed"