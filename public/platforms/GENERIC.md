---
name: platform-generic
platform: generic
updated: 2026-03-16
phase: procurement / browsing / navigation
---

# Generic — Platform Guide

Use this guide when the site doesn't match any known platform (Shopify, Amazon, etc.). Covers how to identify what you're dealing with and navigate it efficiently.

---

## Platform Detection Script

Run this on any page to identify the platform:

```javascript
var platform = 'unknown';

// Shopify
if (typeof Shopify !== 'undefined' && Shopify.shop) platform = 'shopify';
// WooCommerce
else if (document.querySelector('link[href*="woocommerce"], script[src*="woocommerce"], .woocommerce')) platform = 'woocommerce';
// Squarespace
else if (document.querySelector('script[src*="squarespace.com"]') || typeof Static !== 'undefined') platform = 'squarespace';
// BigCommerce
else if (document.querySelector('script[src*="cdn-bc.com"]') || typeof BCData !== 'undefined') platform = 'bigcommerce';
// Wix
else if (document.querySelector('meta[name="generator"][content*="Wix"]') || document.querySelector('script[src*="wixstatic.com"]')) platform = 'wix';
// Magento
else if (typeof require !== 'undefined' && document.querySelector('script[src*="mage"]')) platform = 'magento';

platform;
```

**Result → action:**

| Platform | Guide |
|----------|-------|
| `shopify` | → `platforms/SHOPIFY.md` |
| `woocommerce` | → this file (WooCommerce section below) |
| `squarespace` | → this file (Squarespace section below) |
| `bigcommerce` | → this file (BigCommerce section below) |
| `unknown` | → this file (Unknown site section below) |

---

## WooCommerce

**Detection:** `woocommerce` in stylesheet/script URLs, or `.woocommerce` CSS class on the body.

**URL patterns:**
- Products: `/product/{slug}/` or `/shop/`
- Cart: `/cart/`
- Checkout: `/checkout/`
- Categories: `/product-category/{slug}/`

**Add to cart:** Button with class `.add_to_cart_button` or `.single_add_to_cart_button`.

**Checkout:** Usually Stripe Elements (iframe). See `checkouts/GENERIC.md` for Stripe iframe handling.

---

## Squarespace

**Detection:** `static.squarespace.com` in scripts, or `Static` JS global.

**Navigation:** Squarespace sites vary heavily by template. Products are typically at `/shop` or `/store`. Add-to-cart buttons use `.sqs-add-to-cart-button`.

**Checkout:** Stripe Elements or Squarespace's built-in checkout. See `checkouts/GENERIC.md`.

---

## BigCommerce

**Detection:** `cdn-bc.com` in scripts, or `BCData` JS global.

**URL patterns:**
- Products: `/{slug}/` (flat URLs)
- Cart: `/cart.php`
- Checkout: `/checkout`

**Navigation:** Multi-step checkout is common. See `checkouts/GENERIC.md` (multi-step section).

---

## Unknown Sites

If no platform is detected:

1. **Look for product/cart patterns:**
   - Forms with add-to-cart actions
   - Cart icons or links in the header
   - Price elements near product images

2. **Look for payment stack:**
   - `iframe[src*="stripe"]` → Stripe Elements
   - `iframe[src*="braintree"]` → Braintree
   - `iframe[src*="adyen"]` → Adyen
   - No iframes with card fields → likely inline checkout

3. **Navigate cautiously:**
   - Use `--efficient` snapshots scoped to forms
   - Don't snapshot entire pages on unknown sites — they may be very large
   - Look for standard e-commerce patterns: "Add to cart", "Buy now", "Checkout"

For checkout on unknown sites → `checkouts/GENERIC.md`.
