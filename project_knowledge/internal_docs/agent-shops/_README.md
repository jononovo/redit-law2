---
name: Agent Shops
description: Module 7 — Checkout pages, shop storefronts, seller profiles, procurement controls. The merchant-facing commerce experiences.
---

# Agent Shops

Docs for Module 7. Covers the storefronts and checkout flows that agents interact with during purchases.

## Key code

- `app/api/v1/checkout/` — checkout flow API
- `app/api/v1/checkout-pages/` — configurable checkout page management
- `app/api/v1/shop/[slug]/` — public shop storefronts
- `app/api/v1/seller-profile/` — merchant profile management
- `lib/procurement/` — procurement types and integrations
- `lib/procurement-controls/evaluate.ts` — allow/blocklists, merchant evaluation
- `lib/shipping/` — shipping address management
- `app/api/v1/sales/` — sales tracking
- `app/api/v1/merchant-accounts/` — merchant account management

## Related modules

- **Module 4 (Payment Tools)** provides the payment rails used at checkout
- **Module 3 (Brands Index)** provides the merchant catalog that shops reference
