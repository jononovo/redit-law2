---
name: Agent Shops Module Reference
description: Complete reference for the inbound commerce engine — checkout pages, storefronts, seller profiles, invoicing, payment methods, and all related code paths. All payments flow inward into the seller's crypto wallet.
---

# 8. Agent Shops

The platform's inbound commerce engine. Every wallet holder becomes a seller via checkout pages, storefronts, and invoices. The inverse of outbound payment rails (Module 3) — this handles how the world pays our merchants, including bot-to-bot commerce via x402.

**All checkout payment methods are inbound** — they collect payments from buyers (humans or agents) and deposit funds into the seller's crypto wallet. These are not outward payments made by agents; those are handled by the payment rails in Module 3/4.

---

## Inbound Payment Methods (all deposit into seller's crypto wallet)

| Method | One-liner | Endpoint |
|--------|-----------|----------|
| **x402** | Autonomous agent-to-agent payments using EIP-3009 `transferWithAuthorization` on Base — enables bot-to-bot commerce | `POST /api/v1/checkout/[id]/pay/x402` |
| **Base Pay** | One-tap USDC payment on the Base network via `@base-org/account` popup — instant on-chain settlement | `POST /api/v1/checkout/[id]/pay/base-pay` |
| **Stripe Onramp** | Card or bank payment converted to USDC via Stripe's Crypto Onramp — fiat buyers can pay crypto sellers | `POST /api/v1/checkout/[id]/pay/stripe-onramp` |
| **USDC Direct** | Manual USDC transfer to the seller's wallet address — no intermediary, buyer sends directly on-chain | (on-chain transfer) |
| **Testing** | Development/test mode with a mock card form — creates a test sale, no real funds move | `POST /api/v1/checkout/[id]/pay/testing` |

Note: QR Pay and Stripe Onramp (top-up mode) are wallet funding methods under Module 3, not checkout payment methods.

---

## Core Primitives

- **Checkout Pages** (`checkout_pages`) — Public payment URLs with 3 page types: product, event, digital_product. Configurable allowed methods per page.
- **Sales** (`sales`) — Transaction records for every payment received. Tracks buyer info, payment method, tx hash, invoice linkage.
- **Seller Profiles** (`seller_profiles`) — Per-owner identity with shop slug, business name, logo. Powers the public storefront.
- **Invoices** (`invoices`) — Full lifecycle: draft → sent → viewed → paid. Email delivery with PDF attachment, linked to checkout page for collection.

---

## Pages

| Page | Route | Purpose |
|------|-------|---------|
| Checkout (public) | `/pay/[id]` | Split-panel buyer payment page — seller info left, payment widget right |
| Payment success | `/pay/[id]/success` | Post-payment confirmation |
| Storefront (public) | `/s/[slug]` | Public product grid with seller branding |
| Create Checkout | `/checkout/create` | Dashboard — create new checkout page |
| Shop Admin | `/shop` | Dashboard — configure storefront, toggle page visibility |
| My Sales | `/sales` | Dashboard — sales ledger with filters |
| Invoices | `/invoices` | Dashboard — invoice list, create, send, track |
| Invoice Detail | `/invoices/[invoice_id]` | Dashboard — status timeline, actions |
| Invoice Create | `/invoices/create` | Dashboard — line items repeater form |

---

## Bot API Parity

Full bot API access under `/api/v1/bot/`:
- `POST /api/v1/bot/checkout-pages/create` — Create checkout page
- `GET /api/v1/bot/checkout-pages` — List pages
- `GET/PATCH /api/v1/bot/checkout-pages/[id]` — Detail/update
- `GET /api/v1/bot/sales` — List sales with filters
- `GET/PATCH /api/v1/bot/seller-profile` — Read/update seller identity
- `GET /api/v1/bot/shop` — Shop config + all checkout pages
- `POST /api/v1/bot/invoices/create` — Create invoice
- `GET /api/v1/bot/invoices` — List invoices
- `POST /api/v1/bot/invoices/[id]/send` — Send invoice

**Skill file:** `public/MY-STORE.md`

---

## Key Code

| File | Purpose |
|------|---------|
| `server/storage/sales.ts` | Checkout pages + sales CRUD |
| `server/storage/seller-profiles.ts` | Seller profile CRUD |
| `server/storage/invoices.ts` | Invoice CRUD |
| `features/payment-rails/x402/receive.ts` | x402 payment parsing, validation, on-chain settlement |
| `features/payment-rails/x402/checkout.ts` | x402 wallet credit, sale recording, invoice linking |
| `features/agent-shops/base-pay/` | Base Pay verification, ledger, sale recording |
| `features/agent-shops/qr-pay/` | QR Pay backend (wallet top-up, not checkout) |
| `features/agent-shops/invoice-email.ts` | Invoice email via SendGrid |
| `features/agent-shops/invoice-pdf.ts` | Invoice PDF generation via pdf-lib |
| `features/agent-shops/payments/` | Modular client-side payment method handlers |
| `app/pay/[id]/page.tsx` | Public checkout page UI |
| `app/s/[slug]/page.tsx` | Public storefront UI |

---

## Payments UI Architecture (`features/agent-shops/payments/`)

Modular client-side payment method selection and execution for both wallet top-ups and checkout pages. Each payment method is a fully self-contained handler component. Pages provide a `PaymentContext` and render either `FundWalletSheet` (top-up) or `CheckoutPaymentPanel` (checkout) — they never touch SDK details.
- **`types.ts`** — `PaymentContext` (mode, rail, amount, walletAddress, etc.), `PaymentResult`, `PaymentMethodDef`, `PaymentHandlerProps`
- **`methods.ts`** — `PAYMENT_METHODS` registry + `getAvailableMethods(rail, mode, allowedMethods?)` — filters by rail/mode/allowedMethods
- **`handlers/stripe-onramp-handler.tsx`** — Self-contained Stripe handler: creates session via API (different endpoint per mode), loads Stripe SDK, mounts widget via `waitForRef()` rAF loop, handles `fulfillment_complete`, fallback to `redirect_url`
- **`handlers/base-pay-handler.tsx`** — Self-contained Base Pay handler: calls `pay()` from `@base-org/account` (popup), verifies via backend (different endpoint per mode), reports success/error
- **`handlers/testing-handler.tsx`** — Self-contained Testing handler (checkout only): renders a plain card form (number, expiry, CVV, name, billing address) with no validation. Submits to `POST /api/v1/checkout/[id]/pay/testing`. Creates a sale with `paymentMethod: "testing"`, `status: "test"`, card details in `metadata` JSONB. No wallet updates. Increments checkout page stats normally. Available to all users but not enabled by default — must be toggled on per checkout page.
- **`handlers/qr-wallet-handler.tsx`** — Self-contained QR/copy-paste handler (topup only): creates QR payment via API, renders QR code (EIP-681 URI) + copy-paste address + network warning. Auto-polls every 5s for 90s, then shows manual "Check Payment" button with 5s cooldown. Credits whatever amount arrives on-chain.
- **`components/payment-method-selector.tsx`** — Renders vertical list of payment method buttons with amount, label, subtitle
- **`components/fund-wallet-sheet.tsx`** — Sheet wrapper for top-ups: amount input → method selection → handler rendering. Used by stripe-wallet page (Rail 1). Ready for card-wallet page (Rail 2) with rail-specific method filtering.
- **`components/checkout-payment-panel.tsx`** — Right panel for checkout pages: amount display/input → method selection → handler rendering. Supports `allowedMethods` filtering from checkout page config. Single-method pages auto-select (no selector shown). State machine: select → paying → error (with retry).
- **Design principle**: Each handler is independent — no shared base class, no shared hooks. One handler can't break another. Adding a new method = new handler file + entry in `methods.ts`.

## Base Pay Backend (`features/agent-shops/base-pay/`)

Server-side Base Pay verification and ledger logic.
- **`types.ts`** — `BasePayVerifyInput`, `BasePayVerifyResult`, `BasePayCheckoutInput`
- **`verify.ts`** — RPC verification via `getPaymentStatus()`, recipient/amount check. For top-ups, amount mismatch is logged as a warning but not rejected (credits whatever actually arrived). Recipient must still match.
- **`ledger.ts`** — `creditWalletFromBasePay()` — race-safe wallet crediting (insert pending record first, credit second)
- **`sale.ts`** — `recordBasePaySale()` — sale recording for checkout (mirrors Stripe flow exactly)
- **Storage**: `server/storage/base-pay.ts` — `createBasePayPayment`, `getBasePayPaymentByTxId`, `updateBasePayPaymentStatus`
- **API routes**: `POST /api/v1/base-pay/verify` (authenticated top-up), `POST /api/v1/checkout/[id]/pay/base-pay` (public checkout)

## QR Pay Backend (`features/agent-shops/qr-pay/`)

Server-side QR/copy-paste crypto top-up logic. Credits whatever USDC amount arrives on-chain — no amount enforcement.
- **`types.ts`** — `QrPayCreateInput`, `QrPayCreateResult`, `QrPayStatusResult`
- **`eip681.ts`** — `buildEip681Uri()` — builds EIP-681 URI for USDC transfer on Base (chain 8453, contract `0x833589...`)
- **`ledger.ts`** — `creditWalletFromQrPay()` — fully transactional (single `db.transaction()` wrapping confirm + wallet update + transaction insert). Atomic `WHERE status = 'waiting'` prevents double-crediting.
- **Schema**: `qr_payments` table (paymentId unique, ownerUid, walletAddress, amountUsdc, eip681Uri, balanceBefore, creditedUsdc, status [waiting/confirmed/expired], createdAt, confirmedAt, expiresAt [60-min TTL])
- **Storage**: `server/storage/qr-pay.ts` — `createQrPayment`, `getQrPaymentById`, `confirmQrPayment`, `expireQrPayment`, `expireWaitingQrPaymentsForWallet`
- **API routes**: `POST /api/v1/qr-pay/create` (authenticated, snapshots balanceBefore, generates EIP-681 URI, expires any existing waiting payments for the same wallet), `GET /api/v1/qr-pay/status/[paymentId]` (authenticated, polls on-chain balance, credits delta if > 0)
- **Concurrent session safety**: Creating a new QR payment expires all existing "waiting" payments for that wallet (prevents balance-delta over-crediting)

---

## Related Modules

| Module | Relationship |
|--------|-------------|
| **3/4. Payment Rails** | Outbound side — how our agents pay external merchants. This module is the inbound side. |
| **Brands Index** | Provides the merchant catalog that shops can reference |
| **Agent Interaction** | Handles orders and approvals triggered by shop purchases |
