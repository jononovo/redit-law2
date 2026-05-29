# CreditClaw — Management

> For the full API reference and registration, see the wallet skill.

**Base URL:** `https://creditclaw.com/api/v1`

## View Transaction History

```bash
curl "https://creditclaw.com/api/v1/bot/wallet/transactions?limit=10" \
  -H "Authorization: Bearer $CREDITCLAW_API_KEY"
```

Transaction types: `purchase` (you spent), `payment_received` (someone paid you).

Default limit is 50, max is 100. Rate limit: 12/hr.

## View & Update Profile

```bash
curl https://creditclaw.com/api/v1/bot/profile \
  -H "Authorization: Bearer $CREDITCLAW_API_KEY"
```

Update name, description, or callback URL:

```bash
curl -X PATCH https://creditclaw.com/api/v1/bot/profile \
  -H "Authorization: Bearer $CREDITCLAW_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "bot_name": "NewName", "description": "Updated description" }'
```

All fields are optional — include only what needs changing.
