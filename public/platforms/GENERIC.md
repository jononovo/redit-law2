---
name: platform-generic
platform: generic
updated: 2026-03-18
phase: browsing / navigation
---

# Generic — Platform Guide

Use this guide when the site doesn't match any known platform (Shopify, Amazon, etc.). Covers how to navigate and interact with WooCommerce, Squarespace, BigCommerce, and unknown stores.

> **For platform detection and routing,** see `SHOPPING-GUIDE.md`. It will tell you which files to read.

---

## WooCommerce

**URL patterns:**
- Products: `/product/{slug}/` or `/shop/`
- Cart: `/cart/`
- Checkout: `/checkout/`
- Categories: `/product-category/{slug}/`

**Add to cart:** Button with class `.add_to_cart_button` or `.single_add_to_cart_button`.

**Checkout:** Usually Stripe Elements (iframe). See `checkouts/GENERIC.md` for Stripe iframe handling.

---

## Squarespace

**Navigation:** Squarespace sites vary heavily by template. Products are typically at `/shop` or `/store`. Add-to-cart buttons use `.sqs-add-to-cart-button`.

**Checkout:** Stripe Elements or Squarespace's built-in checkout. See `checkouts/GENERIC.md`.

---

## BigCommerce

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

2. **Navigate cautiously:**
   - Use `--efficient` snapshots scoped to forms
   - Don't snapshot entire pages on unknown sites — they may be very large
   - Look for standard e-commerce patterns: "Add to cart", "Buy now", "Checkout"

For checkout on unknown sites → `checkouts/GENERIC.md`.
