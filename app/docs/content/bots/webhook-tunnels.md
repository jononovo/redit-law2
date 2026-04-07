# Managed Tunnels

If your bot doesn't have a publicly accessible webhook endpoint, CreditClaw can provision a managed Cloudflare tunnel during registration. This gives your bot a permanent `*.nortonbot.com` URL that routes webhook traffic to your local machine through a secure tunnel.

---

## How It Works

1. Register your bot **without** a `callback_url`
2. CreditClaw creates a Cloudflare tunnel and a DNS record at `bot-<id>.nortonbot.com`
3. The registration response includes a `tunnel_setup` object with everything you need
4. You run `cloudflared` on your machine to connect the tunnel to your local server
5. CreditClaw delivers webhooks to your `*.nortonbot.com` URL, which routes through the tunnel to your local port

The tunnel URL is permanent — it won't change unless you re-register the bot.

---

## Registration

Register without a `callback_url` to trigger tunnel provisioning:

```bash
curl -X POST https://creditclaw.com/api/v1/bots/register \
  -H "Content-Type: application/json" \
  -d '{
    "bot_name": "my-agent",
    "owner_email": "owner@example.com",
    "bot_type": "openclaw"
  }'
```

### Optional Fields

| Field | Default (OpenClaw) | Default (other) | Description |
|-------|-------------------|-----------------|-------------|
| `bot_type` | `"openclaw"` | — | Controls default port and webhook path |
| `local_port` | `18789` | `8080` | Port where your local server listens |
| `webhook_path` | `/hooks/creditclaw` | `/webhook` | Path appended to the tunnel URL |

### Response

The response includes all the standard registration fields plus tunnel-specific data:

```json
{
  "bot_id": "bot_abc123",
  "api_key": "cck_live_...",
  "claim_token": "clm_xyz789...",
  "status": "pending_owner_verification",
  "owner_verification_url": "https://creditclaw.com/claim?token=clm_xyz789...",
  "webhook_secret": "whsec_...",
  "webhook_note": "Save your webhook_secret now — it cannot be retrieved later.",
  "webhook_url": "https://bot-abc123.nortonbot.com/hooks/creditclaw",
  "tunnel_token": "eyJ...",
  "tunnel_setup": {
    "webhook_url": "https://bot-abc123.nortonbot.com/hooks/creditclaw",
    "tunnel_token": "eyJ...",
    "cloudflared_command": "cloudflared tunnel run --token eyJ...",
    "local_port": 18789,
    "webhook_path": "/hooks/creditclaw",
    "steps": [
      "1. Install cloudflared: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/",
      "2. Run: cloudflared tunnel run --token eyJ..."
    ],
    "webhook_headers": {
      "X-CreditClaw-Signature": "sha256=<hmac of payload using your webhook_secret>",
      "X-CreditClaw-Event": "<event_type>"
    },
    "retry_policy": "Failed deliveries are retried up to 5 times with exponential backoff.",
    "openclaw_gateway_config": { }
  },
  "openclaw_hooks_token": "whsec_...",
  "openclaw_hooks_token_note": "Save your openclaw_hooks_token now — it cannot be retrieved later. Set it as CREDITCLAW_HOOKS_TOKEN in your OpenClaw environment.",
  "important": "Save your api_key now — it cannot be retrieved later. Give the claim_token to your human so they can activate your wallet."
}
```

> **Save immediately:** `api_key`, `webhook_secret`, and `openclaw_hooks_token` are shown only once and cannot be retrieved later.

---

## Running the Tunnel

### 1. Install cloudflared

Download from [cloudflare.com/downloads](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/).

### 2. Start the tunnel

Copy the `cloudflared_command` from the registration response and run it:

```bash
cloudflared tunnel run --token eyJ...
```

This connects your local machine to the Cloudflare tunnel. Webhook traffic to `bot-abc123.nortonbot.com` will be forwarded to `localhost:<local_port>`.

### 3. Start your local server

Make sure your server is listening on the configured port and path. For OpenClaw bots, that's port `18789` at `/hooks/creditclaw` by default.

---

## OpenClaw Gateway Setup

For OpenClaw bots, the registration response includes an `openclaw_gateway_config` snippet and an `openclaw_hooks_token`. These configure the OpenClaw Gateway to accept and authenticate CreditClaw webhooks.

### 1. Set the environment variable

Save the `openclaw_hooks_token` from the registration response as an environment variable:

```bash
export CREDITCLAW_HOOKS_TOKEN="whsec_..."
```

### 2. Add the hook mapping

The `openclaw_gateway_config` from the response goes into your `~/.openclaw/openclaw.json`. The config references `${CREDITCLAW_HOOKS_TOKEN}`, which OpenClaw resolves from your environment at runtime — the raw token is never stored in the config file.

```json
{
  "hooks": {
    "enabled": true,
    "token": "${CREDITCLAW_HOOKS_TOKEN}",
    "mappings": [
      {
        "match": { "path": "creditclaw" },
        "action": "agent",
        "name": "CreditClaw",
        "agentId": "main",
        "messageTemplate": "CreditClaw event {{event}}: {{description}}",
        "deliver": false
      }
    ]
  }
}
```

### 3. Start the Gateway

The OpenClaw Gateway listens on port `18789` by default. When CreditClaw sends a webhook:

1. The request hits `bot-abc123.nortonbot.com/hooks/creditclaw`
2. Cloudflare routes it through the tunnel to `localhost:18789/hooks/creditclaw`
3. The Gateway validates the `Authorization: Bearer <token>` header against your `CREDITCLAW_HOOKS_TOKEN`
4. The Gateway routes the event to your agent based on the hook mapping

---

## Two-Layer Authentication

CreditClaw sends two authentication layers on every webhook to tunnel-provisioned OpenClaw bots:

| Header | Purpose | Who validates |
|--------|---------|--------------|
| `Authorization: Bearer <token>` | Gateway authentication — proves the request is from CreditClaw | OpenClaw Gateway (using `CREDITCLAW_HOOKS_TOKEN`) |
| `X-CreditClaw-Signature: sha256=<hmac>` | Payload integrity — proves the body hasn't been tampered with | Your application code (using `webhook_secret`) |

The `Authorization` header lets the Gateway accept or reject requests before they reach your agent. The HMAC signature lets your agent verify payload integrity independently. See [Webhook Setup & Signing](/docs/bots/webhook-setup) for signature verification examples.

---

## Non-OpenClaw Bots

If your `bot_type` is not `"openclaw"`, the tunnel still works the same way — you just don't get the `openclaw_gateway_config` or `openclaw_hooks_token`. CreditClaw delivers webhooks with `X-CreditClaw-Signature` and `X-CreditClaw-Event` headers only (no `Authorization` header).

Set up your own webhook server on the configured port and path:

```bash
cloudflared tunnel run --token eyJ...
# Your server listens on localhost:8080 at /webhook
```

---

## Webhook Status

Tunnel-provisioned bots start with a webhook status of `pending` (not `active`). The status transitions to `active` when the bot's webhook endpoint begins responding successfully — this happens through the normal [webhook health tracking](/docs/bots/webhook-health-technical) system.

If deliveries fail after the tunnel was working, the status follows the same degradation path as any other webhook (`active` → `degraded` → `unreachable`). See [Webhook Health & Reliability](/docs/bots/webhook-health-technical) for details.

---

## Next Steps

- [Webhook Setup & Signing](/docs/bots/webhook-setup) — signature verification and delivery format
- [Webhook Event Types](/docs/bots/webhook-events) — all events your bot can receive
- [Health & Reliability](/docs/bots/webhook-health-technical) — how CreditClaw handles delivery failures
- [Bot Registration](/docs/bots/api-reference) — full registration endpoint reference
