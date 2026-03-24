# Brand Skill Metadata Schema — Technical Spec v2

**Purpose:** Define the structured metadata that makes brand skills instantly searchable by agents. Every field here either gets filtered on or returned in search results. If an agent can't filter on it, it doesn't belong in metadata — it belongs in the skill markdown.

**Core model:** Everything is a brand. Nike is a brand. Footlocker is a brand. Amazon is a brand. The difference is whether a brand also carries other brands' products. This is self-evident from the data — if `carries_brands` is populated, the brand is also a retailer. No explicit type flag needed.

---

## The metadata file

Each brand skill ships with a `skill.json` alongside the `SKILL.md`.

```
brand-slug/
├── skill.json      ← this schema (machine-readable index)
├── SKILL.md        ← checkout instructions, tips, step-by-step flows
└── CHANGELOG.md    ← optional
```

---

## Schema

```jsonc
{
  // ─── IDENTITY ───
  "slug": "footlocker",
  "name": "Foot Locker",
  "domain": "footlocker.com",
  "url": "https://www.footlocker.com",
  "logo_url": "https://creditclaw.com/logos/footlocker.svg",
  "description": "Athletic shoes and apparel from top brands.",
  "version": "1.0.0",
  "last_verified": "2026-03-20",

  // ─── TAXONOMY ───
  "taxonomy": {
    "sector": "fashion",
    "sub_sectors": ["athletic-shoes", "sportswear", "sneakers"],
    "tier": "mid-range",
    "tags": ["sneakers", "basketball", "running", "streetwear"]
  },

  // ─── BRAND RELATIONSHIPS ───
  "carries_brands": ["nike", "adidas", "new-balance", "puma", "reebok", "jordan"],

  // ─── SEARCH INTEGRATIONS ───
  "search": {
    "mcp": {
      "available": false
    },
    "api": {
      "available": true,
      "endpoint": "https://api.footlocker.com/v1/products/search",
      "auth_required": true,
      "docs_url": "https://developer.footlocker.com"
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
    "wishlist",
    "store_pickup"
  ],

  // ─── BUYING ───
  "buying": {
    "ordering": "guest",
    "checkout_provider": "adyen",
    "vendor_accepts": ["card", "paypal", "apple_pay", "google_pay", "klarna"],
    "creditclaw_supports": ["card"],
    "business_account_available": false
  },

  // ─── DELIVERY ───
  "delivery": {
    "options": ["standard", "two-day", "store-pickup"],
    "free_shipping_threshold": 50.00,
    "ships_internationally": true,
    "supported_countries": ["US", "CA", "GB", "DE", "FR", "NL"]
  },

  // ─── DEALS ───
  "deals": {
    "has_deals": true,
    "deals_url": "https://www.footlocker.com/sale",
    "deals_api": null,
    "loyalty_program": "FLX Rewards"
  },

  // ─── OWNERSHIP ───
  "ownership": {
    "maturity": "community",
    "claimed_by": null,
    "submitted_by": "creditclaw-ai",
    "submitter_type": "ai_generated"
  }
}
```

### Second example — an HQ brand (no `carries_brands`)

```jsonc
{
  "slug": "nike",
  "name": "Nike",
  "domain": "nike.com",
  "url": "https://www.nike.com",
  "logo_url": "https://creditclaw.com/logos/nike.svg",
  "description": "Athletic footwear, apparel, and equipment.",
  "version": "1.0.0",
  "last_verified": "2026-03-20",

  "taxonomy": {
    "sector": "fashion",
    "sub_sectors": ["athletic-shoes", "sportswear", "sneakers"],
    "tier": "premium",
    "tags": ["running", "basketball", "jordan", "air-max"]
  },

  // Empty — Nike sells its own products only
  "carries_brands": [],

  "search": {
    "mcp": { "available": false },
    "api": {
      "available": true,
      "endpoint": "https://api.nike.com/discover/products/v2",
      "auth_required": false,
      "docs_url": null
    },
    "cli": { "available": false },
    "site_search": true,
    "product_feed": false
  },

  "capabilities": [
    "price_lookup",
    "stock_check",
    "cart_management",
    "custom_engraving",
    "wishlist"
  ],

  "buying": {
    "ordering": "registered",
    "checkout_provider": "in-house",
    "vendor_accepts": ["card", "paypal", "apple_pay", "google_pay", "klarna", "affirm"],
    "creditclaw_supports": ["card"],
    "business_account_available": false
  },

  "delivery": {
    "options": ["standard", "two-day", "next-day"],
    "free_shipping_threshold": 50.00,
    "ships_internationally": true,
    "supported_countries": ["US", "CA", "GB", "DE", "FR", "JP", "CN", "AU"]
  },

  "deals": {
    "has_deals": true,
    "deals_url": "https://www.nike.com/sale",
    "deals_api": null,
    "loyalty_program": "Nike Membership"
  },

  "ownership": {
    "maturity": "community",
    "claimed_by": null,
    "submitted_by": "creditclaw-ai",
    "submitter_type": "ai_generated"
  }
}
```

The difference is visible without any flags: Nike's `carries_brands` is empty, Footlocker's lists six brands. An agent seeing Footlocker's listing immediately knows it can find Nike products there.

---

## Field definitions

### Identity

| Field | Type | Required | Notes |
|---|---|---|---|
| `slug` | string | yes | URL-safe unique ID. Lowercase, hyphens only. |
| `name` | string | yes | Display name. |
| `domain` | string | yes | Normalized root domain. Used for brand claim verification. |
| `url` | string | yes | Full website URL. |
| `logo_url` | string | no | Hosted logo. |
| `description` | string | yes | One sentence, max 200 chars. |
| `version` | string | yes | Semver. |
| `last_verified` | string | yes | ISO date. |

### Taxonomy

| Field | Type | Required | Notes |
|---|---|---|---|
| `sector` | enum | yes | Primary vertical. |
| `sub_sectors` | enum[] | yes | 1-5 values from controlled vocabulary. |
| `tier` | enum | yes | Price/quality positioning. |
| `tags` | string[] | no | Freeform. For discoverability, not primary filtering. Max 10. |

**Sector enum:** `office`, `fashion`, `electronics`, `home`, `health`, `construction`, `industrial`, `grocery`, `saas`, `automotive`, `specialty`

**Tier enum:** `top-luxury`, `luxury`, `premium`, `mid-range`, `value`, `wholesale`, `marketplace`

**Sub-sector enum** (grows via PRs to `taxonomy.json`): `office-supplies`, `ink-toner`, `furniture`, `tech-accessories`, `athletic-shoes`, `sneakers`, `sportswear`, `womens-handbags`, `womens-shoes`, `mens-clothing`, `safety-equipment`, `power-tools`, `hand-tools`, `building-materials`, `plumbing`, `electrical`, `appliances`, `supplements`, `pharmacy`, `personal-care`, `software-licenses`, `cloud-services`, `auto-parts`, `tires`

### Brand relationships

| Field | Type | Required | Notes |
|---|---|---|---|
| `carries_brands` | string[] | yes | Slugs of other brands this brand sells. Empty array = sells own products only. |

**How this works in practice:**

- `"carries_brands": []` → HQ brand (Nike, Apple). Sells its own products.
- `"carries_brands": ["nike", "adidas"]` → Retailer/vendor (Footlocker). Carries other brands.
- A brand can sell its own products AND carry other brands. Footlocker sells Footlocker-branded items implicitly, plus everything in `carries_brands`.

**Claiming is per-brand.** Nike claims "nike." Footlocker claims "footlocker." Footlocker listing Nike in `carries_brands` doesn't give Footlocker any claim over the Nike brand entry. Nike's owner controls Nike's metadata. Footlocker's owner controls Footlocker's metadata, including which brands they list as carrying.

### Search integrations

| Field | Type | Required | Notes |
|---|---|---|---|
| `search.mcp.available` | boolean | yes | Has an MCP server. |
| `search.mcp.url` | string | if available | MCP SSE endpoint. |
| `search.api.available` | boolean | yes | Has a REST/GraphQL product search API. |
| `search.api.endpoint` | string | if available | Base URL. |
| `search.api.auth_required` | boolean | if available | |
| `search.api.docs_url` | string | no | |
| `search.cli.available` | boolean | yes | Has a CLI tool. |
| `search.cli.install_command` | string | if available | e.g. `npm install -g @vendor/cli` |
| `search.site_search` | boolean | yes | Searchable via browser automation. |
| `search.product_feed` | boolean | no | Exposes catalog feed. |

### Capabilities

Array of enum strings.

**Enum:** `price_lookup`, `stock_check`, `bulk_pricing`, `tax_exemption`, `po_number`, `reorder`, `wishlist`, `cart_management`, `quote_request`, `scheduled_delivery`, `gift_wrapping`, `custom_engraving`, `subscription`, `auto_reorder`, `store_pickup`

### Buying

| Field | Type | Required | Notes |
|---|---|---|---|
| `ordering` | enum | yes | `guest`, `registered`, `approval_required` |
| `checkout_provider` | enum | yes | `stripe`, `adyen`, `shopify`, `worldpay`, `in-house`, `other` |
| `vendor_accepts` | string[] | yes | All payment methods the brand supports. |
| `creditclaw_supports` | string[] | yes | Which of those CreditClaw can currently automate. |
| `business_account_available` | boolean | no | |

**Payment methods enum:** `card`, `ACH`, `wire`, `invoice`, `apple_pay`, `google_pay`, `paypal`, `x402`, `crypto`, `klarna`, `affirm`

### Delivery

| Field | Type | Required | Notes |
|---|---|---|---|
| `options` | string[] | yes | `same-day`, `next-day`, `two-day`, `standard`, `freight`, `digital`, `store-pickup` |
| `free_shipping_threshold` | number | no | USD. `null` = none. `0` = always free. |
| `ships_internationally` | boolean | yes | |
| `supported_countries` | string[] | if not global | ISO 3166-1 alpha-2. |

### Deals

| Field | Type | Required | Notes |
|---|---|---|---|
| `has_deals` | boolean | yes | |
| `deals_url` | string | no | Direct link to deals page. |
| `deals_api` | string | no | API endpoint returning current promotions. |
| `loyalty_program` | string | no | Name of rewards program. |

### Ownership

| Field | Type | Required | Notes |
|---|---|---|---|
| `maturity` | enum | yes | `draft`, `community`, `official`, `verified` |
| `claimed_by` | string | no | UID of brand owner. |
| `submitted_by` | string | yes | Who created this. |
| `submitter_type` | enum | yes | `ai_generated`, `community`, `brand_verified` |

---

## Agent readiness score

Computed server-side, never self-reported. Recalculated on every metadata change.

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

---

## Database mapping: `brand_index` table

Every field an agent filters on becomes a flat, indexed column.

### Columns

| Column | Type | Index | Source |
|---|---|---|---|
| `id` | serial PK | — | auto |
| `slug` | text UNIQUE NOT NULL | btree | `slug` |
| `name` | text NOT NULL | — | `name` |
| `domain` | text | btree | `domain` |
| `url` | text NOT NULL | — | `url` |
| `logo_url` | text | — | `logo_url` |
| `description` | text | — | `description` |
| `sector` | text NOT NULL | btree | `taxonomy.sector` |
| `sub_sectors` | text[] DEFAULT '{}' | GIN | `taxonomy.sub_sectors` |
| `tier` | text | btree | `taxonomy.tier` |
| `tags` | text[] DEFAULT '{}' | GIN | `taxonomy.tags` |
| `carries_brands` | text[] DEFAULT '{}' | GIN | `carries_brands` |
| `has_mcp` | boolean DEFAULT false | partial (WHERE true) | `search.mcp.available` |
| `mcp_url` | text | — | `search.mcp.url` |
| `has_api` | boolean DEFAULT false | partial (WHERE true) | `search.api.available` |
| `api_endpoint` | text | — | `search.api.endpoint` |
| `has_cli` | boolean DEFAULT false | — | `search.cli.available` |
| `site_search` | boolean DEFAULT true | — | `search.site_search` |
| `capabilities` | text[] NOT NULL DEFAULT '{}' | GIN | `capabilities` |
| `ordering` | text | btree | `buying.ordering` |
| `checkout_provider` | text | — | `buying.checkout_provider` |
| `vendor_accepts` | text[] DEFAULT '{}' | GIN | `buying.vendor_accepts` |
| `creditclaw_supports` | text[] DEFAULT '{}' | GIN | `buying.creditclaw_supports` |
| `business_account` | boolean DEFAULT false | — | `buying.business_account_available` |
| `delivery_options` | text[] DEFAULT '{}' | — | `delivery.options` |
| `free_shipping_threshold` | numeric | btree | `delivery.free_shipping_threshold` |
| `ships_internationally` | boolean DEFAULT false | — | `delivery.ships_internationally` |
| `supported_countries` | text[] DEFAULT '{}' | GIN | `delivery.supported_countries` |
| `has_deals` | boolean DEFAULT false | partial (WHERE true) | `deals.has_deals` |
| `deals_url` | text | — | `deals.deals_url` |
| `loyalty_program` | text | — | `deals.loyalty_program` |
| `maturity` | text NOT NULL DEFAULT 'draft' | btree | `ownership.maturity` |
| `claimed_by` | text | btree (WHERE NOT NULL) | `ownership.claimed_by` |
| `submitted_by` | text | — | `ownership.submitted_by` |
| `submitter_type` | text | — | `ownership.submitter_type` |
| `agent_readiness` | integer | btree | computed |
| `version` | text NOT NULL DEFAULT '1.0.0' | — | `version` |
| `last_verified` | text | — | `last_verified` |
| `brand_data` | jsonb NOT NULL | — | full skill.json |
| `skill_md` | text | — | pre-rendered SKILL.md |
| `search_vector` | tsvector | GIN | generated |
| `created_at` | timestamp DEFAULT now() | — | auto |
| `updated_at` | timestamp DEFAULT now() | — | auto |

### Search vector composition

Built from weighted fields via trigger or generated column:

- **Weight A:** `name`
- **Weight B:** `tags`, `sub_sectors`, `carries_brands`
- **Weight C:** `sector`, `description`

### Key indexes

```sql
CREATE UNIQUE INDEX brand_index_slug_idx ON brand_index (slug);
CREATE INDEX brand_index_domain_idx ON brand_index (domain);
CREATE INDEX brand_index_sector_idx ON brand_index (sector);
CREATE INDEX brand_index_tier_idx ON brand_index (tier);
CREATE INDEX brand_index_maturity_idx ON brand_index (maturity);
CREATE INDEX brand_index_sub_sectors_gin ON brand_index USING gin (sub_sectors);
CREATE INDEX brand_index_tags_gin ON brand_index USING gin (tags);
CREATE INDEX brand_index_carries_brands_gin ON brand_index USING gin (carries_brands);
CREATE INDEX brand_index_capabilities_gin ON brand_index USING gin (capabilities);
CREATE INDEX brand_index_vendor_accepts_gin ON brand_index USING gin (vendor_accepts);
CREATE INDEX brand_index_creditclaw_supports_gin ON brand_index USING gin (creditclaw_supports);
CREATE INDEX brand_index_supported_countries_gin ON brand_index USING gin (supported_countries);
CREATE INDEX brand_index_search_idx ON brand_index USING gin (search_vector);
CREATE INDEX brand_index_has_mcp_idx ON brand_index (has_mcp) WHERE has_mcp = true;
CREATE INDEX brand_index_has_deals_idx ON brand_index (has_deals) WHERE has_deals = true;
CREATE INDEX brand_index_guest_idx ON brand_index (ordering) WHERE ordering = 'guest';
CREATE INDEX brand_index_readiness_idx ON brand_index (agent_readiness DESC);
CREATE INDEX brand_index_claimed_idx ON brand_index (claimed_by) WHERE claimed_by IS NOT NULL;
```

---

## Example agent queries

**"Nike shoes" — brand + retailer discovery**
```sql
-- 1. Direct brand match
SELECT slug, name, agent_readiness, maturity
FROM brand_index
WHERE slug = 'nike' OR search_vector @@ to_tsquery('nike');

-- 2. Retailers that carry this brand
SELECT slug, name, agent_readiness, has_deals, free_shipping_threshold
FROM brand_index
WHERE 'nike' = ANY(carries_brands)
ORDER BY agent_readiness DESC;
```
Returns: Nike (HQ brand) first, then Footlocker, Amazon, Dick's sorted by readiness.

**"Office supplies, guest checkout, free shipping under $50"**
```sql
SELECT slug, name, agent_readiness FROM brand_index
WHERE sector = 'office'
  AND ordering = 'guest'
  AND free_shipping_threshold <= 50
ORDER BY agent_readiness DESC;
```

**"Any brand with MCP that supports bulk pricing"**
```sql
SELECT slug, name, mcp_url FROM brand_index
WHERE has_mcp = true
  AND 'bulk_pricing' = ANY(capabilities);
```

**"Luxury fashion that ships to Germany and accepts x402"**
```sql
SELECT slug, name FROM brand_index
WHERE sector = 'fashion'
  AND tier IN ('luxury', 'top-luxury')
  AND 'DE' = ANY(supported_countries)
  AND 'x402' = ANY(creditclaw_supports);
```

**"Which brands does Footlocker carry?"**
```sql
SELECT carries_brands FROM brand_index WHERE slug = 'footlocker';
-- Then optionally hydrate: SELECT slug, name, tier FROM brand_index WHERE slug = ANY('{nike,adidas,...}');
```

---

## Controlled vocabulary management

`taxonomy.json` is the source of truth for all enum values. Versioned independently. New sectors, sub-sectors, tiers, capabilities, and payment methods are added via PR and validated at publish time.

`tags` is the only freeform field.

---

## Data flow

```
Existing TS registry files (14 brands)
         │
         ▼  seed migration (one-time)
   ┌──────────────┐
   │  brand_index  │ ◄── Published skill drafts (existing pipeline)
   │    (DB)       │ ◄── Brand claims (set maturity + claimed_by)
   └──────────────┘ ◄── AI-generated brand skills (maturity: draft)
         │
         ▼
   Search API  →  Agents
```

- **Seed:** Migration reads 14 registry files, denormalizes each into a `brand_index` row.
- **AI generation:** New brands get created as `maturity: draft`, `submitter_type: ai_generated`.
- **Community verification:** Someone confirms the metadata works → `maturity: community`.
- **Brand claim:** Owner proves domain ownership → `maturity: official`, `claimed_by` set.
- **CreditClaw audit:** Team reviews → `maturity: verified`.
- **Registry files stay** as dev reference and seed source but are no longer the runtime source of truth.

---

## What this schema does NOT cover

- **Checkout instructions** — those live in `SKILL.md`
- **Session behavior, tips, gotchas** — those live in `SKILL.md`
- **Brand claim verification flow** — platform feature, not metadata
- **Skill submission pipeline** — separate system, consumes this schema
- **Export to ClawHub / skills.sh** — separate pipeline, reads from `brand_index`
- **The Master Skill (PROCUREMENT.md)** — a separate meta-document that teaches agents how to query this index
