# Authentication

CreditClaw uses API keys to authenticate all bot-facing API requests.

## API Keys

### Format

All API keys use the prefix `cck_live_` followed by 24 random bytes encoded as hex (48 hex characters):

```
cck_live_a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6
```

### Key Security

Only a bcrypt hash of the key is stored server-side. The raw key is returned **once** at registration and **cannot be retrieved later**. Store it securely.

When authenticating, CreditClaw looks up candidate bots by the first 12 characters of the key (the prefix), then verifies the full key against the stored hash.

---

## Registering a Bot

API keys are generated during bot registration.

**`POST /api/v1/bots/register`**

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `bot_name` | string | Yes | Display name for your bot |
| `owner_email` | string | Yes | Email of the human owner |
| `description` | string | No | What your bot does |
| `callback_url` | string | No | Webhook delivery URL |
| `pairing_code` | string | No | Pre-generated pairing code from dashboard |

### Example Request

```bash
curl -X POST https://creditclaw.com/api/v1/bots/register \
  -H "Content-Type: application/json" \
  -d '{
    "bot_name": "shopping-agent",
    "owner_email": "owner@example.com",
    "description": "Autonomous shopping assistant",
    "callback_url": "https://mybot.example.com/webhooks"
  }'
```

### Response (without pairing code)

```json
{
  "bot_id": "bot_a1b2c3d4",
  "api_key": "cck_live_a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6",
  "claim_token": "coral-AB3X",
  "status": "pending_owner_verification",
  "owner_verification_url": "https://creditclaw.com/claim?token=coral-AB3X",
  "webhook_secret": "whsec_f1e2d3c4b5a6f1e2d3c4b5a6f1e2d3c4b5a6f1e2d3c4b5a6",
  "webhook_note": "Save your webhook_secret now — it cannot be retrieved later.",
  "important": "Save your api_key now — it cannot be retrieved later. Give the claim_token to your human so they can activate your wallet."
}
```

### Response (with pairing code)

When you provide a valid `pairing_code`, the bot is immediately paired to the owner and the wallet is activated:

```json
{
  "bot_id": "bot_a1b2c3d4",
  "api_key": "cck_live_a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6",
  "claim_token": null,
  "status": "active",
  "paired": true,
  "owner_uid": "uid_abc123",
  "webhook_secret": "whsec_f1e2d3c4b5a6f1e2d3c4b5a6f1e2d3c4b5a6f1e2d3c4b5a6",
  "webhook_note": "Save your webhook_secret now — it cannot be retrieved later.",
  "important": "Save your api_key now — it cannot be retrieved later. Your wallet is already active via pairing code."
}
```

### Key Fields

| Field | Description |
|-------|-------------|
| `api_key` | Your authentication key. **Shown once.** Save it immediately. |
| `claim_token` | Give this to the human owner to claim the bot in the dashboard. `null` if a pairing code was used. |
| `webhook_secret` | Used to verify webhook signatures. **Shown once.** Only present if `callback_url` was provided. |

### Rate Limiting

Bot registration is limited to **3 registrations per IP per hour**. Exceeding this returns a `429` response:

```json
{
  "error": "rate_limited",
  "message": "Too many registrations. Try again later.",
  "retry_after_seconds": 3600
}
```

---

## Using API Keys

Pass your API key in the `Authorization` header using the Bearer scheme:

```
Authorization: Bearer cck_live_a1b2c3d4e5f6...
```

### Example Authenticated Request

```bash
curl https://creditclaw.com/api/v1/bot/status \
  -H "Authorization: Bearer cck_live_a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6"
```

### Authentication Errors

If the key is missing, malformed, or invalid, the API returns:

```json
{
  "error": "Authentication required"
}
```

All endpoints under `/api/v1/bot/` require a valid API key. The registration endpoint (`POST /api/v1/bots/register`) is the only unauthenticated endpoint.

---

## Next Steps

- [Quick Start](/docs/api/agent-integration/quick-start) — end-to-end walkthrough from registration to first purchase
- [Webhook Setup](/docs/api/webhooks/setup) — configure and verify webhook deliveries
- [Wallet Endpoints](/docs/api/endpoints/wallets) — check balances and request top-ups
