# Webhooks Setup & Signing

Webhooks let CreditClaw push real-time event notifications to your bot instead of requiring it to poll for updates. When something happens — a purchase is approved, a wallet is funded, an order ships — CreditClaw sends an HTTP POST to your bot's registered `callback_url`.

## Webhook Secret

When you register a bot via `POST /api/v1/bots/register`, the response includes a `webhook_secret` with the prefix `whsec_`:

```json
{
  "api_key": "cck_live_...",
  "webhook_secret": "whsec_a1b2c3d4e5f6..."
}
```

Store this secret securely. It is used to verify that incoming webhook requests genuinely originate from CreditClaw.

## Delivery

CreditClaw delivers webhooks as **POST** requests to your bot's `callback_url` with a JSON body:

```json
{
  "event": "purchase.approved",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "bot_id": "bot_a1b2c3d4",
  "data": {
    "checkout_id": "chk_abc123",
    "amount": 29.99,
    "vendor": "example.com",
    "description": "Monthly subscription"
  }
}
```

### Headers

Every webhook request includes two custom headers:

| Header | Format | Description |
|--------|--------|-------------|
| `X-CreditClaw-Signature` | `sha256=<hex>` | HMAC-SHA256 signature of the raw request body |
| `X-CreditClaw-Event` | Event type string | The event type (e.g., `purchase.approved`) |
| `Content-Type` | `application/json` | Always JSON |

## Verifying Signatures

Always verify the `X-CreditClaw-Signature` header before processing a webhook. This prevents spoofed requests.

The signature is computed as `sha256=` followed by the hex-encoded HMAC-SHA256 digest of the raw request body, using your `webhook_secret` as the key.

### JavaScript (Node.js)

```javascript
import { createHmac, timingSafeEqual } from "crypto";

function verifyWebhook(rawBody, signatureHeader, secret) {
  const expectedSig = createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  const expected = `sha256=${expectedSig}`;

  if (expected.length !== signatureHeader.length) return false;

  return timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(signatureHeader)
  );
}

// Express example
app.post("/webhook", express.raw({ type: "application/json" }), (req, res) => {
  const signature = req.headers["x-creditclaw-signature"];
  const event = req.headers["x-creditclaw-event"];

  if (!verifyWebhook(req.body, signature, process.env.WEBHOOK_SECRET)) {
    return res.status(401).send("Invalid signature");
  }

  const payload = JSON.parse(req.body);
  console.log(`Received ${event}:`, payload.data);

  res.status(200).send("OK");
});
```

### Python

```python
import hmac
import hashlib

def verify_webhook(raw_body: bytes, signature_header: str, secret: str) -> bool:
    expected_sig = hmac.new(
        secret.encode("utf-8"),
        raw_body,
        hashlib.sha256
    ).hexdigest()

    expected = f"sha256={expected_sig}"
    return hmac.compare_digest(expected, signature_header)

# Flask example
from flask import Flask, request, abort

app = Flask(__name__)

@app.route("/webhook", methods=["POST"])
def webhook():
    signature = request.headers.get("X-CreditClaw-Signature", "")
    event = request.headers.get("X-CreditClaw-Event", "")

    if not verify_webhook(request.data, signature, WEBHOOK_SECRET):
        abort(401)

    payload = request.get_json()
    print(f"Received {event}: {payload['data']}")

    return "OK", 200
```

## Retry Behavior

If your endpoint does not return a `2xx` status code (or the request times out after 10 seconds), CreditClaw will retry delivery with exponential backoff:

| Attempt | Delay after failure |
|---------|-------------------|
| 1st retry | 1 minute |
| 2nd retry | 5 minutes |
| 3rd retry | 15 minutes |
| 4th retry | 1 hour |
| 5th retry | 6 hours |

After 5 failed attempts, the delivery is marked as **failed** and will not be retried automatically. You can view failed deliveries and trigger manual retries from the dashboard webhook log.

## Best Practices

- **Respond quickly.** Return a `200` response as soon as you receive the webhook. Process the event asynchronously if your handler does heavy work.
- **Use timing-safe comparison.** Always use `timingSafeEqual` (Node.js) or `hmac.compare_digest` (Python) to prevent timing attacks.
- **Handle duplicates.** In rare cases, the same event may be delivered more than once. Use the `timestamp` and event data to deduplicate.
- **Keep your secret secure.** Never expose your `webhook_secret` in client-side code or public repositories.

## Next Steps

- [Webhook Event Types](/docs/api/webhooks/events) — full reference of all event types and their payloads
- [Health & Reliability](/docs/api/webhooks/health) — how CreditClaw tracks webhook health and falls back to pending messages
- [Authentication](/docs/api/authentication) — how API keys and webhook secrets are generated
- [Quick Start](/docs/api/agent-integration/quick-start) — end-to-end guide from registration to first purchase
