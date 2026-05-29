---
name: creditclaw-secure-fill
description: >
  Pair and manage the CreditClaw Secure Fill Chrome extension. Use when
  the user mentions "extension", "connect extension", "pair extension",
  "CreditClaw extension ready", "ext-", or when the secure-checkout skill
  reports the extension is not configured. Also use to check extension
  status or troubleshoot extension connectivity.
---

# CreditClaw Secure Fill — Extension Pairing & Management

The CreditClaw Secure Fill Chrome extension provides **true credential isolation** for card checkout. It decrypts and fills payment forms without the agent ever seeing card data.

This skill covers pairing (first-time setup), status checking, and troubleshooting. For the actual checkout flow, see the `secure-checkout` skill.

## Security Rules

1. **Never decrypt card data yourself.** The extension does this.
2. **Never screenshot or DOM-read after triggering a fill.** Card numbers will be visible in the form.
3. **Never log, store, or repeat** any value from the encrypted blob, decryption key, or card fields.
4. **Capture the pay button selector BEFORE fill.** Click it blind after fill confirmation.

## Pairing (First Use)

When the user installs the extension, a setup page opens showing a connection string like:

> `CreditClaw extension ready: ext-abcdef123456`

The user will paste this into chat. When you see this pattern, run the setup flow:

### Step 1: Verify Extension

On any page, check if the extension is active:

```js
// Via global flag
window.__creditclawExtensionReady === true

// Via message
window.postMessage({ type: 'creditclaw-ping' }, '*');
// Listen for: { type: 'creditclaw-pong', ready: true, configured: false }
```

### Step 2: Send Credentials

The extension needs the CreditClaw API key and the encrypted card blob. The API key comes from `CREDITCLAW_API_KEY`. The encrypted blob comes from the `rail5.card.delivered` message (see `wallet` skill).

```js
window.postMessage({
  type: 'creditclaw-setup',
  api_key: '<CREDITCLAW_API_KEY>',
  encrypted_blob: '<encrypted_data from card delivery message>'
}, '*');
// Listen for: { type: 'creditclaw-setup-result', status: 'ready' }
```

### Step 3: Confirm

```js
window.postMessage({ type: 'creditclaw-ping' }, '*');
// Should return: { configured: true }
```

Tell the user: **"Connected to CreditClaw Secure Fill extension."** Setup is complete. This only needs to happen once — credentials persist in `chrome.storage.local`.

## Status Check

```js
window.postMessage({ type: 'creditclaw-status' }, '*');
// → { type: 'creditclaw-status-result', configured: true, has_api_key: true, has_blob: true }
```

## When the Extension is Missing

If `window.__creditclawExtensionReady` is not `true`, the extension is not installed. Tell the user:

> "To complete purchases securely, you'll need to install the CreditClaw Secure Fill Chrome extension. It ensures your card details are never visible to me — decryption and form filling happen entirely inside the extension."

Do NOT fall back to decrypting card data yourself. The entire point of the extension is credential isolation.

## Re-Pairing

If the API key changes (e.g., wallet re-registration) or the card blob is updated (new card delivered), re-run the setup flow. The extension overwrites the stored values.

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `__creditclawExtensionReady` is undefined | Extension not installed or page loaded before injection | Ask user to verify extension is installed; try refreshing the page |
| Ping returns `configured: false` | Setup hasn't been run | Run the pairing flow above |
| Setup returns error | Missing api_key or encrypted_blob | Verify CREDITCLAW_API_KEY is set and card has been delivered |
| Fill returns "Key fetch failed: 401" | Stored API key is invalid | Re-run setup with current API key |
| Fill returns "Decryption failed" | Encrypted blob is stale (card updated) | Re-run setup with fresh blob from latest `rail5.card.delivered` message |

## What the Extension Contains

The extension is a standalone Chrome extension (not bundled in this plugin) with these components:

| File | Purpose |
|------|---------|
| `background.js` | Service worker — fetches decryption key from CreditClaw API, decrypts card, routes fill commands |
| `content-setup.js` | Lightweight script on all pages — handles ping, setup, status messages |
| `content-main.js` | Checkout page script — receives fill requests, coordinates with background |
| `content-iframe.js` | Payment iframe script — registers fields, executes fill inside cross-origin iframes |
| `setup.html` | Auto-opens on install, shows connection string for pairing |

The extension source is maintained separately from this plugin. See the extension's own README for installation and development instructions.
