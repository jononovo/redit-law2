---
name: checkout-generic
platform: generic
updated: 2026-03-16
---

# Generic Checkout

Use this guide when no platform-specific guide exists. Covers inline card fields, Stripe Elements iframes, WooCommerce, multi-step checkouts, and unknown platforms.

---

## Step 1: Identify the Form

```bash
openclaw browser snapshot --efficient --selector "form"
```

If no form found:
```bash
openclaw browser snapshot --efficient --depth 4
```

From the snapshot, determine:
- Are card fields **visible directly** (inline) or **inside iframes**?
- Is there a payment method selector (radio buttons, tabs)?
- Is the checkout single-page or multi-step?

---

## Inline Card Fields (No Iframes)

Card fields are regular inputs — fill them like any form field.

```bash
openclaw browser type e<card_number_ref> "<decrypted card number>"
openclaw browser type e<expiry_ref> "<MM/YY>"
openclaw browser type e<cvv_ref> "<decrypted cvv>"
openclaw browser type e<name_ref> "<cardholder name>"
```

Some forms have separate month/year dropdowns:
```bash
openclaw browser select e<month_ref> "12"
openclaw browser select e<year_ref> "2029"
```

---

## Stripe Elements (Iframe Card Fields)

Stripe puts card fields inside iframes sourced from `js.stripe.com`. There are two layouts:

**Single iframe** (all card fields in one frame):
```bash
openclaw browser snapshot --interactive --frame "iframe[src*='js.stripe.com']"
openclaw browser type e<card_ref> "<decrypted card number>"
openclaw browser type e<expiry_ref> "<MM/YY>"
openclaw browser type e<cvc_ref> "<decrypted cvv>"
```

**Split iframes** (one iframe per field):
```bash
openclaw browser snapshot --interactive --frame "iframe[name*='number']"
openclaw browser type e<ref> "<decrypted card number>"

openclaw browser snapshot --interactive --frame "iframe[name*='expiry']"
openclaw browser type e<ref> "<MM/YY>"

openclaw browser snapshot --interactive --frame "iframe[name*='cvc']"
openclaw browser type e<ref> "<decrypted cvv>"
```

**Important:** The submit button is always on the main page, not inside the iframe. Take a new main-page snapshot to find and click it.

---

## WooCommerce

WooCommerce usually uses Stripe Elements for card fields. The checkout form is `form.checkout`.

```bash
openclaw browser snapshot --efficient --selector "form.checkout"
```

1. Fill billing fields (name, address, email, phone) on the main page
2. If a payment method selector exists, click "Credit Card (Stripe)" if not already selected
3. Follow the **Stripe Elements** instructions above for card fields
4. Submit is typically a "Place order" button on the main page

---

## Braintree / Adyen (Iframe Card Fields)

Same approach as Stripe — card fields are in iframes.

**Braintree:**
```bash
openclaw browser snapshot --interactive --frame "iframe[name*='braintree']"
```

**Adyen:**
```bash
openclaw browser snapshot --interactive --frame "iframe[src*='adyen']"
```

Fill fields using refs from the iframe snapshot. Submit button is on the main page.

---

## Multi-Step Checkout

Some sites (BigCommerce, Magento, custom) split checkout across multiple pages or sections.

After filling each section:
```bash
openclaw browser click e<continue_ref>
openclaw browser wait --load networkidle
openclaw browser snapshot --efficient --selector "form"
```

Fill visible fields → click Continue → repeat until the payment step. Then use the appropriate card fill approach (inline or iframe).

Budget: **5-6 snapshots** for multi-step flows.

---

## Dropdowns

**Native `<select>` elements:**
```bash
openclaw browser select e<ref> "United States"
```

**Custom/React dropdowns** (no `<select>` in the DOM):
```bash
openclaw browser click e<ref>              # open
openclaw browser type e<ref> "United"      # filter
openclaw browser press Enter               # select
```

If typing doesn't filter:
```bash
openclaw browser click e<ref>              # open
openclaw browser press ArrowDown           # navigate
openclaw browser press ArrowDown
openclaw browser press Enter               # select
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Card fields not visible | Check for iframes: `snapshot --interactive --frame "iframe"` |
| `click`/`type` fails | `highlight e<ref>` to verify ref, then retry. Try `press Tab` to focus. |
| Field covered by overlay | Wait 2 seconds, retake snapshot, try again |
| Dropdown won't open | Try `click` then `press ArrowDown` then `press Enter` |
| Submit button not found | Take full page snapshot: `snapshot --efficient --depth 4` |
| Page unchanged after submit | Wait for network idle: `wait --load networkidle --timeout-ms 15000` |

---

## Budget

| Checkout type | Target | Max |
|---------------|--------|-----|
| Single-page, inline fields | 3 | 5 |
| Single-page, iframe fields | 5 | 8 |
| Multi-step | 5 | 8 |

**CAPTCHA / 3DS / OTP → fail immediately.** Do not attempt to solve these.
