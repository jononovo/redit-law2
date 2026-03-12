# Skills

The Skills endpoints let your bot discover procurement skills — structured vendor profiles that describe how to purchase from specific merchants. Use these endpoints to search for vendors by category, checkout method, or capability, and retrieve detailed skill files for integration.

---

## List / Search Skills

Search and filter available procurement skills.

| | |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/v1/bot/skills` |
| **Auth** | Bearer token (`Authorization: Bearer cck_live_...`) |

### Query Parameters

| Parameter | Type | Description |
|---|---|---|
| `search` | string | Filter vendors by name or slug (case-insensitive) |
| `category` | string | Filter by category: `retail`, `office`, `hardware`, `electronics`, `industrial`, `specialty` |
| `checkout` | string | Comma-separated checkout methods: `native_api`, `acp`, `x402`, `crossmint_world`, `self_hosted_card`, `browser_automation` |
| `capability` | string | Comma-separated required capabilities (all must match): `price_lookup`, `stock_check`, `programmatic_checkout`, `business_invoicing`, `bulk_pricing`, `tax_exemption`, `account_creation`, `order_tracking`, `returns`, `po_numbers` |
| `maturity` | string | Comma-separated maturity levels: `verified`, `beta`, `community`, `draft` |

### Response

```json
{
  "vendors": [
    {
      "slug": "amazon",
      "name": "Amazon",
      "category": "retail",
      "url": "https://amazon.com",
      "checkout_methods": ["crossmint_world", "self_hosted_card"],
      "capabilities": ["price_lookup", "stock_check", "order_tracking"],
      "maturity": "verified",
      "agent_friendliness": 85,
      "guest_checkout": true,
      "bulk_pricing": false,
      "free_shipping_above": 35,
      "skill_url": "https://creditclaw.com/api/v1/bot/skills/amazon",
      "catalog_url": "https://creditclaw.com/skills/amazon",
      "version": "1.0.0",
      "last_verified": "2025-01-15",
      "success_rate": 0.94
    }
  ],
  "total": 1,
  "categories": ["retail", "office", "hardware", "electronics", "industrial", "specialty"]
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `slug` | string | Unique vendor identifier |
| `name` | string | Display name |
| `category` | string | Vendor category |
| `url` | string | Vendor website |
| `checkout_methods` | string[] | Supported checkout methods |
| `capabilities` | string[] | Vendor capabilities |
| `maturity` | string | Skill maturity level (`verified`, `beta`, `community`, `draft`) |
| `agent_friendliness` | number | Score from 0–100 indicating how well the vendor supports agent-driven purchases |
| `guest_checkout` | boolean | Whether the vendor supports guest checkout |
| `bulk_pricing` | boolean | Whether bulk pricing is available |
| `free_shipping_above` | number \| null | Order amount threshold for free shipping |
| `skill_url` | string | URL to fetch the full skill markdown |
| `catalog_url` | string | URL to the vendor's skill page on CreditClaw |
| `version` | string | Skill version (semver) |
| `last_verified` | string | Date the skill was last verified |
| `success_rate` | number \| null | Historical purchase success rate (0–1) |

### Example

```bash
# Search for office supply vendors with programmatic checkout
curl "https://creditclaw.com/api/v1/bot/skills?category=office&capability=programmatic_checkout" \
  -H "Authorization: Bearer cck_live_abc123..."
```

```bash
# Find vendors that support x402 payments
curl "https://creditclaw.com/api/v1/bot/skills?checkout=x402&maturity=verified,beta" \
  -H "Authorization: Bearer cck_live_abc123..."
```

---

## Get Vendor Skill

Retrieve the full skill file for a specific vendor. The response is a Markdown document containing detailed procurement instructions, checkout flows, payment methods, and integration notes.

| | |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/v1/bot/skills/:vendor` |
| **Auth** | Bearer token (`Authorization: Bearer cck_live_...`) |

### Path Parameters

| Parameter | Type | Description |
|---|---|---|
| `vendor` | string | The vendor slug (e.g., `amazon`, `staples`) |

### Response

The response is a `text/markdown` document with the following headers:

| Header | Description |
|---|---|
| `Content-Type` | `text/markdown; charset=utf-8` |
| `Cache-Control` | `public, max-age=3600, s-maxage=86400` |
| `X-Skill-Version` | Skill version (e.g., `1.0.0`) |
| `X-Skill-Maturity` | Maturity level (e.g., `verified`) |

The Markdown body includes sections such as:
- Vendor overview and supported categories
- Available checkout methods with configuration details
- Search patterns and product URL templates
- Shipping and return policies
- Agent integration notes and tips

### Error Response

```json
{
  "error": "vendor_not_found",
  "message": "No skill found for vendor 'unknown-vendor'"
}
```

**Status:** `404 Not Found`

### Example

```bash
# Fetch the full skill file for Amazon
curl "https://creditclaw.com/api/v1/bot/skills/amazon" \
  -H "Authorization: Bearer cck_live_abc123..."
```

Response (truncated):

```markdown
# Amazon — Procurement Skill

## Overview
Amazon is a retail vendor supporting crossmint_world and self_hosted_card checkout methods...

## Checkout Methods
...
```

---

## Related

- [Authentication](/docs/api/authentication) — How to authenticate API requests
- [Bots](/docs/api/endpoints/bots) — Register and manage your bot
- [Webhooks](/docs/api/webhooks/setup) — Get notified of purchase events
