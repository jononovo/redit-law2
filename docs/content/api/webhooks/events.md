# Webhook Event Types

CreditClaw sends webhook events to your bot's `callback_url` whenever something significant happens — a purchase is approved, a wallet is funded, an order ships, etc. Each event has a specific type string and a structured `data` payload.

All webhook deliveries follow the format described in [Webhook Setup & Signing](/docs/api/webhooks/setup).

---

## Event Payload Structure

Every webhook POST body follows this shape:

```json
{
  "event": "wallet.spend.authorized",
  "timestamp": "2025-01-15T09:30:00.000Z",
  "bot_id": "bot_abc123",
  "data": {
    // event-specific fields
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `event` | `string` | The event type (see below) |
| `timestamp` | `string` | ISO 8601 timestamp of when the event occurred |
| `bot_id` | `string` | The bot this event relates to |
| `data` | `object` | Event-specific payload |

---

## Wallet Events

### `wallet.activated`

Fired when a wallet is first activated and ready for use.

```json
{
  "event": "wallet.activated",
  "timestamp": "2025-01-15T09:00:00.000Z",
  "bot_id": "bot_abc123",
  "data": {
    "wallet_id": "wal_xyz789",
    "rail": "rail1",
    "message": "Wallet is now active and ready for transactions."
  }
}
```

### `wallet.topup.completed`

Fired when an owner tops up (funds) the bot's wallet.

```json
{
  "event": "wallet.topup.completed",
  "timestamp": "2025-01-15T10:00:00.000Z",
  "bot_id": "bot_abc123",
  "data": {
    "wallet_id": "wal_xyz789",
    "amount": 50.00,
    "currency": "USD",
    "new_balance": 150.00
  }
}
```

### `wallet.spend.authorized`

Fired when a spending request passes guardrail evaluation and is authorized.

```json
{
  "event": "wallet.spend.authorized",
  "timestamp": "2025-01-15T09:30:00.000Z",
  "bot_id": "bot_abc123",
  "data": {
    "amount": 29.99,
    "currency": "USD",
    "vendor": "example.com",
    "description": "Widget purchase",
    "remaining_balance": 120.01
  }
}
```

### `wallet.spend.declined`

Fired when a spending request is blocked by guardrails (over limit, blocked category, etc.).

```json
{
  "event": "wallet.spend.declined",
  "timestamp": "2025-01-15T09:31:00.000Z",
  "bot_id": "bot_abc123",
  "data": {
    "amount": 500.00,
    "currency": "USD",
    "vendor": "example.com",
    "reason": "Exceeds per-transaction spending limit of $100.00"
  }
}
```

### `wallet.balance.low`

Fired when the wallet balance drops below a threshold after a transaction.

```json
{
  "event": "wallet.balance.low",
  "timestamp": "2025-01-15T11:00:00.000Z",
  "bot_id": "bot_abc123",
  "data": {
    "wallet_id": "wal_xyz789",
    "current_balance": 5.20,
    "currency": "USD",
    "message": "Wallet balance is low. Request a top-up or notify the owner."
  }
}
```

### `wallet.payment.received`

Fired when a payment is received into the bot's wallet (e.g., from a checkout page or invoice).

```json
{
  "event": "wallet.payment.received",
  "timestamp": "2025-01-15T12:00:00.000Z",
  "bot_id": "bot_abc123",
  "data": {
    "amount": 75.00,
    "currency": "USD",
    "source": "checkout_page",
    "reference_id": "chk_abc123"
  }
}
```

### `wallet.funded`

Fired when a wallet is funded by the owner through the dashboard or API.

```json
{
  "event": "wallet.funded",
  "timestamp": "2025-01-15T12:30:00.000Z",
  "bot_id": "bot_abc123",
  "data": {
    "wallet_id": "wal_xyz789",
    "amount": 100.00,
    "currency": "USD",
    "new_balance": 200.00
  }
}
```

### `wallet.sale.completed`

Fired when a sale through the bot's shop or checkout page is completed.

```json
{
  "event": "wallet.sale.completed",
  "timestamp": "2025-01-15T14:00:00.000Z",
  "bot_id": "bot_abc123",
  "data": {
    "sale_id": "sale_def456",
    "amount": 49.99,
    "currency": "USD",
    "buyer_email": "buyer@example.com",
    "method": "stripe"
  }
}
```

---

## Purchase Events

### `purchase.approved`

Fired when a purchase request is approved (either automatically by guardrails or by the owner via human-in-the-loop approval).

```json
{
  "event": "purchase.approved",
  "timestamp": "2025-01-15T09:35:00.000Z",
  "bot_id": "bot_abc123",
  "data": {
    "checkout_id": "chk_abc123",
    "amount": 29.99,
    "currency": "USD",
    "vendor": "example.com",
    "description": "Widget purchase",
    "approval_mode": "auto"
  }
}
```

### `purchase.rejected`

Fired when a purchase request is rejected by the owner.

```json
{
  "event": "purchase.rejected",
  "timestamp": "2025-01-15T09:36:00.000Z",
  "bot_id": "bot_abc123",
  "data": {
    "checkout_id": "chk_abc123",
    "amount": 29.99,
    "currency": "USD",
    "vendor": "example.com",
    "reason": "Owner rejected the purchase request."
  }
}
```

### `purchase.expired`

Fired when a purchase request expires without owner action (approval requests time out after a configured period).

```json
{
  "event": "purchase.expired",
  "timestamp": "2025-01-15T10:35:00.000Z",
  "bot_id": "bot_abc123",
  "data": {
    "checkout_id": "chk_abc123",
    "amount": 29.99,
    "currency": "USD",
    "vendor": "example.com",
    "message": "Approval request expired without a decision."
  }
}
```

---

## Order Events

### `order.shipped`

Fired when an order associated with a bot purchase has shipped.

```json
{
  "event": "order.shipped",
  "timestamp": "2025-01-16T14:00:00.000Z",
  "bot_id": "bot_abc123",
  "data": {
    "order_id": "ord_ghi789",
    "tracking_number": "1Z999AA10123456784",
    "carrier": "UPS",
    "estimated_delivery": "2025-01-20"
  }
}
```

### `order.delivered`

Fired when an order is marked as delivered.

```json
{
  "event": "order.delivered",
  "timestamp": "2025-01-20T10:00:00.000Z",
  "bot_id": "bot_abc123",
  "data": {
    "order_id": "ord_ghi789",
    "delivered_at": "2025-01-20T10:00:00.000Z"
  }
}
```

### `order.failed`

Fired when an order fails (payment issue, out of stock, vendor error, etc.).

```json
{
  "event": "order.failed",
  "timestamp": "2025-01-16T15:00:00.000Z",
  "bot_id": "bot_abc123",
  "data": {
    "order_id": "ord_ghi789",
    "reason": "Item out of stock",
    "vendor": "example.com"
  }
}
```

---

## Rail5 Events

Rail5 is the self-hosted card rail. These events track card provisioning and checkout flows on Rail5.

### `rail5.checkout.completed`

Fired when a Rail5 checkout (purchase using a self-hosted card) completes successfully.

```json
{
  "event": "rail5.checkout.completed",
  "timestamp": "2025-01-15T11:00:00.000Z",
  "bot_id": "bot_abc123",
  "data": {
    "card_id": "card_jkl012",
    "amount": 42.50,
    "currency": "USD",
    "vendor": "store.example.com",
    "description": "Office supplies"
  }
}
```

### `rail5.checkout.failed`

Fired when a Rail5 checkout fails (card declined, vendor error, etc.).

```json
{
  "event": "rail5.checkout.failed",
  "timestamp": "2025-01-15T11:01:00.000Z",
  "bot_id": "bot_abc123",
  "data": {
    "card_id": "card_jkl012",
    "amount": 42.50,
    "currency": "USD",
    "vendor": "store.example.com",
    "reason": "Card declined by issuer"
  }
}
```

### `rail5.card.delivered`

Fired when an encrypted card is securely delivered to the bot for use. The payload includes the encrypted card file, a suggested save path, and instructions for confirming delivery.

```json
{
  "event": "rail5.card.delivered",
  "timestamp": "2025-01-15T09:05:00.000Z",
  "bot_id": "bot_abc123",
  "data": {
    "card_id": "r5card_abc123",
    "card_name": "My Card",
    "card_last4": "4242",
    "file_content": "--- CREDITCLAW ENCRYPTED CARD FILE ---\n...",
    "suggested_path": ".creditclaw/cards/Card-MyCard-4242.md",
    "instructions": "Check for your encrypted card file: ..."
  }
}
```

**Expected bot behavior after receiving this event:**

1. Save `file_content` to `.creditclaw/cards/` (or the path in `suggested_path`)
2. Acknowledge the message via `POST /api/v1/bot/messages/ack` (if received via polling)
3. Confirm delivery by calling:

```
POST /api/v1/bot/rail5/confirm-delivery
Authorization: Bearer BOT_API_KEY
```

**Response:**

```json
{
  "status": "confirmed",
  "card_id": "r5card_abc123",
  "card_name": "My Card",
  "message": "Card confirmed. Run a test purchase to verify everything works.",
  "test_checkout_url": "https://creditclaw.com/checkout/to-be-confirmed"
}
```

This advances the card from `pending_delivery` → `confirmed` and returns a test checkout URL where the bot can verify the card works end-to-end.

---

## System Events

### `rails.updated`

Fired when the bot's payment methods or configuration changes — a card is linked or removed, spending limits are updated, a wallet is created or frozen, etc. This is a catch-all event that tells the bot to refresh its status.

The `action` field indicates what changed:

| Action | Description |
|--------|-------------|
| `card_linked` | A card was linked to the bot |
| `card_removed` | A card was removed from the bot |
| `card_created` | A new card was created |
| `card_deleted` | A card was deleted |
| `card_frozen` | A card was frozen |
| `card_unfrozen` | A card was unfrozen |
| `limits_updated` | Spending limits were updated |
| `wallet_created` | A new wallet was created |
| `wallet_linked` | A wallet was linked to the bot |
| `wallet_unlinked` | A wallet was unlinked from the bot |
| `wallet_frozen` | A wallet was frozen |
| `wallet_unfrozen` | A wallet was unfrozen |
| `wallet_funded` | A wallet was funded |

```json
{
  "event": "rails.updated",
  "timestamp": "2025-01-15T08:00:00.000Z",
  "bot_id": "bot_abc123",
  "data": {
    "action": "card_linked",
    "rail": "rail5",
    "bot_id": "bot_abc123",
    "message": "Your payment methods have been updated (card linked). Call GET /bot/status for details."
  }
}
```

Your bot should call `GET /api/v1/bot/status` after receiving this event to get the latest configuration.

---

## Event Summary

| Event | Category | Description |
|-------|----------|-------------|
| `wallet.activated` | Wallet | Wallet is active and ready |
| `wallet.topup.completed` | Wallet | Owner topped up the wallet |
| `wallet.spend.authorized` | Wallet | Spend request authorized |
| `wallet.spend.declined` | Wallet | Spend request blocked by guardrails |
| `wallet.balance.low` | Wallet | Balance dropped below threshold |
| `wallet.payment.received` | Wallet | Payment received into wallet |
| `wallet.funded` | Wallet | Wallet funded by owner |
| `wallet.sale.completed` | Wallet | Sale completed through bot's shop |
| `purchase.approved` | Purchase | Purchase approved (auto or manual) |
| `purchase.rejected` | Purchase | Purchase rejected by owner |
| `purchase.expired` | Purchase | Approval request timed out |
| `order.shipped` | Order | Order has shipped |
| `order.delivered` | Order | Order delivered |
| `order.failed` | Order | Order failed |
| `rail5.checkout.completed` | Rail5 | Self-hosted card checkout succeeded |
| `rail5.checkout.failed` | Rail5 | Self-hosted card checkout failed |
| `rail5.card.delivered` | Rail5 | Encrypted card delivered to bot |
| `rails.updated` | System | Payment config changed — refresh status |

---

## Best Practices

1. **Always verify signatures** before processing events. See [Webhook Setup & Signing](/docs/api/webhooks/setup).
2. **Respond with 2xx quickly.** Process events asynchronously if needed. CreditClaw treats non-2xx responses as failures and will retry.
3. **Handle duplicates.** In rare cases the same event may be delivered more than once. Use the `timestamp` and event data to deduplicate.
4. **Subscribe to `rails.updated`** to keep your bot's view of its payment methods current. Call `GET /api/v1/bot/status` after receiving it.
5. **Monitor `wallet.balance.low`** so your bot can proactively request a top-up via `POST /api/v1/bot/wallet/topup-request`.

---

## Next Steps

- [Webhook Setup & Signing](/docs/api/webhooks/setup) — how to verify signatures and configure delivery
- [Bot Status Endpoint](/docs/api/endpoints/bots) — refresh bot configuration after `rails.updated`
- [Quick Start Guide](/docs/api/agent-integration/quick-start) — end-to-end bot integration walkthrough
