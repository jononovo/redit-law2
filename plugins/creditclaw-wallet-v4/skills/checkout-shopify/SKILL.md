---
name: checkout-shopify
description: >
  Shopify-specific checkout optimization. Use when the agent detects a Shopify
  checkout page (cdn.shopify.com, checkout.shopify.com, or Shopify.theme).
  Handles Shopify's cross-origin card iframes, auto-formatting expiry field,
  address autocomplete, and single-page checkout layout. This skill is loaded
  by the secure-checkout skill after platform detection.
---

# CreditClaw — Shopify Checkout (v4)

Optimized checkout flow for Shopify stores using the CreditClaw Secure Fill Chrome extension. Shopify uses **cross-origin iframes** for card fields — the extension handles filling them securely without card data ever entering Claude's context.

## v4 vs v3

In v3, Shopify card fields required the agent to decrypt card data in the browser and use `computer` tool typing to fill cross-origin iframes. Card plaintext passed through Claude's context.

In v4, the Chrome extension handles all decryption and filling — including inside cross-origin iframes. The agent only passes a `checkout_id`. **True credential isolation.**

## Shopify Architecture

Shopify's checkout is a **single page** with shipping + payment together. Card fields live in **cross-origin iframes** — one iframe per field:

| Field | Iframe name pattern |
|-------|-------------------|
| Card number | `card-fields-number-*` |
| Expiry | `card-fields-expiry-*` |
| CVV | `card-fields-verification_value-*` |
| Name on card | `card-fields-name-*` |

The extension's `content-iframe.js` is injected into these iframes automatically (matching `*://checkout.pci.shopifyinc.com/*`). It registers each field with the background service worker, which routes fill commands to the correct iframe.

## Checkout Flow

### Phase 1: Shipping Info (non-iframe, fast)

Fill all shipping fields using standard browser tools (`form_input`, `find`, `computer`):

1. **Email** — `form_input` on the email field
2. **First/Last name** — `form_input` on name fields
3. **Address** — Type the address, then **click the autocomplete suggestion** if one appears (it auto-fills city, state, ZIP)
4. **Phone** — `form_input` on the phone field (often required on Shopify)
5. **Shipping method** — Usually auto-selected (Free Shipping or cheapest). Verify it's selected.

### Phase 2: Card Fields (via extension)

**Step 1: Verify extension is ready**

```js
window.postMessage({ type: 'creditclaw-ping' }, '*');
// Should return: { type: 'creditclaw-pong', configured: true }
```

If not configured, run the pairing flow (see `creditclaw-secure-fill` skill).

**Step 2: Build targets with Shopify iframe selectors**

```js
const targets = {
  number: { type: 'iframe', selector: 'iframe[name^="card-fields-number"]' },
  verification_value: { type: 'iframe', selector: 'iframe[name^="card-fields-verification_value"]' }
};
```

The extension's `content-iframe.js` is already running inside these iframes. It detects field type from the iframe name and registers with the background worker.

**Step 3: Capture the pay button selector BEFORE fill**

```js
// Shopify's submit button
const payButtonSelector = 'button[type="submit"]';
// or find it: look for "Pay now" text
```

Capture this NOW. After fill, card data will be visible — do not read the page.

**Step 4: Trigger fill**

```js
window.postMessage({
  type: 'creditclaw-fill',
  checkout_id: '<checkout_id>',
  fields: ['number', 'verification_value'],
  targets: targets
}, '*');
```

**Step 5: Poll for result**

```js
// Poll every 500ms, timeout after 15 seconds
const result = window.__creditclawFillResult;
```

The result includes `exp_month` and `exp_year`. Use these for the expiry field if it's a separate dropdown (rare on Shopify — usually handled by the extension inside the expiry iframe).

**Step 6: Handle expiry if needed**

On most Shopify checkouts, the expiry field is inside `card-fields-expiry-*` iframe and is auto-filled by the extension. If the result shows expiry wasn't filled (check `errors` array), and the checkout has a separate same-origin expiry dropdown, use the returned `exp_month`/`exp_year` to select values.

### Phase 3: Submit (blind)

1. **Do NOT screenshot or read the page** — card data is visible in form fields
2. Click the pay button using the selector from Step 3
3. Wait 8–10 seconds for processing
4. Check for success: "Thank you for your purchase", order number
5. If validation errors appear (missing phone, invalid expiry), address them and retry

### Phase 4: Confirm with CreditClaw

```bash
curl -X POST https://creditclaw.com/api/v1/bot/rail5/confirm \
  -H "Authorization: Bearer $CREDITCLAW_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "checkout_id": "CHECKOUT_ID", "status": "success" }'
```

## Common Issues

| Issue | Solution |
|-------|----------|
| Extension fill times out | Shopify iframes may load slowly. Wait for full page load, retry |
| "Enter a phone number" error | Phone field is required — fill it before card fields |
| Address autocomplete popup | Click the matching suggestion to auto-fill city/state/zip |
| Expiry not filled | Extension should fill it via iframe. If not, use returned exp_month/exp_year on same-origin dropdown |
| `content-iframe.js` not loaded | Extension must have `*://checkout.pci.shopifyinc.com/*` in manifest. Verify extension is installed |
| Name on card already filled | Shopify auto-fills from shipping name — extension skips if field is non-empty |

## Timing Notes

- **After clicking Pay now**: Wait 8–10 seconds
- **Address autocomplete**: Appears ~1 second after typing address
- **Shipping method loading**: May take 2–3 seconds after address is filled
- **Extension fill**: Typically completes in 1–3 seconds (iframe registration + fill)

## Security Note

In v4, card plaintext NEVER passes through Claude's context on Shopify. The extension's `content-iframe.js` runs inside each payment iframe and fills fields directly. The background service worker fetches the decryption key from CreditClaw's API, decrypts the card, routes values to the correct iframe, and zeros everything. Claude only sees the checkout_id and the fill result status.
