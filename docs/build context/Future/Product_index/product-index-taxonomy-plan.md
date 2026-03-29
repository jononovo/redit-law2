# CreditClaw Product Index — Taxonomy & Agent Discovery Plan

## Purpose

Define a standardized product categorization layer for CreditClaw's skill catalog that enables AI agents to find the right vendor for any product. This document covers: what standard we're adopting, how it maps to our existing data, and how we plan to build a cross-vendor product index.

### Related Documents

| Document | What It Covers |
|---|---|
| `product-index-taxonomy-plan.md` | This document — Google Product Taxonomy adoption, UCP category model, product index schema |
| `agent-readiness-and-product-index-service.md` | Three service tiers, agent gateway, API analysis, implementation roadmap |
| `shopy-sh-commerce-skill-standard.md` | The shopy.sh open standard — commerce SKILL.md format, frontmatter schema, catalog, CLI |

---

## The Problem

Today, each vendor in CreditClaw's catalog carries freeform `subSectors` strings (e.g. `"fasteners"`, `"ink & toner"`, `"general merchandise"`). These are:

- **Inconsistent** — `"office supplies"` appears on Staples but `"business supplies"` on Amazon Business.
- **Non-hierarchical** — no parent/child relationship; can't browse from broad to narrow.
- **Not interoperable** — an agent can't compare categories across vendors because the labels don't match.

---

## Standards Landscape (Research Summary)

| Standard | Owner | Categories | Depth | Best For |
|---|---|---|---|---|
| **Google Product Taxonomy (GPT)** | Google | ~5,600 | 5–7 levels | Retail/ecommerce product classification |
| **UNSPSC** | United Nations | ~157,000 | 4 levels (Segment → Family → Class → Commodity) | Enterprise procurement, B2B spend analysis |
| **GS1 GPC** | GS1 | ~40,000 | 4 levels (Segment → Family → Class → Brick) | Supply chain, retail scanning |
| **Shopify Product Types** | Shopify | Unlimited | Freeform | Merchant-defined, no standard |
| **NAICS** | US Census Bureau | ~1,000 | 6-digit | Industry classification (not product-level) |

### Why Google Product Taxonomy

1. **Agent-optimized granularity.** ~5,600 categories is large enough to be precise but small enough for an LLM to reason over. UNSPSC's 157K codes are designed for ERP systems, not agent decision-making.
2. **Retail + B2B coverage.** GPT has a full `Business & Industrial` root with sub-categories for construction, industrial manufacturing, food service, agriculture, etc. — covering our B2B vendors (Grainger, McMaster-Carr, Uline).
3. **Stable numeric IDs.** Each category gets a permanent integer ID (e.g., `222` = Electronics). Text paths can change across locales; IDs don't.
4. **Industry adoption.** Google Shopping, Facebook Ads, Criteo, and most feed management tools already use GPT. Vendors who integrate with Google Merchant Center already have these mappings.
5. **Free and public.** The full taxonomy is a downloadable text file — no license fees, no account required.

### What GPT Doesn't Cover

- **Services** (SaaS, consulting, logistics) — GPT is product-only. For our `saas` sector, we'll need a small custom extension.
- **Marketplace platforms** (Shopify as a vendor) — GPT classifies products, not sales channels. These get tagged but not categorized.

---

## Google Product Taxonomy Structure

**Source:** `https://www.google.com/basepages/producttype/taxonomy-with-ids.en-US.txt`

**Format:** Each line is `{numericId} - {Level1} > {Level2} > ... > {LevelN}`

**21 Root Categories:**

| ID | Root Category | Relevant CreditClaw Sectors |
|---|---|---|
| 1 | Animals & Pet Supplies | pets |
| 166 | Apparel & Accessories | fashion |
| 8 | Arts & Entertainment | entertainment |
| 537 | Baby & Toddler | retail |
| 111 | Business & Industrial | industrial, construction |
| 141 | Cameras & Optics | electronics |
| 222 | Electronics | electronics |
| 412 | Food, Beverages & Tobacco | food |
| 436 | Furniture | home |
| 632 | Hardware | construction, home |
| 469 | Health & Beauty | health, beauty |
| 536 | Home & Garden | home, garden |
| 5181 | Luggage & Bags | fashion, travel |
| 772 | Mature | — |
| 783 | Media | entertainment |
| 922 | Office Supplies | office |
| 5605 | Religious & Ceremonial | specialty |
| 2092 | Software | saas |
| 988 | Sporting Goods | sports |
| 1239 | Toys & Games | retail |
| 888 | Vehicles & Parts | automotive |

**Example hierarchy for Electronics:**

```
222   Electronics
 └─ 223   Audio
      └─ 242   Audio Players & Recorders
           └─ 233   MP3 Players
 └─ 262   Communications
 └─ 278   Computers
      └─ 331   Computer Components
           └─ 285   I/O Cards & Adapters
 └─ 3702  Circuit Boards & Components
```

**Depth:** Most product-level categories sit at levels 3–5. The maximum depth is 7.

---

## Current CreditClaw Categorization (What We Have Today)

### Sectors (21 defined in `lib/procurement-skills/taxonomy/sectors.ts`)

```
retail, office, fashion, health, beauty, saas, home, construction,
automotive, electronics, food, sports, industrial, specialty, luxury,
travel, entertainment, education, pets, garden
```

### Sub-Sectors (freeform strings on `brand_index.sub_sectors[]`)

Each vendor defines its own sub-sector list. Current examples:

| Vendor | Sector | Current Sub-Sectors |
|---|---|---|
| Amazon | retail | general merchandise, electronics, home goods, books, grocery |
| Walmart | retail | general merchandise, grocery, home goods, electronics |
| Grainger | industrial | mro, safety, electrical, plumbing, hvac, hand tools, power tools |
| McMaster-Carr | industrial | fasteners, raw materials, pneumatics, hydraulics, bearings, hardware |
| B&H Photo | electronics | cameras, audio, lighting, pro video, computers, drones |
| Staples | office | office supplies, ink & toner, furniture, technology |
| Home Depot | construction | building materials, tools, appliances, plumbing, electrical, paint |
| Uline | industrial | packaging, shipping supplies, janitorial, warehouse equipment, safety |

### Database Schema (on `brand_index` table)

```sql
sector        TEXT NOT NULL        -- single primary sector slug
sub_sectors   TEXT[] DEFAULT '{}'  -- freeform sub-sector strings
tier          TEXT                 -- value/mid-range/premium/luxury/wholesale/marketplace
tags          TEXT[] DEFAULT '{}'  -- freeform searchable keywords
```

---

## Proposed: CreditClaw Universal Category Protocol (UCP)

Since no open standard exists for AI-agent product discovery across vendors, we define our own — built on top of Google Product Taxonomy as the canonical reference.

### Design Goals

1. **Agent-queryable.** An agent should be able to say "I need office supplies → ink & toner → laser toner cartridges" and get back the matching vendors with skill files.
2. **Standards-backed.** Every category maps to a Google Product Taxonomy ID, so vendor feeds and external systems can interoperate.
3. **Cross-vendor.** The same category tree applies to all vendors — an agent searching "power tools" sees Home Depot, Lowe's, Grainger, and McMaster-Carr.
4. **Extensible.** We can add custom categories for domains GPT doesn't cover (SaaS, services) without breaking the core tree.

### Three-Layer Model

```
Layer 1: CreditClaw Sector     (our 21 sectors — stable, URL-friendly slugs)
Layer 2: UCP Category           (maps to GPT Level 2–3 categories with numeric IDs)
Layer 3: UCP Sub-Category       (maps to GPT Level 3–5 categories — product-level)
```

**Example traversal:**

```
Sector:         electronics
UCP Category:   Cameras & Optics  (GPT ID: 141)
Sub-Category:   Digital Cameras > DSLR Cameras  (GPT ID: 152)
  → Vendors:    B&H Photo, Amazon
```

### Schema Changes (Future)

```sql
-- New table: master category tree derived from GPT
CREATE TABLE ucp_categories (
  id            SERIAL PRIMARY KEY,
  gpt_id        INTEGER UNIQUE,           -- Google Product Taxonomy numeric ID
  name          TEXT NOT NULL,             -- e.g. "Digital Cameras"
  slug          TEXT NOT NULL UNIQUE,      -- e.g. "digital-cameras"
  parent_id     INTEGER REFERENCES ucp_categories(id),
  depth         INTEGER NOT NULL,          -- 0 = root, 1 = L2, etc.
  sector_slug   TEXT,                      -- maps to our sector system
  path          TEXT NOT NULL              -- "Electronics > Cameras & Optics > Digital Cameras"
);

-- Junction table: which brands carry which categories
CREATE TABLE brand_categories (
  brand_id      INTEGER NOT NULL REFERENCES brand_index(id),
  category_id   INTEGER NOT NULL REFERENCES ucp_categories(id),
  is_primary    BOOLEAN DEFAULT false,     -- brand's main category
  PRIMARY KEY (brand_id, category_id)
);
```

### How It Replaces `sub_sectors`

| Before (freeform) | After (UCP mapped) |
|---|---|
| `sub_sectors: ["cameras", "audio", "lighting"]` | `brand_categories` rows pointing to GPT IDs `141` (Cameras & Optics), `223` (Audio), `2636` (Lighting) |
| `sub_sectors: ["office supplies", "ink & toner"]` | `brand_categories` rows pointing to GPT IDs `922` (Office Supplies), `499991` (Ink & Toner) |

The `sub_sectors` column stays as a fallback/searchable cache but the canonical source of truth becomes the `brand_categories` junction table.

---

## Product Index: Cross-Vendor Product Discovery

Beyond categorizing vendors, the longer-term vision is a **product-level index** — enabling agents to search for specific products across all vendors.

### Concept

```
Agent query: "Find me a Brother TN-760 toner cartridge"

Product Index response:
  - Staples:       $74.99, in stock, free next-day delivery
  - Office Depot:  $72.49, in stock, $5.99 shipping
  - Amazon:        $69.99, in stock, Prime 2-day
  - Walmart:       $71.00, in stock, free shipping over $35
```

### Data Model (Conceptual)

```sql
CREATE TABLE product_index (
  id              SERIAL PRIMARY KEY,
  upc             TEXT,                    -- Universal Product Code (if physical)
  gtin            TEXT,                    -- Global Trade Item Number
  mpn             TEXT,                    -- Manufacturer Part Number
  name            TEXT NOT NULL,
  brand           TEXT,                    -- product brand (e.g. "Brother")
  category_id     INTEGER REFERENCES ucp_categories(id),
  image_url       TEXT,
  created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE product_listings (
  id              SERIAL PRIMARY KEY,
  product_id      INTEGER REFERENCES product_index(id),
  vendor_brand_id INTEGER REFERENCES brand_index(id), -- which vendor sells it
  vendor_sku      TEXT,                    -- vendor's internal SKU
  vendor_url      TEXT,                    -- direct link to product page
  price_cents     INTEGER,                -- last known price
  currency        TEXT DEFAULT 'USD',
  in_stock        BOOLEAN,
  last_checked    TIMESTAMP,
  metadata        JSONB                   -- shipping, delivery estimates, etc.
);
```

### Data Sources

1. **Vendor feeds** — Many vendors publish product data feeds (Google Shopping format, CSV, API). We can ingest these.
2. **Agent reports** — When an agent completes a purchase through CreditClaw, it can report back: product name, SKU, price, vendor. This builds the index organically.
3. **Skill files** — Our procurement skill YAML files already contain product search instructions per vendor. The skill execution layer can feed results back.

### Why Not Wait for Google/Shopify

- Google's Merchant Center API exists but is **not an open product search API** — it's for merchants to manage their own feeds.
- Shopify has a product taxonomy but it's **store-specific**, not cross-vendor.
- Neither provides a **unified cross-vendor product comparison** layer, which is what agents need.
- By building on GPT IDs, we stay compatible. If Google ever launches an open product discovery API, our UCP categories will map directly.

---

## Implementation Phases

### Phase 1: GPT Category Import (Low Effort)
- Parse the GPT taxonomy text file into `ucp_categories` table.
- ~5,600 rows. One-time seed script.
- Build admin UI or script to browse the tree.

### Phase 2: Vendor → Category Mapping (Medium Effort)
- Map each of our ~14 vendors to their relevant GPT categories via `brand_categories`.
- Replace freeform `sub_sectors` with structured references.
- Update catalog pages to show categories from the tree.

### Phase 3: Category-Based Navigation (Medium Effort)
- Sub-sector pages (`/c/[sector]/[subSector]`) read from `ucp_categories` instead of freeform strings.
- Category breadcrumbs on brand detail pages.
- "Browse by category" UI in the skill catalog.

### Phase 4: Product Index MVP (High Effort)
- Create `product_index` and `product_listings` tables.
- Seed with data from vendor feeds (start with 1–2 vendors).
- Agent API: `GET /api/v1/products/search?q=...&category=...`

### Phase 5: Agent-Driven Index Growth
- After each successful purchase, the agent reports product details back.
- Price tracking over time.
- Stock availability monitoring.

---

## Open Questions

1. **Custom categories for SaaS/Services.** GPT's `Software` category (ID 2092) is thin. Do we create a CreditClaw extension tree for SaaS sub-categories, or handle it purely through tags?
2. **Tier vs. Category.** Our `tier` field (value/premium/luxury) is orthogonal to category. Keep it separate or encode it somehow in the UCP tree?
3. **Localization.** GPT is available in 12 languages. Do we store localized category names, or just use English with the numeric ID as the key?
4. **Feed ingestion cadence.** How often do we refresh vendor product feeds? Daily? Weekly? Real-time for some vendors?
