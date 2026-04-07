# Checkout Pages

Create hosted checkout pages so your bot can accept payments programmatically.

All endpoints require bot authentication via `Authorization: Bearer cck_live_...` header. See [Authentication](/docs/getting-started/authentication) for details.

---

## List Checkout Pages

Retrieve all checkout pages associated with the bot's wallet.

| | |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/v1/bot/checkout-pages` |
| **Auth** | Bot API key |

### Request

No parameters required.

### Response

```json
{
  "checkout_pages": [
    {
      "checkout_page_id": "cp_a1b2c3d4e5f6",
      "checkout_url": "/pay/cp_a1b2c3d4e5f6",
      "title": "Premium Plan",
      "description": "Monthly subscription to premium features",
      "wallet_address": "0x1234...abcd",
      "amount_usd": 29.99,
      "amount_locked": true,
      "allowed_methods": ["x402", "usdc_direct", "stripe_onramp", "base_pay"],
      "status": "active",
      "page_type": "product",
      "image_url": null,
      "collect_buyer_name": false,
      "digital_product_url": null,
      "view_count": 42,
      "payment_count": 12,
      "total_received_usd": 359.88,
      "created_at": "2025-01-15T10:30:00.000Z",
      "expires_at": null
    }
  ]
}
```

### Example

```bash
curl -X GET https://creditclaw.com/api/v1/bot/checkout-pages \
  -H "Authorization: Bearer cck_live_abc123..."
```

---

## Create Checkout Page

Create a new hosted checkout page linked to the bot's wallet.

| | |
|---|---|
| **Method** | `POST` |
| **Path** | `/api/v1/bot/checkout-pages/create` |
| **Auth** | Bot API key |

### Request Body

| Field | Type | Required | Description |
|---|---|---|---|
| `title` | string | Yes | Page title (1–200 chars) |
| `description` | string | No | Page description (max 2000 chars) |
| `amount_usd` | number | No | Fixed price in USD. Omit for pay-what-you-want. |
| `amount_locked` | boolean | No | Whether the amount is fixed. Default: `true` |
| `allowed_methods` | string[] | No | Payment methods to accept. Default: all methods. Options: `x402`, `usdc_direct`, `stripe_onramp`, `base_pay` |
| `success_url` | string | No | URL to redirect buyer after payment |
| `expires_at` | string | No | ISO 8601 expiration timestamp |
| `page_type` | string | No | `"product"`, `"event"`, or `"digital_product"`. Default: `"product"` |
| `digital_product_url` | string | No | URL delivered to buyer after payment. Required when `page_type` is `"digital_product"`. Must be a valid URL. |
| `image_url` | string | No | URL of an image to display on the page |
| `collect_buyer_name` | boolean | No | Whether to collect buyer's name. Default: `false` |

### Response `201 Created`

```json
{
  "checkout_page_id": "cp_a1b2c3d4e5f6",
  "checkout_url": "/pay/cp_a1b2c3d4e5f6",
  "title": "Premium Plan",
  "description": "Monthly subscription to premium features",
  "wallet_address": "0x1234...abcd",
  "amount_usd": 29.99,
  "amount_locked": true,
  "allowed_methods": ["x402", "usdc_direct", "stripe_onramp", "base_pay"],
  "status": "active",
  "page_type": "product",
  "image_url": null,
  "collect_buyer_name": false,
  "digital_product_url": null,
  "created_at": "2025-01-15T10:30:00.000Z"
}
```

### Errors

| Status | Error | Description |
|---|---|---|
| 400 | `wallet_not_found` | Bot does not have an active wallet |
| 400 | `invalid_json` | Request body is not valid JSON |
| 400 | `validation_error` | Request body failed validation |

### Example

```bash
curl -X POST https://creditclaw.com/api/v1/bot/checkout-pages/create \
  -H "Authorization: Bearer cck_live_abc123..." \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Premium Plan",
    "description": "Monthly subscription to premium features",
    "amount_usd": 29.99,
    "amount_locked": true,
    "allowed_methods": ["x402", "stripe_onramp"],
    "page_type": "product"
  }'
```

---

## Related

- [Authentication](/docs/getting-started/authentication) — how to authenticate API requests
- [Invoices](/docs/selling/invoice-api-reference) — create and send invoices
- [Sales](/docs/selling/sales-api-reference) — track incoming payments
- [Webhooks](/docs/bots/webhook-events) — listen for `wallet.sale.completed` events
