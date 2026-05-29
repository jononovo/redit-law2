#!/bin/bash
# CreditClaw Plugin v4 — Smoke Tests
# Run from plugin root: bash tests/smoke.sh
#
# Generates test card numbers at runtime to avoid triggering
# the card-data-guard hook on the script file itself.

# Resolve plugin root from script location
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PLUGIN_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PLUGIN_ROOT"

PASS=0
FAIL=0

check() {
  local desc="$1" expected="$2" actual="$3"
  if [ "$expected" = "$actual" ]; then
    echo "  PASS: $desc"
    PASS=$((PASS + 1))
  else
    echo "  FAIL: $desc (expected exit $expected, got $actual)"
    FAIL=$((FAIL + 1))
  fi
}

# Wrapper: runs card-data-guard and captures exit code
guard() {
  echo "$1" | python3 scripts/card-data-guard.py 2>/dev/null
  echo $?
}

# Generate Luhn-valid test numbers at runtime
VISA=$(python3 -c "print('4' + '1' * 15)")
AMEX=$(python3 -c "print('3782822463' + '10005')")
MC=$(python3 -c "print('55' + '0' * 13 + '4')")
DISC=$(python3 -c "print('6011' + '1' * 11 + '7')")
INVALID=$(python3 -c "print('1234567890123456')")
VISA_SPACED=$(python3 -c "v='4'+'1'*15; print(v[:4]+' '+v[4:8]+' '+v[8:12]+' '+v[12:])")

echo "=== Card Data Guard (PreToolUse) ==="

RC=$(guard "{\"tool_name\":\"Bash\",\"tool_input\":{\"command\":\"$VISA\"}}")
check "Blocks Visa" 2 "$RC"

RC=$(guard "{\"tool_name\":\"Bash\",\"tool_input\":{\"command\":\"hello world\"}}")
check "Allows normal text" 0 "$RC"

RC=$(guard "{\"tool_name\":\"Write\",\"tool_input\":{\"content\":\"$VISA_SPACED\"}}")
check "Blocks spaced card in Write" 2 "$RC"

RC=$(guard "{\"tool_name\":\"Bash\",\"tool_input\":{\"command\":\"$INVALID\"}}")
check "Allows Luhn-invalid number" 0 "$RC"

RC=$(guard "{\"tool_name\":\"Bash\",\"tool_input\":{\"command\":\"$AMEX\"}}")
check "Blocks Amex" 2 "$RC"

RC=$(guard "{\"tool_name\":\"Bash\",\"tool_input\":{\"command\":\"$MC\"}}")
check "Blocks Mastercard" 2 "$RC"

RC=$(guard "{\"tool_name\":\"Bash\",\"tool_input\":{\"command\":\"$DISC\"}}")
check "Blocks Discover" 2 "$RC"

RC=$(guard "{\"tool_name\":\"Bash\",\"tool_input\":{\"command\":\"+15551234567\"}}")
check "Allows phone number" 0 "$RC"

RC=$(guard "{\"tool_name\":\"mcp__Claude_in_Chrome__javascript_tool\",\"tool_input\":{\"text\":\"var n=$VISA\"}}")
check "Blocks card in javascript_tool" 2 "$RC"

RC=$(guard "{\"tool_name\":\"Edit\",\"tool_input\":{\"new_string\":\"function add(a,b){return a+b}\"}}")
check "Allows normal Edit" 0 "$RC"

echo ""
echo "=== Card Data Strip (PreCompact) ==="

OUTPUT=$(echo '{}' | python3 scripts/card-data-strip.py 2>/dev/null)

echo '{}' | python3 scripts/card-data-strip.py > /tmp/_cc_strip_out.json 2>/dev/null
python3 -c "import json; d=json.load(open('/tmp/_cc_strip_out.json')); assert 'additionalContext' in d.get('hookSpecificOutput',{})"
check "Returns valid JSON structure" 0 $?

for TOKEN in CARD_REDACTED KEY_REDACTED CVV_REDACTED BLOB_REDACTED APIKEY_REDACTED; do
  echo "$OUTPUT" | grep -q "$TOKEN"
  check "Contains $TOKEN token" 0 $?
done

echo ""
echo "=== Wallet Status Check (SessionStart) ==="

CREDITCLAW_API_KEY=cck_test_123 python3 scripts/wallet-status-check.py < /dev/null 2>/dev/null | grep -q "API key present"
check "Detects API key present" 0 $?

unset CREDITCLAW_API_KEY 2>/dev/null
python3 scripts/wallet-status-check.py < /dev/null 2>/dev/null | grep -q "no API key"
check "Detects API key missing" 0 $?

echo ""
echo "==============================="
echo "Results: $PASS passed, $FAIL failed"
echo "==============================="
if [ "$FAIL" -eq 0 ]; then
  echo "ALL TESTS PASSED"
  exit 0
else
  echo "SOME TESTS FAILED"
  exit 1
fi
