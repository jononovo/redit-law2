---
name: checkout-shopify
platform: shopify
updated: 2026-03-16
---

# Shopify Checkout

Shopify uses a **single-page checkout** with shipping and payment together. Card fields live in **cross-origin iframes** — one iframe per field.

## Shopify Card Iframe Layout

| Field | Iframe name pattern |
|-------|-------------------|
| Card number | `card-fields-number-*` |
| Expiry | `card-fields-expiry-*` |
| CVV | `card-fields-verification_value-*` |
| Name on card | `card-fields-name-*` |

These iframes are cross-origin. You **cannot** use `evaluate` to run JavaScript inside them. You must use `--frame` targeting with snapshot + click/type.

---

## Phase 1: Shipping Info

Shipping fields are regular DOM elements — fill them normally.

```bash
openclaw browser snapshot --efficient --selector "form"
```

Fill in order:
1. **Email** — `type` on the email field
2. **Country** — custom dropdown: `click` → `type` first letters → `press Enter`
3. **First name, Last name** — `type` on each
4. **Address** — `type` the street address. **Wait 1-2 seconds** for autocomplete suggestions to appear, then `click` the matching suggestion. This **may** auto-fill city, state, and ZIP — but not always. After clicking, snapshot and verify those three fields. Fill manually any that are still empty.
5. **State** — treat as a React combobox: `click` to open → `type` the first letters → `press Enter` on the match. Some stores use a simpler native `<select>` instead — the same approach still works.
6. **Phone** — `type` the phone number. **Shopify often requires this.** Missing phone is a common cause of submit failure.
7. **Shipping method** — usually auto-selected (Free Shipping or cheapest). Verify with a snapshot if unsure.

Budget: **2 snapshots** for shipping.

---

## Phase 2: Card Fields

Card fields are inside cross-origin iframes. Use `--frame` to target each one.

### Card Number

```bash
openclaw browser snapshot --interactive --frame "iframe[name^='card-fields-number']"
openclaw browser click e<ref>
openclaw browser type e<ref> "<decrypted card number>"
```

### Expiry Date — CRITICAL

Shopify's expiry field auto-formats input (inserting " / " between month and year). Typing all digits at once will garble the field.

**You must type digit-by-digit with pauses:**

```bash
openclaw browser snapshot --interactive --frame "iframe[name^='card-fields-expiry']"
openclaw browser click e<ref>
openclaw browser press 1
# wait 1 second
openclaw browser press 2
# Shopify auto-formats to "12 / " — wait 2 seconds
openclaw browser press 2
# wait 1 second
openclaw browser press 9
# Field now shows "12 / 29"
```

**Rules for expiry:**
- Type each digit as a separate `press` command
- Wait **2 seconds** after the second month digit (the auto-formatter needs time)
- Wait **1 second** between other digits
- **Never** use `type` to enter all digits at once
- If the field shows the wrong value: `press End` → `press Backspace` ×10 to clear → retype

### CVV

```bash
openclaw browser snapshot --interactive --frame "iframe[name^='card-fields-verification']"
openclaw browser click e<ref>
openclaw browser type e<ref> "<decrypted cvv>"
```

### Name on Card

Often auto-filled from shipping info. Check before filling.

```bash
openclaw browser snapshot --interactive --frame "iframe[name^='card-fields-name']"
```

If the name field is empty:
```bash
openclaw browser click e<ref>
openclaw browser type e<ref> "<cardholder name>"
```

Budget: **3-4 snapshots** for card fields (one per iframe you need to fill).

---

## Phase 3: Submit

```bash
openclaw browser snapshot --efficient --selector "form"
openclaw browser click e<pay_now_ref>
```

Wait **8-10 seconds** for processing. Then check for confirmation:

```bash
openclaw browser snapshot --efficient
```

Look for "Thank you for your purchase" or "Order confirmed" with an order number.

**If validation errors appear:**

| Error | Fix |
|-------|-----|
| "Enter a phone number" | Go back, fill phone field, resubmit |
| "Enter a valid card number" | Re-fill card number iframe |
| "Enter a valid expiry date" | Clear and retype expiry digit-by-digit |
| "Enter a security code" | Re-fill CVV iframe |

---

## Total Snapshot Budget

| Phase | Snapshots |
|-------|-----------|
| Shipping | 2 |
| Card fields | 3-4 |
| Submit + confirm | 1-2 |
| **Total** | **6-8** |

---

## Common Pitfalls

1. **Expiry garbling** — The #1 issue. Always type digit-by-digit with pauses. Never use `type` for the full expiry string.
2. **Missing phone number** — Shopify requires it on most stores. Fill it during shipping.
3. **Address autocomplete** — Don't manually fill city/state/zip if autocomplete is available. Click the suggestion instead.
4. **Name on card auto-fill** — Check before typing. Overwriting the auto-filled name can cause issues.
5. **Iframe ref scoping** — Refs from `--frame` snapshots are scoped to that frame. You need a new snapshot when switching to a different iframe or back to the main page.
