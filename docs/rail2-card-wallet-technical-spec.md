# Rail 2: Card Wallet — Technical Specification

**Date:** February 14, 2026

> CrossMint smart wallets on Base chain, fiat onramp for USDC funding, commerce purchases (Amazon, Shopify, browser URLs) via CrossMint Orders API, owner-approved purchase flow with 15-minute TTL.

---

## Architecture

```
Owner (Browser)                         Bot (API Client)
      │                                       │
      ▼                                       ▼
┌──────────────────────────────────────────────────────────────────┐
│                CreditClaw Backend (Next.js API)                  │
│                                                                  │
│  Owner endpoints:                Bot endpoints:                  │
│  /card-wallet/create             /card-wallet/bot/purchase       │
│  /card-wallet/list               /card-wallet/bot/purchase/status│
│  /card-wallet/balance            /card-wallet/bot/search         │
│  /card-wallet/freeze                                             │
│  /card-wallet/onramp/session                                     │
│  /card-wallet/guardrails                                         │
│  /card-wallet/transactions                                       │
│  /card-wallet/orders/[order_id]                                  │
│  /card-wallet/approvals                                          │
│  /card-wallet/approvals/decide                                   │
│  /card-wallet/webhooks/crossmint                                 │
│                                                                  │
│  Cross-rail:                                                     │
│  /master-guardrails (GET/POST)                                   │
└──────────┬────────────────────────────────┬──────────────────────┘
           │                                │
     ┌─────┴──────────┐             ┌───────┴───────┐
     │   CrossMint    │             │   CrossMint   │
     │  Smart Wallets │             │  Orders API   │
     │  (Base chain)  │             │  (Commerce)   │
     └─────┬──────────┘             └───────┬───────┘
           │                                │
     ┌─────┴────────────────────────────────┴──────────────┐
     │              Settlement & Fulfillment               │
     │  Custodial USDC auto-settlement on purchase         │
     │  Amazon: full order tracking (ship/deliver/fail)    │
     │  Shopify: order placed, no delivery tracking        │
     │  URL: order placed, no delivery tracking            │
     └────────────────────────────────────────────────────-┘
```

---

## Data Model

Four tables prefixed `crossmint_` for rail segmentation, plus the shared `master_guardrails` table.

### crossmint_wallets
| Column | Type | Description |
|--------|------|-------------|
| id | serial PK | |
| bot_id | text | Linked bot identifier |
| owner_uid | text | Firebase UID of the wallet owner |
| crossmint_wallet_id | text | CrossMint's internal wallet locator |
| address | text | 0x address on Base |
| balance_usdc | bigint | Micro-USDC (6 decimals). 1000000 = $1.00. Cached locally, queried on-demand from CrossMint chain balance. |
| chain | text | Always `base` |
| status | text | `active` / `paused` |
| created_at / updated_at | timestamp | |

### crossmint_guardrails
| Column | Type | Description |
|--------|------|-------------|
| id | serial PK | |
| wallet_id | integer | FK → crossmint_wallets |
| max_per_tx_usdc | integer | Per-transaction cap in USD (default: 100) |
| daily_budget_usdc | integer | Daily spend cap in USD (default: 500) |
| monthly_budget_usdc | integer | Monthly spend cap in USD (default: 2000) |
| require_approval_above | integer | Human approval threshold in USD (default: 0 — all purchases require approval) |
| allowlisted_merchants | jsonb | Array of allowed merchant strings (e.g. `["amazon", "shopify"]`) |
| blocklisted_merchants | jsonb | Array of blocked merchant strings |
| auto_pause_on_zero | boolean | Pause wallet when balance hits zero (default: true) |
| updated_at | timestamp | |
| updated_by | text | UID of last modifier |

### crossmint_transactions
| Column | Type | Description |
|--------|------|-------------|
| id | serial PK | |
| wallet_id | integer | FK → crossmint_wallets |
| type | text | `purchase` / `deposit` / `refund` |
| amount_usdc | bigint | Micro-USDC |
| crossmint_order_id | text | CrossMint order ID (set after approval creates the order) |
| product_locator | text | Full locator string, e.g. `amazon:B0EXAMPLE123` |
| product_name | text | Human-readable product name |
| quantity | integer | Default 1, max 100 |
| order_status | text | `pending` / `quote` / `processing` / `shipped` / `delivered` / `payment_failed` / `delivery_failed` |
| shipping_address | jsonb | `{ name, line1, line2?, city, state, zip, country }` |
| tracking_info | jsonb | `{ carrier?, tracking_number?, tracking_url?, estimated_delivery? }` — populated by CrossMint webhooks (Amazon only) |
| status | text | `pending` / `confirmed` / `failed` / `requires_approval` |
| metadata | jsonb | Webhook event logs, misc data |
| created_at / updated_at | timestamp | |

### Approvals
Rail 2 approvals are managed through the centralized `unified_approvals` table. The `railRef` column stores the crossmint_transaction ID. Rail-specific metadata (productLocator, product_name, shipping_address) is stored in the `metadata` JSONB column. See the Unified Approval System section in replit.md for details.

### master_guardrails (shared across rails)
| Column | Type | Description |
|--------|------|-------------|
| id | serial PK | |
| owner_uid | text | Unique per owner |
| max_per_tx_usdc | integer | Cross-rail per-transaction cap (default: 500) |
| daily_budget_usdc | integer | Cross-rail daily budget (default: 2000) |
| monthly_budget_usdc | integer | Cross-rail monthly budget (default: 10000) |
| enabled | boolean | Master budget toggle |
| created_at / updated_at | timestamp | |

---

## API Endpoints

All routes under `/api/v1/card-wallet/`. Owner endpoints use Firebase session cookie auth. Bot endpoints use Bearer API token auth via `authenticateBot()`.

### Owner Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/create` | Create a CrossMint smart wallet for a bot. Calls CrossMint `POST /wallets` with `evm-smart-wallet` type and Fireblocks custodial signer. Stores wallet record, creates default guardrails. |
| GET | `/list` | List owner's wallets with balances, guardrails, and merchant controls. Queries CrossMint chain balance on-demand for each wallet. |
| GET | `/balance` | Single wallet balance from CrossMint chain query (`/wallets/{locator}/balances?tokens=usdc&chains=base`). |
| POST | `/freeze` | Toggle wallet status between `active` and `paused`. Paused wallets reject all purchase requests. |
| POST | `/onramp/session` | Create CrossMint fiat onramp order (fiat → USDC via Checkout.com flow). Returns `clientSecret` for embedded widget. |
| GET/POST | `/guardrails` | View or update spending controls and merchant allow/blocklists. |
| GET | `/transactions` | List transactions for a wallet. |
| GET | `/orders/[order_id]` | Get detailed order status with live CrossMint tracking info (fetches from CrossMint Orders API in real time). |
| GET | `/approvals` | List pending approvals for the owner. |
| POST | `/approvals/decide` | Approve or reject a pending purchase. On approval, creates the actual CrossMint purchase order. |

### Bot Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/bot/purchase` | Request a purchase. Enforces master + per-wallet guardrails, always creates pending approval (15-min TTL). Returns 202. |
| GET | `/bot/purchase/status` | Poll for approval/order status by `transaction_id` or `approval_id`. Returns current status, order tracking info. |
| POST | `/bot/search` | Search Shopify product variants via CrossMint WS Search API (`/api/unstable/ws/search`). Returns variant IDs for use in purchase endpoint. |

### Webhook

| Method | Path | Description |
|--------|------|-------------|
| POST | `/webhooks/crossmint` | Handles CrossMint order lifecycle events. Svix signature verification. Updates transaction `orderStatus` and `trackingInfo`. Fires bot webhook notifications for shipped/delivered/failed events. |

### Master Guardrails (cross-rail)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/master-guardrails` | Read master config + live cross-rail spend totals (daily/monthly breakdown per rail). |
| POST | `/api/v1/master-guardrails` | Create or update master guardrails (per-tx max, daily, monthly, enabled toggle). |

---

## Core Flows

### 1. Wallet Creation

```
Owner clicks "Create Wallet" → selects a bot
→ POST /card-wallet/create { bot_id }
→ Backend: CrossMint POST /wallets
   { type: "evm-smart-wallet",
     config: { adminSigner: { type: "evm-fireblocks-custodial" } },
     linkedUser: "userId:{ownerUid}" }
→ Returns { walletId (locator), address, type }
→ Store in crossmint_wallets, create default guardrails
   (max $100/tx, $500/day, $2000/month, approval required for all)
→ Wallet card appears in dashboard with $0.00 balance
```

### 2. Funding via Fiat Onramp

```
Owner clicks "Fund Wallet" on a wallet card
→ POST /card-wallet/onramp/session { wallet_id, amount_usd? }
→ Backend: CrossMint POST /orders
   {
     lineItems: [{ tokenLocator: "base:{USDC_CONTRACT}", executionParameters: { mode: "exact-in" } }],
     payment: { method: "checkoutcom-flow", receiptEmail: ownerEmail },
     recipient: { walletAddress: walletAddress }
   }
→ Returns { orderId, clientSecret, order }
→ Frontend opens CrossMint-hosted Checkout.com payment flow
→ Upon completion, USDC is deposited directly to wallet on Base chain
→ Balance reflected on next on-demand query
```

**Important difference from Rail 1:** CrossMint custodial wallets auto-settle payments — no manual signing or transfer step needed. USDC sits in the smart wallet and is debited automatically when CrossMint processes a purchase order.

### 3. Bot Purchase Flow (the main flow)

```
Bot wants to buy a product (e.g. Amazon ASIN, Shopify variant)
→ POST /card-wallet/bot/purchase (Bearer: bot API key)
   {
     merchant: "amazon",
     product_id: "B0EXAMPLE123",
     quantity: 1,
     product_name: "Wireless Mouse",
     estimated_price_usd: 29.99,
     shipping_address: { name, line1, city, state, zip, country }
   }

Backend checks (in order):
  1. Bot has a Card Wallet? Wallet active?
  2. Estimated amount → micro-USDC conversion
  3. Master guardrails check (cross-rail budget)
  4. Per-wallet guardrails check:
     a. Amount ≤ max_per_tx_usdc?
     b. Daily cumulative + amount ≤ daily_budget_usdc?
     c. Monthly cumulative + amount ≤ monthly_budget_usdc?
     d. Merchant on allowlist? (if set)
     e. Merchant not on blocklist?
     f. Amount < require_approval_above? (if set; default 0 = always approve)

If blocked → return 403 with reason
If passed (or approval required) → create pending approval (15-min TTL)
→ Return 202 { status: "awaiting_approval", approval_id, transaction_id, expires_at }

Bot polls GET /bot/purchase/status?approval_id=X every ~30s
```

### 4. Owner Approval → Order Creation

```
Owner sees pending approval in dashboard
→ POST /card-wallet/approvals/decide { approval_id, decision: "approve" }

Backend:
  1. Verify owner owns the wallet
  2. Check 15-min TTL (→ 410 Gone if expired)
  3. If rejected → mark failed, fire purchase.rejected webhook to bot
  4. If approved:
     a. Mark approval as approved
     b. Parse product_locator → merchant + productId
     c. Call CrossMint Orders API: createPurchaseOrder()
        { lineItems: [{ productLocator: "amazon:B0EXAMPLE123" }],
          payment: { method: "crypto", currency: "usdc", payerAddress: walletAddress },
          recipient: { email, physicalAddress } }
     d. Store crossmintOrderId on transaction, status → confirmed
     e. Fire purchase.approved webhook to bot

Bot's next status poll returns:
→ { status: "confirmed", order_status: "processing", crossmint_order_id: "..." }
```

### 5. Order Lifecycle (Webhook-Driven)

```
CrossMint sends webhook events → POST /card-wallet/webhooks/crossmint

Svix signature verification (svix-id, svix-timestamp, svix-signature headers)

Event mapping:
  orders.quote.created    → orderStatus: "quote"
  orders.quote.updated    → orderStatus: "quote"
  orders.payment.succeeded → orderStatus: "processing"
  orders.payment.failed   → orderStatus: "payment_failed", status: "failed"
  orders.delivery.initiated → orderStatus: "shipped" (+ tracking info)
  orders.delivery.completed → orderStatus: "delivered"
  orders.delivery.failed  → orderStatus: "delivery_failed", status: "failed"

Tracking info extracted from lineItems[0].delivery:
  { carrier, trackingNumber, trackingUrl, estimatedDelivery }

Bot webhook notifications fired for:
  orders.delivery.initiated → order.shipped
  orders.delivery.completed → order.delivered
  orders.payment.failed     → order.failed
  orders.delivery.failed    → order.failed
```

### 6. Shopify Product Search

```
Bot wants to find Shopify product variants
→ POST /card-wallet/bot/search { product_url: "https://shop.example.com/products/widget" }

Backend:
  → POST https://www.crossmint.com/api/unstable/ws/search
    { url: product_url }
  → Parse response: extract variants with { variant_id, title, price, currency, available, options }
  → Filter out variants missing IDs
  → Return { product_url, product_name, variants[], locator_format }

Bot uses variant in purchase:
  merchant: "shopify"
  product_id: "{product_url}:{variant_id}"
```

---

## Merchant Locator Formats

| Merchant | Locator Format | Example |
|----------|---------------|---------|
| Amazon | `amazon:{ASIN}` | `amazon:B0EXAMPLE123` |
| Shopify | `shopify:{url}:{variantId}` | `shopify:https://shop.com/products/widget:12345` |
| General URL | `url:{url}:{variant}` | `url:https://store.com/item:default` |

The locator is split into `merchant` and `product_id` fields in the purchase endpoint. CrossMint's Orders API receives the full `productLocator` string.

---

## Shared Guardrail Engine

Rail 2 reuses the same `evaluateGuardrails()` function as Rail 1, shared in `lib/guardrails/evaluate.ts`. The function accepts a `GuardrailRules` object and returns `allow`, `block`, or `require_approval`.

**Key difference from Rail 1:** Rail 2 uses **merchant allow/blocklists** instead of domain allow/blocklists. The `GuardrailRules` type supports both:
- `allowlistedDomains` / `blocklistedDomains` — used by Rail 1 (x402 resource URLs)
- `allowlistedMerchants` / `blocklistedMerchants` — used by Rail 2 (commerce merchants)

**Master guardrails** (`lib/guardrails/master.ts`) run before per-wallet guardrails. They aggregate spend across Rails 1, 2, and 4:
- Rail 1/2 amounts are natively in micro-USDC
- Rail 4 amounts in cents are converted via `centsToMicroUsdc(cents) = cents * 10_000`
- Master guardrails only block or allow — no approval threshold at master level
- If master config is missing or disabled, the check is skipped

---

## Bot Webhook Notifications

Rail 2 fires push notifications to bots via `lib/webhooks.ts`. The system uses HMAC-SHA256 signed payloads delivered to the bot's `callbackUrl` with exponential backoff retries.

### Event Types Fired by Rail 2

| Event | Trigger | Data |
|-------|---------|------|
| `purchase.approved` | Owner approves a purchase | `{ approval_id, transaction_id, order_id, product_name, product_locator, amount_usdc }` |
| `purchase.rejected` | Owner rejects a purchase | `{ approval_id, product_name, product_locator }` |
| `purchase.expired` | Approval TTL expires | `{ approval_id, product_name, product_locator }` |
| `order.shipped` | CrossMint webhook: delivery initiated | `{ transaction_id, order_id, order_status, product_name, tracking }` |
| `order.delivered` | CrossMint webhook: delivery completed | `{ transaction_id, order_id, order_status, product_name, tracking }` |
| `order.failed` | CrossMint webhook: payment/delivery failed | `{ transaction_id, order_id, order_status, product_name, tracking }` |

### Delivery Mechanics
- **Signature:** `X-CreditClaw-Signature: sha256={hmac}` using bot's `webhookSecret`
- **Event header:** `X-CreditClaw-Event: {eventType}`
- **Timeout:** 10 seconds per attempt
- **Retries:** Up to 5 attempts with exponential backoff: 1min → 5min → 15min → 1hr → 6hr
- **Non-blocking:** All `fireWebhook()` calls use `.catch(() => {})` to avoid slowing main flows
- **Delivery tracking:** Each delivery is persisted in `webhook_deliveries` table with attempt count, response status, and next retry time

---

## Lib Files

| File | Purpose |
|------|---------|
| `lib/card-wallet/server.ts` | CrossMint API client (`crossmintFetch`), wallet creation (`createSmartWallet`), balance query (`getWalletBalance`), USDC formatting utilities |
| `lib/card-wallet/onramp.ts` | Fiat onramp order creation via CrossMint Orders API with Checkout.com payment flow |
| `lib/card-wallet/purchase.ts` | Purchase order creation (`createPurchaseOrder`) and order status query (`getOrderStatus`) via CrossMint Orders API |
| `lib/guardrails/evaluate.ts` | Shared guardrail evaluation engine — checks limits, budgets, merchant/domain lists, approval thresholds |
| `lib/guardrails/types.ts` | TypeScript types for `GuardrailRules`, `TransactionRequest`, `CumulativeSpend`, `GuardrailDecision` |
| `lib/guardrails/master.ts` | Master guardrail evaluation — cross-rail spend aggregation, `centsToMicroUsdc()`, `microUsdcToUsd()` |
| `lib/approvals/lifecycle.ts` | Approval TTL utilities — `isApprovalExpired()`, `getApprovalExpiresAt()`, `RAIL2_APPROVAL_TTL_MINUTES = 15` |
| `lib/webhooks.ts` | Bot webhook delivery engine — HMAC signing, exponential backoff retries, delivery persistence |

---

## Key Technical Details & Complexity

### CrossMint Custodial Auto-Settlement
Unlike Rail 1 (which requires explicit EIP-712 signing for each payment), Rail 2's CrossMint smart wallets auto-settle. When CrossMint processes a purchase order, USDC is debited from the wallet automatically. **This means there is no signing step** — the trust model is: owner approves → backend calls CrossMint Orders API → CrossMint handles the rest.

### Balance Is Not Real-Time
Balances are **not** polled in real-time. They are queried on-demand:
- **Bots:** Balance is checked at purchase time (via CrossMint chain query)
- **Owners:** Balance is shown on dashboard page load
- **Locally cached:** `balance_usdc` in `crossmint_wallets` is a cache that may drift from on-chain reality

This is intentional — CrossMint custodial wallets handle balance enforcement at the order level anyway.

### Approval Creates the Order (Not the Bot)
The bot's `POST /bot/purchase` does **not** call CrossMint. It only creates a local transaction + approval record. The actual CrossMint order is created in `POST /approvals/decide` when the owner approves. This means:
- If CrossMint's API is down at purchase request time, it doesn't matter
- If CrossMint's API is down at approval time, the purchase fails and is marked `failed`
- The `crossmintOrderId` is `null` until approval

### 15-Minute Approval TTL
Rail 2 uses 15-minute approval TTL (vs Rail 1's 5-minute). This is because physical good purchases are less time-sensitive than x402 API payments. The TTL is checked at decision time — if expired, the approval is marked `expired`, the transaction is marked `failed`, and a `purchase.expired` webhook fires.

### Shopify Search API Is Unstable
The search endpoint uses `https://www.crossmint.com/api/unstable/ws/search` — CrossMint's beta Worldstore Search API. It may:
- Return inconsistent response formats (the handler normalizes both `data` and `data.variants` shapes)
- Fail with 404 for unsupported product URLs
- Go down without notice
- All errors return 502 with a "beta" warning message

### Tracking Info Is Amazon-Only
Only Amazon orders receive delivery lifecycle webhooks from CrossMint (`orders.delivery.initiated`, `orders.delivery.completed`, `orders.delivery.failed`). Shopify and URL orders will get `orders.payment.succeeded` but typically no shipping events. The dashboard shows an amber note for non-Amazon orders: "Tracking available for Amazon orders only."

### Product Locator Splitting
The `productLocator` is stored as a single string (e.g., `amazon:B0EXAMPLE123`). At order-creation time in `approvals/decide`, it is split on the first `:` to extract `merchant` and `productId`. For Shopify, `productId` contains colons itself (e.g., `https://shop.com/products/widget:12345`), so the split uses only the first colon: `const [merchant, productId] = locator.split(":");`. **This is a potential bug** — if merchant names ever contain colons, the split breaks. Currently safe because merchants are `amazon`, `shopify`, `url`.

### Webhook Event De-duplication
CrossMint may send duplicate webhook events. The handler is idempotent — it simply overwrites `orderStatus` and merges `trackingInfo`. No guard against processing the same event twice, but the updates are safe to replay.

### Master Guardrails Unit Normalization
Master guardrails aggregate spend across three rails with different native units:
- Rail 1 (Privy): micro-USDC (6 decimals)
- Rail 2 (CrossMint): micro-USDC (6 decimals)
- Rail 4 (Self-hosted): cents (2 decimals) → converted via `centsToMicroUsdc(cents) = cents * 10,000`

This conversion happens in `getMasterDailySpend` and `getMasterMonthlySpend` storage methods.

---

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `CROSSMINT_SERVER_API_KEY` | CrossMint server API key for all backend calls (wallets, orders, search) |
| `NEXT_PUBLIC_CROSSMINT_CLIENT_API_KEY` | CrossMint client API key for embedded onramp widget |
| `CROSSMINT_WEBHOOK_SECRET` | Svix webhook secret for verifying CrossMint order lifecycle events |
| `CROSSMINT_ENV` | Optional. Set to `staging` to use CrossMint staging API (`staging.crossmint.com`). Defaults to production. |

---

## Webhook Signature Verification

CrossMint uses **Svix** for webhook delivery. Verification requires three headers:
- `svix-id` — unique event ID
- `svix-timestamp` — event timestamp
- `svix-signature` — HMAC signature

The handler uses the `svix` npm package: `new Webhook(secret).verify(body, headers)`. If any header is missing → 400. If signature fails → 401.

Bot-facing webhooks (fired by CreditClaw to bots) use a separate HMAC-SHA256 scheme with `X-CreditClaw-Signature` header.

---

## Test Coverage

Three test suites, 79 total tests:

| Suite | File | Count | What It Tests |
|-------|------|-------|---------------|
| API Auth & Validation | `docs/tests/rail2-api-tests.sh` | 21 | Auth enforcement on all owner/bot endpoints, input validation, master guardrails auth, page rendering |
| Guardrails & Merchants | `docs/tests/rail2-guardrail-tests.ts` | 30 | Spending limits, merchant allow/blocklists (Amazon, Shopify, URL), approval lifecycle TTLs, master guardrails utility functions, master budget enforcement |
| Storage CRUD | `docs/tests/rail2-storage-tests.ts` | 28 | Wallet CRUD, guardrails upsert, transaction lifecycle, approval flow, daily/monthly spend aggregation, master guardrails storage |

---

## Status

**Implemented:**
- Wallet creation (CrossMint smart wallets, Fireblocks custodial signer)
- Fiat onramp (CrossMint + Checkout.com flow)
- Multi-merchant purchase flow (Amazon, Shopify, URL)
- Shopify product search (beta API)
- Owner approval flow with 15-minute TTL
- Guardrails CRUD with merchant allow/blocklists
- Master guardrails (cross-rail spending limits)
- Wallet freeze/unfreeze
- Transaction ledger with order tracking (Amazon)
- CrossMint webhook handler (Svix verification, order lifecycle)
- Bot webhook notifications (6 event types, exponential backoff)
- Bot status polling endpoint
- Dashboard UI with wallet cards, approvals, guardrails panel

**Not yet implemented:**
- Flights/travel purchases (uses different CrossMint Worldstore Search API — needs separate investigation)
- Real-time balance sync (intentionally excluded — on-demand queries only)
- CrossMint embedded onramp widget (currently creates orders server-side; client widget integration deferred)
- Automatic refund handling (CrossMint may issue refunds that aren't tracked yet)
- Rate limiting on bot endpoints
