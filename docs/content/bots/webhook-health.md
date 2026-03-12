# Webhook Health

CreditClaw continuously monitors the health of your bot's webhook endpoint. This helps ensure that your bot receives real-time notifications about purchases, approvals, and other events without interruption.

## What Is Webhook Health?

When your bot registers with CreditClaw, it can provide a **callback URL** — a webhook endpoint where CreditClaw sends event notifications. Webhook health tracks whether that endpoint is responding correctly.

Every time CreditClaw delivers a message to your bot's webhook, it checks the response. Successful deliveries keep the webhook healthy; repeated failures cause the status to degrade.

## Webhook Statuses

Your bot's webhook can be in one of four states:

| Status | Meaning |
|--------|---------|
| **Active** | Your webhook is working normally. All events are delivered in real time. |
| **Degraded** | Your webhook has failed a few recent deliveries but is still receiving attempts. This is often a temporary issue. |
| **Unreachable** | Your webhook has failed repeatedly and CreditClaw has stopped attempting delivery. Events are queued for your bot to fetch. |
| **None** | No webhook URL is configured. Your bot must poll for messages. |

## What Happens When a Webhook Is Broken?

If your bot's webhook becomes **degraded** or **unreachable**, CreditClaw doesn't lose your messages. Instead:

1. Events that would normally be pushed to your webhook are **staged as pending messages**.
2. Your bot can retrieve these messages by polling the **Bot Messages** endpoint (`GET /api/v1/bot/messages`).
3. Once your bot acknowledges the messages, they are marked as delivered.

This means your bot will never miss an event — it just may not receive it instantly if the webhook is down.

## How to Fix a Broken Webhook

If your webhook status shows **degraded** or **unreachable**:

1. **Check your endpoint** — make sure your server is running and accessible from the internet.
2. **Verify the URL** — confirm the callback URL registered with CreditClaw is correct.
3. **Update the webhook URL** — re-register your bot or update the callback URL. This automatically resets the webhook status back to **active**.

Updating your webhook URL is the fastest way to recover. CreditClaw will immediately begin delivering events to the new endpoint.

## Where to See Webhook Status

You can check your bot's webhook status in two places:

- **Dashboard** — each bot card on the main dashboard displays the current webhook status alongside the bot's other details.
- **API** — the `GET /api/v1/bot/status` and `GET /api/v1/bots/mine` responses include `webhook_status` and `webhook_fail_count` fields.

## Tips for Reliable Webhooks

- **Use HTTPS** — always use a secure endpoint to protect event data in transit.
- **Respond quickly** — your endpoint should return a `200` status code promptly. Long-running processing should happen asynchronously after acknowledging the webhook.
- **Start with a reliable host** — use a cloud provider or hosting service with high uptime guarantees.
- **Monitor your endpoint** — set up external monitoring for your webhook URL so you know immediately if it goes down.
- **Implement polling as a fallback** — even with a healthy webhook, having your bot periodically poll for missed messages adds an extra layer of reliability.
