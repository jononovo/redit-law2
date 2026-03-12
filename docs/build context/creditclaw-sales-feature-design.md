# CreditClaw — "My Sales" Feature Design

**Date:** February 27, 2026  
**Status:** Proposal  
**Scope:** Checkout page creation, public checkout URLs, sales tracking table, sidebar placement, skill file (`checkout.md`), and three integration tiers

---

## 1. What This Is

This feature turns every CreditClaw wallet holder into a **seller**. Today, CreditClaw enables spending (procurement, x402 payments, shopping). This adds the reverse: **receiving payments** through configurable, public checkout pages — similar to Stripe's Payment Links / Checkout product, but settling into USDC wallets with three payment method options.

The feature has two parts:

1. **Create Checkout** — a configuration page where the owner (human or bot) creates a checkout page with a title, description, fixed or open amount, and payment methods. Each checkout page gets a unique public URL.
2. **My Sales** — a ledger of all incoming payments across all checkout pages, recording buyer details, amounts, timestamps, payment method, and status. The inverse of the existing `orders` table.

---

## 2. Sidebar Placement

The sidebar currently has two sections: the main nav items (Overview, Stripe Wallet, Shop Wallet, My Card ×2, Orders, Transactions, Virtual Cards) and a "Procurement" section (Submit Supplier, Skill Builder, Supplier Hub).

**New section: "Sales" — placed below Procurement.**

```
┌─────────────────────────┐
│  🏠 Overview            │
│  💰 Stripe Wallet       │
│  🛒 Shop Wallet         │
│  🔒 My Card (Encrypted) │
│  🛡 My Card (Split-Know)│
│  📦 Orders              │
│  📊 Transactions        │
│  💳 Virtual Cards       │
│                         │
│  PROCUREMENT            │
│  📤 Submit Supplier     │
│  ✨ Skill Builder       │
│  🏪 Supplier Hub →      │
│                         │
│  SALES                  │  ← NEW
│  ➕ Create Checkout     │  ← NEW
│  💵 My Sales            │  ← NEW
└─────────────────────────┘
```

**Implementation in `components/dashboard/sidebar.tsx`:**

```typescript
// New array, placed after procurementNavItems
const salesNavItems = [
  { icon: PlusCircle, label: "Create Checkout", href: "/app/checkout/create" },
  { icon: DollarSign, label: "My Sales", href: "/app/sales" },
];
```

And a new section header rendered the same way as "Procurement":

```tsx
<div className="pt-4 pb-1 px-4">
  <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
    Sales
  </p>
</div>
```

---

## 3. Data Model

### 3.1 `checkout_pages` table

Each row is a configured checkout page. An owner can have many. A bot can create them via API.

```typescript
export const checkoutPages = pgTable("checkout_pages", {
  id: serial("id").primaryKey(),
  checkoutPageId: text("checkout_page_id").notNull().unique(),  // "cp_a1b2c3d4"
  ownerUid: text("owner_uid").notNull(),
  
  // Which wallet receives the payment
  walletId: integer("wallet_id").notNull(),         // FK → privy_wallets.id
  walletAddress: text("wallet_address").notNull(),   // 0x address (denormalized)
  
  // Checkout configuration
  title: text("title").notNull(),                    // "Premium API Access"
  description: text("description"),                  // Optional longer text
  amountUsdc: bigint("amount_usdc", { mode: "number" }),  // micro-USDC (NULL = open)
  amountLocked: boolean("amount_locked").notNull().default(true),
  
  // Payment method options
  allowedMethods: text("allowed_methods").array().notNull()
    .default(["x402", "usdc_direct", "stripe_onramp"]),
  
  // Lifecycle
  status: text("status").notNull().default("active"),  // active | paused | archived
  
  // Optional behavior
  successUrl: text("success_url"),          // Custom redirect after payment
  successMessage: text("success_message"),  // Custom message on success page
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  
  // Tracking
  viewCount: integer("view_count").notNull().default(0),
  paymentCount: integer("payment_count").notNull().default(0),
  totalReceivedUsdc: bigint("total_received_usdc", { mode: "number" }).notNull().default(0),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at"),  // NULL = no expiry
}, (table) => [
  index("checkout_pages_owner_uid_idx").on(table.ownerUid),
  index("checkout_pages_wallet_id_idx").on(table.walletId),
  index("checkout_pages_status_idx").on(table.status),
  index("checkout_pages_checkout_page_id_idx").on(table.checkoutPageId),
]);
```

### 3.2 `sales` table — "My Sales"

Every completed payment through a checkout page creates a sale record. This is the **reverse of `orders`** — orders track what *you bought*, sales track what *someone bought from you*.

```typescript
export const sales = pgTable("sales", {
  id: serial("id").primaryKey(),
  saleId: text("sale_id").notNull().unique(),          // "sale_x1y2z3"
  checkoutPageId: text("checkout_page_id").notNull(),   // FK → checkout_pages
  ownerUid: text("owner_uid").notNull(),                // Seller's Firebase UID
  
  // Payment details
  amountUsdc: bigint("amount_usdc", { mode: "number" }).notNull(),
  paymentMethod: text("payment_method").notNull(),      // "x402" | "usdc_direct" | "stripe_onramp"
  status: text("status").notNull().default("pending"),  // pending | confirmed | failed | refunded
  
  // Buyer information (what we know)
  buyerType: text("buyer_type"),              // "bot" | "wallet" | "stripe_customer"
  buyerIdentifier: text("buyer_identifier"),  // bot_id, wallet address, or Stripe customer email
  buyerIp: text("buyer_ip"),                  // IP address of the payer
  buyerUserAgent: text("buyer_user_agent"),   // User-agent string
  buyerEmail: text("buyer_email"),            // If provided (Stripe collects this)
  
  // On-chain / provider references
  txHash: text("tx_hash"),                              // On-chain transaction hash
  stripeOnrampSessionId: text("stripe_onramp_session_id"),
  privyTransactionId: integer("privy_transaction_id"),  // FK → privy_transactions
  
  // Denormalized from checkout page for historical record
  checkoutTitle: text("checkout_title"),
  checkoutDescription: text("checkout_description"),
  
  // Metadata
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  
  confirmedAt: timestamp("confirmed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("sales_owner_uid_idx").on(table.ownerUid),
  index("sales_checkout_page_id_idx").on(table.checkoutPageId),
  index("sales_status_idx").on(table.status),
  index("sales_payment_method_idx").on(table.paymentMethod),
  index("sales_created_at_idx").on(table.createdAt),
  index("sales_buyer_identifier_idx").on(table.buyerIdentifier),
]);
```

**Why `sales` is separate from `orders`:**

| Aspect | `orders` (buying) | `sales` (selling) |
|---|---|---|
| Direction | Money goes **out** | Money comes **in** |
| Counterparty | Vendor/merchant | Buyer/customer |
| Details captured | Product, shipping, tracking | Buyer IP, user-agent, email, payment method |
| Rail | Rail 1/2/4/5 | Checkout (new) |
| Status flow | pending → shipped → delivered | pending → confirmed → (refunded) |

---

## 4. Page Routes

| Route | Auth | Purpose |
|---|---|---|
| `/app/checkout/create` | Session cookie | Create/edit checkout pages |
| `/app/checkout/[id]` | Session cookie | View/edit a specific checkout page + its sales |
| `/app/sales` | Session cookie | My Sales — all incoming payments across all checkout pages |
| `/app/sales/[sale_id]` | Session cookie | Individual sale detail |
| `/pay/[checkout_page_id]` | **Public** | The checkout page itself — where buyers pay |
| `/pay/[checkout_page_id]/success` | **Public** | Post-payment confirmation |

---

## 5. API Endpoints

### Owner Endpoints (Session Cookie Auth)

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/v1/checkout-pages` | Create a checkout page |
| GET | `/api/v1/checkout-pages` | List owner's checkout pages |
| GET | `/api/v1/checkout-pages/[id]` | Get checkout page detail |
| PATCH | `/api/v1/checkout-pages/[id]` | Update checkout page |
| DELETE | `/api/v1/checkout-pages/[id]` | Archive checkout page |
| GET | `/api/v1/sales` | List all sales (filters: checkout_page, status, date range, method) |
| GET | `/api/v1/sales/[sale_id]` | Get sale detail |

### Bot Endpoints (Bearer Token Auth via `withBotApi`)

| Method | Path | Rate Limit | Purpose |
|---|---|---|---|
| POST | `/api/v1/bot/checkout-pages/create` | 10/hr | Bot creates checkout page for its wallet |
| GET | `/api/v1/bot/checkout-pages` | 12/hr | Bot lists its checkout pages |
| GET | `/api/v1/bot/sales` | 12/hr | Bot views its incoming sales |

### Public Endpoints (No Auth)

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/checkout/[id]/public` | Fetch checkout page config for rendering |
| POST | `/api/v1/checkout/[id]/pay/stripe-onramp` | Create Stripe onramp session |
| POST | `/api/v1/checkout/[id]/pay/x402` | Pay with CreditClaw x402 wallet |
| POST | `/api/v1/checkout/[id]/pay/usdc-direct` | Register an incoming USDC direct transfer |

---

## 6. The Public Checkout Page — `/pay/[id]`

### 6.1 What It Shows

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│  ┌─────────┐                                        │
│  │ CC LOGO │  CreditClaw Checkout                   │
│  └─────────┘                                        │
│                                                     │
│  ─────────────────────────────────────────────────  │
│                                                     │
│  Premium API Access - 1 Month                       │
│  Unlimited access to my data analysis API.          │
│                                                     │
│  Amount                                             │
│  ┌─────────────────────────────────┐                │
│  │  $5.00                    🔒    │  ← locked      │
│  └─────────────────────────────────┘                │
│                                                     │
│  Pay with                                           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  │  💳      │ │  🔷      │ │  x402    │            │
│  │  Card /  │ │  USDC    │ │  Wallet  │            │
│  │  Bank    │ │  Direct  │ │          │            │
│  └──────────┘ └──────────┘ └──────────┘            │
│                                                     │
│  [ Selected tab content renders here ]              │
│                                                     │
│  ─────────────────────────────────────────────────  │
│  Powered by CreditClaw · Payments settle as USDC   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 6.2 Payment Method Tabs

**Tab 1: Card / Bank (Stripe Crypto Onramp)** — Default for humans.
- Calls `POST /api/v1/checkout/[id]/pay/stripe-onramp`
- Backend calls `createStripeOnrampSession({ walletAddress, amountUsd })` from existing `lib/crypto-onramp/`
- Frontend mounts the Stripe onramp widget inline (reuses the script-loading logic from `use-stripe-onramp.ts`, but in a full-page layout instead of a Sheet)
- On `fulfillment_complete`, existing webhook credits wallet, and we create a `sales` record

**Tab 2: USDC Direct** — For crypto-native users.
- Shows wallet address + QR code + exact amount to send
- "Connect Wallet" button (WalletConnect / Coinbase Wallet / MetaMask)
- Frontend builds ERC-20 `transfer(address, uint256)` calldata
- User signs in their wallet extension
- We poll on-chain for the transfer confirmation, then create a `sales` record

**Tab 3: x402 Wallet** — For CreditClaw wallet holders (bots or humans).
- "Sign in to CreditClaw" button or "Enter API Key" field
- Backend validates payer, checks their wallet balance and guardrails
- Executes wallet-to-wallet USDC transfer on Base
- Creates `sales` record for seller + `privy_transactions` for both wallets

### 6.3 Fixed Amount ($5 Scenario)

When `amount_locked = true` and `amount_usdc = 5000000`:

| Layer | Enforcement |
|---|---|
| **Frontend** | Amount renders as read-only `$5.00` with lock icon. No input field. |
| **Stripe Onramp** | Session created with `source_amount: "5"` + `source_currency: "usd"` |
| **x402 endpoint** | Backend validates `request.amount_usdc === checkout_page.amount_usdc`. Rejects 400 on mismatch. |
| **USDC Direct** | Frontend pre-fills transfer amount. Post-transfer validation confirms amount matches. |

### 6.4 Success Flow

After payment:
1. If `success_url` is set → redirect to that URL with `?sale_id=sale_x1y2z3&status=confirmed`
2. Otherwise → show `/pay/[id]/success` with a confirmation message
3. In both cases:
   - Seller's wallet balance is credited
   - `sales` record is created with status `confirmed`
   - Seller (owner) gets a notification
   - If seller's bot has a webhook URL → `wallet.sale.completed` event fired

---

## 7. "Create Checkout" Page — `/app/checkout/create`

A form where the owner configures a checkout page.

**Fields:**

| Field | Type | Required | Notes |
|---|---|---|---|
| Title | text | Yes | "Premium API Access", "Donate to my bot", etc. |
| Description | textarea | No | Longer explanation shown on checkout page |
| Wallet | select | Yes | Dropdown of owner's active Privy wallets |
| Amount (USD) | number | No | Leave blank for open/custom amount |
| Lock Amount | toggle | Yes (default: on) | If on, payer sees read-only amount |
| Payment Methods | multi-select | Yes (default: all) | x402, USDC Direct, Card/Bank |
| Custom Success URL | url | No | Redirect after payment |
| Custom Success Message | text | No | Shown on default success page |
| Expiry | datetime | No | Leave blank for no expiry |

**On submit:** Creates a `checkout_pages` record, generates `cp_` ID, shows the shareable URL with a copy button and QR code.

**The page also lists existing checkout pages** with stats (views, payments, total earned) and links to edit or archive them.

---

## 8. "My Sales" Page — `/app/sales`

Mirrors the existing `/app/orders` page structure but shows the reverse — incoming payments.

**Columns:**

| Column | Source |
|---|---|
| Date | `sales.created_at` |
| Sale ID | `sales.sale_id` |
| Checkout Page | `sales.checkout_title` (linked to checkout page) |
| Amount | `sales.amount_usdc` formatted as USD |
| Payment Method | Badge: "Card" / "USDC" / "x402" |
| Buyer | `sales.buyer_email` or truncated wallet address or bot name |
| Status | Badge: "Confirmed" / "Pending" / "Failed" |

**Filters:** Status, payment method, checkout page, date range.

**Sale Detail Page (`/app/sales/[sale_id]`):**

Shows everything we know about the sale:
- Amount, timestamp, status
- Checkout page it came through
- Payment method details (Stripe session, tx hash, etc.)
- Buyer info: email (if Stripe), wallet address (if USDC/x402), IP, user-agent
- Link to the privy_transaction record
- The wallet that received it

---

## 9. Skill File — `checkout.md`

Per your direction, this is a **separate file** listed in the skill file tables but not part of the main SKILL.md. It follows the same pattern as `shopping.md`, `amazon.md`, `prepaid-wallet.md`, etc.

**Added to all skill file tables:**

```markdown
| **CHECKOUT.md** | `https://creditclaw.com/{variant}/checkout.md` | Selling & checkout pages — create checkout pages, receive payments |
```

**Added to all install scripts:**

```bash
curl -s https://creditclaw.com/{variant}/checkout.md > ~/.creditclaw/skills/{variant}/CHECKOUT.md
```

**Added to all `skill.json` files:**

```json
{
  "files": {
    ...existing files...,
    "CHECKOUT.md": "https://creditclaw.com/{variant}/checkout.md"
  }
}
```

### 9.1 `checkout.md` Content

```markdown
---
name: creditclaw-checkout
description: "Create checkout pages and receive payments from anyone — bots, agents, or humans."
---

# CreditClaw Checkout — Get Paid by Anyone

Create public checkout pages where anyone can pay you. Buyers can pay with:
- **Credit card or bank** — via Stripe (no crypto knowledge needed)
- **USDC on Base** — direct transfer from any wallet
- **x402 wallet** — from another CreditClaw wallet

All payments settle as USDC into your Privy wallet on Base.

---

## Create a Checkout Page

POST https://creditclaw.com/api/v1/bot/checkout-pages/create
  -H "Authorization: Bearer $CREDITCLAW_API_KEY"
  -H "Content-Type: application/json"
  -d '{
    "title": "Premium API Access - 1 Month",
    "description": "Unlimited queries to my data analysis endpoint.",
    "amount_usd": 5.00,
    "amount_locked": true
  }'

### Request Fields

| Field | Required | Description |
|-------|----------|-------------|
| `title` | Yes | Name shown on checkout page (max 200 chars) |
| `description` | No | Longer text shown below the title |
| `amount_usd` | No | Fixed price in USD. Omit for open/custom amount. |
| `amount_locked` | No | Default `true`. If true, buyer cannot change amount. |
| `allowed_methods` | No | Array of: `"x402"`, `"usdc_direct"`, `"stripe_onramp"`. Default: all three. |
| `success_url` | No | URL to redirect buyer after payment. |
| `expires_at` | No | ISO timestamp. Checkout page expires after this. |

### Response (HTTP 201)

```json
{
  "checkout_page_id": "cp_a1b2c3d4",
  "checkout_url": "https://creditclaw.com/pay/cp_a1b2c3d4",
  "amount_usd": 5.00,
  "amount_locked": true,
  "status": "active"
}
```

Share `checkout_url` with anyone who needs to pay you.

---

## List Your Checkout Pages

GET https://creditclaw.com/api/v1/bot/checkout-pages
  -H "Authorization: Bearer $CREDITCLAW_API_KEY"

Returns all your active checkout pages with view/payment counts.

**Rate limit:** 12 requests per hour.

---

## View Your Sales

GET https://creditclaw.com/api/v1/bot/sales
  -H "Authorization: Bearer $CREDITCLAW_API_KEY"

Optional query parameters:
- `?status=confirmed|pending|failed` — Filter by status
- `?checkout_page_id=cp_xxx` — Filter by checkout page
- `?limit=N` — Number of results (default 20, max 100)

**Rate limit:** 12 requests per hour.

### Response

```json
{
  "sales": [
    {
      "sale_id": "sale_x1y2z3",
      "checkout_page_id": "cp_a1b2c3d4",
      "checkout_title": "Premium API Access - 1 Month",
      "amount_usd": 5.00,
      "payment_method": "stripe_onramp",
      "buyer_email": "buyer@example.com",
      "status": "confirmed",
      "confirmed_at": "2026-02-27T15:30:00Z",
      "created_at": "2026-02-27T15:29:45Z"
    }
  ],
  "total": 1
}
```

---

## When to Use Checkout Pages

| Scenario | Use This |
|----------|----------|
| You sell API access or digital services | ✅ Checkout page with fixed amount |
| You accept donations or tips | ✅ Checkout page with open amount |
| You want to invoice a specific buyer | ✅ Checkout page (share the link) |
| You want to sell on a marketplace (Moltroad) | ✅ Create checkout page, list the URL |
| You need to send a one-time payment request | Consider Payment Links instead (24h expiry, Stripe-only) |
| You want to sell physical products with shipping | Use a procurement skill + vendor instead |

---

## Webhooks

When a sale is confirmed, CreditClaw fires a `wallet.sale.completed` webhook:

```json
{
  "event": "wallet.sale.completed",
  "data": {
    "sale_id": "sale_x1y2z3",
    "checkout_page_id": "cp_a1b2c3d4",
    "amount_usd": 5.00,
    "payment_method": "stripe_onramp",
    "buyer_email": "buyer@example.com",
    "new_balance_usd": 125.50
  }
}
```

Use this to trigger fulfillment (e.g., grant API access, send a download link, update a service).

---

## Tips

- **Set `amount_locked: true`** for fixed-price products so buyers can't underpay.
- **Leave `amount_usd` empty** for donation or tip jars.
- **Use `success_url`** to redirect buyers back to your service after payment.
- **Check `GET /bot/sales`** periodically to reconcile completed sales with your fulfillment.
- **Multiple checkout pages** are fine — create one per product or service tier.
```

---

## 10. Vendor Index / Supplier Hub Integration

You mentioned the idea of a filter for "hosted vendors" on the vendor index. This maps nicely:

**Concept:** Checkout pages created by bots or humans are essentially **hosted storefronts**. They could appear in the Supplier Hub (`/skills`) alongside traditional vendor skills, but with a different badge.

**Implementation:**

- Add a `source` field or tag to the skills/vendor catalog: `"external"` (Amazon, Shopify, etc.) vs `"hosted"` (CreditClaw checkout pages).
- On the `/skills` catalog page, add a filter: "Hosted on CreditClaw" that shows checkout pages from other users/bots.
- Each hosted vendor card links to their checkout URL (`/pay/cp_xxx`) instead of a skill file.

This is a **Phase 2** enhancement. For now, checkout pages are shared by direct link. The marketplace/discovery layer comes later.

---

## 11. How the Three Integration Tiers Use This

### A. OpenClaw Bots

1. Bot reads `CHECKOUT.md` from the skill file
2. Bot calls `POST /bot/checkout-pages/create` with title, amount, etc.
3. Bot gets `checkout_url` back
4. Bot shares the URL wherever it needs to (Moltbook posts, Moltroad listings, conversations, x402 service descriptions)
5. Buyers visit URL, pay, USDC lands in bot's wallet
6. Bot polls `GET /bot/sales` or receives `wallet.sale.completed` webhook

### B. Third-Party Agents (API)

Same flow as OpenClaw, but the agent reads REST API docs instead of a skill file. The endpoints are identical. We publish the bot API docs at a developer-friendly URL and alias `/api/v1/agent/` to `/api/v1/bot/` for branding.

### C. Humans on CreditClaw

1. Owner clicks "Create Checkout" in the sidebar
2. Fills out the form (title, amount, wallet, methods)
3. Gets a shareable URL + QR code
4. Shares it (email, social, embed on website)
5. Views incoming sales in "My Sales" dashboard page
6. Gets notifications for each sale

---

## 12. Implementation Priority

### Phase 1 — Core (1 week)
- `checkout_pages` + `sales` tables in `shared/schema.ts`
- Storage CRUD for both tables
- Owner API: create, list, get, update, archive checkout pages
- Owner API: list, get sales
- Bot API: create, list checkout pages + list sales
- Public checkout page at `/pay/[id]` — **Stripe Onramp only** (card/bank)
- Create Checkout dashboard page (`/app/checkout/create`)
- My Sales dashboard page (`/app/sales`)
- Sale detail page (`/app/sales/[sale_id]`)
- Sidebar update with "Sales" section
- `checkout.md` skill file for all variants
- `wallet.sale.completed` webhook event
- Success page at `/pay/[id]/success`

### Phase 2 — x402 + USDC Direct (1 week)
- x402 wallet-to-wallet payment on checkout page
- USDC direct transfer tab (WalletConnect integration)
- On-chain transfer detection
- `checkout_payments` join table for multi-method tracking

### Phase 3 — Discovery + Marketplace (2 weeks)
- "Hosted on CreditClaw" filter in Supplier Hub
- Discovery API (`/api/v1/discover/search`)
- `/api/v1/agent/` namespace alias
- Embeddable checkout widget (`<script>` tag)
- Recurring checkout support (subscriptions)

---

## 13. Open Questions

1. **Fees:** Does CreditClaw take a cut on checkout page payments? If so, what percentage, and is it deducted pre- or post-credit?
2. **Refunds:** Should sellers be able to issue refunds from the sales detail page? This would require a USDC transfer back to the buyer.
3. **Rate limiting on public pages:** How aggressively? Proposal: 30 Stripe sessions/hr per IP, 30 x402 payments/hr per API key.
4. **Checkout page visibility:** Public by default with unlisted option? Or unlisted by default with opt-in to marketplace listing?
5. **Bot-to-bot auto-pay:** If a bot visits another bot's checkout page URL, should it auto-detect it's a CreditClaw URL and attempt x402 payment without loading the HTML page? (This would be a programmatic shortcut.)
