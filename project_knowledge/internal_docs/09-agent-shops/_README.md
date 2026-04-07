---
name: Agent Shops
description: Module 9 — Checkout pages, shop storefronts, seller profiles, invoicing, inbound payment methods. How the world pays our merchants.
---

# Agent Shops

Docs for Module 9. Covers the storefronts, checkout flows, invoicing, and inbound payment methods that shoppers/agents use to pay at our hosted checkouts.

→ Start with `_overview.md` for the full system narrative.

## Key code — storefronts & commerce

- `server/storage/sales.ts` — checkout pages + sales CRUD
- `server/storage/seller-profiles.ts` — seller profile CRUD
- `server/storage/invoices.ts` — invoice CRUD
- `app/api/v1/checkout/` — checkout flow API
- `app/api/v1/checkout-pages/` — configurable checkout page management
- `app/api/v1/shop/[slug]/` — public shop storefronts
- `app/api/v1/seller-profile/` — merchant profile management
- `app/api/v1/sales/` — sales tracking
- `app/api/v1/invoices/` — invoicing
- `app/api/v1/merchant-accounts/` — merchant account management
- `lib/procurement-controls/evaluate.ts` — allow/blocklists, merchant evaluation (cross-module dep)
- `lib/shipping/` — shipping address management (cross-module dep)

## Key code — checkout payment methods

- `lib/x402/receive.ts`, `lib/x402/checkout.ts` — x402 receive side (autonomous agent payments)
- `lib/base-pay/verify.ts`, `lib/base-pay/sale.ts`, `lib/base-pay/ledger.ts` — Base Pay (one-tap USDC)
- `app/api/v1/checkout/[id]/pay/` — per-checkout payment handlers (x402, base-pay, stripe-onramp, testing)
- `lib/invoice-email.ts`, `lib/invoice-pdf.ts` — invoice delivery

## Related modules

- **Module 4 (Payment Tools)** is the outbound side — how our agents pay external merchants
- **Module 3 (Brands Index)** provides the merchant catalog that shops reference
- **Module 5 (Agent Interaction)** handles orders and approvals triggered by shop purchases
