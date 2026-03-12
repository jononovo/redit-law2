# Technical Reference: Amazon Shopping with CreditClaw

**Date:** February 14, 2026

> Internal reference document for building accurate skill documentation and ensuring CreditClaw's Amazon shopping instructions are technically correct.

---

## 1. How Amazon Purchases Work (The Stack)

Amazon purchases through CreditClaw involve three layers:

```
┌─────────────────────────────────────────────────────────────────┐
│  Agent (OpenClaw Bot)                                           │
│  - Holds local signing key (ed25519 for Solana, or EVM key)     │
│  - Calls CreditClaw API or CrossMint directly                   │
└────────────┬────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────┐
│  CreditClaw (Rail 2 — Card Wallet)                              │
│  - Enforces owner guardrails (per-tx, daily, monthly limits)    │
│  - Enforces master guardrails (cross-rail limits)               │
│  - Manages approval workflow (owner approves before purchase)   │
│  - Creates CrossMint orders on approval                         │
│  - Tracks order lifecycle via webhooks                          │
└────────────┬────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────┐
│  CrossMint Headless Checkout API                                │
│  - Creates orders with Amazon product locators                  │
│  - Handles payment (crypto → fiat settlement)                   │
│  - Acts as Merchant of Record (returns, chargebacks, taxes)     │
│  - Places real Amazon orders with real fulfillment              │
│  - Provides order tracking (carrier, tracking number, ETA)      │
└─────────────────────────────────────────────────────────────────┘
```

**Key insight:** CrossMint is the Merchant of Record. The agent never interacts with Amazon directly. CrossMint handles the fiat conversion, Amazon order placement, shipping, returns, and chargebacks.

---

## 2. Two Integration Paths

### Path A: CreditClaw Rail 2 (Recommended for CreditClaw users)

The bot calls CreditClaw's API. CreditClaw enforces guardrails and creates CrossMint orders on behalf of the bot.

**Flow:**
1. Bot calls `POST /api/v1/card-wallet/bot/purchase` with ASIN + shipping address
2. CreditClaw checks guardrails (per-tx limit, daily/monthly budget, merchant allowlist)
3. If purchase requires approval → status `requires_approval`, owner gets notification
4. Owner approves via dashboard or email link (15-min TTL)
5. On approval, CreditClaw calls CrossMint Orders API to create the order
6. CrossMint returns serialized payment transaction
7. CreditClaw handles payment confirmation
8. Bot polls `GET /api/v1/card-wallet/bot/purchase/status` for updates
9. CrossMint webhooks update order status (shipped, delivered, failed)

**Bot-facing endpoints:**
- `POST /api/v1/card-wallet/bot/purchase` — Request a purchase
- `GET /api/v1/card-wallet/bot/purchase/status` — Poll purchase/approval status

### Path B: CrossMint OpenClaw Plugin (Direct, no CreditClaw guardrails)

The bot uses the `@crossmint/openclaw-wallet` plugin directly. No CreditClaw guardrails — the agent has direct wallet access.

**Flow:**
1. Agent generates local keypair via `crossmint_setup`
2. Owner delegates signing authority at `lobster.cash/configure?pubkey=<key>`
3. CrossMint creates smart wallet, adds agent as delegated signer
4. Agent calls `crossmint_buy` with ASIN + shipping address
5. Plugin executes 6-step delegated signer flow (see Section 5)
6. Agent polls `crossmint_order_status` for delivery tracking

**Plugin tools:** `crossmint_setup`, `crossmint_configure`, `crossmint_balance`, `crossmint_send`, `crossmint_buy`, `crossmint_order_status`

### Path C: GOAT SDK + CrossMint Headless Checkout (EVM)

Uses the GOAT SDK with `@goat-sdk/plugin-crossmint-headless-checkout` for EVM-based purchases.

**Flow:**
1. Create viem wallet client with private key
2. Initialize GOAT with CrossMint headless checkout plugin
3. Agent uses `buy_token` tool with Amazon product locator
4. GOAT handles order creation, payment signing, and confirmation

**Key difference:** Uses EVM chains (Base, Ethereum, etc.) instead of Solana. Supports USDC, ETH, and other EVM tokens.

---

## 3. CrossMint Headless Checkout API — Amazon Details

### Create Order

```
POST https://www.crossmint.com/api/2022-06-09/orders

Headers:
  x-api-key: <server-api-key>   (scope: orders.create)
  Content-Type: application/json

Body:
{
  "recipient": {
    "email": "buyer@example.com",
    "physicalAddress": {
      "name": "John Doe",
      "line1": "123 Main St",
      "line2": "Apt 4B",         // optional
      "city": "San Francisco",
      "state": "CA",             // required for US
      "postalCode": "94105",
      "country": "US"            // ONLY US supported currently
    }
  },
  "payment": {
    "method": "base",            // chain: base, ethereum, solana, etc.
    "currency": "usdc",          // usdc, eth, sol, etc.
    "payerAddress": "0x..."      // wallet address paying
  },
  "lineItems": [
    {
      "productLocator": "amazon:B01DFKC2SO"
    }
  ]
}
```

### Product Locator Formats

All valid for Amazon:
- ASIN only: `amazon:B00O79SKV6`
- Full URL: `amazon:https://www.amazon.com/dp/B00O79SKV6`
- Short URL: `amazon:https://a.co/d/abc1234` (if supported)

**ASIN format:** 10-character alphanumeric code (starts with B0 for most products). Found in the Amazon product URL after `/dp/`.

### Order Response

```json
{
  "order": {
    "orderId": "cc40e6af-...",
    "phase": "payment",
    "quote": {
      "status": "valid",
      "totalPrice": {
        "amount": "12.50",
        "currency": "usdc"
      }
    },
    "payment": {
      "preparation": {
        "serializedTransaction": "...",
        "status": "awaiting-payment"
      }
    },
    "lineItems": [
      {
        "metadata": {
          "name": "AmazonBasics USB Cable",
          "imageUrl": "https://..."
        }
      }
    ]
  }
}
```

### Order Phases

| Phase | Description |
|-------|-------------|
| `quote` | Order created, price being calculated |
| `payment` | Quote ready, awaiting crypto payment |
| `delivery` | Payment confirmed, order being fulfilled by Amazon |
| `completed` | Order delivered |

### Payment Status Values

| Status | Description |
|--------|-------------|
| `requires-quote` | Price not yet determined |
| `awaiting-payment` | Ready for payment |
| `requires-crypto-payer-address` | Need payer wallet address (use PATCH to add) |
| `completed` | Payment confirmed on-chain |

### Get Order Status

```
GET https://www.crossmint.com/api/2022-06-09/orders/{orderId}

Headers:
  x-api-key: <server-api-key>   (scope: orders.read)
```

### Update Order (Add payer address)

```
PATCH https://www.crossmint.com/api/2022-06-09/orders/{orderId}

Body:
{
  "payment": {
    "method": "base",
    "currency": "usdc",
    "payerAddress": "0x..."
  }
}
```

### API Key Scopes Required

| Scope | Used For |
|-------|----------|
| `orders.create` | Creating orders |
| `orders.read` | Polling order status |
| `orders.update` | Updating payer address, editing orders |

### API Environments

| Environment | Base URL | API Key Prefix |
|-------------|----------|----------------|
| Staging | `https://staging.crossmint.com/api` | `sk_staging_` or `ck_staging_` |
| Production | `https://www.crossmint.com/api` | `sk_production_` or `ck_production_` |

---

## 4. Amazon-Specific Restrictions & Gotchas

### What CAN be purchased:
- Physical products sold by Amazon or verified third-party sellers
- Most standard Prime-eligible items
- Products with standard shipping

### What CANNOT be purchased:
- Digital products (Kindle books, software, music, video)
- Amazon Fresh / Pantry / Pharmacy items
- Subscribe & Save items
- Hazardous materials (hazmat)
- Oversized/freight items
- Gift cards
- Products requiring age verification
- Items unavailable for shipping to the provided address

### Shipping:
- **US only** — Currently only US shipping addresses are supported
- Address must include: name, line1, city, state, postalCode, country
- `line2` is optional (apartment, suite, etc.)
- Standard Amazon shipping applies (not Prime 2-day)

### Order Tracking (Amazon-specific):
CrossMint provides tracking info for Amazon orders via webhooks:
- `carrier` — Shipping carrier name (UPS, USPS, FedEx, etc.)
- `tracking_number` — Carrier tracking number
- `tracking_url` — Direct tracking URL
- `estimated_delivery` — Estimated delivery date

### Product Validation:
**Critical:** Always validate the product title returned in the order response matches what was requested. ASINs can change or be reassigned. The CrossMint OpenClaw plugin SKILL.md explicitly warns about this — agents should compare the returned product name against the user's request before confirming payment.

---

## 5. Delegated Signer Flow (CrossMint OpenClaw Plugin — Solana)

When using the CrossMint OpenClaw plugin directly (Path B), the `crossmint_buy` tool executes this 6-step flow:

```
Step 1: Create Order
  POST /api/2022-06-09/orders
  → Returns serialized payment transaction

Step 2: Create Transaction
  POST /api/v1/wallets/{address}/transactions
  Body: { serializedTransaction }
  → Returns approval message to sign

Step 3: Sign Approval (Local)
  Agent signs the approval message with its ed25519 keypair locally
  No network call — pure cryptographic signing

Step 4: Submit Approval
  POST /api/v1/wallets/{address}/transactions/{txId}/approvals
  Body: { signature }

Step 5: Wait for Broadcast
  Poll GET /api/v1/wallets/{address}/transactions/{txId}
  Until on-chain txId is available

Step 6: Confirm Payment
  POST /api/2022-06-09/orders/{orderId}/payment
  Body: { txId }
  → Notifies CrossMint that payment is on-chain, triggers fulfillment
```

**Key:** Steps 2-5 use Crossmint's Wallet API (delegated signer flow). Step 6 links the on-chain payment back to the order.

---

## 6. Wallet Funding — CrossMint Onramp

Before purchasing, the wallet needs USDC (or SOL/ETH). CrossMint provides an embedded onramp:

### Fiat → Crypto Onramp
- Accepts credit/debit cards, Apple Pay, Google Pay
- Handles KYC automatically within the embedded checkout component
- Delivers USDC (or other tokens) directly to the smart wallet
- Uses `@crossmint/client-sdk-react-ui` for embedded UI

### CreditClaw Rail 2 Onramp Flow
1. Owner calls `POST /api/v1/card-wallet/onramp/session` to create a session
2. CreditClaw returns a CrossMint onramp session config
3. Owner uses embedded onramp UI to fund the wallet
4. CrossMint delivers USDC to the smart wallet on Base
5. CreditClaw updates local balance cache

### Environment Variables for Onramp
- `CROSSMINT_SERVER_API_KEY` — Server-side operations
- `NEXT_PUBLIC_CROSSMINT_CLIENT_API_KEY` — Client-side embedded UI
- `CROSSMINT_WEBHOOK_SECRET` — Webhook signature verification (Svix)

---

## 7. CreditClaw Rail 2 — Purchase Flow Detail

### Bot Purchase Request

```
POST /api/v1/card-wallet/bot/purchase

Headers:
  Authorization: Bearer <bot-api-token>

Body:
{
  "wallet_id": 123,
  "product_locator": "amazon:B01DFKC2SO",
  "quantity": 1,
  "shipping_address": {
    "name": "John Doe",
    "line1": "123 Main St",
    "city": "San Francisco",
    "state": "CA",
    "zip": "94105",
    "country": "US"
  },
  "recipient_email": "buyer@example.com"
}
```

### Guardrail Evaluation Order
1. **Master guardrails** checked first (cross-rail limits)
2. **Rail 2 guardrails** checked second (per-wallet limits)
3. **Merchant allowlist/blocklist** checked
4. **Approval threshold** — If amount > `require_approval_above`, requires owner approval
5. **New accounts default:** `require_approval_above = 0` (all purchases need approval)

### Purchase Status Lifecycle

```
requires_approval → approved → processing → shipped → delivered
                  → rejected
                  → expired (15-min TTL)
```

### Bot Polling

```
GET /api/v1/card-wallet/bot/purchase/status?purchase_id=abc123

Headers:
  Authorization: Bearer <bot-api-token>

Response:
{
  "status": "approved",
  "order_status": "shipped",
  "tracking_info": {
    "carrier": "UPS",
    "tracking_number": "1Z...",
    "tracking_url": "https://...",
    "estimated_delivery": "2026-02-18"
  }
}
```

---

## 8. Webhook Events (CrossMint → CreditClaw)

CreditClaw receives order lifecycle webhooks from CrossMint, verified with Svix signatures.

| Event | Trigger | CreditClaw Action |
|-------|---------|-------------------|
| `order.payment.completed` | Payment confirmed on-chain | Update transaction status to `confirmed` |
| `order.delivery.shipped` | Amazon ships the order | Update `order_status` to `shipped`, store tracking info |
| `order.delivery.delivered` | Amazon confirms delivery | Update `order_status` to `delivered` |
| `order.delivery.failed` | Delivery failed | Update `order_status` to `delivery_failed` |
| `order.payment.failed` | Payment failed | Update transaction status to `failed` |

Webhook endpoint: `POST /api/v1/card-wallet/webhooks/crossmint`
Verification: Svix library (`svix.Webhook.verify()`)

---

## 9. Supported Payment Methods for Amazon Purchases

### Via CreditClaw Rail 2 (Card Wallet)
- **USDC on Base** — Primary method. Wallet holds USDC, CrossMint settles to fiat for Amazon purchase.
- Funded via fiat onramp (credit card → USDC)

### Via CrossMint OpenClaw Plugin (Direct)
- **SOL** — Native Solana
- **USDC on Solana** — Solana SPL token
- Wallet is a Crossmint smart wallet on Solana mainnet

### Via GOAT SDK (EVM)
- **USDC on Base** / **ETH on Base Sepolia** / other EVM tokens
- Uses viem wallet client with any EVM-compatible chain
- Payment: `crossmintHeadlessCheckout({ apiKey })` plugin

---

## 10. Key Differences: CreditClaw vs. Direct CrossMint

| Feature | CreditClaw Rail 2 | Direct CrossMint Plugin |
|---------|-------------------|------------------------|
| Guardrails | Full (per-tx, daily, monthly, merchant lists) | None — agent has full access |
| Owner approval | Yes, configurable threshold | No — agent acts autonomously |
| Master guardrails | Yes — cross-rail limits | No |
| Wallet freeze | Yes — owner can freeze | No built-in freeze |
| Chain | Base (EVM) | Solana |
| Currency | USDC | SOL, USDC, SPL tokens |
| Funding | Fiat onramp via CreditClaw UI | Fiat onramp via lobster.cash |
| Order tracking | Webhooks → dashboard | Agent polls `crossmint_order_status` |
| Multi-bot | Yes — multiple bots per owner | One wallet per agent |
| Audit trail | Full transaction ledger | Agent-local only |

---

## 11. Finding Amazon Products (ASIN Discovery)

Agents need the ASIN to purchase. Methods:

1. **User provides ASIN directly:** `B01DFKC2SO`
2. **User provides Amazon URL:** Extract ASIN from `/dp/B01DFKC2SO` in the URL
3. **User describes product:** Agent searches Amazon via web search, finds ASIN, confirms with user before purchasing
4. **CrossMint search (beta):** `POST /api/v1/card-wallet/bot/search` — Shopify product search via CrossMint WS Search API (unstable, not recommended for Amazon)

**Best practice flow:**
1. User says "Buy me Celsius energy drinks"
2. Agent searches "Celsius energy drink site:amazon.com"
3. Agent finds ASIN `B08P5H1FLX` — "CELSIUS Sparkling Orange (12-pack)"
4. Agent confirms: "I found CELSIUS Sparkling Orange 12-pack. Is this what you want?"
5. User confirms → Agent calls purchase API with the ASIN

---

## 12. Error Handling

### Common CrossMint Order Errors

| Error | Cause | Resolution |
|-------|-------|------------|
| `product_not_found` | Invalid ASIN or product unavailable | Verify ASIN exists on Amazon |
| `shipping_address_invalid` | Missing required fields or unsupported country | Ensure all required fields present, US only |
| `insufficient_funds` | Wallet balance too low | Fund wallet via onramp |
| `payment_failed` | On-chain transaction failed | Retry or check wallet balance |
| `product_restricted` | Digital product, hazmat, gift card, etc. | Choose a different product |
| `quote_expired` | Took too long to pay after quote | Create a new order |

### CreditClaw-Specific Errors

| Error | Cause | Resolution |
|-------|-------|------------|
| `guardrail_exceeded` | Purchase exceeds per-tx, daily, or monthly limit | Owner adjusts guardrails |
| `merchant_blocked` | Amazon not in allowlist or is in blocklist | Owner updates merchant lists |
| `wallet_paused` | Wallet is frozen | Owner unfreezes wallet |
| `approval_expired` | Owner didn't approve within 15 minutes | Bot re-requests purchase |
| `approval_rejected` | Owner rejected the purchase | Bot should not retry same purchase |
| `master_guardrail_exceeded` | Cross-rail budget exhausted | Owner adjusts master guardrails |

---

## 13. Environment Variables Summary

### CreditClaw Rail 2
| Variable | Purpose |
|----------|---------|
| `CROSSMINT_SERVER_API_KEY` | Server-side CrossMint API calls |
| `NEXT_PUBLIC_CROSSMINT_CLIENT_API_KEY` | Client-side embedded onramp UI |
| `CROSSMINT_WEBHOOK_SECRET` | Svix webhook signature verification |

### CrossMint OpenClaw Plugin (Direct)
| Variable | Purpose |
|----------|---------|
| Wallet API key | Provided by lobster.cash after delegation setup |
| Agent's ed25519 keypair | Generated locally by `crossmint_setup`, stored in `~/.openclaw/` |

### GOAT SDK (EVM)
| Variable | Purpose |
|----------|---------|
| `CROSSMINT_API_KEY` | CrossMint headless checkout API key |
| `WALLET_PRIVATE_KEY` | EVM wallet private key |
| `RPC_PROVIDER_URL` | EVM RPC endpoint (e.g., Base, Ethereum) |
| `OPENAI_API_KEY` | LLM for agent reasoning |

---

## 14. Reference Links

- [CrossMint Headless Checkout Overview](https://docs.crossmint.com/payments/headless/overview)
- [CrossMint Amazon Integration Guide](https://docs.crossmint.com/payments/headless/guides/providers/amazon)
- [CrossMint Order Lifecycle](https://docs.crossmint.com/nft-checkout/headless/guides/order-lifecycle/crypto-payment-phase)
- [CrossMint OpenClaw Plugin (GitHub)](https://github.com/Crossmint/openclaw-crossmint-plugin)
- [GOAT SDK — EVM Amazon Purchase (GitHub)](https://github.com/goat-sdk/goat/tree/main/typescript/examples/by-use-case/evm-purchase-on-amazon)
- [CrossMint Onramp Embedded Quickstart (GitHub)](https://github.com/Crossmint/onramp-embedded-quickstart)
- [CrossMint Amazon Shopper Demo (GitHub)](https://github.com/Crossmint/amazon-shopper)
- [CrossMint WorldStore Agent (GitHub)](https://github.com/Crossmint/worldstore-agent)
- [CrossMint Full API Docs (LLM-friendly)](https://docs.crossmint.com/llms-full.txt)
- [CrossMint Supported Currencies](https://docs.crossmint.com/payments/headless/guides/supported-currencies)
