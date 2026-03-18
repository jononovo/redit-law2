# PROCUREMENT.md — Change Notes

**Date:** 2026-03-17
**Applies to:** `public/PROCUREMENT.md` v2.9.0 → proposed v2.10.0

---

## What Changed in PROCUREMENT.md

### 1. Step order fixed to match actual execution flow

**Before:** Steps went 1 (vendor check) → 2 (detect) → 3 (route) → 4 (identify payment form) → 5 (browse) → 6 (checkout).

**After:** Steps go 1 (vendor check) → 2 (detect) → 3 (route) → 4 (browse) → 5 (checkout) → 6 (identify payment form).

Browsing and product selection now come before payment form detection, which is when they actually happen. Payment form identification moved to Step 6 — it runs at checkout time, after the agent has already navigated the store, found the product, and gotten approval.

### 2. Step 6 adds short-circuits for known platforms

Shopify and Amazon don't need the generic payment form detection. Step 6 now starts with:

> **If you already know it's Shopify** → go directly to `checkouts/SHOPIFY.md`. Shopify checkout always uses cross-origin iframes (`card-fields-*` pattern).
>
> **If you already know it's Amazon** → skip this step. Amazon uses saved payment methods, not card form entry.

This saves a snapshot on the two most common platforms.

### 3. Detection script consolidated and improved

All signals for each platform combined into single `if` blocks with `||` operators. Any one signal triggers the match.

Key improvements:

**Shopify** — 4 signals (was 1):
```javascript
if ((typeof Shopify !== 'undefined' && Shopify.shop)
  || document.querySelector('script[src*="cdn.shopify.com"]')
  || document.querySelector('link[href*="monorail-edge.shopifysvc.com"]')
  || document.querySelector('[id^="shopify-section"]')) p = 'shopify';
```
Catches headless/custom themes that strip `Shopify.shop`.

**Amazon** — 3 signals (was 1), moved to second position:
```javascript
else if ((typeof ue !== 'undefined' && typeof AmazonUIPageJS !== 'undefined')
  || (document.querySelector('#nav-logo-sprites') && document.querySelector('#twotabsearchtextbox'))
  || document.querySelector('script[src*="images-na.ssl-images-amazon.com"]')) p = 'amazon';
```
Checked before generic platforms to avoid false positives from Amazon's third-party scripts.

**WooCommerce** — added `wp-content/plugins/woocommerce` script src check.

**Magento** — tightened `mage` to `mage/` (trailing slash) to avoid false matches. Added `varien` and `requirejs/require` as secondary signals.

---

## Recommended Changes to Other Files

### SKILL.md — End-to-End Flow (high priority)

The current flow in `SKILL.md` skips straight from "wallet activates" to "follow CHECKOUT-GUIDE.md":

```
8. When you need to make a purchase, follow CHECKOUT-GUIDE.md
```

This should become two steps — procurement first, then checkout:

```
8. When you need to buy something, start with PROCUREMENT.md — detect the merchant,
   navigate the store, find the product, and add to cart
9. When ready to check out, follow CHECKOUT-GUIDE.md for approval, decryption,
   and payment form filling
```

(Renumber subsequent steps accordingly.)

**Why:** An agent reading SKILL.md currently has no indication that PROCUREMENT.md exists until it's deep into the checkout flow. The main skill file should establish the correct order: procure first, then check out.

### CHECKOUT-GUIDE.md — Step 4a (medium priority)

The current Step 4a has a full inline detection table. This was reportedly already replaced with a pointer to PROCUREMENT.md. The wording should be a **fallback**, not the primary path:

**Replace Step 4a with:**

```markdown
### 4a. Platform & Payment Form Detection

If you haven't already detected the platform via `PROCUREMENT.md`, do it now —
see PROCUREMENT.md Step 2 (platform detection) and Step 6 (payment form identification).

If you already ran detection during the browsing phase, skip to 4b.
```

**Why:** By the time an agent reaches Step 4 of CHECKOUT-GUIDE.md, it should have already run PROCUREMENT.md during browsing. The detection pointer here is a safety net, not the primary entry point.

### OPENCLAW.md — Step 6a (medium priority)

Same change as CHECKOUT-GUIDE.md. Replace the inline detection table with:

```markdown
### 6a. Platform & Payment Form Detection

If you haven't already detected the platform via `PROCUREMENT.md`, do it now —
see PROCUREMENT.md Step 2 and Step 6.
```

### platforms/GENERIC.md — Already done

Detection script and routing table already removed. Now starts with a pointer to PROCUREMENT.md and contains only navigation content (WooCommerce, Squarespace, BigCommerce, unknown sites). No further changes needed.

### checkouts/GENERIC.md — Already done

"Step 1: Identify the Form" pre-check already removed. Now starts with a pointer to PROCUREMENT.md and contains only form-filling mechanics. No further changes needed.

### platforms/SHOPIFY.md, platforms/AMAZON.md — No change

Their detection signal sections serve as confirmation/reference within the platform guide. These are useful when the agent is already on the platform and needs to understand available globals and DOM structure. Not duplicating the routing logic.

---

## Summary

| File | Status | Action |
|------|--------|--------|
| `PROCUREMENT.md` | **Updated** | Steps reordered, detection script improved, short-circuits added |
| `SKILL.md` | **Needs update** | Add PROCUREMENT.md to End-to-End Flow before CHECKOUT-GUIDE.md |
| `CHECKOUT-GUIDE.md` | **Needs update** | Step 4a → fallback pointer to PROCUREMENT.md |
| `OPENCLAW.md` | **Needs update** | Step 6a → fallback pointer to PROCUREMENT.md |
| `platforms/GENERIC.md` | Done | Already trimmed |
| `checkouts/GENERIC.md` | Done | Already trimmed |
| `platforms/SHOPIFY.md` | No change | Keep confirmation signals |
| `platforms/AMAZON.md` | No change | Keep confirmation signals |
