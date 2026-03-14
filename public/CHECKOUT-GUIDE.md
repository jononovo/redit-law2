---
name: creditclaw-checkout-guide
version: 2.7.0
updated: 2026-03-13
description: "Browser checkout guide — platform detection, form filling, iframe handling."
companion_of: https://creditclaw.com/SKILL.md
api_base: https://creditclaw.com/api/v1
credentials: [CREDITCLAW_API_KEY]
---

# Browser Checkout Guide

> **This file is a companion to [SKILL.md](https://creditclaw.com/SKILL.md).**
> For the card checkout API flow (requesting checkout, getting the decryption key, confirming), see [ENCRYPTED-CARD.md](https://creditclaw.com/ENCRYPTED-CARD.md).

After decrypting your card details, use this guide to complete the purchase on the merchant's website. This guide applies to both real purchases and the test checkout at `test_checkout_url` (received after card delivery).

**Security:** Never store, log, or persist decrypted card data. It should exist only in memory for the duration of this single checkout. Discard it immediately after submitting the form.

---

## Card Data → Form Fields

The decrypted card data maps to checkout form fields as follows:

| Decrypted Field | Form Field | Format Notes |
|-----------------|------------|--------------|
| `number` | Card number | Enter as-is (e.g. `4111111111111111`) |
| `exp_month` + `exp_year` | Expiration date | Combine as `MM/YY` (e.g. `03/26`). Some forms use separate month/year fields. |
| `cvv` | Security code / CVV / CVC | 3 or 4 digits |
| `name` | Name on card / Cardholder name | Enter as-is |
| `address` | Billing address line 1 | If present. Some forms pre-fill from shipping. |
| `city` | Billing city | If present |
| `state` | Billing state / province | If present. May be a dropdown. |
| `zip` | Billing ZIP / postal code | If present |
| `country` | Billing country | If present. Usually a dropdown. |

Fields marked "if present" are optional in the decrypted data. If the form requires them but the card data doesn't include them, leave the form's default or pre-filled value.

---

## Pre-Check: Detect Platform & Payment Stack

Always run this before filling any fields. One snapshot of the page head is enough.

```bash
openclaw browser snapshot --efficient --selector "head" --depth 2
```

Search the output for these signals:

| Signal | Result |
|--------|--------|
| `cdn.shopify.com` or `Shopify.theme` | **SHOPIFY** |
| `/wp-content/plugins/woocommerce/` | **WOOCOMMERCE** |
| `static.squarespace.com` | **SQUARESPACE** |
| `wixstatic.com` | **WIX** |
| `cdn-bc.com` or `"BigCommerce"` | **BIGCOMMERCE** |
| `Mage.Cookies` or `/skin/frontend/` | **MAGENTO** |

Then check for payment stack:

| Signal | Result |
|--------|--------|
| `js.stripe.com` in `<script>` or `<iframe>` | **STRIPE** — card fields in iframe |
| `adyen` in `<script>` or `<iframe>` | **ADYEN** — card fields in iframe |
| `braintreegateway.com` | **BRAINTREE** — card fields in iframe |
| Card fields visible directly (no iframe) | **INLINE** — fill directly |

Also note:
- `data-reactroot` or `react` in scripts → **React** (custom dropdowns, async rendering)
- `<select>` elements for country/state → native dropdowns
- No `<select>` but dropdown UI → custom dropdowns (click → type → Enter)

Now proceed to the matching checkout section below.

---

## Agent-Browser (CLI) Checkout

### Setup

Set this once so `--efficient` is always the default:

```json
{
  "browser": { "snapshotDefaults": { "mode": "efficient" } }
}
```

Save to `~/.openclaw/openclaw.json`.

### Generic Rules

```bash
openclaw browser snapshot --efficient --selector "form"
```

If no form found:

```bash
openclaw browser snapshot --efficient --depth 4
```

Interact using role refs from snapshot output:

```bash
openclaw browser click e12
openclaw browser type e13 "card data here"
```

If click/type fails — debug with highlight:

```bash
openclaw browser highlight e12
```

If card fields not visible — check for iframe:

```bash
openclaw browser snapshot --interactive --frame "iframe"
openclaw browser snapshot --interactive --frame "iframe[src*='stripe']"
openclaw browser snapshot --interactive --frame "iframe[src*='adyen']"
```

For native `<select>` dropdowns:

```bash
openclaw browser select e14 "United States"
```

For custom/React dropdowns:

```bash
openclaw browser click e14
openclaw browser type e14 "United"
openclaw browser press Enter
```

If filter doesn't work:

```bash
openclaw browser press ArrowDown
openclaw browser press Enter
```

Wait for network idle after every navigation or button click before snapshotting.

**Budget:** 5 snapshots target. 8 max. Fail if exceeded.

**CAPTCHA / 3DS / OTP →** fail immediately.

Max 2 retries per field. On failure:

```bash
openclaw browser snapshot --efficient
openclaw browser highlight e12
```

Still failing → keyboard nav:

```bash
openclaw browser press Tab
openclaw browser type e12 "value"
```

### Shopify (CLI)

Card fields: **inline** — no iframe needed. Directly visible in form snapshot.
Expiry: single MM/YY field.
Dropdowns (country, state): custom — click, type first letters, Enter.
Billing: "Same as shipping" checkbox pre-checked. Leave it.

```bash
openclaw browser snapshot --efficient --selector "form"
```

Fill: email, country, first name, last name, address, city, state, zip, phone.
Fill: card number, expiry (MM/YY), security code, name on card.
Click submit ("Pay now" / "Complete order").

3-4 snapshots total.

### WooCommerce (CLI)

Card fields: usually **Stripe iframe**. May need to click "Credit Card" radio first.
Dropdowns: Select2 (custom) — click, type, Enter.

```bash
openclaw browser snapshot --efficient --selector "form.checkout"
```

Fill billing fields.
Click "Credit Card (Stripe)" if payment method not pre-selected.

```bash
openclaw browser snapshot --interactive --frame "iframe[src*='js.stripe.com']"
```

Fill card fields inside iframe.
Back to main page for submit:

```bash
openclaw browser click e_submit_button_ref
```

3-5 snapshots total.

### Stripe Iframe (CLI)

Applies to any site using Stripe Elements (Squarespace, WooCommerce, custom sites).

Fill address/shipping on main page first:

```bash
openclaw browser snapshot --efficient --selector "form"
```

Then scope to Stripe iframe for card fields:

```bash
openclaw browser snapshot --interactive --frame "iframe[src*='js.stripe.com']"
```

Fill card number, expiry, CVC using refs from iframe snapshot.
Switch back to main page to click submit — submit button is NOT in the iframe.

Stripe may use one combined field or separate iframes for number/expiry/CVC.

3-4 snapshots total.

### Multi-Step (CLI)

BigCommerce, some Magento, some custom sites. Steps separated by Continue/Next.

After each Continue click, wait for network idle:

```bash
openclaw browser snapshot --efficient --selector "form"
```

Fill visible fields → click Continue → repeat.

5-6 snapshots total.

### Generic (CLI)

```bash
openclaw browser snapshot --efficient --selector "form"
```

Fill address/billing from decrypted card data.

Card fields not visible?

```bash
openclaw browser snapshot --interactive --frame "iframe"
```

Still not visible?

```bash
openclaw browser snapshot --efficient --depth 4
```

Submit → wait for confirmation page.

---

## Browser-Control (Playwright) Checkout

### Generic Rules

- Scope actions to the checkout form — do not interact with the full page.
- Use role-based or accessibility selectors, not CSS class selectors. CSS breaks on re-renders.
- Fill all visible fields before triggering any new page action.
- After any navigation or button click, wait for `networkidle` before reading the page.
- If a field is not interactable (`not visible`, `covered`, `strict mode`), wait 1-2 seconds and retry.
- Budget: 5 page reads target. 8 max. Fail if exceeded.
- CAPTCHA / 3DS / OTP → fail immediately.
- Max 2 retries per field. On third failure, try Tab key to focus the field, then type.

For iframe-based card fields (Stripe, Adyen, Braintree):
- Locate the iframe: `page.frameLocator('iframe[src*="stripe"]')` or similar.
- Interact with fields inside the frame context.
- Switch back to main page context to click the submit button.

For native `<select>` dropdowns: use `selectOption()`.
For custom/React dropdowns: click the trigger → type to filter → press Enter.
If filter doesn't work: click trigger → ArrowDown to target → Enter.

### Shopify (Playwright)

Card fields: **inline** — no iframe. Directly in the DOM.
Expiry: single MM/YY field.
Dropdowns (country, state): custom React — `click()` → `type()` → `press('Enter')`.
Billing: "Same as shipping" checkbox pre-checked. Don't touch.

```javascript
const form = page.locator('form');
await form.getByLabel('Email').fill('...');
await form.getByLabel('Card number').fill('4111...');
await form.getByLabel('Expiration date').fill('12/26');
await form.getByLabel('Security code').fill('123');
await form.getByRole('combobox', { name: /country/i }).click();
await page.keyboard.type('United States');
await page.keyboard.press('Enter');
```

3-4 page reads total.

### WooCommerce (Playwright)

Card fields: usually **Stripe iframe**.

```javascript
const form = page.locator('form.checkout');
await form.getByLabel('First name').fill('...');

const stripeFrame = page.frameLocator('iframe[src*="js.stripe.com"]');
await stripeFrame.getByPlaceholder('Card number').fill('4111...');
await stripeFrame.getByPlaceholder('MM / YY').fill('12/26');
await stripeFrame.getByPlaceholder('CVC').fill('123');

await page.getByRole('button', { name: /place order/i }).click();
```

3-5 page reads total.

### Stripe Iframe (Playwright)

Applies to any site using Stripe Elements.

```javascript
const stripeFrame = page.frameLocator('iframe[src*="js.stripe.com"]');
await stripeFrame.locator('[name="cardnumber"]').fill('4111...');
await stripeFrame.locator('[name="exp-date"]').fill('12/26');
await stripeFrame.locator('[name="cvc"]').fill('123');
```

Stripe may use split iframes — each field in its own iframe:

```javascript
const numFrame = page.frameLocator('iframe[name*="number"]');
const expFrame = page.frameLocator('iframe[name*="expiry"]');
const cvcFrame = page.frameLocator('iframe[name*="cvc"]');
```

Submit button is always on the main page. 3-4 page reads total.

### Multi-Step (Playwright)

```javascript
await page.getByRole('button', { name: /continue/i }).click();
await page.waitForLoadState('networkidle');
```

Then read next section and fill. 5-6 page reads total.

### Generic (Playwright)

```javascript
const form = page.locator('form');

const iframe = page.frameLocator('iframe');

await page.getByRole('button', { name: /pay|submit|order/i }).click();
await page.waitForLoadState('networkidle');
```

---

## After Submission

After clicking the submit/pay button, wait for the confirmation page to load. Look for these signals to determine success:

| Signal | Meaning |
|--------|---------|
| "Thank you", "Order confirmed", "Order #..." | **Success** — capture the order number or confirmation text |
| "Payment successful", "Receipt" | **Success** |
| "Payment declined", "Card declined" | **Failed** — report as failed |
| "Error", "try again" | **Failed** — do not retry automatically |
| Page unchanged or spinner persists after 30 seconds | **Failed** — report as failed |

On success, capture the confirmation message or order number from the page. Pass this back when confirming the checkout.
