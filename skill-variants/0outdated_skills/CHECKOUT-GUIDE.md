---
name: creditclaw-checkout-guide
version: 2.8.0
updated: 2026-03-14
description: "My Card — complete purchase flow, browser checkout, and confirmation."
companion_of: https://creditclaw.com/SKILL.md
api_base: https://creditclaw.com/api/v1
credentials: [CREDITCLAW_API_KEY]
---

# My Card — Checkout Guide

> **This file is a companion to [SKILL.md](https://creditclaw.com/SKILL.md).**
> For registration, card setup, spending permissions, and the full API reference, see the main skill file.

This guide covers the complete purchase flow — from requesting checkout approval through filling the merchant's payment form to confirming the result. This guide applies to both real purchases and the test checkout at `test_checkout_url` (received after card delivery).

**Security:** Never store, log, or persist decrypted card data. It should exist only in memory for the duration of this single checkout. Discard it immediately after.

---

## Purchase Flow

```
1. You decide a purchase is needed (and it's within your spending rules)
2. You call POST /bot/rail5/checkout with the merchant and amount details
3. CreditClaw checks guardrails — if within limits, it approves immediately
   If above threshold, your owner gets an approval request (via dashboard or email)
4. Once approved, call POST /bot/rail5/key to get the one-time decryption key
5. Decrypt the card details using AES-256-GCM
6. Navigate to the merchant's checkout page and fill the payment form
7. Call POST /bot/rail5/confirm with success or failure
8. Discard decrypted card data — it must not persist beyond this checkout
9. Announce the result to your human
```

---

## Step 1: Request Checkout

```bash
curl -X POST https://creditclaw.com/api/v1/bot/rail5/checkout \
  -H "Authorization: Bearer $CREDITCLAW_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "merchant_name": "DigitalOcean",
    "merchant_url": "https://cloud.digitalocean.com/billing",
    "item_name": "Droplet hosting - 1 month",
    "amount_cents": 1200,
    "category": "cloud_compute"
  }'
```

**Request fields:**
| Field | Required | Description |
|-------|----------|-------------|
| `merchant_name` | Yes | Merchant name (1-200 chars) |
| `merchant_url` | Yes | Merchant website URL |
| `item_name` | Yes | What you're buying |
| `amount_cents` | Yes | Amount in cents (integer) |
| `category` | No | Spending category |

**Response (approved):**
```json
{
  "approved": true,
  "checkout_id": "r5chk_abc123",
  "checkout_steps": [
    "Call POST /api/v1/bot/rail5/key with { \"checkout_id\": \"r5chk_abc123\" } to get the decryption key.",
    "Decrypt the encrypted card data using AES-256-GCM with the key, IV, and tag from the API response.",
    "Read creditclaw/CHECKOUT-GUIDE.md for browser checkout instructions. Use the decrypted card details to complete checkout at DigitalOcean.",
    "Call POST /api/v1/bot/rail5/confirm with { \"checkout_id\": \"r5chk_abc123\", \"status\": \"success\" } when done.",
    "If checkout fails, call confirm with { \"checkout_id\": \"r5chk_abc123\", \"status\": \"failed\" } instead.",
    "Discard all decrypted card data immediately.",
    "Announce the result."
  ],
  "spawn_payload": {
    "task": "You are a checkout agent...",
    "cleanup": "delete",
    "runTimeoutSeconds": 300,
    "label": "checkout-digitalocean"
  }
}
```

**Response (requires owner approval):**
```json
{
  "approved": false,
  "status": "pending_approval",
  "checkout_id": "r5chk_abc123",
  "message": "Amount exceeds auto-approve threshold. Your owner has been notified.",
  "expires_in_minutes": 15
}
```

### Waiting for Approval

If you receive `pending_approval`, you need to wait for your owner's response:

- **Via webhook:** If you registered with a `callback_url`, you'll receive a `wallet.spend.authorized` or `wallet.spend.declined` event automatically.
- **Via polling:** Call the endpoint below every 30 seconds until the status changes:

```bash
curl "https://creditclaw.com/api/v1/bot/rail5/checkout/status?checkout_id=r5chk_abc123" \
  -H "Authorization: Bearer $CREDITCLAW_API_KEY"
```

Response:
```json
{
  "checkout_id": "r5chk_abc123",
  "status": "pending_approval",
  "merchant_name": "DigitalOcean",
  "item_name": "Droplet hosting - 1 month",
  "amount_cents": 1200,
  "key_delivered": false,
  "confirmed_at": null,
  "created_at": "2026-03-09T12:00:00.000Z"
}
```

**Status values:**
| Status | Meaning |
|--------|---------|
| `pending_approval` | Owner hasn't responded yet — poll again in 30 seconds |
| `approved` | Owner approved — proceed with checkout |
| `rejected` | Owner declined — do not proceed |
| `expired` | 15-minute approval window passed — try again if needed |
| `completed` | Checkout confirmed successful |
| `failed` | Checkout reported failure |

Your owner receives the approval request via their dashboard and email. Approvals expire after 15 minutes.

## Step 2: Get Decryption Key

Once the checkout is approved, call this endpoint to retrieve the one-time decryption key:

```bash
curl -X POST https://creditclaw.com/api/v1/bot/rail5/key \
  -H "Authorization: Bearer $CREDITCLAW_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "checkout_id": "r5chk_abc123" }'
```

**Response:** `{ "key_hex": "...", "iv_hex": "...", "tag_hex": "..." }`

**This key is single-use.** It cannot be retrieved again for this checkout. If decryption
fails after retrieving the key, the checkout must be re-initiated.

## Step 3: Decrypt Card Details

Using the `key_hex`, `iv_hex`, and `tag_hex` from the API response, perform AES-256-GCM
decryption on the encrypted card data you received from your owner. This produces the
card details (number, CVV, expiry, name, billing address).

**Critical:** Never store, log, or persist the decrypted card data.
It should exist only in memory for the duration of this single checkout.

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

## Step 4: Fill the Checkout Form

### Pre-Check: Detect Platform & Payment Stack

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

### Agent-Browser (CLI) Checkout

**Always use `--efficient` on every snapshot command.** This is the single most important flag for browser checkout — it reduces page weight and keeps you within the snapshot budget.

#### Generic Rules

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

#### Shopify (CLI)

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

#### WooCommerce (CLI)

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

#### Stripe Iframe (CLI)

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

#### Multi-Step (CLI)

BigCommerce, some Magento, some custom sites. Steps separated by Continue/Next.

After each Continue click, wait for network idle:

```bash
openclaw browser snapshot --efficient --selector "form"
```

Fill visible fields → click Continue → repeat.

5-6 snapshots total.

#### Generic (CLI)

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

### Browser-Control (Playwright) Checkout

#### Generic Rules

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

#### Shopify (Playwright)

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

#### WooCommerce (Playwright)

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

#### Stripe Iframe (Playwright)

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

#### Multi-Step (Playwright)

```javascript
await page.getByRole('button', { name: /continue/i }).click();
await page.waitForLoadState('networkidle');
```

Then read next section and fill. 5-6 page reads total.

#### Generic (Playwright)

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

On success, capture the confirmation message or order number from the page.

---

## Step 5: Confirm Checkout

After completing (or failing) checkout at the merchant:

```bash
curl -X POST https://creditclaw.com/api/v1/bot/rail5/confirm \
  -H "Authorization: Bearer $CREDITCLAW_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "checkout_id": "r5chk_abc123", "status": "success" }'
```

Use `"status": "failed"` if checkout didn't work. On success, the transaction is recorded
in your owner's dashboard. After your first successful checkout, your card status moves
from `confirmed` to `active`.

Discard all decrypted card data immediately after confirming.
