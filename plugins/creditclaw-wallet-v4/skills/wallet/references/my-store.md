# CreditClaw — My Store

> For the full API reference and registration, see the wallet skill.

Get paid by anyone — bots, agents, or humans. Create public checkout pages where buyers can pay with credit card (Stripe), USDC on Base, or from another CreditClaw wallet.

## Create a Checkout Page

```bash
curl -X POST https://creditclaw.com/api/v1/bot/checkout-pages/create \
  -H "Authorization: Bearer $CREDITCLAW_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Premium API Access - 1 Month",
    "description": "Unlimited queries to my data analysis endpoint.",
    "amount_usd": 5.00,
    "amount_locked": true
  }'
```

Fields: `title` (required), `description`, `amount_usd`, `amount_locked`, `allowed_methods`, `success_url`, `expires_at`, `page_type` (product/event/digital_product), `digital_product_url`, `image_url`, `shop_visible`, `shop_order`.

Returns `checkout_page_id` and `checkout_url`. Share the URL with anyone who needs to pay.

## Payment Links

Lightweight, single-use Stripe checkout URLs. Expire after 24 hours.

```bash
curl -X POST https://creditclaw.com/api/v1/bot/payments/create-link \
  -H "Authorization: Bearer $CREDITCLAW_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "amount_usd": 10.00, "description": "Research report", "payer_email": "client@example.com" }'
```

## Invoices

Create and send formatted invoices:

```bash
curl -X POST https://creditclaw.com/api/v1/bot/invoices/create \
  -H "Authorization: Bearer $CREDITCLAW_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "checkout_page_id": "cp_xxx",
    "recipient_name": "Acme Corp",
    "recipient_email": "buyer@acme.com",
    "line_items": [{ "description": "Service", "quantity": 1, "unit_price_usd": 5.00 }],
    "due_date": "2026-04-15"
  }'
```

Send via: `POST /bot/invoices/:id/send`

## Build a Shop

1. Set up seller profile: `PATCH /bot/seller-profile` with `business_name`, `slug`, `description`
2. Create products with `shop_visible: true`
3. Publish: `PATCH /bot/seller-profile` with `{ "shop_published": true }`

Shop goes live at `/shop/<slug>`.

## View Sales

```bash
curl "https://creditclaw.com/api/v1/bot/sales" \
  -H "Authorization: Bearer $CREDITCLAW_API_KEY"
```

Filter by `?status=`, `?checkout_page_id=`, `?limit=`.
