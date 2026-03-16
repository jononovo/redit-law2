#!/bin/bash
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOCKER_DIR="$(dirname "$SCRIPT_DIR")"
RESULTS_DIR="${DOCKER_DIR}/results"

mkdir -p "$RESULTS_DIR"

echo "=== CreditClaw Agent Isolation Tests ==="
echo ""

# 1. Start containers
echo "[1/5] Starting OpenClaw containers..."
cd "$DOCKER_DIR"
docker compose up -d --wait

# 2. Install CreditClaw skill in each container
echo "[2/5] Installing CreditClaw skill..."
for svc in openclaw-claude openclaw-openai openclaw-gemini; do
  echo "  Installing in ${svc}..."
  docker compose exec "$svc" clawhub install creditclaw || echo "  Warning: install failed for ${svc}"
done

# 3. Run test scenario in each container (parallel with PID tracking)
echo "[3/5] Running agent test scenarios (parallel)..."
pids=()
for svc in openclaw-claude openclaw-openai openclaw-gemini; do
  (
    echo "  Starting ${svc}..."
    docker compose exec "$svc" openclaw chat --message \
      "You have the creditclaw skill installed. Follow its instructions to register with creditclaw.com. Use bot_name 'test_${svc}' and owner_email 'test@creditclaw.com'. Report the api_key and claim_token you receive." \
      --output json > "${RESULTS_DIR}/${svc}.json" 2>&1
    echo "  ${svc} complete."
  ) &
  pids+=($!)
done

failed=0
for pid in "${pids[@]}"; do
  wait "$pid" || ((failed++))
done
[ "$failed" -eq 0 ] || echo "WARNING: $failed agent(s) failed"

# 4. Verify results
echo "[4/5] Verifying results..."
cd "$(dirname "$DOCKER_DIR")/.."
npx vitest run tests/agent/scenarios/verify-docker-results.test.ts

# 5. Teardown (also cleans up result files with keys)
echo "[5/5] Tearing down..."
cd "$DOCKER_DIR"
docker compose down -v
rm -f "${RESULTS_DIR}"/*.json

echo ""
echo "=== Done ==="
