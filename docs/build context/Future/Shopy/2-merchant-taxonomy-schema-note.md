# Merchant Metadata — Taxonomy Schema Decision

**Date:** March 31, 2026
**Status:** Agreed direction — ready for implementation
**Context:** Discussion about how to categorize 10,000+ merchants in CreditClaw's vendor/brand index so AI agents can find the right merchant for any shopping intent.

---

## Decision: Google Product Taxonomy, 3 Levels Deep for Merchants

We are adopting **Google Product Taxonomy (GPT)** as the canonical category standard for CreditClaw's merchant index. This was chosen over UNSPSC (too granular at 157K codes), GS1 GPC, Shopify's freeform product types, and NAICS (industry-level, not product-level).

Google's taxonomy has ~5,600 categories with stable numeric IDs, is free/public, and is already the standard used by Google Merchant Center, Shopify Catalog, Facebook/Meta product feeds, and most feed management tools. Every major commerce platform already speaks this language.

**For merchants:** We map categories **3 levels deep** maximum. This tells an agent "this merchant sells laptops" without needing to go to the specific product SKU level.

**For products (future):** If we build a product-level index, we go to level 4+ and attach categories to individual products. This is noted as a future expansion, not current scope.

---

## Three-Layer Category Model

```
Layer 1: CreditClaw Sector        (our 21 sectors — stable, owned by us)
Layer 2: Google Taxonomy Level 2   (mapped via ucp_categories table)
Layer 3: Google Taxonomy Level 3   (mapped via ucp_categories table)
```

### Layer 1: CreditClaw Sectors (21)

These are our own high-level pillars. They exist for fast agent routing — an agent looking for fashion skips industrial merchants entirely. Defined in `lib/procurement-skills/taxonomy/sectors.ts`:

```
retail, office, fashion, health, beauty, saas, home, construction,
automotive, electronics, food, sports, industrial, specialty, luxury,
travel, entertainment, education, pets, garden
```

A merchant can belong to **multiple sectors** (Amazon spans retail, electronics, food, etc.).

### Layers 2-3: Google Product Taxonomy

Each merchant gets tagged with the Google taxonomy categories representing the types of products they sell. We store the full taxonomy tree in the `ucp_categories` database table, populated by parsing Google's public taxonomy file.

**Example — Home Depot:**

```
Sectors: [construction, home]
Google Taxonomy mappings:
  - Hardware > Power Tools              (GPT ID: 1167)
  - Hardware > Hand Tools               (GPT ID: 115)
  - Hardware > Building Materials        (GPT ID: 123)
  - Home & Garden > Bathroom Accessories (GPT ID: 689)
  - Home & Garden > Lawn & Garden > Outdoor Power Equipment (GPT ID: 2918)
```

**Example — Gucci:**

```
Sectors: [fashion, luxury]
Google Taxonomy mappings:
  - Apparel & Accessories > Clothing    (GPT ID: 1604)
  - Apparel & Accessories > Shoes       (GPT ID: 187)
  - Apparel & Accessories > Jewelry     (GPT ID: 188)
```

---

## Database Schema

This aligns with what's already planned in `product-index-taxonomy-plan.md`.

### `ucp_categories` table — the full Google taxonomy tree

```sql
CREATE TABLE ucp_categories (
  id            SERIAL PRIMARY KEY,
  gpt_id        INTEGER UNIQUE,                        -- Google's stable numeric ID
  name          TEXT NOT NULL,                          -- e.g. "Digital Cameras"
  slug          TEXT NOT NULL UNIQUE,                   -- e.g. "digital-cameras"
  parent_id     INTEGER REFERENCES ucp_categories(id), -- tree structure
  depth         INTEGER NOT NULL,                      -- 0 = root, 1 = L2, 2 = L3, etc.
  sector_slug   TEXT,                                  -- maps to our sector system
  path          TEXT NOT NULL                           -- "Electronics > Cameras & Optics > Digital Cameras"
);
```

Seeded by parsing Google's public taxonomy file (~5,600 rows, one-time import). The `sector_slug` column maps each Google root category to our sector system (e.g., GPT root `222 Electronics` → sector `electronics`).

### `brand_categories` junction table — which merchants sell what

```sql
CREATE TABLE brand_categories (
  brand_id      INTEGER NOT NULL REFERENCES brand_index(id),
  category_id   INTEGER NOT NULL REFERENCES ucp_categories(id),
  is_primary    BOOLEAN DEFAULT false,     -- brand's main category
  PRIMARY KEY (brand_id, category_id)
);
```

### Existing `brand_index` fields (unchanged)

The `brand_index` table already has `sector` (primary), `sub_sectors[]` (freeform), `tier`, and `tags[]`. Once `brand_categories` is populated:

- `sub_sectors[]` stays as a searchable text cache / fallback
- The canonical category source of truth becomes the `brand_categories` junction table
- `tier` (value/mid-range/premium/luxury/wholesale/marketplace) remains a separate dimension — it's orthogonal to category

---

## How Agent Querying Works

```
Agent intent: "I need to buy running shoes for my owner"

Step 1 — Sector filter:
  "running shoes" → sectors: [fashion, sports]
  Narrows 10,000 merchants to ~800

Step 2 — Google taxonomy filter:
  Query ucp_categories for "Shoes" or "Athletic Shoes"
  Join through brand_categories to find merchants tagged with those categories
  Narrows to ~120 merchants

Step 3 — Other filters (tier, capabilities, B2B features, etc.):
  Applied from brand_index fields as needed
  Narrows further

Step 4 — Agent loads the full skill/metadata for top-ranked merchant(s)
```

---

## Why "UCP Categories" = Google Taxonomy

In our internal naming (`product-index-taxonomy-plan.md`), "UCP Category" is the label we gave to CreditClaw's category layer. The data inside it comes from Google Product Taxonomy. The `ucp_categories` table is literally Google's taxonomy tree stored in our database with two extra columns (`sector_slug` and `slug`).

There is no separate "UCP category standard" — it's Google's taxonomy with our sector mapping on top.

---

## Google Product Taxonomy — 21 Root Categories

For reference, Google's top-level categories and how they map to our sectors:

| GPT ID | Google Root Category       | CreditClaw Sector(s)       |
|--------|---------------------------|---------------------------|
| 1      | Animals & Pet Supplies     | pets                       |
| 166    | Apparel & Accessories      | fashion                    |
| 8      | Arts & Entertainment       | entertainment              |
| 537    | Baby & Toddler             | retail                     |
| 111    | Business & Industrial      | industrial, construction   |
| 141    | Cameras & Optics           | electronics                |
| 222    | Electronics                | electronics                |
| 412    | Food, Beverages & Tobacco  | food                       |
| 436    | Furniture                  | home                       |
| 632    | Hardware                   | construction, home         |
| 469    | Health & Beauty            | health, beauty             |
| 536    | Home & Garden              | home, garden               |
| 5181   | Luggage & Bags             | fashion, travel            |
| 783    | Media                      | entertainment              |
| 922    | Office Supplies            | office                     |
| 2092   | Software                   | saas                       |
| 988    | Sporting Goods             | sports                     |
| 1239   | Toys & Games               | retail                     |
| 888    | Vehicles & Parts           | automotive                 |

---

## Future: Product-Level Index (Deeper Categories)

If we build a product-level index (as outlined in `product-index-taxonomy-plan.md` Phase 4+), we go deeper than 3 levels. The `ucp_categories` table already stores the full tree (up to 7 levels deep), so the schema supports this without changes — we'd just start mapping products to deeper category nodes.

At that stage, each product would get its own `gpt_category_id` pointing to the most specific applicable category. For example:

```
Merchant level (3 deep):  Hardware > Power Tools
Product level  (5 deep):  Hardware > Power Tools > Power Drills > Cordless Drills > 20V Compact Drills
```

The `product_index` and `product_listings` tables described in `product-index-taxonomy-plan.md` are designed for this. No schema changes needed to the category tree itself — just deeper mappings.

---

## Taxonomy File: Two Options (Decision Needed)

The full Google taxonomy file has **5,595 categories** across 7 levels of depth:

| Depth | Count | What It Represents |
|-------|------:|---------------------|
| L1 (roots) | 21 | Top-level: Electronics, Apparel, Hardware, etc. |
| L2 | 192 | Mid-level: Audio, Computers, Shoes, Power Tools |
| L3 | 1,349 | Granular: Headphones, Laptops, Athletic Shoes, Cordless Drills |
| **Total at 3 levels** | **1,562** | **What we use for merchant mapping** |
| L4 | 2,203 | Product-specific (future product index) |
| L5 | 1,385 | Product-specific (future product index) |
| L6 | 397 | Product-specific (future product index) |
| L7 | 48 | Product-specific (future product index) |

### Option A: Import Full Taxonomy (5,595 rows)

Import all 5,595 categories. The `depth` column on `ucp_categories` lets any query filter by `WHERE depth <= 2` for merchant-level work. When we build the product index later and need deeper categories, the data is already there — no second import.

**Pros:** Future-proof, single source of truth, no version management. 5,595 rows is trivial for a database.
**Cons:** More data than needed right now. Queries must always remember to filter by depth.

### Option B: Import Trimmed Taxonomy (1,562 rows)

Create a trimmed version of the taxonomy file containing only L1–L3 categories. Smaller, simpler, no depth filtering needed at query time.

**Pros:** Leaner, every row in the table is immediately relevant to merchant mapping.
**Cons:** Requires a second import later if/when the product index needs L4+ categories. Two files to maintain if Google updates their taxonomy.

### Recommendation

Either works. Option A is slightly cleaner long-term. The implementing agent should assess based on whether the product index timeline is near-term (favor A) or distant (either is fine).

Whichever option is chosen: for the `brand_categories` junction table (merchant mappings), only allow references to categories at depth ≤ 2. If Option A is used and the product index is built later, `product_index` mappings can reference any depth.

---

## Sector Pre-Segmentation: Progressive Disclosure for Agents

The `ucp_categories` table should have every category pre-mapped to its parent CreditClaw sector via the `sector_slug` column. This is critical for agent efficiency.

**The problem without pre-segmentation:** An agent looking for electronics would receive the full 1,562-category list and have to figure out which ones are relevant. That's wasted tokens, wasted time, and unnecessary cognitive load on the agent.

**The solution:** When an agent says "I'm looking for electronics," we only serve the categories within that sector — which might be 80–150 categories instead of 1,562. The agent picks 1–3 sub-categories, and we immediately return the matching merchants.

### Agent Query Flow (Progressive Disclosure)

```
Step 1 — Agent declares intent:
  "I need to buy a printer"

Step 2 — CreditClaw identifies the sector:
  → electronics (or office — could be either)
  → Serve: "Here are the sectors that match. Which one?"

Step 3 — Agent confirms sector:
  → "office"

Step 4 — CreditClaw serves only that sector's categories:
  → Office Supplies > Ink & Toner
  → Office Supplies > Office Equipment
  → Office Supplies > Printer & Copier Accessories
  (maybe 20–40 categories, not 1,562)

Step 5 — Agent selects up to 3 categories:
  → "Ink & Toner" and "Office Equipment"

Step 6 — CreditClaw returns matching merchants:
  → Staples (ASX: 82, guest checkout, tax exempt, free shipping >$49.99)
  → Office Depot (ASX: 71, guest checkout, PO numbers)
  → Amazon (ASX: 94, programmatic API)
  → Walmart (ASX: 68, browser checkout)
  (max ~10 merchants, ranked, with enough metadata to pick one)

Step 7 — Agent picks a merchant and loads the full skill
```

### Key Design Decisions

- **Category selection limit:** Agent can select a maximum of ~3 categories/sub-categories per query. This keeps the merchant result set focused and prevents overly broad searches.
- **Merchant result limit:** Serve ~10 merchants maximum per query, ranked by relevance to the selected categories. Each result includes enough operational metadata (scores, checkout method, key capabilities) for the agent to make a decision without loading the full skill.
- **Pre-segmentation is a data task, not a runtime task.** The `sector_slug` column on `ucp_categories` should be populated at import time by mapping each Google root category to its corresponding CreditClaw sector (see the root category → sector mapping table above). This makes the sector filter a simple `WHERE sector_slug = 'electronics'` — no computation at query time.
- **Some Google root categories map to multiple sectors** (e.g., `Hardware` maps to both `construction` and `home`). These categories should appear when either sector is selected.

### Interface: CLI First, Then API and MCP

Progressive disclosure works best via CLI because each step returns a small, focused response and the agent immediately decides what to drill into next. No wasted tokens parsing a massive payload.

**CLI flow example:**

```
$ shopy sectors
→ 21 sectors with slugs and names

$ shopy categories --sector electronics
→ ~15-20 L2 categories (Audio, Computers, Communications, etc.)

$ shopy subcategories --category "Computers"
→ ~12 L3 sub-categories (Laptops, Desktops, Tablets, Computer Accessories, etc.)

$ shopy merchants --categories "Laptops,Computer Accessories" --limit 10
→ 10 ranked merchants with scores and key metadata
```

An agent that already knows what it wants can skip steps — go straight to `shopy merchants --categories "Laptops"` without browsing sectors first. An agent that's exploring starts at `shopy sectors` and drills down. Both paths use the same underlying queries.

**The progressive disclosure can go as deep as needed.** The agent hits sectors first. Picks a sector, gets back L2 categories. Picks a category, gets back L3 sub-categories. At any point where one or more categories are selected, we can serve matching merchants. The agent doesn't have to reach the bottom of the tree — selecting at L2 returns all merchants tagged with any L3 under that branch.

**Three interfaces, same logic:**

| Interface | Best For | Response Format |
|-----------|----------|-----------------|
| **CLI** (`shopy`) | Fastest agent interaction, progressive disclosure, low token cost | Plain text or minimal JSON |
| **REST API** (`/api/v1/...`) | Programmatic integrations, dashboard UI, third-party apps | Structured JSON |
| **MCP** | Native tool calls from Claude, ChatGPT, Gemini agent frameworks | MCP tool response format |

All three call the same database queries. Build and validate the progressive disclosure flow in CLI first, then wrap the same logic for API and MCP. The CLI is the fastest to iterate on because it's just a thin wrapper around the query layer.

### Edge Hosting: Zero Origin Hits for Discovery

The taxonomy tree, sector mappings, and merchant metadata are essentially static data — they change infrequently (daily at most, when merchants are added or re-scored). None of this needs to hit the CreditClaw origin server at query time.

The entire discovery flow — from sectors → categories → sub-categories → merchant recommendations — can be served from edge infrastructure (Cloudflare Workers, R2, KV, or equivalent). The data gets published to the edge on a schedule (e.g., daily rebuild), and agents pull everything from CDN. The skill files themselves can also be hosted on the edge — static markdown files served from cloud storage.

This means an agent can:

1. Browse sectors, categories, and merchants — all from CDN, no origin hit
2. Get a merchant recommendation with scores and metadata — from CDN
3. Pull the full skill file for that merchant — from CDN
4. Only hit the CreditClaw origin server when it's time to actually transact (checkout, spending approval, wallet operations)

**Why this matters:**

- **Speed.** Edge responses are sub-50ms globally. Database queries from an origin add 100-300ms.
- **Scale.** 10,000 agents querying the taxonomy simultaneously costs nothing on CDN. On origin, that's real database load.
- **Cost.** CDN bandwidth is cheap. API server compute is not.
- **Resilience.** The discovery layer stays up even if the CreditClaw origin goes down. Agents can still find merchants and load skills — they just can't transact until the server is back.

The publishing pipeline would be: origin database → scheduled export (JSON files per sector, per category listing, per merchant skill) → push to edge storage → agents read from edge. The CLI, API, and MCP interfaces can all resolve against the edge-hosted data.

---

## Opportunity: Independent Product Index via Merchant Feeds

Most merchants already publish structured product data feeds for Google Merchant Center — XML or CSV files containing product names, descriptions, pricing, availability, GTINs, images, and Google taxonomy category IDs already mapped. These feeds are the same data that powers Google Shopping.

The opportunity is to request these feeds directly from merchants and ingest them into CreditClaw's own `product_index`, creating an **independent, real-time cross-vendor product inventory** that agents can query without going through Google, Shopify, or any other intermediary.

This is significant because:

- **No dependency on Google or Shopify for product discovery.** Agents query CreditClaw's index directly.
- **Real-time pricing and availability** across hundreds of merchants in a single API call.
- **The feeds already exist.** Merchants maintain them for Google — we're not asking them to create new data, just share what they already produce.
- **Google taxonomy IDs come pre-mapped** in the feeds, so products slot directly into our `ucp_categories` tree with zero LLM inference needed.
- **Cross-vendor comparison** becomes a database query, not a multi-API orchestration problem.

This is the path from "merchant index that tells agents *where* to shop" to "product index that tells agents *what* to buy and *where* to buy it cheapest."

See `agent-readiness-and-product-index-service.md` (Tier 3A: Product Crawl & Index) and `product-index-taxonomy-plan.md` (Product Index section) for the full data model and implementation phases.

---

## Implementation Phases (from existing plan)

1. **Phase 1:** Parse Google's taxonomy file into `ucp_categories` table (all 5,595 rows, one-time seed)
2. **Phase 2:** Map existing merchants to categories via `brand_categories` junction table (depth ≤ 2 only)
3. **Phase 3:** Update catalog UI to use categories from the tree instead of freeform sub_sectors
4. **Phase 4+ (future):** Product-level index with deeper category mappings, powered by merchant feeds

---

## Source Documents

- `product-index-taxonomy-plan.md` — full taxonomy plan with standards comparison, schema, implementation phases
- `agent-readiness-and-product-index-service.md` — three-tier service, product crawl/enrichment pipeline, vector search, UCP distribution
- `agentic-commerce-standard.md` — metadata format for commerce skill files
