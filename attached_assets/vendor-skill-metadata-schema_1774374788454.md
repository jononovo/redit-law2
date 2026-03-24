# Vendor Skill Metadata Schema — Technical Spec

**Purpose:** Define the structured metadata that makes vendor skills instantly searchable by agents. Every field here either gets filtered on or returned in search results. If an agent can't filter on it, it doesn't belong in metadata — it belongs in the skill markdown.

---

## The metadata file

Each vendor skill ships with a `skill.json` (or `_meta.json`) alongside the `SKILL.md`. The metadata is the machine-readable index. The skill markdown is the human/agent-readable instruction set. They serve different purposes and should not duplicate each other.

```
vendor-slug/
├── skill.json      ← this schema
├── SKILL.md        ← checkout instructions, tips, step-by-step flows
└── CHANGELOG.md    ← optional
```

---

## Schema

```jsonc
{
  // ─── IDENTITY ───
  "slug": "staples",
  "name": "Staples",
  "domain": "staples.com",
  "url": "https://www.staples.com",
  "logo_url": "https://creditclaw.com/logos/staples.svg",
  "description": "Office supplies, furniture, and tech for businesses.",
  "version": "1.2.0",
  "last_verified": "2026-03-20",

  // ─── TAXONOMY ───
  "taxonomy": {
    "sector": "office",
    "sub_sectors": ["office-supplies", "furniture", "ink-toner", "tech-accessories"],
    "tier": "mid-range",
    "tags": ["business", "bulk", "b2b", "school-supplies"]
  },

  // ─── SEARCH INTEGRATIONS ───
  "search": {
    "mcp": {
      "available": true,
      "url": "https://mcp.staples.com/sse"
    },
    "api": {
      "available": true,
      "endpoint": "https://api.staples.com/v2/products/search",
      "auth_required": true,
      "docs_url": "https://developer.staples.com/docs"
    },
    "cli": {
      "available": false
    },
    "site_search": true,
    "product_feed": false
  },

  // ─── CAPABILITIES ───
  "capabilities": [
    "price_lookup",
    "stock_check",
    "bulk_pricing",
    "tax_exemption",
    "po_number",
    "reorder",
    "wishlist"
  ],

  // ─── BUYING ───
  "buying": {
    "ordering": "guest",
    "checkout_provider": "in-house",
    "vendor_accepts": ["card", "ACH", "invoice", "apple_pay"],
    "creditclaw_supports": ["card", "x402"],
    "business_account_available": true
  },

  // ─── DELIVERY ───
  "delivery": {
    "options": ["standard", "next-day", "same-day"],
    "free_shipping_threshold": 49.99,
    "ships_internationally": false,
    "supported_countries": ["US"]
  },

  // ─── DEALS ───
  "deals": {
    "has_deals": true,
    "deals_url": "https://www.staples.com/deals",
    "deals_api": null,
    "loyalty_program": "Staples Rewards"
  },

  // ─── OWNERSHIP ───
  "ownership": {
    "maturity": "official",
    "claimed_by": null,
    "submitted_by": "creditclaw-ai",
    "submitter_type": "community"
  }
}
```

---

## Field definitions

### Identity

| Field | Type | Required | Description |
|---|---|---|---|
| `slug` | string | yes | URL-safe unique ID. Lowercase, hyphens only. |
| `name` | string | yes | Display name. |
| `domain` | string | yes | Normalized root domain (e.g. `staples.com`). Used for brand claim verification. |
| `url` | string | yes | Full website URL. |
| `logo_url` | string | no | Hosted logo. |
| `description` | string | yes | One sentence. What does this vendor sell? Max 200 chars. |
| `version` | string | yes | Semver. Incremented on any metadata or skill content change. |
| `last_verified` | string | yes | ISO date. When someone last confirmed this metadata is accurate. |

### Taxonomy

| Field | Type | Required | Notes |
|---|---|---|---|
| `sector` | enum | yes | Primary vertical. See enum below. |
| `sub_sectors` | enum[] | yes | 1-5 values from controlled list. |
| `tier` | enum | yes | Price/quality positioning. |
| `tags` | string[] | no | Freeform. For search, not filtering. Max 10. |

**Sector enum:** `office`, `fashion`, `electronics`, `home`, `health`, `construction`, `industrial`, `grocery`, `saas`, `automotive`, `specialty`

**Tier enum:** `top-luxury`, `luxury`, `premium`, `mid-range`, `value`, `wholesale`, `marketplace`

**Sub-sector enum** (partial — grows over time): `office-supplies`, `ink-toner`, `furniture`, `tech-accessories`, `womens-handbags`, `womens-shoes`, `mens-clothing`, `safety-equipment`, `power-tools`, `hand-tools`, `building-materials`, `plumbing`, `electrical`, `appliances`, `supplements`, `pharmacy`, `personal-care`, `software-licenses`, `cloud-services`, `auto-parts`, `tires`

Sub-sectors are namespaced to their sector. The full controlled vocabulary lives in a separate `taxonomy.json` file that gets versioned independently. New values are added via PR, not freeform entry.

### Search integrations

Each integration method is its own object so agents know exactly what's available and where to connect.

| Field | Type | Required | Notes |
|---|---|---|---|
| `search.mcp.available` | boolean | yes | Has an MCP server for product search. |
| `search.mcp.url` | string | if available | MCP server SSE endpoint. |
| `search.api.available` | boolean | yes | Has a REST/GraphQL product search API. |
| `search.api.endpoint` | string | if available | Base URL for product search. |
| `search.api.auth_required` | boolean | if available | Whether API key or OAuth is needed. |
| `search.api.docs_url` | string | no | Link to API documentation. |
| `search.cli.available` | boolean | yes | Has a CLI tool for product operations. |
| `search.cli.install_command` | string | if available | e.g. `npm install -g @staples/cli` |
| `search.site_search` | boolean | yes | Can agents search via the website's search bar (browser automation). |
| `search.product_feed` | boolean | no | Exposes a product catalog feed (XML, CSV, etc). |

### Capabilities

Array of enum strings. These are things the vendor supports that matter to purchasing agents.

**Capabilities enum:** `price_lookup`, `stock_check`, `bulk_pricing`, `tax_exemption`, `po_number`, `reorder`, `wishlist`, `cart_management`, `quote_request`, `scheduled_delivery`, `gift_wrapping`, `custom_engraving`, `subscription`, `auto_reorder`

### Buying

| Field | Type | Required | Notes |
|---|---|---|---|
| `ordering` | enum | yes | `guest`, `registered`, `approval_required` |
| `checkout_provider` | enum | yes | `stripe`, `adyen`, `shopify`, `worldpay`, `in-house`, `other` |
| `vendor_accepts` | string[] | yes | All payment methods the vendor supports. |
| `creditclaw_supports` | string[] | yes | Which of those CreditClaw can currently automate. |
| `business_account_available` | boolean | no | Whether the vendor offers B2B accounts. |

**Payment methods enum:** `card`, `ACH`, `wire`, `invoice`, `apple_pay`, `google_pay`, `paypal`, `x402`, `crypto`, `klarna`, `affirm`

The split between `vendor_accepts` and `creditclaw_supports` is critical. An agent must never promise a payment method CreditClaw can't execute.

### Delivery

| Field | Type | Required | Notes |
|---|---|---|---|
| `options` | string[] | yes | `same-day`, `next-day`, `two-day`, `standard`, `freight`, `digital` |
| `free_shipping_threshold` | number | no | USD. `null` = no free shipping. `0` = always free. |
| `ships_internationally` | boolean | yes | |
| `supported_countries` | string[] | if not international | ISO 3166-1 alpha-2 codes. |

### Deals

| Field | Type | Required | Notes |
|---|---|---|---|
| `has_deals` | boolean | yes | Does the vendor currently have active promotions? |
| `deals_url` | string | no | Direct link to deals/coupons page. |
| `deals_api` | string | no | API endpoint that returns current promotions. |
| `loyalty_program` | string | no | Name of loyalty/rewards program if one exists. |

### Ownership

| Field | Type | Required | Notes |
|---|---|---|---|
| `maturity` | enum | yes | `draft`, `community`, `official`, `verified` |
| `claimed_by` | string | no | UID of brand owner. `null` if unclaimed. |
| `submitted_by` | string | yes | Who created this skill. |
| `submitter_type` | enum | yes | `ai_generated`, `community`, `brand_verified` |

**Maturity progression:**
- `draft` — AI-generated, unreviewed
- `community` — someone verified it works, unclaimed by brand
- `official` — brand claimed and confirmed the metadata
- `verified` — brand claimed + CreditClaw team audited

---

## Agent readiness score

Computed server-side from the metadata, never self-reported. Score is 0-100.

| Signal | Points |
|---|---|
| `search.mcp.available` | +25 |
| `search.api.available` | +20 |
| `ordering` = `guest` | +15 |
| `x402` in `creditclaw_supports` | +15 |
| `cart_management` in capabilities | +10 |
| `deals.deals_api` is set | +5 |
| `search.product_feed` | +5 |
| `maturity` = `verified` | +5 |

This score is stored as a column in the vendor index table and recalculated whenever metadata changes.

---

## How this maps to the database

Every field an agent would filter on becomes a flat, indexed column in the `vendor_index` table. The full `skill.json` is stored in a `vendor_data jsonb` column for retrieval.

| Metadata field | Column type | Index type |
|---|---|---|
| `slug` | text UNIQUE | btree |
| `domain` | text | btree |
| `taxonomy.sector` | text | btree |
| `taxonomy.sub_sectors` | text[] | GIN |
| `taxonomy.tier` | text | btree |
| `taxonomy.tags` | text[] | GIN |
| `search.mcp.available` | boolean | partial (WHERE true) |
| `search.api.available` | boolean | partial (WHERE true) |
| `capabilities` | text[] | GIN |
| `buying.ordering` | text | btree |
| `buying.creditclaw_supports` | text[] | GIN |
| `delivery.free_shipping_threshold` | numeric | btree |
| `deals.has_deals` | boolean | partial (WHERE true) |
| `ownership.maturity` | text | btree |
| `agent_readiness` | integer | btree |
| `vendor_data` | jsonb | — (retrieval only) |
| `skill_md` | text | — (retrieval only) |
| `search_vector` | tsvector | GIN |

The `search_vector` is built from: `name`, `description`, `tags`, `sub_sectors`, and `sector`. This powers full-text search for natural language queries.

---

## Example agent queries → SQL

**"Office supplies with guest checkout and free shipping under $50"**
```sql
SELECT slug, name, agent_readiness FROM vendor_index
WHERE sector = 'office'
  AND ordering = 'guest'
  AND free_shipping_threshold <= 50
ORDER BY agent_readiness DESC;
```

**"Any vendor with MCP that supports bulk pricing"**
```sql
SELECT slug, name, mcp_url FROM vendor_index
WHERE has_mcp = true
  AND 'bulk_pricing' = ANY(capabilities);
```

**"Luxury fashion, must accept x402"**
```sql
SELECT slug, name FROM vendor_index
WHERE sector = 'fashion'
  AND tier IN ('luxury', 'top-luxury')
  AND 'x402' = ANY(creditclaw_supports);
```

---

## Controlled vocabulary management

The `taxonomy.json` file is the source of truth for all enum values (sectors, sub-sectors, tiers, capabilities, payment methods). It is versioned separately from individual vendor skills.

Adding a new sub-sector or capability requires a PR to `taxonomy.json`. Vendor skill submissions are validated against the current taxonomy version at publish time. This prevents drift ("womens bags" vs "women's handbags" vs "purses").

`tags` is the only freeform field. It exists for discoverability, not for primary filtering.

---

## What this schema does NOT cover

- **Checkout instructions** — those live in `SKILL.md`
- **Tips, gotchas, session behavior** — those live in `SKILL.md`
- **Brand claim verification flow** — that's a platform feature, not a metadata concern
- **Skill submission pipeline** — separate system, consumes this schema as input
- **Export to ClawHub / skills.sh** — separate pipeline, reads from the vendor index table
