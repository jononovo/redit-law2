# Sales

Query incoming sales and payments received through your checkout pages.

## List sales

Retrieve all sales associated with your bot's wallet, with optional filters.

| | |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/v1/bot/sales` |
| **Auth** | API key (`Authorization: Bearer cck_live_...`) |

### Query parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `checkout_page_id` | string | No | Filter by checkout page ID |
| `status` | string | No | Filter by sale status (e.g. `confirmed`, `pending`) |
| `payment_method` | string | No | Filter by payment method (e.g. `base_pay`, `stripe_onramp`, `qr_pay`) |
| `limit` | integer | No | Maximum number of sales to return |

### Response

```json
{
  "sales": [
    {
      "sale_id": "sale_abc123",
      "checkout_page_id": "cp_xyz789",
      "amount_usd": 25.00,
      "payment_method": "base_pay",
      "status": "confirmed",
      "buyer_type": "wallet",
      "buyer_identifier": "0x1234...abcd",
      "buyer_email": "buyer@example.com",
      "tx_hash": "0xdeadbeef...",
      "checkout_title": "Premium Bot Access",
      "confirmed_at": "2025-01-15T10:30:00.000Z",
      "created_at": "2025-01-15T10:29:45.000Z"
    }
  ]
}
```

### Response fields

| Field | Type | Description |
|-------|------|-------------|
| `sale_id` | string | Unique sale identifier |
| `checkout_page_id` | string | ID of the checkout page that generated this sale |
| `amount_usd` | number | Sale amount in USD |
| `payment_method` | string | Payment method used by the buyer |
| `status` | string | Sale status (`confirmed`, `pending`, etc.) |
| `buyer_type` | string | Type of buyer (e.g. `wallet`, `email`) |
| `buyer_identifier` | string | Buyer's wallet address or other identifier |
| `buyer_email` | string \| null | Buyer's email if provided |
| `tx_hash` | string \| null | On-chain transaction hash if applicable |
| `checkout_title` | string | Title of the checkout page |
| `confirmed_at` | string \| null | ISO 8601 timestamp when the sale was confirmed |
| `created_at` | string | ISO 8601 timestamp when the sale was created |

If the bot has no linked wallet, the response returns an empty array: `{ "sales": [] }`.

### Example request

```bash
# List all confirmed sales
curl -H "Authorization: Bearer cck_live_your_api_key" \
  "https://creditclaw.com/api/v1/bot/sales?status=confirmed"

# List sales from a specific checkout page, limited to 10
curl -H "Authorization: Bearer cck_live_your_api_key" \
  "https://creditclaw.com/api/v1/bot/sales?checkout_page_id=cp_xyz789&limit=10"

# Filter by payment method
curl -H "Authorization: Bearer cck_live_your_api_key" \
  "https://creditclaw.com/api/v1/bot/sales?payment_method=base_pay"
```

### Error responses

| Status | Error | Description |
|--------|-------|-------------|
| `401` | `unauthorized` | Missing or invalid API key |
| `500` | `internal_error` | Unexpected server error |

## Related

- [Checkout Pages](/docs/api/endpoints/checkout-pages) — create the checkout pages that generate sales
- [Webhooks](/docs/api/webhooks/events) — listen for `wallet.payment.received` events instead of polling
- [Authentication](/docs/api/authentication) — set up your bot's API key
