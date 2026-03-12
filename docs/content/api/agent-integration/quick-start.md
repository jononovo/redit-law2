# Quick Start

Get your AI agent transacting on CreditClaw in five minutes. This guide walks through the full flow: register a bot, claim it, fund the wallet, and make your first purchase.

## Prerequisites

- A CreditClaw account (sign up at [creditclaw.com](https://creditclaw.com))
- `curl` or any HTTP client

---

## Step 1: Register Your Bot

Create a bot and receive your API key. You only see the key once — save it immediately.

```bash
curl -X POST https://creditclaw.com/api/v1/bots/register \
  -H "Content-Type: application/json" \
  -d '{
    "bot_name": "my-shopping-agent",
    "owner_email": "you@example.com",
    "callback_url": "https://mybot.example.com/webhooks"
  }'
```

**Response (201):**

```json
{
  "bot_id": "bot_a1b2c3d4e5f6",
  "api_key": "cck_live_abc123...",
  "claim_token": "clm_xyz789...",
  "status": "pending_owner_verification",
  "owner_verification_url": "https://creditclaw.com/claim?token=clm_xyz789...",
  "webhook_secret": "whsec_...",
  "important": "Save your api_key now — it cannot be retrieved later."
}
```

> **Save these values:** `api_key`, `claim_token`, and `webhook_secret` are shown only once.

### Alternative: Use a Pairing Code

If the owner generates a pairing code from the dashboard first, pass it during registration to skip the claim step:

```bash
curl -X POST https://creditclaw.com/api/v1/bots/register \
  -H "Content-Type: application/json" \
  -d '{
    "bot_name": "my-shopping-agent",
    "owner_email": "you@example.com",
    "callback_url": "https://mybot.example.com/webhooks",
    "pairing_code": "pair_abc123"
  }'
```

With a pairing code, the bot is immediately active — skip to Step 4.

---

## Step 2: Owner Claims the Bot

The bot owner opens the CreditClaw dashboard and pastes the `claim_token` to link the bot to their account.

1. Go to **Dashboard → Bots**
2. Click **Claim a Bot**
3. Paste the `claim_token` value

Once claimed, the bot's wallet status changes from `pending` to `active`.

---

## Step 3: Owner Funds the Wallet

The owner adds funds to the bot's wallet through the dashboard:

1. Go to **Dashboard → Wallets**
2. Select the bot's wallet
3. Click **Fund** and add the desired amount

The bot receives a `wallet.funded` webhook when funds are added.

---

## Step 4: Check Wallet Balance

Verify the wallet is active and has funds before making purchases.

```bash
curl https://creditclaw.com/api/v1/bot/wallet/check \
  -H "Authorization: Bearer cck_live_abc123..."
```

**Response (200):**

```json
{
  "wallet_status": "active",
  "balance_usd": 50.00,
  "card_status": "active",
  "spending_limits": {
    "per_transaction_usd": 100.00,
    "monthly_usd": 500.00,
    "monthly_spent_usd": 0,
    "monthly_remaining_usd": 500.00
  },
  "pending_topups": 0
}
```

If `wallet_status` is `"pending"`, the owner hasn't claimed the bot yet. Share the claim token with them.

---

## Step 5: Make a Purchase

Submit a purchase request. The guardrail engine evaluates the request against spending limits, category controls, and approval rules.

```bash
curl -X POST https://creditclaw.com/api/v1/bot/merchant/checkout \
  -H "Authorization: Bearer cck_live_abc123..." \
  -H "Content-Type: application/json" \
  -d '{
    "profile_index": 0,
    "merchant_name": "Example Store",
    "merchant_url": "https://example-store.com",
    "item_name": "Widget Pro",
    "amount_cents": 1999,
    "category": "electronics"
  }'
```

### Auto-Approved Response (200)

If the purchase passes all guardrails and doesn't require human approval:

```json
{
  "approved": true,
  "missing_digits": "4242",
  "expiry_month": "12",
  "expiry_year": "2026",
  "confirmation_id": "chk_a1b2c3d4e5f6",
  "profile_index": 0,
  "merchant_name": "Example Store",
  "amount_usd": 19.99,
  "message": "Checkout approved. Enter the provided card details to complete your purchase."
}
```

### Pending Approval Response (202)

If the purchase requires human approval, you get a `202` with a `confirmation_id` to poll:

```json
{
  "approved": false,
  "status": "pending_confirmation",
  "confirmation_id": "chk_a1b2c3d4e5f6",
  "profile_index": 0,
  "merchant_name": "Example Store",
  "amount_usd": 19.99,
  "expires_at": "2025-01-15T12:15:00.000Z",
  "message": "This purchase requires owner approval. Poll /api/v1/bot/merchant/checkout/status to check the result."
}
```

---

## Step 6: Check Purchase Status

If you received a `202`, poll the status endpoint until the owner approves or denies the purchase.

```bash
curl "https://creditclaw.com/api/v1/bot/merchant/checkout/status?confirmation_id=chk_a1b2c3d4e5f6" \
  -H "Authorization: Bearer cck_live_abc123..."
```

**Approved Response:**

```json
{
  "confirmation_id": "chk_a1b2c3d4e5f6",
  "status": "approved",
  "amount_usd": 19.99,
  "merchant_name": "Example Store",
  "item_name": "Widget Pro",
  "missing_digits": "4242",
  "expiry_month": "12",
  "expiry_year": "2026",
  "message": "Purchase approved. Use the provided card details to complete checkout."
}
```

**Denied Response:**

```json
{
  "confirmation_id": "chk_a1b2c3d4e5f6",
  "status": "denied",
  "amount_usd": 19.99,
  "merchant_name": "Example Store",
  "item_name": "Widget Pro",
  "message": "Purchase was denied by the owner."
}
```

**Possible statuses:** `pending`, `approved`, `denied`, `expired`

---

## What's Next

- **[Webhook Setup](/docs/api/webhooks/setup)** — Receive real-time notifications instead of polling. Get notified when purchases are approved, wallets are funded, or balances run low.
- **[Wallet Endpoints](/docs/api/endpoints/wallets)** — Check balances, view transactions, and request top-ups.
- **[Bot Endpoints](/docs/api/endpoints/bots)** — Full reference for bot registration, status, and purchase endpoints.
- **[x402 Protocol](/docs/api/agent-integration/x402-protocol)** — Enable autonomous HTTP 402 payments for your bot using the x402 protocol.
- **[Authentication](/docs/api/authentication)** — API key format, security, and auth details.

---

## Common Errors

| Status | Error | Meaning |
|--------|-------|---------|
| `400` | `validation_error` | Invalid request body — check required fields |
| `402` | `insufficient_funds` | Wallet balance too low for this purchase |
| `403` | `wallet_not_active` | Bot hasn't been claimed yet |
| `403` | `wallet_frozen` | Owner has frozen the wallet |
| `403` | `allowance_exceeded` | Purchase exceeds spending allowance for this period |
| `403` | `card_guardrail_violation` | Purchase blocked by card-level guardrails |
| `429` | `rate_limited` | Too many requests — back off and retry |
