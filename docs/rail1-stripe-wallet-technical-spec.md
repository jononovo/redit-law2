# Rail 1: Stripe Wallet — Technical Specification

**Date:** February 13, 2026, 8:30 PM UTC

> Privy server wallets on Base chain, Stripe Crypto Onramp for fiat→USDC, x402 payment protocol for bot spending.

---

## Architecture

```
Owner (Browser)                    Bot (API Client)
      │                                  │
      ▼                                  ▼
┌─────────────────────────────────────────────────────────┐
│              CreditClaw Backend (Next.js API)           │
│                                                         │
│  Owner endpoints:              Bot endpoints:           │
│  /stripe-wallet/create         /stripe-wallet/bot/sign  │
│  /stripe-wallet/list                                    │
│  /stripe-wallet/balance                                 │
│  /stripe-wallet/freeze                                  │
│  /stripe-wallet/onramp/session                          │
│  /stripe-wallet/guardrails                              │
│  /stripe-wallet/transactions                            │
│  /stripe-wallet/approvals                               │
│  /stripe-wallet/approvals/decide                        │
│  /stripe-wallet/webhooks/stripe                         │
└──────────┬─────────────────────────────┬────────────────┘
           │                             │
     ┌─────┴─────┐               ┌──────┴──────┐
     │   Privy   │               │   Stripe    │
     │  Server   │               │   Crypto    │
     │  Wallets  │               │   Onramp    │
     └─────┬─────┘               └─────────────┘
           │
     ┌─────┴─────────────────────────────────┐
     │         x402 Payment Flow             │
     │  EIP-712 sign → X-PAYMENT header      │
     │  → Coinbase CDP facilitator           │
     │  → USDC settlement on Base            │
     └──────────────────────────────────────-┘
```

---

## Data Model

Four tables, all prefixed `privy_` for rail segmentation.

### privy_wallets
| Column | Type | Description |
|--------|------|-------------|
| id | serial PK | |
| bot_id | text | Linked bot identifier |
| owner_uid | text | Firebase UID of the wallet owner |
| privy_wallet_id | text | Privy's internal wallet ID |
| address | text | 0x address on Base (Ethereum-format) |
| balance_usdc | bigint | Micro-USDC (6 decimals). 1000000 = $1.00 |
| status | text | `active` / `paused` |
| created_at | timestamp | |
| updated_at | timestamp | |

### privy_guardrails
| Column | Type | Description |
|--------|------|-------------|
| id | serial PK | |
| wallet_id | integer | FK → privy_wallets |
| max_per_tx_usdc | integer | Per-transaction cap in USD (default: 100) |
| daily_budget_usdc | integer | Daily spend cap in USD (default: 1000) |
| monthly_budget_usdc | integer | Monthly spend cap in USD (default: 10000) |
| require_approval_above | integer | Human approval threshold in USD (null = never) |
| allowlisted_domains | jsonb | Array of allowed domains |
| blocklisted_domains | jsonb | Array of blocked domains |
| auto_pause_on_zero | boolean | Pause wallet when balance hits zero (default: true) |

### privy_transactions
| Column | Type | Description |
|--------|------|-------------|
| id | serial PK | |
| wallet_id | integer | FK → privy_wallets |
| type | text | `deposit` / `x402_payment` / `refund` |
| amount_usdc | bigint | Micro-USDC |
| recipient_address | text | For x402 payments |
| resource_url | text | The x402 endpoint URL |
| tx_hash | text | Base chain transaction hash |
| status | text | `pending` / `confirmed` / `failed` / `requires_approval` |
| stripe_session_id | text | For deposits via onramp |
| metadata | jsonb | |

### Approvals
Rail 1 approvals are managed through the centralized `unified_approvals` table. The `railRef` column stores the privy_transaction ID. Rail-specific metadata (resource_url, recipient_address) is stored in the `metadata` JSONB column. See the Unified Approval System section in replit.md for details.

---

## API Endpoints

All routes under `/api/v1/stripe-wallet/`. Owner endpoints use Firebase session cookie auth. Bot endpoint uses Bearer API token auth.

### Owner Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/create` | Create a Privy server wallet for a bot. Calls `privy.walletsService.create({ chain_type: "ethereum" })`. Stores wallet record, creates default guardrails. |
| GET | `/list` | List owner's wallets with balances, guardrails, and linked bot info. |
| GET | `/balance` | Single wallet balance lookup. |
| POST | `/freeze` | Toggle wallet status between `active` and `paused`. Paused wallets reject all signing requests. |
| POST | `/onramp/session` | Create Stripe Crypto Onramp session. Returns `client_secret` for embedded widget and `redirect_url` for hosted fallback. |
| GET/POST | `/guardrails` | View or update spending controls for a wallet. |
| GET | `/transactions` | List transactions for a wallet. Filterable by type. |
| GET | `/approvals` | List pending approvals for the owner. |
| POST | `/approvals/decide` | Approve or reject a pending payment. Checks expiration. |

### Bot Endpoint

| Method | Path | Description |
|--------|------|-------------|
| POST | `/bot/sign` | Sign an x402 payment. Enforces all guardrails, returns `X-PAYMENT` header. |

### Webhook

| Method | Path | Description |
|--------|------|-------------|
| POST | `/webhooks/stripe` | Handles `crypto.onramp_session_updated`. On `fulfillment_complete`, credits wallet balance and creates deposit transaction. |

---

## Core Flows

### 1. Wallet Creation

```
Owner clicks "Create Wallet" → selects a bot
→ POST /stripe-wallet/create { bot_id }
→ Backend: Privy API POST /v1/wallets { chain_type: "ethereum" }
→ Returns { privy_wallet_id, address }
→ Store in privy_wallets, create default guardrails
→ Wallet card appears in dashboard with $0.00 balance
```

### 2. Funding via Stripe Crypto Onramp

```
Owner clicks "Fund with Stripe" on a wallet card
→ POST /stripe-wallet/onramp/session { wallet_id }
→ Backend: POST https://api.stripe.com/v1/crypto/onramp_sessions
   Parameters:
     wallet_addresses[ethereum] = <wallet address>
     lock_wallet_address = true
     destination_currencies[] = usdc
     destination_network = base
     destination_currency = usdc
     customer_ip_address = <from x-forwarded-for>
     customer_information[email] = <owner email>
→ Returns { client_secret, redirect_url }
→ Frontend: Try embedded widget (@stripe/crypto), fallback to hosted redirect
→ User completes KYC (first time) + pays with card
→ Stripe webhook: crypto.onramp_session_updated (fulfillment_complete)
→ Backend credits privy_wallets.balance_usdc, creates deposit transaction
```

Embedded widget requires `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` and cannot run inside iframes (falls back to hosted `crypto.link.com` redirect in Replit preview; works embedded on production domain).

### 3. Bot x402 Payment Signing

```
Bot encounters 402 Payment Required response
→ POST /stripe-wallet/bot/sign (Bearer: bot API key)
   { resource_url, amount_usdc, recipient_address, valid_before? }

Backend guardrail checks (in order):
  1. Wallet active? (status == "active")
  2. Amount ≤ max_per_tx_usdc?
  3. Daily cumulative + amount ≤ daily_budget_usdc?
  4. Monthly cumulative + amount ≤ monthly_budget_usdc?
  5. Domain on allowlist? (if set)
  6. Domain not on blocklist?
  7. Amount < require_approval_above? (if set)

If approval required → create pending approval (5-min TTL), return 202
If hard block → return 403 with reason
If passed:
  → Build EIP-712 TransferWithAuthorization typed data
  → Sign via Privy walletsService.ethereum().signTypedData()
  → Construct X-PAYMENT header (base64-encoded JSON payload)
  → Log transaction, return { x_payment_header, signature }

Bot retries original request with X-PAYMENT header
→ Coinbase CDP facilitator verifies + settles USDC on Base
```

### 4. Human-in-the-Loop Approval

```
Bot payment exceeds require_approval_above threshold
→ Transaction created with status "requires_approval"
→ Approval record created (5-minute expiry)
→ Bot receives 202 { status: "awaiting_approval", approval_id }

Owner sees pending approval in dashboard
→ POST /stripe-wallet/approvals/decide { approval_id, decision: "approve"|"reject" }
→ If expired → 410 Gone
→ If rejected → transaction marked failed
→ If approved → (bot can re-request signing)
```

---

## Lib Files

| File | Purpose |
|------|---------|
| `lib/stripe-wallet/server.ts` | Privy client initialization, authorization signature generation (HMAC over canonicalized payload), wallet creation, EIP-712 signing |
| `lib/stripe-wallet/x402.ts` | EIP-712 `TransferWithAuthorization` typed data construction, nonce generation, `X-PAYMENT` header encoding, USDC formatting utilities |
| `lib/stripe-wallet/onramp.ts` | Direct Stripe REST API call to `POST /v1/crypto/onramp_sessions` (SDK lacks native support for beta endpoints) |

---

## Key Technical Details

- **Privy SDK**: `@privy-io/node` v0.8.0. Constructor: `new PrivyClient({ appId, appSecret })`. Wallet creation uses `privy.walletsService.create()`. Signing uses `privy.walletsService.ethereum().signTypedData()`.
- **Stripe Onramp API**: Called via raw `fetch()` to `https://api.stripe.com/v1/crypto/onramp_sessions` because the Node SDK (v20.3.1) does not expose `stripe.crypto.onrampSessions` — the Crypto Onramp API is in public preview.
- **Chain**: Base (chain ID 8453). USDC contract: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`.
- **EIP-712 Domain**: `{ name: "USD Coin", version: "2", chainId: 8453, verifyingContract: <USDC address> }`.
- **Balance units**: `balance_usdc` and `amount_usdc` fields store micro-USDC (6 decimals). `1000000 = $1.00`. Guardrail limits (`max_per_tx_usdc`, etc.) store integer USD values.
- **Auth**: Firebase Auth (global) for owners via httpOnly session cookies. Bearer API tokens for bots via `authenticateBot()` middleware.
- **Rail segmentation**: All tables prefixed `privy_*`, all routes under `/api/v1/stripe-wallet/*`, all lib under `lib/stripe-wallet/`, all UI under `/app/stripe-wallet`.

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_PRIVY_APP_ID` | Privy app ID (client-side) |
| `PRIVY_APP_ID` | Privy app ID (server-side) |
| `PRIVY_APP_SECRET` | Privy app secret for API auth |
| `PRIVY_AUTHORIZATION_KEY` | Private key for Privy request signing |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key for embedded onramp widget |
| `STRIPE_SECRET_KEY` | Stripe secret key for onramp session creation |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signature verification |

---

## Frontend

Dashboard at `/app/stripe-wallet` (client component). Features:
- Wallet cards with gradient design (matching self-hosted cards page)
- Balance display, bot name, wallet address, status badge
- "Fund with Stripe" button per wallet (opens onramp)
- "Create Wallet" flow with bot selector
- Wallet freeze/unfreeze toggle
- Transaction ledger per wallet
- Pending approvals section with approve/reject actions
- Guardrails configuration panel

## Status

**Implemented**: Wallet creation, funding (onramp), guardrails CRUD, bot signing with guardrail enforcement, approval flow, freeze/unfreeze, transaction ledger, webhook handler, dashboard UI.

**Not yet implemented**: Privy Policy Engine sync (guardrails currently enforced at application level only), real-time balance polling from Base RPC, webhook notifications to bots, approval result polling for bots.
