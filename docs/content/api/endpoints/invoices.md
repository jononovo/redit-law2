# Invoices

Create, list, and send invoices programmatically through your bot. Invoices are tied to a checkout page and can be emailed to recipients with an attached PDF.

All endpoints require bot authentication via `Authorization: Bearer <api_key>`. See [Authentication](/docs/api/authentication) for details.

---

## List Invoices

Retrieve all invoices belonging to the bot's owner.

**`GET /api/v1/bot/invoices`**

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `status` | string | No | Filter by status: `draft`, `sent`, `viewed`, `paid`, `cancelled` |
| `checkout_page_id` | string | No | Filter by checkout page |
| `limit` | integer | No | Maximum number of invoices to return |

### Example Request

```bash
curl -X GET "https://creditclaw.com/api/v1/bot/invoices?status=sent&limit=10" \
  -H "Authorization: Bearer cck_live_a1b2c3d4e5f6..."
```

### Response

```json
{
  "invoices": [
    {
      "invoice_id": "inv_abc123def456abc123def456",
      "reference_number": "INV-0001",
      "checkout_page_id": "cp_xyz789",
      "status": "sent",
      "recipient_name": "Acme Corp",
      "recipient_email": "billing@acme.com",
      "line_items": [
        {
          "description": "API Integration Service",
          "quantity": 1,
          "unitPriceUsd": 250,
          "amountUsd": 250
        }
      ],
      "subtotal_usd": 250,
      "tax_usd": 0,
      "total_usd": 250,
      "payment_url": "/pay/cp_xyz789?ref=INV-0001",
      "due_date": "2025-07-01T00:00:00.000Z",
      "sender_name": "MyBot",
      "sender_email": "owner@example.com",
      "notes": "Payment due within 30 days",
      "sale_id": null,
      "sent_at": "2025-06-01T12:00:00.000Z",
      "viewed_at": null,
      "paid_at": null,
      "created_at": "2025-06-01T10:00:00.000Z",
      "updated_at": "2025-06-01T12:00:00.000Z"
    }
  ]
}
```

If the bot does not have an active wallet, an empty array is returned.

---

## Create Invoice

Create a new invoice with line items. The invoice is created in `draft` status and must be explicitly sent.

**`POST /api/v1/bot/invoices/create`**

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `checkout_page_id` | string | Yes | ID of the checkout page to associate with this invoice |
| `recipient_name` | string | No | Name of the invoice recipient (max 200 chars) |
| `recipient_email` | string | No | Email address for sending the invoice |
| `recipient_type` | string | No | One of `human`, `bot`, or `agent` |
| `line_items` | array | Yes | At least one line item (see below) |
| `tax_usd` | number | No | Tax amount in USD (default: 0) |
| `due_date` | string | No | ISO 8601 datetime; defaults to 30 days from creation |
| `notes` | string | No | Additional notes (max 2000 chars) |

### Line Item Structure

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `description` | string | Yes | Item description (max 500 chars) |
| `quantity` | number | Yes | Must be positive |
| `unit_price_usd` | number | Yes | Price per unit in USD (min 0) |

### Example Request

```bash
curl -X POST "https://creditclaw.com/api/v1/bot/invoices/create" \
  -H "Authorization: Bearer cck_live_a1b2c3d4e5f6..." \
  -H "Content-Type: application/json" \
  -d '{
    "checkout_page_id": "cp_xyz789",
    "recipient_name": "Acme Corp",
    "recipient_email": "billing@acme.com",
    "line_items": [
      {
        "description": "API Integration Service",
        "quantity": 2,
        "unit_price_usd": 125
      },
      {
        "description": "Setup Fee",
        "quantity": 1,
        "unit_price_usd": 50
      }
    ],
    "tax_usd": 30,
    "notes": "Thank you for your business"
  }'
```

### Response `201 Created`

```json
{
  "invoice_id": "inv_abc123def456abc123def456",
  "reference_number": "INV-0042",
  "checkout_page_id": "cp_xyz789",
  "status": "draft",
  "recipient_name": "Acme Corp",
  "recipient_email": "billing@acme.com",
  "line_items": [
    {
      "description": "API Integration Service",
      "quantity": 2,
      "unitPriceUsd": 125,
      "amountUsd": 250
    },
    {
      "description": "Setup Fee",
      "quantity": 1,
      "unitPriceUsd": 50,
      "amountUsd": 50
    }
  ],
  "subtotal_usd": 300,
  "tax_usd": 30,
  "total_usd": 330,
  "payment_url": "/pay/cp_xyz789?ref=INV-0042",
  "due_date": "2025-07-01T00:00:00.000Z",
  "created_at": "2025-06-01T10:00:00.000Z"
}
```

### Errors

| Status | Error Code | Description |
|--------|-----------|-------------|
| 400 | `wallet_not_found` | Bot does not have an active wallet |
| 400 | `invalid_json` | Request body is not valid JSON |
| 400 | `validation_error` | Request body fails schema validation |
| 404 | `checkout_page_not_found` | Checkout page not found or doesn't belong to this bot's owner |

---

## Send Invoice

Send a draft invoice to the recipient via email. A PDF is automatically generated and attached. The invoice status changes from `draft` to `sent`.

**`POST /api/v1/bot/invoices/{id}/send`**

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | The invoice ID (e.g., `inv_abc123...`) |

### Example Request

```bash
curl -X POST "https://creditclaw.com/api/v1/bot/invoices/inv_abc123def456abc123def456/send" \
  -H "Authorization: Bearer cck_live_a1b2c3d4e5f6..."
```

### Response

```json
{
  "invoice_id": "inv_abc123def456abc123def456",
  "reference_number": "INV-0042",
  "status": "sent",
  "sent_at": "2025-06-01T12:00:00.000Z",
  "payment_url": "/pay/cp_xyz789?ref=INV-0042",
  "email_sent": true,
  "email_reason": null
}
```

### Email Delivery

The `email_sent` field indicates whether the email was successfully dispatched. If `false`, check `email_reason`:

| Reason | Description |
|--------|-------------|
| `no_recipient_email` | Invoice has no `recipient_email` set |
| `email_error` | Email delivery failed (invoice is still marked as sent) |

### Errors

| Status | Error Code | Description |
|--------|-----------|-------------|
| 400 | `wallet_not_found` | Bot does not have an active wallet |
| 400 | `missing_invoice_id` | No invoice ID in the URL path |
| 400 | `only_draft_invoices_can_be_sent` | Invoice has already been sent or is in another non-draft state |
| 404 | `not_found` | Invoice not found or doesn't belong to this bot's owner |
| 500 | `send_failed` | Internal error updating invoice status |

---

## Typical Workflow

1. Create a [checkout page](/docs/api/endpoints/checkout-pages) to receive payments
2. Create an invoice with `POST /api/v1/bot/invoices/create`, referencing the checkout page
3. Send the invoice with `POST /api/v1/bot/invoices/{id}/send`
4. The recipient receives an email with a PDF and a payment link
5. Track payment status by polling `GET /api/v1/bot/invoices` or listening for [webhook events](/docs/api/webhooks/events)
6. Monitor revenue through the [Sales API](/docs/api/endpoints/sales)
