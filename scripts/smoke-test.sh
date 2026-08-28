#!/usr/bin/env bash
#
# smoke-test.sh
# Starts docker-compose, waits for /health, verifies 200 OK.
# Used by CI/CD pipeline (Phase 6).
#
# Usage: ./scripts/smoke-test.sh
# Prerequisites: docker-compose installed, Docker running

set -euo pipefail

HEALTH_URL="${HEALTH_URL:-http://localhost:3001/health}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:5173}"
TIMEOUT="${TIMEOUT:-60}"
CLEANUP="${CLEANUP:-true}"

echo "=== Smoke Test ==="
echo "Health URL: $HEALTH_URL"
echo "Frontend URL: $FRONTEND_URL"
echo "Timeout: ${TIMEOUT}s"
echo ""

# Function to cleanup on exit
cleanup() {
  if [ "$CLEANUP" = "true" ]; then
    echo ""
    echo "Cleaning up containers..."
    docker-compose down -v --remove-orphans 2>/dev/null || true
  fi
}
trap cleanup EXIT

# Start services
echo "Starting docker-compose services..."
docker-compose up -d --build

# Wait for backend health
echo ""
echo "Waiting for backend health check..."
START_TIME=$(date +%s)

while true; do
  CURRENT_TIME=$(date +%s)
  ELAPSED=$((CURRENT_TIME - START_TIME))

  if [ "$ELAPSED" -ge "$TIMEOUT" ]; then
    echo "ERROR: Health check timed out after ${TIMEOUT}s"
    docker-compose logs backend
    exit 1
  fi

  # Check health endpoint
  HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL" 2>/dev/null || echo "000")

  if [ "$HTTP_STATUS" = "200" ]; then
    echo "Backend health check passed (${ELAPSED}s)"
    break
  fi

  echo "  Waiting... (${ELAPSED}s elapsed, status: $HTTP_STATUS)"
  sleep 2
done

# Verify frontend is accessible
echo ""
echo "Checking frontend accessibility..."
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL" 2>/dev/null || echo "000")

if [ "$FRONTEND_STATUS" = "200" ]; then
  echo "Frontend accessible (status: $FRONTEND_STATUS)"
else
  echo "WARNING: Frontend returned status $FRONTEND_STATUS"
fi

# Verify backend health response body
echo ""
echo "Verifying health response body..."
HEALTH_BODY=$(curl -s "$HEALTH_URL" 2>/dev/null)

if echo "$HEALTH_BODY" | grep -q '"status"'; then
  echo "Health response body valid"
  echo "  $HEALTH_BODY"
else
  echo "WARNING: Health response body may be invalid"
  echo "  $HEALTH_BODY"
fi

echo ""
echo "=== Smoke Test Passed ==="
