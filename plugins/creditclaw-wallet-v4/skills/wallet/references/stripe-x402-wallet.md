# Stripe Wallet — x402 / USDC (Private Beta)

> This rail is currently in private beta. Endpoints return 404 if not enabled.

The Stripe Wallet rail provides USDC wallets on Base blockchain with spending via the x402 payment protocol. Owner funds the wallet using Stripe's fiat-to-crypto onramp.

## How x402 Signing Works

When a service returns HTTP `402 Payment Required` with x402 payment details:

1. Send payment details to `POST /stripe-wallet/bot/sign`
2. CreditClaw enforces guardrails (per-tx, daily, monthly, domain rules)
3. If approved, returns signed `X-PAYMENT` header
4. Retry original request with the `X-PAYMENT` header attached

```bash
curl -X POST https://creditclaw.com/api/v1/stripe-wallet/bot/sign \
  -H "Authorization: Bearer $CREDITCLAW_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "resource_url": "https://api.example.com/v1/data",
    "amount_usdc": 500000,
    "recipient_address": "0x1234...abcd"
  }'
```

Amount is in micro-USDC (6 decimals): 1000000 = $1.00.

## Check Balance

```bash
curl "https://creditclaw.com/api/v1/stripe-wallet/balance?wallet_id=1" \
  -H "Authorization: Bearer $CREDITCLAW_API_KEY"
```

## API Reference

| Method | Endpoint | Description | Rate Limit |
|--------|----------|-------------|------------|
| POST | `/stripe-wallet/bot/sign` | Request x402 payment signature | 30/hr |
| GET | `/stripe-wallet/balance` | Get USDC balance | 12/hr |
| GET | `/stripe-wallet/transactions` | List x402 transactions | 12/hr |
| GET | `/bot/check/rail1` | Stripe Wallet detail | 6/hr |
