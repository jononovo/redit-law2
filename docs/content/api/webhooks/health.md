# Webhook Health & Reliability

CreditClaw automatically monitors the health of your bot's webhook endpoint. When deliveries fail, the system gracefully degrades to message staging so your bot never misses an event.

---

## How Message Routing Works

All internal event dispatching flows through `sendToBot()`, which decides how to deliver each message:

1. **Check webhook availability** — does the bot have a `callback_url` and `webhook_secret`?
2. **Check webhook health** — is `webhook_status` either `active` or `degraded`?
3. **Attempt delivery** — fire the webhook via HTTP POST.
4. **On success** — if the status was `degraded` or the fail count was above zero, reset to `active` with a fail count of `0`.
5. **On failure** — increment the fail count atomically and transition the status (see below).
6. **Fallback** — if the webhook is `unreachable`, `none`, or delivery failed, the event is staged as a pending message for the bot to poll.

> **Note:** Only `sendToBot()` participates in health tracking. Direct `fireWebhook()` callers bypass the health system entirely — they handle their own error logic.

---

## Status Transitions

CreditClaw tracks two fields on every bot record:

| Field | Type | Description |
|-------|------|-------------|
| `webhook_status` | `string` | One of `active`, `degraded`, `unreachable`, `none` |
| `webhook_fail_count` | `integer` | Consecutive delivery failures since last success |

### Transition Table

| Current Status | Event | New Status | New Fail Count |
|---------------|-------|------------|----------------|
| `active` | Delivery succeeds | `active` | `0` |
| `active` | Delivery fails | `degraded` | `1` |
| `degraded` | Delivery succeeds | `active` | `0` |
| `degraded` | Delivery fails | `unreachable` | `2` |
| `unreachable` | Bot updates `callback_url` | `active` | `0` |
| `none` | Bot registers with `callback_url` | `active` | `0` |

Once a bot reaches `unreachable`, CreditClaw stops attempting webhook delivery and routes all events directly to pending messages. The bot must re-register or update its `callback_url` to reset to `active`.

---

## Atomic Failure Counting

Failure counting uses an atomic SQL increment to handle concurrent deliveries correctly:

```sql
UPDATE bots
SET webhook_fail_count = webhook_fail_count + 1,
    webhook_status = CASE
      WHEN webhook_fail_count + 1 >= 2 THEN 'unreachable'
      ELSE 'degraded'
    END
WHERE bot_id = $1
```

This ensures that two simultaneous failed deliveries cannot both read `fail_count = 0` and both write `fail_count = 1` — the database serializes the increments.

---

## Fire-and-Forget Health Updates

Health status updates are intentionally fire-and-forget. They never block or delay message staging:

- On success recovery: the status reset to `active` runs asynchronously.
- On failure: the fail count increment runs asynchronously.
- If the health update itself fails (e.g., database hiccup), it is logged but does not affect the message delivery outcome.

The message is always either delivered via webhook **or** staged as a pending message — health tracking is a side effect, not a gate.

---

## Fallback Behavior

When webhook delivery is skipped or fails, events are staged as pending messages:

- **`webhook_status` is `unreachable` or `none`** — webhook delivery is not attempted; the event goes directly to the pending message queue.
- **Webhook delivery fails** — after updating the health status, the event is staged as a pending message.
- **No `callback_url` or `webhook_secret`** — the event goes directly to the pending message queue.

Pending messages have configurable expiry times based on event type. Bots retrieve them by polling `GET /api/v1/bot/messages` and acknowledge receipt with `POST /api/v1/bot/messages/ack`.

---

## Recovery

A bot's webhook health resets to `active` with a fail count of `0` when:

- The bot re-registers via `POST /api/v1/bots/register` with a new `callback_url`.
- The bot's `callback_url` is updated by the owner.
- A webhook delivery succeeds while the status is `degraded` (automatic recovery).

There is no manual "reset health" endpoint — updating the callback URL is the reset mechanism.

---

## Inspecting Webhook Health

The `webhook_status` and `webhook_fail_count` fields are included in bot status responses:

### GET /api/v1/bot/status

```json
{
  "bot_id": "bot_abc123",
  "bot_name": "my-shopping-bot",
  "wallet_status": "active",
  "webhook_status": "active",
  "webhook_fail_count": 0,
  "callback_url": "https://my-bot.example.com/webhook",
  "rails": { ... }
}
```

### GET /api/v1/bots/mine

Returns an array of bots, each including `webhook_status` and `webhook_fail_count`.

---

## Bot Messages as a Safety Net

The pending message system (`GET /api/v1/bot/messages`) acts as a universal safety net:

- Bots that never register a webhook receive all events as pending messages.
- Bots with unreachable webhooks automatically fall back to pending messages.
- Bots with healthy webhooks can still poll for messages as a backup.

For maximum reliability, bots should poll for pending messages periodically even when webhooks are working. This catches any edge cases where a webhook delivery succeeds from the server's perspective but the bot didn't process it.

---

## Best Practices

1. **Use a reliable, always-on endpoint** for your `callback_url`. Serverless functions or managed services with high uptime are ideal.
2. **Always use HTTPS** for webhook endpoints to protect payload integrity.
3. **Respond quickly** with a `200` status. Do heavy processing asynchronously after acknowledging receipt.
4. **Poll as backup** — even with webhooks enabled, periodically call `GET /api/v1/bot/messages` to catch any missed events.
5. **Monitor `webhook_status`** in your `GET /api/v1/bot/status` responses. If you see `degraded`, investigate your endpoint before it transitions to `unreachable`.
6. **Update your `callback_url`** to reset health after fixing endpoint issues.

---

## Next Steps

- [Webhook Setup & Signing](/docs/api/webhooks/setup) — configure your webhook endpoint and verify signatures
- [Webhook Event Types](/docs/api/webhooks/events) — full reference of all event types and payloads
- [Bot Messages Polling](/docs/api/endpoints/bots) — the `GET /bot/messages` fallback endpoint
