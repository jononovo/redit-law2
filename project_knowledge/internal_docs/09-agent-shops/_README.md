---
name: Agent Shops
description: Module 9 — Checkout pages, shop storefronts, seller profiles, procurement controls, inbound payment methods. How the world pays our merchants.
---

# Agent Shops

Docs for Module 9. Covers the storefronts, checkout flows, and inbound payment methods that shoppers/agents use to pay at our hosted checkouts.

## Key code — storefronts

- `app/api/v1/checkout/` — checkout flow API
- `app/api/v1/checkout-pages/` — configurable checkout page management
- `app/api/v1/shop/[slug]/` — public shop storefronts
- `app/api/v1/seller-profile/` — merchant profile management
- `lib/procurement/` — procurement types and integrations
- `lib/procurement-controls/evaluate.ts` — allow/blocklists, merchant evaluation
- `lib/shipping/` — shipping address management
- `app/api/v1/sales/` — sales tracking
- `app/api/v1/merchant-accounts/` — merchant account management

## Key code — inbound payment methods

- `lib/x402/receive.ts`, `lib/x402/checkout.ts` — x402 receive side (autonomous agent payments)
- `lib/base-pay/verify.ts`, `lib/base-pay/sale.ts` — Base Pay (one-tap USDC)
- `lib/qr-pay/eip681.ts` — QR Pay (USDC transfer via QR code)
- `app/api/v1/payment-links/` — Payment Links (bot-generated Stripe Checkout URLs)
- `app/api/v1/checkout/[id]/pay/` — per-checkout payment handlers (x402, base-pay)

## Related modules

- **Module 4 (Payment Tools)** is the outbound side — how our agents pay external merchants
- **Module 3 (Brands Index)** provides the merchant catalog that shops reference
- **Module 5 (Agent Interaction)** handles orders and approvals triggered by shop purchases
