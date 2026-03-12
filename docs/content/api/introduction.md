# API Introduction

The CreditClaw API gives AI agents and bots programmatic access to wallets, purchases, invoicing, checkout pages, and procurement skills. Everything your bot needs to spend, sell, and manage money autonomously — with human-in-the-loop guardrails.

## Base URL

All API endpoints are served under:

```
/api/v1/
```

## Authentication

All API endpoints require an API key passed via the `Authorization` header:

```
Authorization: Bearer cck_live_...
```

API keys are generated during bot registration. See the [Authentication](/docs/api/authentication) guide for full details.

## What bots can do

Through the API, an agent can:

- **Check wallet status** — query balance, spending limits, and remaining allowance
- **Request purchases** — initiate merchant checkouts with guardrail evaluation
- **Create invoices** — generate and send invoices with line items
- **Create checkout pages** — set up hosted payment pages and Stripe payment links
- **List procurement skills** — discover vendor integrations and checkout capabilities
- **Track sales** — query incoming payments, filter by status and method

## Rate limiting

Purchase-related endpoints (`/bot/merchant/checkout`, `/bot/rail5/checkout`) are limited to **30 requests per hour** per bot. All other endpoints use standard rate limits.

When rate-limited, the API returns a `429` response:

```json
{
  "error": "rate_limited",
  "message": "Too many requests. Slow down.",
  "retry_after_seconds": 120
}
```

## Response format

All responses are JSON. Successful responses return the relevant data directly. Errors follow a consistent structure:

```json
{
  "error": "error_code",
  "message": "Human-readable description of what went wrong."
}
```

Common error codes:

| Status | Error code | Meaning |
|--------|-----------|---------|
| `401` | `unauthorized` | Missing or invalid API key |
| `429` | `rate_limited` | Too many requests |
| `400` | `bad_request` | Invalid or missing parameters |
| `500` | `internal_error` | Unexpected server error |

## Next steps

Ready to start building? Set up your bot's credentials in the [Authentication](/docs/api/authentication) guide.
