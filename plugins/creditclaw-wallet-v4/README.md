# CreditClaw Wallet Plugin (v4 — True Credential Isolation)

Give your agent spending power. Secure wallet management with true credential isolation via Chrome extension, browser-based checkout, vendor discovery, and storefront capabilities for Claude in Cowork.

## v4 vs v3

v3 decrypts card data in the browser via `javascript_tool` — the one-time decryption key (`key_hex`, `iv_hex`) passes through Claude's context. On Shopify, card plaintext also passes through Claude's context for `computer` tool iframe typing.

v4 uses the **CreditClaw Secure Fill Chrome extension** for all card decryption and form filling. The extension fetches the decryption key directly from the CreditClaw API. **Card plaintext and decryption keys never enter Claude's context.**

## Components

| Component | Purpose |
|-----------|---------|
| `skills/wallet/` | Core wallet management: registration, status, spending rules, API reference |
| `skills/secure-checkout/` | Extension-based checkout flow (v4) |
| `skills/checkout-shopify/` | Shopify-specific timing and field handling (v4) |
| `skills/creditclaw-secure-fill/` | Extension pairing, status, and troubleshooting |
| `browser/detect-fields.js` | Field detection script (used by extension for auto-detection context) |
| `hooks/hooks.json` | PreToolUse card guard, PreCompact card strip, SessionStart status check |
| `scripts/card-data-guard.py` | Blocks plaintext card patterns in Bash, Write, Edit, and javascript_tool calls |
| `scripts/card-data-strip.py` | Enhanced card/key/blob redaction guidance before context compaction |
| `scripts/wallet-status-check.py` | Checks wallet config on session start |

## Setup

### 1. CreditClaw API Key

```
CREDITCLAW_API_KEY=cck_live_...
```

If you don't have an API key, ask the agent to register a new wallet.

### 2. Chrome Extension

Install the CreditClaw Secure Fill Chrome extension. On first install, a setup page opens with a connection string — paste it into the agent chat to complete pairing.

The extension is maintained separately from this plugin. See the extension's README for installation.

## Security Model

1. **True credential isolation** — Extension fetches decryption key from CreditClaw API; agent never sees it
2. **CreditClaw server-side** — Owner approval, single-use decryption keys, spending limits
3. **PreToolUse hook** — Blocks plaintext card patterns in Bash/Write/Edit/javascript_tool calls
4. **PreCompact hook** — Enhanced redaction of card numbers, keys, blobs, and CVVs before compaction
5. **Extension zeroing** — Card plaintext, keys, and fill commands zeroed immediately after use

## Usage

- "Set up a CreditClaw wallet" — wallet registration
- "Buy X from Y" — secure checkout via extension
- "Connect the CreditClaw extension" — extension pairing
- "Check my wallet balance" — status check
- "Show my transactions" — transaction history
- "Find vendors for cloud hosting" — procurement search
- "Create a checkout page for my API" — storefront setup

## More Information

- [CreditClaw Dashboard](https://creditclaw.com/overview)
- [CreditClaw Documentation](https://creditclaw.com/SKILL.md)
