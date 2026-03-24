# Brand Index — Implementation Plan v3

## What this is

A single `brand_index` database table that replaces the in-memory TypeScript vendor registry. It is denormalized for agent search, self-service ready for brand claims, and relationship-aware (brands can list other brands they carry).

Everything is a brand. Nike is a brand. Footlocker is a brand. The difference is whether `carries_brands` is populated. No type flag needed.

---

## Phase 1: Schema + migration

### Table: `brand_index`

```sql
CREATE TABLE brand_index (
  -- Identity
  id                    serial PRIMARY KEY,
  slug                  text UNIQUE NOT NULL,
  name                  text NOT NULL,
  domain                text,
  url                   text NOT NULL,
  logo_url              text,
  description           text NOT NULL,  -- max 200 chars, used in search vector at weight A

  -- Taxonomy (flat, individually indexed)
  sector                text NOT NULL,
  sub_sectors           text[] NOT NULL DEFAULT '{}',
  tier                  text,
  tags                  text[] DEFAULT '{}',

  -- Brand relationships
  carries_brands        text[] DEFAULT '{}',  -- slugs of brands this brand sells. Empty = HQ brand.

  -- Search integrations (booleans for filtering, URLs for retrieval)
  has_mcp               boolean NOT NULL DEFAULT false,
  mcp_url               text,
  has_api               boolean NOT NULL DEFAULT false,
  api_endpoint          text,
  api_auth_required     boolean DEFAULT false,
  api_docs_url          text,
  has_cli               boolean NOT NULL DEFAULT false,
  cli_install_command   text,
  site_search           boolean NOT NULL DEFAULT true,
  product_feed          boolean NOT NULL DEFAULT false,

  -- Capabilities (GIN indexed)
  capabilities          text[] NOT NULL DEFAULT '{}',

  -- Checkout methods — HOW CreditClaw executes the purchase
  checkout_methods      text[] NOT NULL DEFAULT '{}',  -- native_api, browser_automation, x402_protocol, acp, self_hosted_card

  -- Buying config
  ordering              text,            -- guest, registered, approval_required
  checkout_provider     text,            -- stripe, adyen, shopify, worldpay, in-house, other
  vendor_accepts        text[] DEFAULT '{}',       -- all payment methods the brand supports
  creditclaw_supports   text[] DEFAULT '{}',       -- which of those CreditClaw can automate TODAY
  business_account      boolean DEFAULT false,
  tax_exempt_supported  boolean DEFAULT false,
  po_number_supported   boolean DEFAULT false,

  -- Delivery
  delivery_options      text[] DEFAULT '{}',       -- same-day, next-day, two-day, standard, freight, digital, store-pickup
  free_shipping_threshold numeric,                 -- USD. null = none. 0 = always free.
  ships_internationally boolean DEFAULT false,
  supported_countries   text[] DEFAULT '{}',       -- ISO 3166-1 alpha-2

  -- Deals
  has_deals             boolean DEFAULT false,
  deals_url             text,
  deals_api             text,
  loyalty_program       text,

  -- Ownership
  maturity              text NOT NULL DEFAULT 'draft',  -- draft, community, official, verified
  claimed_by            text,                           -- owner UID
  claim_id              integer,                        -- FK to brand_claims table
  submitted_by          text NOT NULL,
  submitter_type        text NOT NULL DEFAULT 'ai_generated',  -- ai_generated, community, brand_verified

  -- Version tracking
  version               text NOT NULL DEFAULT '1.0.0',
  last_verified         text,
  active_version_id     integer,         -- FK to skill_versions table

  -- Computed
  agent_readiness       integer DEFAULT 0,  -- 0-100, recomputed on every write

  -- Full data (retrieval only, never filtered)
  brand_data            jsonb NOT NULL,   -- complete skill.json object
  skill_md              text,             -- pre-rendered SKILL.md markdown

  -- Search
  search_vector         tsvector,         -- generated from name, description, tags, sub_sectors, carries_brands, sector

  -- Timestamps
  created_at            timestamp NOT NULL DEFAULT now(),
  updated_at            timestamp NOT NULL DEFAULT now()
);
```

### Indexes

```sql
-- Primary lookups
CREATE UNIQUE INDEX brand_index_slug_idx ON brand_index (slug);
CREATE INDEX brand_index_domain_idx ON brand_index (domain);

-- Taxonomy
CREATE INDEX brand_index_sector_idx ON brand_index (sector);
CREATE INDEX brand_index_tier_idx ON brand_index (tier);
CREATE INDEX brand_index_sub_sectors_gin ON brand_index USING gin (sub_sectors);
CREATE INDEX brand_index_tags_gin ON brand_index USING gin (tags);

-- Brand relationships
CREATE INDEX brand_index_carries_brands_gin ON brand_index USING gin (carries_brands);

-- Capabilities and checkout
CREATE INDEX brand_index_capabilities_gin ON brand_index USING gin (capabilities);
CREATE INDEX brand_index_checkout_methods_gin ON brand_index USING gin (checkout_methods);
CREATE INDEX brand_index_vendor_accepts_gin ON brand_index USING gin (vendor_accepts);
CREATE INDEX brand_index_creditclaw_supports_gin ON brand_index USING gin (creditclaw_supports);

-- Delivery
CREATE INDEX brand_index_supported_countries_gin ON brand_index USING gin (supported_countries);

-- Boolean filters (partial indexes — only index the true rows)
CREATE INDEX brand_index_has_mcp_idx ON brand_index (has_mcp) WHERE has_mcp = true;
CREATE INDEX brand_index_has_api_idx ON brand_index (has_api) WHERE has_api = true;
CREATE INDEX brand_index_has_deals_idx ON brand_index (has_deals) WHERE has_deals = true;
CREATE INDEX brand_index_guest_idx ON brand_index (ordering) WHERE ordering = 'guest';
CREATE INDEX brand_index_tax_exempt_idx ON brand_index (tax_exempt_supported) WHERE tax_exempt_supported = true;
CREATE INDEX brand_index_po_number_idx ON brand_index (po_number_supported) WHERE po_number_supported = true;

-- Scoring and ownership
CREATE INDEX brand_index_readiness_idx ON brand_index (agent_readiness DESC);
CREATE INDEX brand_index_maturity_idx ON brand_index (maturity);
CREATE INDEX brand_index_claimed_idx ON brand_index (claimed_by) WHERE claimed_by IS NOT NULL;

-- Full-text search
CREATE INDEX brand_index_search_idx ON brand_index USING gin (search_vector);
```

### Search vector trigger

```sql
CREATE OR REPLACE FUNCTION brand_index_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.description, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(array_to_string(NEW.tags, ' '), '')), 'B') ||
    setweight(to_tsvector('english', coalesce(array_to_string(NEW.sub_sectors, ' '), '')), 'B') ||
    setweight(to_tsvector('english', coalesce(array_to_string(NEW.carries_brands, ' '), '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.sector, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER brand_index_search_vector_trigger
  BEFORE INSERT OR UPDATE ON brand_index
  FOR EACH ROW EXECUTE FUNCTION brand_index_search_vector_update();
```

### Agent readiness score formula

Computed on every INSERT or UPDATE via trigger or application code.

```
score = 0
if has_mcp:                         +25
if has_api:                         +20
if ordering = 'guest':              +15
if 'x402' in creditclaw_supports:   +15
if 'cart_management' in capabilities: +10
if deals_api is not null:            +5
if product_feed:                     +5
if maturity = 'verified':            +5
```

Max possible: 100.

### Seed migration: mapping the 14 existing vendors

Each `VendorSkill` TypeScript object maps to a `brand_index` row. The tricky transforms:

| Existing field | New column(s) | Transform |
|---|---|---|
| `paymentMethods` (single array) | `vendor_accepts` + `creditclaw_supports` | Split manually per vendor. `vendor_accepts` = everything the vendor takes. `creditclaw_supports` = only what CreditClaw can automate today (likely `card` and `x402` only for most). |
| `checkoutMethods` | `checkout_methods` | Direct mapping. Values: `native_api`, `browser_automation`, `x402_protocol`, `acp`, `self_hosted_card`. |
| No description exists | `description` | Write a one-sentence description for each of the 14 vendors. Max 200 chars. |
| No carries_brands exists | `carries_brands` | Populate per vendor. All 14 are retailers. Amazon = broad list. Staples = office brands. Home Depot = tool/material brands. Start with 5-10 top brands per retailer, expand later. |
| `category` (6 values) | `sector` + `sub_sectors` + `tier` | Map each vendor's flat category to the richer taxonomy. e.g. category "office" → sector "office", sub_sectors ["office-supplies", "ink-toner", "furniture"], tier "mid-range". |
| `search` object | `has_mcp`, `has_api`, `mcp_url`, `api_endpoint`, etc. | Extract from existing search config. Most will be `has_api: false`, `has_mcp: false`, `site_search: true`. |
| Full `VendorSkill` object | `brand_data` | Store the complete object as JSONB. |
| Generated markdown | `skill_md` | Call the existing `generateVendorSkill()` function once during seed to populate. |

The seed migration script reads all files from `lib/procurement-skills/vendors/*.ts`, applies these transforms, and inserts 14 rows.

---

## Phase 2: Storage layer + API switchover

### Storage: `server/storage/brand-index.ts`

Core methods:

```typescript
// Search with filters — returns flat indexed columns only
searchBrands(filters: BrandSearchFilters): Promise<BrandSearchResult[]>

// Get single brand by slug — returns brand_data JSONB + skill_md
getBrandBySlug(slug: string): Promise<BrandDetail | null>

// Find retailers carrying a specific brand
getRetailersForBrand(brandSlug: string): Promise<BrandSearchResult[]>

// Upsert from published skill draft or brand claim
upsertBrandIndex(data: BrandIndexUpsert): Promise<void>

// Recompute agent_readiness for a single row
recomputeReadiness(slug: string): Promise<void>
```

`BrandSearchFilters` mirrors the WHERE-clause columns:
```typescript
interface BrandSearchFilters {
  query?: string;              // full-text search against search_vector
  sector?: string;
  sub_sectors?: string[];      // ANY containment
  tier?: string;
  carries_brand?: string;      // find retailers carrying this brand slug
  capabilities?: string[];     // ANY containment
  checkout_methods?: string[]; // ANY containment
  ordering?: string;
  creditclaw_supports?: string[];
  has_mcp?: boolean;
  has_api?: boolean;
  has_deals?: boolean;
  tax_exempt_supported?: boolean;
  po_number_supported?: boolean;
  ships_to?: string;           // country code, checked against supported_countries
  free_shipping_max?: number;  // free_shipping_threshold <= this value
  maturity?: string;
  limit?: number;              // default 20
  offset?: number;
}
```

### API switchover

**`/api/v1/bot/skills` (search endpoint)**

Before:
```typescript
let vendors = VENDOR_REGISTRY;  // load all into memory
vendors = vendors.filter(v => v.category === category);  // JS chain
```

After:
```typescript
const results = await searchBrands(filtersFromQueryParams(req));
```

Response format stays identical. Agents don't need to change anything.

**`/api/v1/bot/skills/[vendor]` (single brand endpoint)**

Before:
```typescript
const skill = generateVendorSkill(vendorData);  // runtime markdown generation
```

After:
```typescript
const brand = await getBrandBySlug(params.vendor);
return brand.skill_md;  // pre-generated, single column read
```

### Post-publish hook

When a skill draft is published through the existing pipeline (`app/api/v1/skills/drafts/[id]/publish/route.ts`), add a post-publish step:

```typescript
// After createSkillVersion()
await upsertBrandIndex({
  slug: vendorData.slug,
  // ... denormalize all flat columns from vendorData
  brand_data: vendorData,                          // full object as JSONB
  skill_md: generateVendorSkill(vendorData),       // regenerate markdown
  active_version_id: newVersion.id,                // FK to skill_versions
  // agent_readiness is recomputed inside upsertBrandIndex()
  // search_vector is rebuilt by the DB trigger
});
```

This ensures every publish flows through to the brand_index automatically.

---

## Phase 3: Brand claims

### Table: `brand_claims`

```sql
CREATE TABLE brand_claims (
  id            serial PRIMARY KEY,
  brand_slug    text NOT NULL REFERENCES brand_index(slug),
  claimer_uid   text NOT NULL,
  claimer_email text NOT NULL,
  status        text NOT NULL DEFAULT 'pending',  -- pending, verified, revoked
  verified_at   timestamp,
  revoked_at    timestamp,
  created_at    timestamp NOT NULL DEFAULT now()
);
```

### Claim flow

1. User submits claim for a brand slug with their corporate email.
2. System checks: does the email domain match or is a subdomain of `brand_index.domain`? Also checks reverse: if brand domain is `shop.staples.com` and email is `@staples.com`, that matches too.
3. Free email providers (gmail.com, yahoo.com, hotmail.com, outlook.com, etc.) are blocked — maintain a blocklist.
4. If domain matches → auto-verify. If not → manual review queue.
5. On verification:
   - `brand_claims.status` → `'verified'`
   - `brand_index.claimed_by` → claimer UID
   - `brand_index.claim_id` → this claim's ID
   - `brand_index.maturity` → `'official'`
   - `brand_index.submitter_type` → `'brand_verified'`

### Revocation

If a claim is revoked:
- `brand_claims.status` → `'revoked'`
- `brand_index.claimed_by` → `null`
- `brand_index.claim_id` → `null`
- `brand_index.maturity` → reverts to `'community'` (not `'draft'` — the data is still valid, just unowned)

---

## Phase 4: Master skill + UI

### Master skill (PROCUREMENT.md)

A meta-document stored as a special row in `brand_index` (slug: `_creditclaw_index`) and served at a dedicated endpoint. Teaches agents:

- Available search parameters and how to combine them
- How to interpret maturity levels
- How brand relationships work (searching for "Nike" returns Nike HQ + all retailers carrying Nike)
- Example queries for common scenarios
- How to read the skill markdown once a brand is selected

### UI updates

- Claim button on brand detail pages (`/skills/[brand]`)
- "Official" maturity badge in catalog and detail views (add to `MATURITY_CONFIG` in both `app/skills/page.tsx` and `app/skills/[vendor]/page.tsx`)
- Brand claim review queue for non-auto-verified claims

---

## Controlled vocabularies

All enum values live in `taxonomy.json`, versioned independently. Validated at publish time. Adding new values requires a PR.

**Sector:** `office`, `fashion`, `electronics`, `home`, `health`, `construction`, `industrial`, `grocery`, `saas`, `automotive`, `specialty`

**Tier:** `top-luxury`, `luxury`, `premium`, `mid-range`, `value`, `wholesale`, `marketplace`

**Sub-sectors** (partial, grows over time): `office-supplies`, `ink-toner`, `furniture`, `tech-accessories`, `athletic-shoes`, `sneakers`, `sportswear`, `womens-handbags`, `womens-shoes`, `mens-clothing`, `safety-equipment`, `power-tools`, `hand-tools`, `building-materials`, `plumbing`, `electrical`, `appliances`, `supplements`, `pharmacy`, `personal-care`, `software-licenses`, `cloud-services`, `auto-parts`, `tires`

**Capabilities:** `price_lookup`, `stock_check`, `bulk_pricing`, `tax_exemption`, `po_number`, `reorder`, `wishlist`, `cart_management`, `quote_request`, `scheduled_delivery`, `gift_wrapping`, `custom_engraving`, `subscription`, `auto_reorder`, `store_pickup`

**Checkout methods:** `native_api`, `browser_automation`, `x402_protocol`, `acp`, `self_hosted_card`, `crossmint_world`

**Payment methods:** `card`, `ACH`, `wire`, `invoice`, `apple_pay`, `google_pay`, `paypal`, `x402`, `crypto`, `klarna`, `affirm`

**Ordering:** `guest`, `registered`, `approval_required`

**Checkout providers:** `stripe`, `adyen`, `shopify`, `worldpay`, `in-house`, `other`

**Delivery options:** `same-day`, `next-day`, `two-day`, `standard`, `freight`, `digital`, `store-pickup`

**Maturity:** `draft`, `community`, `official`, `verified`

**Submitter type:** `ai_generated`, `community`, `brand_verified`

`tags` is the only freeform field. Max 10 values per brand.

---

## Example `skill.json` — retailer (Footlocker)

```jsonc
{
  "slug": "footlocker",
  "name": "Foot Locker",
  "domain": "footlocker.com",
  "url": "https://www.footlocker.com",
  "logo_url": "https://creditclaw.com/logos/footlocker.svg",
  "description": "Athletic shoes and apparel from top brands.",
  "version": "1.0.0",
  "last_verified": "2026-03-20",

  "taxonomy": {
    "sector": "fashion",
    "sub_sectors": ["athletic-shoes", "sportswear", "sneakers"],
    "tier": "mid-range",
    "tags": ["sneakers", "basketball", "running", "streetwear"]
  },

  "carries_brands": ["nike", "adidas", "new-balance", "puma", "reebok", "jordan"],

  "search": {
    "mcp": { "available": false },
    "api": {
      "available": true,
      "endpoint": "https://api.footlocker.com/v1/products/search",
      "auth_required": true,
      "docs_url": "https://developer.footlocker.com"
    },
    "cli": { "available": false },
    "site_search": true,
    "product_feed": false
  },

  "capabilities": ["price_lookup", "stock_check", "wishlist", "store_pickup"],
  "checkout_methods": ["browser_automation"],

  "buying": {
    "ordering": "guest",
    "checkout_provider": "adyen",
    "vendor_accepts": ["card", "paypal", "apple_pay", "google_pay", "klarna"],
    "creditclaw_supports": ["card"]
  },

  "delivery": {
    "options": ["standard", "two-day", "store-pickup"],
    "free_shipping_threshold": 50.00,
    "ships_internationally": true,
    "supported_countries": ["US", "CA", "GB", "DE", "FR", "NL"]
  },

  "deals": {
    "has_deals": true,
    "deals_url": "https://www.footlocker.com/sale",
    "deals_api": null,
    "loyalty_program": "FLX Rewards"
  },

  "ownership": {
    "maturity": "community",
    "claimed_by": null,
    "submitted_by": "creditclaw-ai",
    "submitter_type": "ai_generated"
  }
}
```

## Example `skill.json` — HQ brand (Nike)

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

  "capabilities": ["price_lookup", "stock_check", "cart_management", "custom_engraving", "wishlist"],
  "checkout_methods": ["browser_automation", "native_api"],

  "buying": {
    "ordering": "registered",
    "checkout_provider": "in-house",
    "vendor_accepts": ["card", "paypal", "apple_pay", "google_pay", "klarna", "affirm"],
    "creditclaw_supports": ["card"]
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

---

## Example agent queries

**"Nike shoes" — brand + retailer discovery**
```sql
-- 1. Direct brand match
SELECT slug, name, agent_readiness, maturity
FROM brand_index
WHERE slug = 'nike' OR search_vector @@ to_tsquery('nike');

-- 2. Retailers that carry Nike
SELECT slug, name, agent_readiness, has_deals, free_shipping_threshold
FROM brand_index
WHERE 'nike' = ANY(carries_brands)
ORDER BY agent_readiness DESC;
```

**"Office supplies, guest checkout, free shipping under $50"**
```sql
SELECT slug, name, agent_readiness FROM brand_index
WHERE sector = 'office'
  AND ordering = 'guest'
  AND free_shipping_threshold <= 50
ORDER BY agent_readiness DESC;
```

**"Brands with MCP that support bulk pricing"**
```sql
SELECT slug, name, mcp_url FROM brand_index
WHERE has_mcp = true
  AND 'bulk_pricing' = ANY(capabilities);
```

**"Luxury fashion, ships to Germany, accepts x402"**
```sql
SELECT slug, name FROM brand_index
WHERE sector = 'fashion'
  AND tier IN ('luxury', 'top-luxury')
  AND 'DE' = ANY(supported_countries)
  AND 'x402' = ANY(creditclaw_supports);
```

**"B2B suppliers with tax exemption and PO support"**
```sql
SELECT slug, name, agent_readiness FROM brand_index
WHERE tax_exempt_supported = true
  AND po_number_supported = true
ORDER BY agent_readiness DESC;
```

**"Which brands does Footlocker carry?"**
```sql
SELECT carries_brands FROM brand_index WHERE slug = 'footlocker';
```

**"Brands I can checkout via x402 protocol"**
```sql
SELECT slug, name FROM brand_index
WHERE 'x402_protocol' = ANY(checkout_methods);
```
