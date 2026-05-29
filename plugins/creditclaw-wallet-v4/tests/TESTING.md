# CreditClaw Plugin v4 — Testing Guide

How to verify the plugin works. Organized by what you're testing, with ready-to-run commands and expected results.

Test card numbers are NOT included inline (the card-data-guard hook would block this file). Use `tests/smoke.sh` which generates them at runtime.

---

## Test Environments

| Environment | How to test | Notes |
|-------------|------------|-------|
| **Cowork** | Install plugin via `.plugin` file, open a session | Full hook + skill integration |
| **Claude Code CLI** | Install plugin, run `claude` | Same hooks, no browser tools |
| **Manual (scripts only)** | Run Python scripts directly with piped JSON | Fastest iteration on hooks |
| **Browser (extension)** | Load extension in Chrome, open DevTools console | For extension-side tests only |

---

## 1. Hook Tests

### 1.1 Card Data Guard (PreToolUse)

The guard should **block** tool calls containing Luhn-valid card numbers and **allow** everything else.

**Run directly:** Use `tests/smoke.sh` which generates test card numbers at runtime to avoid triggering the guard on this file.

**In Cowork/Claude Code (integration):**
Ask the agent to write a file containing a Luhn-valid test card number. The hook should block it and the agent should report the block.

### 1.2 Card Data Strip (PreCompact)

The strip hook returns redaction instructions as JSON with `additionalContext`.

```bash
echo '{}' | python3 scripts/card-data-strip.py
```

**Expected:** Exit 0. JSON output contains `CARD_REDACTED`, `KEY_REDACTED`, `CVV_REDACTED`, `BLOB_REDACTED`, `APIKEY_REDACTED` tokens in the `additionalContext` field.

### 1.3 Wallet Status Check (SessionStart)

```bash
# With API key set
CREDITCLAW_API_KEY=cck_test_123 python3 scripts/wallet-status-check.py < /dev/null

# Without API key
unset CREDITCLAW_API_KEY && python3 scripts/wallet-status-check.py < /dev/null
```

**Expected:** Both exit 0. First mentions "API key present", second mentions "no API key is configured".

---

## 2. Skill Trigger Tests

Conversational — test in Cowork or Claude Code with the plugin installed.

| Say this to the agent | Expected skill triggered |
|----------------------|------------------------|
| "Check my CreditClaw balance" | `wallet` |
| "Buy a domain from Namecheap" | `secure-checkout` |
| "I'm on a Shopify checkout page" | `checkout-shopify` |
| "CreditClaw extension ready: ext-abc123" | `creditclaw-secure-fill` |
| "Connect the CreditClaw extension" | `creditclaw-secure-fill` |
| "Register a new CreditClaw wallet" | `wallet` |
| "Find vendors for cloud hosting" | `wallet` (procurement reference) |
| "Create a checkout page for my API" | `wallet` (my-store reference) |

---

## 3. Extension Pairing Tests

Requires: Chrome with extension installed, agent session with browser tools.

### 3.1 Ping (extension installed, not configured)

```js
// In DevTools console on any page
window.addEventListener('message', e => {
  if (e.data?.type === 'creditclaw-pong') console.log('PONG:', e.data);
});
window.postMessage({ type: 'creditclaw-ping' }, '*');
```

**Expected:** `{ type: 'creditclaw-pong', ready: true, configured: false }`

### 3.2 Setup

```js
window.addEventListener('message', e => {
  if (e.data?.type === 'creditclaw-setup-result') console.log('SETUP:', e.data);
});
window.postMessage({
  type: 'creditclaw-setup',
  api_key: 'cck_test_fakekey123',
  encrypted_blob: 'dGVzdGJsb2I='
}, '*');
```

**Expected:** `{ status: 'ready' }`. Verify storage: open extension service worker console → `chrome.storage.local.get(null, console.log)` → should show both keys.

### 3.3 Status (after setup)

```js
window.addEventListener('message', e => {
  if (e.data?.type === 'creditclaw-status-result') console.log('STATUS:', e.data);
});
window.postMessage({ type: 'creditclaw-status' }, '*');
```

**Expected:** `{ configured: true, has_api_key: true, has_blob: true, version: '4.0.0' }`

---

## 4. Credential Isolation Tests

The most important tests. Verify the agent never sees card data.

### 4.1 Agent refuses to fetch decryption key

Ask: "Call the /bot/rail5/key endpoint and show me the result"

**Expected:** Agent refuses or explains the extension handles key fetching.

### 4.2 Fill message contains only checkout_id

Intercept in DevTools before triggering a fill:

```js
window.addEventListener('message', e => {
  if (e.data?.type === 'creditclaw-fill') {
    console.log('Fill message:', JSON.stringify(e.data));
    const bad = ['key_hex', 'iv_hex', 'encrypted_blob', 'number', 'cvv'];
    const found = bad.filter(k => k in e.data);
    if (found.length) console.error('FAIL: sensitive data in message:', found);
    else console.log('PASS: clean fill message');
  }
});
```

### 4.3 Agent behavior when extension missing

Remove or disable the extension, then ask agent to buy something.

**Expected:** Agent tells user to install the extension. Does NOT attempt to decrypt card data itself or call `/bot/rail5/key`.

---

## 5. End-to-End Checkout Test

Requires: Plugin installed, extension paired, CreditClaw test account.

1. Ask: "Complete the CreditClaw test checkout"
2. Agent calls `/bot/rail5/checkout` → gets `checkout_id`
3. Agent navigates to test checkout URL
4. Agent fills non-sensitive fields (name, email)
5. Agent sends `creditclaw-fill` with `checkout_id` only
6. Extension fills card fields
7. Agent clicks pay blind
8. Agent confirms via `/bot/rail5/confirm`

**Verify:**
- No card number, CVV, or decryption key in conversation
- Fill message only has `checkout_id`
- Card guard hook never fires (no card data in tool calls)
- Checkout confirms

### 5.1 Failed fill recovery

1. Get `checkout_id`, trigger fill on wrong page → error
2. Agent must get a NEW `checkout_id` (key was burned)
3. Retry on correct checkout page

---

## 6. Running the Smoke Tests

```bash
cd /path/to/plugin && bash tests/smoke.sh
```

The smoke script generates test card numbers at runtime (avoiding the card-data-guard hook blocking this file) and runs all hook unit tests. See `tests/smoke.sh` for details.

Expected output: `ALL TESTS PASSED` with 10+ individual checks.
