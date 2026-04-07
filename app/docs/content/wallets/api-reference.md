# Wallets

The wallet endpoints let your bot check its balance, view transaction history, and retrieve spending guardrails.

All endpoints require bot authentication via the `Authorization: Bearer cck_live_...` header. See [Authentication](/docs/getting-started/authentication) for details.

---

## Check Wallet Balance

Returns the bot's current wallet status, balance, card status, and spending limits.

| | |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/v1/bot/wallet/check` |
| **Auth** | Bot API key required |

### Request

No request body or query parameters required.

### Response

```json
{
  "wallet_status": "active",
  "balance_usd": 50.00,
  "card_status": "active",
  "spending_limits": {
    "per_transaction_usd": 25.00,
    "monthly_usd": 500.00,
    "monthly_spent_usd": 120.50,
    "monthly_remaining_usd": 379.50
  },
}
```

| Field | Type | Description |
|---|---|---|
| `wallet_status` | string | `"active"`, `"empty"`, `"pending"`, or `"inactive"` |
| `balance_usd` | number | Current wallet balance in USD |
| `card_status` | string | Status of the linked card |
| `spending_limits` | object | Current spending limits and usage (present when wallet is active) |
| `spending_limits.per_transaction_usd` | number | Maximum amount per single transaction |
| `spending_limits.monthly_usd` | number | Total monthly spending budget |
| `spending_limits.monthly_spent_usd` | number | Amount already spent this month |
| `spending_limits.monthly_remaining_usd` | number | Remaining monthly budget |

If the bot has not been claimed by an owner yet, the response will indicate `"pending"` status:

```json
{
  "wallet_status": "pending",
  "balance_usd": 0,
  "card_status": "inactive",
  "message": "Owner has not claimed this bot yet. Share your claim token with your human."
}
```

### Example

```bash
curl -X GET https://creditclaw.com/api/v1/bot/wallet/check \
  -H "Authorization: Bearer cck_live_abc123..."
```

---

## Get Transactions

Returns the bot's recent transaction history.

| | |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/v1/bot/wallet/transactions` |
| **Auth** | Bot API key required |

### Query Parameters

| Parameter | Type | Default | Description |
|---|---|---|---|
| `limit` | integer | `50` | Number of transactions to return (max 100) |

### Response

```json
{
  "transactions": [
    {
      "id": 42,
      "type": "spend",
      "amount_usd": -12.99,
      "balance_after_usd": 37.01,
      "description": "Purchase at Amazon.com",
      "created_at": "2025-01-15T10:30:00.000Z"
    },
    {
      "id": 41,
      "type": "fund",
      "amount_usd": 50.00,
      "balance_after_usd": 50.00,
      "description": "Wallet funded by owner",
      "created_at": "2025-01-14T08:00:00.000Z"
    }
  ]
}
```

| Field | Type | Description |
|---|---|---|
| `transactions` | array | List of transaction records |
| `transactions[].id` | integer | Transaction ID |
| `transactions[].type` | string | Transaction type (e.g. `"spend"`, `"fund"`, `"refund"`) |
| `transactions[].amount_usd` | number | Transaction amount in USD (negative for debits) |
| `transactions[].balance_after_usd` | number \| null | Wallet balance after this transaction |
| `transactions[].description` | string | Human-readable description |
| `transactions[].created_at` | string | ISO 8601 timestamp |

### Error Responses

| Status | Body | Condition |
|---|---|---|
| 403 | `{ "error": "wallet_not_active", "message": "Wallet not yet activated." }` | Bot has not been claimed by an owner |

### Example

```bash
curl -X GET "https://creditclaw.com/api/v1/bot/wallet/transactions?limit=10" \
  -H "Authorization: Bearer cck_live_abc123..."
```

---

## Get Spending Guardrails

Returns the bot's current spending guardrails including approval mode (from master guardrails), limits, and procurement controls.

| | |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/v1/bot/wallet/spending` |
| **Auth** | Bot API key required |

### Request

No request body or query parameters required.

### Response

```json
{
  "approval_mode": "ask_for_everything",
  "limits": {
    "per_transaction_usd": 25.00,
    "daily_usd": 100.00,
    "monthly_usd": 500.00,
    "ask_approval_above_usd": 5.00
  },
  "recurring_allowed": false,
  "notes": "Only purchase office supplies",
  "updated_at": "2025-01-10T12:00:00.000Z",
  "approved_categories": ["office_supplies", "software"],
  "blocked_categories": ["gambling", "adult", "crypto"]
}
```

| Field | Type | Description |
|---|---|---|
| `approval_mode` | string | `"ask_for_everything"`, `"auto_approve_under_threshold"`, or `"auto_approve_by_category"` — set at the account level via master guardrails |
| `limits.per_transaction_usd` | number | Maximum per-transaction spend |
| `limits.daily_usd` | number | Daily spending budget |
| `limits.monthly_usd` | number | Monthly spending budget |
| `limits.ask_approval_above_usd` | number \| null | Purchases above this amount require human approval (from master guardrails; null if not set) |
| `recurring_allowed` | boolean | Whether recurring/subscription purchases are allowed |
| `notes` | string \| null | Owner-provided instructions for the bot |
| `updated_at` | string | ISO 8601 timestamp of last guardrail update |
| `approved_categories` | array | List of explicitly approved procurement categories |
| `blocked_categories` | array | List of blocked procurement categories |

### Error Responses

| Status | Body | Condition |
|---|---|---|
| 403 | `{ "error": "wallet_not_active", "message": "Wallet not yet activated. Owner must claim this bot first." }` | Bot has not been claimed |

### Example

```bash
curl -X GET https://creditclaw.com/api/v1/bot/wallet/spending \
  -H "Authorization: Bearer cck_live_abc123..."
```

---

## Related

- [Authentication](/docs/getting-started/authentication) — how to authenticate API requests
- [Bots](/docs/bots/api-reference) — bot registration and purchase endpoints
- [Webhook Events](/docs/bots/webhook-events) — listen for `wallet.balance.low`, `wallet.sale.completed`, and other wallet events
- [Quick Start](/docs/agent-integration/quick-start) — end-to-end bot integration guide
