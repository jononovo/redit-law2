# CreditClaw Plugin v4 — Internal Technical Reference

Point-form guide to the hard parts. Read this before modifying anything.

---

## 1. Credential Isolation Boundary (The Core Change in v4)

- **v3 flaw:** Agent calls `POST /bot/rail5/key` → receives `key_hex` + `iv_hex` → passes them to browser via `javascript_tool` → agent has the decryption key in its context
- **v4 fix:** Agent only passes `checkout_id` → Chrome extension's `background.js` calls `/bot/rail5/key` itself → key never enters agent context
- The extension stores `api_key` and `encrypted_blob` in `chrome.storage.local` — set once during pairing, reused across all checkouts
- The agent sees: `checkout_id`, fill result status, `exp_month`, `exp_year`
- The agent never sees: `key_hex`, `iv_hex`, card number, CVV, cardholder name

**If you're editing the checkout flow and find yourself putting a decryption key in the agent's context, you've broken the isolation boundary.**

---

## 2. Single-Use Key Problem

- `/bot/rail5/key` returns the decryption key exactly **once** per `checkout_id`
- If the extension fetches the key and then fill fails (iframe not loaded, field not found, network drop), that `checkout_id` is burned
- Recovery: agent must call `/bot/rail5/checkout` again to get a fresh `checkout_id`
- This is the most common source of "stuck" checkouts — the key was consumed but fill didn't complete
- The extension does NOT cache keys — fetch, decrypt, zero, done

---

## 3. Three Zeroing Steps in background.js

All three must happen for credential isolation to hold:

1. **Key data** (`key_hex`, `iv_hex`) → zeroed immediately after `decryptCard()` returns, even on failure
2. **Card object** (number, cvv, name, exp) → zeroed after building fill commands
3. **Fill command values** → zeroed after routing to content scripts

If you add a new code path in `handleFill()`, make sure all three zeroing steps still execute. Watch for early returns that skip them.

---

## 4. Content Script Architecture (Three Scripts, Three Scopes)

| Script | Injected on | `all_frames` | Purpose |
|--------|------------|--------------|---------|
| `content-setup.js` | `<all_urls>` | `false` (top only) | Lightweight (~60 lines). Handles `ping`, `setup`, `status`. Sets `window.__creditclawExtensionReady`. Always present on every page. |
| `content-main.js` | Checkout URL patterns only | `false` (top only) | Receives `creditclaw-fill` from agent, resolves targets, forwards `creditclaw-fill-request` to background via `chrome.runtime.sendMessage`. |
| `content-iframe.js` | Payment provider iframe domains | `true` (all frames) | Runs inside cross-origin iframes (Shopify PCI, Stripe, Braintree, Adyen). Detects field type from iframe attributes, registers with background via `creditclaw-iframe-ready`, executes `creditclaw-fill-field` commands. |

**Why three scripts instead of one:**
- `content-setup.js` on `<all_urls>` must be tiny — it runs on every page load
- `content-main.js` has fill orchestration logic — only needed on checkout pages
- `content-iframe.js` must run with `all_frames: true` inside cross-origin iframes — can't be combined with top-frame-only scripts

**Common mistake:** Adding fill logic to `content-setup.js`. Don't — it runs on every page and bloats memory.

---

## 5. Message Flow (Full Sequence)

```
Agent (postMessage)                    Extension
─────────────────                      ─────────
creditclaw-fill {checkout_id, fields}
    ↓
content-main.js receives via window.addEventListener('message')
    ↓ resolves targets (inline vs iframe)
    ↓ chrome.runtime.sendMessage
background.js handleFill()
    ↓ chrome.storage.local.get → api_key, encrypted_blob
    ↓ fetch POST /bot/rail5/key → key_hex, iv_hex
    ↓ decryptCard() → card object
    ↓ zero key data
    ↓ build fill commands
    ↓ zero card object
    ↓ for each field:
    │   ├─ iframe field? → chrome.tabs.sendMessage(tabId, {fill-field}, {frameId})
    │   │     → content-iframe.js fills input, fires events, responds
    │   └─ inline field? → batch via creditclaw-inline-fill to content-main.js
    ↓ zero fill command values
    ↓ sendResponse({status, fields_filled, exp_month, exp_year})
        ↓
content-main.js sets window.__creditclawFillResult
    ↓
Agent polls window.__creditclawFillResult
```

---

## 6. Iframe Registration & Frame Routing

- `content-iframe.js` runs inside each payment iframe
- On load, it inspects the iframe's `name` attribute and `window.location` to determine field type
- It sends `creditclaw-iframe-ready { field: 'number' }` to background
- Background stores `tabId → Map<fieldType, frameId>` in the `frameMap`
- When filling, background uses `chrome.tabs.sendMessage(tabId, msg, { frameId })` to target the specific iframe
- `frameMap` is cleaned up on `chrome.tabs.onRemoved`

**Race condition:** If fill is triggered before iframes finish loading, `content-iframe.js` hasn't registered yet → frameMap lookup fails → falls back to inline fill attempt → likely fails. The agent should wait for full page load.

---

## 7. Pairing / Setup Flow

Two paths:

**Manual (Cowork/user-facing):**
1. Extension installs → `chrome.runtime.onInstalled` opens `setup.html`
2. `setup.html` displays connection string: `CreditClaw extension ready: ext-{chrome.runtime.id}`
3. User copies string to agent chat
4. Agent recognizes pattern → navigates to any page → sends `creditclaw-setup` via postMessage
5. `content-setup.js` relays to background → background stores in `chrome.storage.local`
6. `setup.html` watches `chrome.storage.onChanged` → transitions to "Connected" state

**Automated (headless/OpenClaw):**
1. Agent writes `config.json` into extension folder before Chrome launch
2. `background.js` IIFE reads `config.json` on startup → stores in `chrome.storage.local`
3. No user interaction needed

---

## 8. Hook Interactions

| Hook | When | What it does | Limitation |
|------|------|-------------|------------|
| `card-data-guard.py` (PreToolUse) | Before Bash, Write, Edit, javascript_tool | Luhn-checks for 13-19 digit card numbers, blocks the tool call | Does NOT fire for `computer` tool actions (clicks, typing). This is acceptable in v4 because the agent never has card plaintext to type. |
| `card-data-strip.py` (PreCompact) | Before context compaction | Injects redaction instructions for card numbers, hex keys, blobs, CVVs, API keys | Cannot programmatically rewrite the transcript — hooks can only add context. Relies on the compaction LLM following instructions. Defense-in-depth, not a guarantee. |
| `wallet-status-check.py` (SessionStart) | Session start | Checks for `CREDITCLAW_API_KEY` env var, warns if missing | Does not check extension status — extension check happens in the skill flow |

---

## 9. What the Plugin Does NOT Bundle

- **The Chrome extension itself.** The extension (`260323_chrome_extension_v2-secure-fill/`) is maintained and distributed separately. The plugin provides the *skill* for pairing with and using the extension, but doesn't contain the extension source.
- **Server-side logic.** All approval, key generation, and spending limit enforcement happens on `creditclaw.com`. The plugin is purely client-side orchestration.

---

## 10. Known Limitations & Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| `card-data-strip.py` is text instruction, not programmatic | Medium | Defense-in-depth; primary protection is that card data never enters context in v4 |
| Single-use key burn on failed fill | Medium | Agent must re-initiate checkout; documented in error handling |
| `chrome.storage.local` is unencrypted | Low | Stores API key + encrypted blob, not card plaintext. Encrypted blob is useless without one-time key from API |
| Extension not installed = no checkout | High | By design — refuse rather than fall back to insecure path |
| Iframe race condition | Medium | Agent should wait for full page load before triggering fill |
| `exp_month`/`exp_year` returned to agent | Low | Non-sensitive; needed for same-origin expiry dropdowns outside the payment iframe |

---

## 11. File Quick Reference

```
creditclaw-wallet-v4.plugin
├── .claude-plugin/plugin.json      ← version 0.4.0, metadata
├── README.md                       ← user/installer facing
├── docs/internal.md                ← YOU ARE HERE
├── hooks/hooks.json                ← 3 hooks: PreToolUse, PreCompact, SessionStart
├── scripts/
│   ├── card-data-guard.py          ← Luhn-based card blocker (unchanged from v3)
│   ├── card-data-strip.py          ← Enhanced redaction instructions (v4)
│   └── wallet-status-check.py      ← API key presence check (unchanged)
├── skills/
│   ├── wallet/                     ← Registration, status, spending, API ref (unchanged)
│   ├── secure-checkout/            ← Main checkout flow (REWRITTEN for extension)
│   ├── checkout-shopify/           ← Shopify-specific (REWRITTEN for extension)
│   └── creditclaw-secure-fill/     ← Extension pairing & management (NEW)
└── browser/
    └── detect-fields.js            ← Field detection utility (unchanged)
```
