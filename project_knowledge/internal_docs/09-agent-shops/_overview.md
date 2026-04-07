---
name: Agent Shops System Overview
description: The inbound commerce system — checkout pages, storefronts, seller profiles, invoicing, and all payment methods buyers use to pay CreditClaw merchants. Read this first before working on shops, checkout, sales, or invoicing.
---

# Agent Shops — Overview

This is the platform's inbound commerce engine. Every CreditClaw wallet holder can become a seller: create checkout pages, build a storefront, send invoices, and accept payments from humans and AI agents alike. The inverse of the outbound payment rails (Module 4) — those handle how our agents pay external merchants; this handles how the world pays our merchants.

---

## System Architecture

```
Seller creates checkout page (dashboard or bot API)
  │
  ├─→ Checkout page stored in `checkout_pages` table
  │     • Page types: product, event, digital_product
  │     • Optionally visible on public shop (/s/[slug])
  │
  ├─→ Buyer visits /pay/[id]
  │     • Split-panel layout: seller info (left) / payment widget (right)
  │     • Supports ?ref=INV-XXXX for invoice payments
  │
  ├─→ Buyer pays via one of 5 checkout methods:
  │     ├── x402 (autonomous agent payments — EIP-3009 transferWithAuthorization)
  │     ├── Base Pay (one-tap USDC on Base network)
  │     ├── Stripe Onramp (card/bank → USDC conversion)
  │     ├── USDC Direct (manual transfer)
  │     └── Testing (dev/test mode)
  │     (QR Pay via lib/qr-pay/ is a wallet top-up rail, not a checkout method)
  │
  ├─→ Sale recorded in `sales` table
  │     • Seller wallet balance credited
  │     • Checkout page stats incremented
  │     • Invoice marked paid (if invoice payment)
  │
  └─→ Webhook fired: `wallet.sale.completed`
        • Notifies seller's bot of the transaction
        • Includes invoice_id/invoice_ref when applicable
```

---

## Checkout Pages

The core primitive. A checkout page is a public URL where anyone can pay a seller.

**Table:** `checkout_pages`

| Column | Purpose |
|--------|---------|
| `checkoutPageId` | Unique string identifier |
| `ownerUid` | Links to owner account |
| `walletId` / `walletAddress` | Destination for funds |
| `title`, `description` | Display info |
| `amountUsdc` | Price in USDC (bigint, micro-units) |
| `amountLocked` | Whether buyer can change amount |
| `allowedMethods` | Array: `x402`, `usdc_direct`, `stripe_onramp`, `base_pay`, `testing` |
| `status` | `active`, `paused`, `archived` |
| `pageType` | `product`, `event`, `digital_product` |
| `digitalProductUrl` | Delivered to bot after successful x402 payment (never exposed in 402 requirements) |
| `shopVisible` / `shopOrder` | Controls visibility and ordering on storefront |
| `imageUrl` | Product image for shop display |
| `collectBuyerName` | Enables buyer name input (for events) |
| `viewCount` / `paymentCount` / `totalReceivedUsdc` | Analytics |
| `successUrl` / `successMessage` | Post-payment redirect/message |
| `expiresAt` | Optional expiry |

**Storage:** `server/storage/sales.ts`
- `createCheckoutPage`, `getCheckoutPageById`, `getCheckoutPagesByOwnerUid`
- `updateCheckoutPage`, `archiveCheckoutPage`
- `incrementCheckoutPageStats`, `incrementCheckoutPageViewCount`
- `getShopPagesByOwnerUid` (active + shopVisible, sorted by shopOrder)
- `getBuyerCountForCheckoutPage`, `getBuyerNamesForCheckoutPage`

**APIs:**

| Endpoint | Auth | Purpose |
|----------|------|---------|
| `POST /api/v1/checkout-pages` | Owner session | Create page |
| `GET /api/v1/checkout-pages` | Owner session | List pages |
| `GET/PATCH/DELETE /api/v1/checkout-pages/[id]` | Owner session | Detail/update/archive |
| `POST /api/v1/bot/checkout-pages/create` | Bot API key | Create (supports `shop_visible`, `shop_order`, `page_type`, `image_url`, `collect_buyer_name`) |
| `GET /api/v1/bot/checkout-pages` | Bot API key | List |
| `GET/PATCH /api/v1/bot/checkout-pages/[id]` | Bot API key | Detail/update |
| `GET /api/v1/checkout/[id]/public` | Public | Fetch config + seller info (increments view count) |

---

## Sales

**Table:** `sales`

| Column | Purpose |
|--------|---------|
| `saleId` | Unique string identifier |
| `checkoutPageId` | Links to checkout page |
| `ownerUid` | Seller |
| `amountUsdc` | Amount paid |
| `paymentMethod` | Which method was used |
| `status` | `pending`, `confirmed`, `completed`, `amount_mismatch`, `test` |
| `buyerType` / `buyerIdentifier` / `buyerEmail` / `buyerName` | Buyer info |
| `buyerIp` / `buyerUserAgent` | Request metadata |
| `txHash` | On-chain transaction hash |
| `stripeOnrampSessionId` | Stripe session (if Stripe payment) |
| `privyTransactionId` | Privy tx (if applicable) |
| `x402Nonce` | Idempotency key for x402 payments |
| `invoiceId` | Links to invoice (if invoice payment) |
| `checkoutTitle` / `checkoutDescription` | Snapshot of checkout page at time of sale |
| `confirmedAt` | When payment was confirmed |

**Storage:** `server/storage/sales.ts`
- `createSale`, `getSaleById`, `getSaleByX402Nonce`
- `getSalesByOwnerUid` (with filters), `updateSaleStatus`

**APIs:**

| Endpoint | Auth | Purpose |
|----------|------|---------|
| `GET /api/v1/sales` | Owner session | List with filters (status, payment_method, checkout_page_id) |
| `GET /api/v1/sales/[sale_id]` | Owner session | Detail |
| `GET /api/v1/bot/sales` | Bot API key | List with filters |

---

## Payment Methods

### x402 Protocol (Agent-to-Agent)
CreditClaw is both an x402 **payer** (via `/bot/sign`) and x402 **receiver** (via checkout pages). Enables bot-to-bot commerce.

**Module:** `lib/x402/`
- `receive.ts` — `parseXPaymentHeader()` (base64→JSON), `validateX402Payment()` (checks chain=Base 8453, token=USDC, recipient, expiry, amount with 1% tolerance), `settleX402Payment()` (encodes `transferWithAuthorization` calldata, submits via Privy RPC with gas sponsorship), `waitForReceipt()`, `buildX402DedupeKey()`
- `checkout.ts` — `creditWalletFromX402()` (wallet balance increment + transaction record), `recordX402Sale()` (sale creation with `x402Nonce` for idempotent retries, amount mismatch detection, invoice linking, `wallet.sale.completed` webhook)

**Endpoints:**
- `GET /api/v1/checkout/[id]/x402` — returns 402 Payment Required with x402 payment requirements (amount, recipient wallet, token, chain)
- `POST /api/v1/checkout/[id]/pay/x402` — processes payment: deduplication → validation → on-chain settlement → wallet credit → sale record → webhook

### Base Pay (One-Tap USDC)
Direct USDC payments on the Base network.

**Module:** `lib/base-pay/`
- `verify.ts` — on-chain payment verification
- `sale.ts` — sale recording after verified payment
- `ledger.ts` — wallet balance credit

**Table:** `base_pay_payments` — tracks Base Pay transactions (txId, sender, recipient, amount, status, chain info)

**Endpoint:** `POST /api/v1/checkout/[id]/pay/base-pay`

### Stripe Onramp (Card/Bank)
Converts fiat to USDC via Stripe's Crypto Onramp.

**Endpoint:** `POST /api/v1/checkout/[id]/pay/stripe-onramp` — creates Stripe session, supports `invoice_ref` for server-authoritative invoice amount

### Testing Mode
Development/test payment method.

**Endpoint:** `POST /api/v1/checkout/[id]/pay/testing`

---

## Seller Profiles

Per-owner seller identity used across all checkout pages, invoices, and the storefront.

**Table:** `seller_profiles`

| Column | Purpose |
|--------|---------|
| `ownerUid` | Unique — one profile per owner |
| `businessName`, `logoUrl`, `description` | Display info |
| `contactEmail`, `websiteUrl` | Contact |
| `slug` | Unique — public shop URL (`/s/[slug]`) |
| `shopPublished` | Boolean — controls storefront visibility |
| `shopBannerUrl` | Storefront banner |

**Storage:** `server/storage/seller-profiles.ts`
- `getSellerProfileByOwnerUid`, `getSellerProfileBySlug`, `upsertSellerProfile`

**APIs:**

| Endpoint | Auth | Purpose |
|----------|------|---------|
| `GET/PUT /api/v1/seller-profile` | Owner session | Get or upsert (slug uniqueness enforced) |
| `GET/PATCH /api/v1/bot/seller-profile` | Bot API key | Read/update — bots can self-service shop setup |

**Public checkout fallback chain:** seller profile → bot name/owner email (no per-page overrides).

**Page:** Seller identity fields consolidated into the **Shop** page (`/shop`) under "Your Details".

---

## Shop (Storefront)

Public storefront built on top of checkout pages and seller profiles.

**Public page:** `/s/[slug]` — storefront with seller info, product grid (image, title, description, price, buyer count for events), links to `/pay/[id]`.

**Admin page:** `/shop` — configure shop slug, publish toggle, banner URL, toggle which checkout pages appear in shop.

**APIs:**

| Endpoint | Auth | Purpose |
|----------|------|---------|
| `GET /api/v1/shop/[slug]` | Public | Returns seller profile + visible checkout pages with buyer counts. 404 if not published. |
| `GET /api/v1/checkout/[id]/buyers` | Public | Buyer count + names for event pages only |
| `GET /api/v1/bot/shop` | Bot API key | Shop config + all checkout pages (including private) |

**Checkout page updates for shop:**
- `/pay/[id]` shows buyer name input when `collectBuyerName` is true
- Shows "X people bought this" for event pages
- Buyer name passed to Stripe metadata and stored on sale record

---

## Invoicing

Full invoicing system — create, send, track, and collect payment via linked checkout pages.

**Table:** `invoices`

| Column | Purpose |
|--------|---------|
| `invoiceId` | Unique string (e.g., `inv_...`) |
| `referenceNumber` | Human-readable unique (e.g., `INV-2025-0001`) |
| `ownerUid` | Seller |
| `checkoutPageId` | Linked checkout page for payment |
| `recipientName`, `recipientEmail` | Who to bill |
| `recipientType` | `human`, `bot`, `agent` |
| `senderName`, `senderEmail` | Seller info snapshot |
| `lineItems` | JSONB array (description, qty, unit price) |
| `subtotalUsdc`, `taxUsdc`, `totalUsdc` | Financials in USDC |
| `dueDate` | Payment deadline |
| `notes` | Free text |
| `status` | `draft` → `sent` → `viewed` → `paid` / `cancelled` |
| `pdfUrl`, `paymentUrl` | Generated artifacts |
| `paidAt`, `paidSaleId` | Payment tracking |
| `sentAt`, `viewedAt` | Lifecycle timestamps |

**Storage:** `server/storage/invoices.ts`
- `createInvoice`, `getInvoiceById`, `getInvoiceByReferenceNumber`
- `getInvoicesByOwnerUid` (with filters), `getInvoicesByCheckoutPageId`
- `updateInvoice`, `markInvoiceSent`, `markInvoiceViewed`, `markInvoicePaid`, `cancelInvoice`
- `getNextReferenceNumber` (generates sequential `INV-YYYY-XXXX`)

**APIs:**

| Endpoint | Auth | Purpose |
|----------|------|---------|
| `POST /api/v1/invoices` | Owner session | Create draft |
| `GET /api/v1/invoices` | Owner session | List with filters |
| `GET/PATCH /api/v1/invoices/[id]` | Owner session | Detail/update draft |
| `POST /api/v1/invoices/[id]/send` | Owner session | Mark sent + email + PDF |
| `POST /api/v1/invoices/[id]/cancel` | Owner session | Cancel unpaid invoice |
| `GET /api/v1/invoices/by-ref/[ref]` | Public | Display-safe fields only |
| `POST /api/v1/bot/invoices/create` | Bot API key (10/hr) | Create invoice |
| `GET /api/v1/bot/invoices` | Bot API key (12/hr) | List invoices |
| `POST /api/v1/bot/invoices/[id]/send` | Bot API key (5/hr) | Send invoice |

**Email & PDF:**
- `lib/invoice-email.ts` — HTML email with SendGrid + PDF attachment, includes "Pay Now" button
- `lib/invoice-pdf.ts` — server-side PDF generation via `pdf-lib`

**Invoice payment flow:**
1. Invoice created with linked checkout page
2. Invoice sent → recipient gets email with "Pay Now" link (`/pay/[id]?ref=INV-XXXX`)
3. Checkout page shows invoice line items, locks amount server-side
4. On payment: webhook handler checks `metadata.invoice_ref`, looks up invoice, verifies checkout page match, marks invoice paid

**Pages:** `/invoices` (list), `/invoices/create` (form with line items repeater), `/invoices/[invoice_id]` (detail with status timeline + actions)

---

## Merchant Accounts

**API:** `app/api/v1/merchant-accounts/`
- `GET /api/v1/merchant-accounts` — list merchant accounts
- `GET /api/v1/merchant-accounts/[id]` — merchant account detail

---

## Dashboard & Navigation

**Sidebar:** "Sales" section with links:
- Create Checkout (`/checkout/create`)
- Shop (`/shop`)
- My Sales (`/sales`)
- Invoices (`/invoices`)

**Checkout page:** `/pay/[id]` — split-panel layout (dark left panel with seller info / white right panel with payment widget). Post-payment: `/pay/[id]/success`.

**Skill file:** `public/MY-STORE.md` — bot-readable instructions for creating checkout pages, viewing sales, and managing invoices.

---

## Key Files

| File | Purpose |
|------|---------|
| `server/storage/sales.ts` | Checkout pages + sales CRUD |
| `server/storage/seller-profiles.ts` | Seller profile CRUD |
| `server/storage/invoices.ts` | Invoice CRUD |
| `shared/schema.ts` | `checkout_pages`, `sales`, `seller_profiles`, `invoices`, `base_pay_payments` tables |
| `lib/x402/receive.ts` | x402 payment parsing, validation, on-chain settlement |
| `lib/x402/checkout.ts` | x402 wallet credit, sale recording, invoice linking |
| `lib/base-pay/verify.ts` | Base Pay payment verification |
| `lib/base-pay/sale.ts` | Base Pay sale recording |
| `lib/base-pay/ledger.ts` | Base Pay wallet credit |
| `lib/qr-pay/ledger.ts` | QR Pay ledger operations |
| `lib/invoice-email.ts` | Invoice email (SendGrid) |
| `lib/invoice-pdf.ts` | Invoice PDF generation (pdf-lib) |
| `app/pay/[id]/page.tsx` | Public checkout page UI |
| `app/s/[slug]/page.tsx` | Public storefront UI |
| `app/(dashboard)/shop/page.tsx` | Shop admin page |
| `app/(dashboard)/checkout/create/page.tsx` | Create checkout page |
| `app/(dashboard)/sales/page.tsx` | Sales ledger |
| `app/(dashboard)/invoices/page.tsx` | Invoice management |
| `public/MY-STORE.md` | Bot-readable shop instructions |

---

## Related Modules

| Module | Relationship |
|--------|-------------|
| **4. Payment Tools** | Outbound side — how our agents pay external merchants. This module is the inbound side. |
| **3. Brands Index** | Provides the merchant catalog that shops can reference |
| **5. Agent Interaction** | Handles orders and approvals triggered by shop purchases |
