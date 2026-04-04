# Metadata & Google Product Taxonomy — Internal Developer Guide

> Last updated: 2026-04-04

## Overview

The metadata system classifies merchants and their products using a structured taxonomy based on the Google Product Taxonomy. This classification powers catalog filtering, agent search, and the `skill.json` machine-readable format. The system uses a three-layer model — Sector → Category → Sub-Category — built on top of Google's ~5,600 category tree plus 43 custom entries for non-Google sectors.

For the full end-to-end pipeline (scan → classification → categories → skill output), see `scan-taxonomy-skills-pipeline.md`.

---

## Architecture

```
Google Product Taxonomy (~5,595 categories)
  + 43 custom categories (IDs 100001+)
  = 5,638 total in product_categories table
  ↓
  ├── Layer 1: Sector (27 slugs)            → brand_index.sector
  ├── Layer 2: Category (depth 2-3)         → brand_categories junction table
  └── Layer 4+: Deep categories (depth 4-5) → in product_categories, reserved for product-level
  ↓
  Also stored on brand_index:
  ├── subSectors (text[])    → freeform strings from classification (display only)
  ├── tier (text)            → market position
  ├── capabilities (text[])  → functional tags
  └── tags (text[])          → additional classification
  ↓
  Serialized into:
  skill.json (machine-readable) + SKILL.md (agent-readable)
```

### Key files

| File | Purpose |
|------|---------|
| `lib/procurement-skills/taxonomy/sectors.ts` | 27 sector slugs with display names, root IDs, helpers |
| `lib/procurement-skills/taxonomy/brand-types.ts` | 8 brand types, MULTI_SECTOR_TYPES, VALID_BRAND_TYPES |
| `lib/procurement-skills/taxonomy/tiers.ts` | Market tier definitions (value → enterprise) |
| `lib/procurement-skills/taxonomy/capabilities.ts` | Functional capability tags and descriptions |
| `shared/schema.ts` (product_categories, brand_categories) | Taxonomy and junction tables |
| `shared/schema.ts` (brand_index) | Where classification data lives |
| `lib/agentic-score/resolve-categories.ts` | Perplexity-powered category resolution |
| `server/storage/brand-categories.ts` | Category CRUD operations |
| `scripts/seed-google-taxonomy.ts` | Seeds product_categories (Google + custom) |
| `lib/procurement-skills/skill-json.ts` | skill.json builder including taxonomy block |

---

## Layer 1: Sectors (27 entries)

Defined in `lib/procurement-skills/taxonomy/sectors.ts`. A hybrid of Google Product Taxonomy roots and custom additions.

### Google Product Taxonomy roots (21)

| Sector Slug | Google Root ID |
|------------|----------------|
| `animals-pet-supplies` | 1 |
| `apparel-accessories` | 166 |
| `arts-entertainment` | 8 |
| `baby-toddler` | 537 |
| `business-industrial` | 111 |
| `cameras-optics` | 141 |
| `electronics` | 222 |
| `food-beverages-tobacco` | 422 |
| `furniture` | 436 |
| `hardware` | 632 |
| `health-beauty` | 469 |
| `home-garden` | 536 |
| `luggage-bags` | 110 |
| `mature` | 772 |
| `media` | 839 |
| `office-supplies` | 922 |
| `religious-ceremonial` | 988 |
| `software` | 313 |
| `sporting-goods` | 990 |
| `toys-games` | 1239 |
| `vehicles-parts` | 888 |

### Custom sectors (6)

| Sector Slug | Root ID | Notes |
|------------|---------|-------|
| `food-services` | 100001 | Restaurant delivery, catering, meal kits |
| `travel` | 100010 | Flights, hotels, tours, car rental |
| `education` | 100020 | Online courses, tutoring, test prep |
| `events` | 100030 | Concerts, sports, festivals, conferences |
| `luxury` | 100040 | NOT an assignable sector — tier-driven filter view |
| `specialty` | 100050 | Fallback for uncategorizable brands |

### Key constants

| Constant | What it contains |
|----------|-----------------|
| `SECTOR_ROOT_IDS` | All 27 sectors → root category IDs |
| `GOOGLE_ROOT_IDS` | Derived — only the 21 Google-mapped sectors |
| `ASSIGNABLE_SECTORS` | 26 entries — luxury excluded from assignment |
| `SECTOR_LABELS` | Display names for all 27 sectors |

### Luxury is special

Luxury is NOT a sector assignment. It's a tier-driven filter view:
- `/c/luxury` queries brands where `tier IN ('ultra_luxury', 'luxury')`
- Injected into facet navigation by `getAllBrandFacets()` when luxury-tier brands exist
- The classifier never assigns `sector = "luxury"` — a luxury brand gets its product sector + `tier = "luxury"`

---

## Layer 2: Product Categories (Live)

5,638 categories stored in the `product_categories` table:
- 5,595 from Google Product Taxonomy
- 43 custom entries for non-Google sectors (IDs 100001+)

**Important:** The `id` column IS the taxonomy identifier directly. Google categories use Google's numeric ID as the PK. Custom categories use 100001+. There is no separate `gptId` column.

### How categories are assigned to brands

Perplexity-powered resolution after the main scan (third API call). Behavior varies by brand type:

**Focused types** (brand, retailer, independent, chain, marketplace):
1. Look up root IDs for up to 2 sectors from `SECTOR_ROOT_IDS`
2. Query L2 and L3 categories under those roots (depth ≤ 3)
3. Send compact menu to Perplexity, get back up to 10 category IDs
4. Primary sector kept; categories can span both sector roots

**Multi-sector types** (department_store, supermarket):
1. Query L1 and L2 categories across all classified sectors
2. Send combined menu to Perplexity, get back up to 20 category IDs
3. Sector set to `multi-sector`

**Mega merchants** (mega_merchant):
1. No Perplexity call — directly map each sector to its L1 root category
2. Sector set to `multi-sector`

All paths: validate returned IDs against queried subtree, store in `brand_categories` junction table with primary flag.

See `scan-taxonomy-skills-pipeline.md` § Step 6 for the full flow.

---

## Tiers (Live)

Market position classification defined in `lib/procurement-skills/taxonomy/tiers.ts`:

| Tier | Description |
|------|-------------|
| `commodity` | Lowest-cost, undifferentiated |
| `budget` | Budget-focused, price-driven |
| `value` | Value-oriented, balancing price and quality |
| `mid_range` | Mainstream brands, moderate pricing |
| `premium` | Higher-end brands, quality focus |
| `luxury` | Luxury goods, exclusive brands |
| `ultra_luxury` | Top-tier luxury, exclusive access |

Tiers affect how agents approach purchasing — a `budget` tier merchant might prioritize coupon checking, while a `premium` merchant might emphasize quality and exclusivity. The `luxury` and `ultra_luxury` tiers also power the `/c/luxury` filter view.

---

## Capabilities (Live)

Functional tags in `lib/procurement-skills/taxonomy/capabilities.ts`:

| Capability | What it means |
|------------|---------------|
| `guest_checkout` | Can purchase without creating an account |
| `po_number` | Accepts purchase order numbers |
| `tax_exempt` | Supports tax exemption certificates |
| `bulk_pricing` | Offers quantity-based discounts |
| `api_ordering` | Has a programmatic ordering API |
| `subscription` | Supports recurring orders |
| `wishlist` | Has a wishlist/saved items feature |
| `price_match` | Offers price matching guarantees |

Detected during scanning and stored in the `capabilities` text array on `brand_index`. Agents use them to match merchants to procurement requirements.

---

## skill.json Taxonomy Block

The machine-readable metadata format served at `/brands/{slug}/skill-json`. The taxonomy section includes:

```json
{
  "taxonomy": {
    "brandType": "brand",
    "sector": "apparel-accessories",
    "tier": "premium",
    "categories": [
      {
        "id": 5322,
        "name": "Activewear",
        "path": "Apparel & Accessories > Clothing > Activewear",
        "depth": 3,
        "primary": true
      },
      {
        "id": 203,
        "name": "Outerwear",
        "path": "Apparel & Accessories > Clothing > Outerwear",
        "depth": 3
      },
      {
        "id": 187,
        "name": "Shoes",
        "path": "Apparel & Accessories > Shoes",
        "depth": 2
      }
    ]
  }
}
```

The taxonomy block uses a single `categories` array of structured objects (with `id`, `name`, `path`, `depth`, `primary` fields). The previous `productCategories` string array (duplicate data in `"{id} - {path}"` format) was removed to avoid duplication in the machine-readable format.

**Source of truth:** The database. skill.json is always derived from `brand_index` columns + `brand_categories`/`product_categories` joins. Never the other way around.

---

## How Metadata Feeds Into Scoring

The Agentic Commerce Standard uses metadata quality as a scoring input:

- **Clarity pillar (35 pts):** Measures structured data — JSON-LD, sitemaps, agent metadata files. Rich Product/Offer schema.org markup scores high.
- **Discoverability pillar (30 pts):** Rewards programmatic catalog access — search APIs, MCP endpoints, OpenSearch.
- **Reliability pillar (35 pts):** Operational quality — guest checkout, order management, checkout flow, bot tolerance.

---

## Fragile Areas & Gotchas

### subSectors vs brand_categories — different things

`subSectors` (text[] on brand_index) = freeform strings for display. `brand_categories` (junction table) = structured taxonomy references. Both exist, serve different purposes. Do not conflate them.

### Brand types and multi-sector routing

Brand type (8 values defined in `lib/procurement-skills/taxonomy/brand-types.ts`) determines how category resolution works:
- **Focused types** (brand, retailer, independent, chain, marketplace) — keep their primary sector, can span up to 2 sectors in categories, L3 depth
- **MULTI_SECTOR_TYPES** (department_store, supermarket) — sector set to `multi-sector`, L1+L2 categories across all sectors
- **mega_merchant** — sector set to `multi-sector`, L1 roots only (no Perplexity call)

The `multi-sector` value is NOT in `ASSIGNABLE_SECTORS` — it's set programmatically only for MULTI_SECTOR_TYPES and mega_merchant.

### Sector assignment is LLM-dependent

Perplexity classifies the sector(s). Edge cases:
- Focused brands get up to 2 sectors (e.g., Patagonia: apparel-accessories + sporting-goods). Primary sector is kept for catalog listing.
- Multi-sector types (department_store, supermarket, mega_merchant) always get `sector = "multi-sector"`
- Niche merchants may be miscategorized
- Not deterministic — rescanning the same site may produce a different sector (rare but possible)

### Stale data from pre-overhaul scans

Brands scanned before April 3, 2026 may have old sector slugs (`"retail"`, `"home"`, `"pets"`). The facet system filters these out. Rescanning fixes them.

### Taxonomy constants are append-only

The sector, tier, and capability lists are plain TypeScript arrays. Never rename or remove existing values without a migration — existing `brand_index` rows would become orphaned.

### Category resolution is non-critical

The try/catch around `resolveProductCategories()` is intentional. Failure returns empty array — brands get no categories but the scan still succeeds. Never make it blocking.

---

## Expansion Plans

### Near-term
- **Category-based filtering** — catalog filter by taxonomy category (currently only by sector)
- **Category landing pages** — `/c/electronics/audio` browsing experience

### Medium-term
- **Product-level taxonomy** — individual products classified to L3-L5 (e.g., "Electronics > Audio > Headphones")
- **Taxonomy-aware search** — agents query by category ID for cross-vendor product comparison

### Longer-term
- **Merchant feed ingestion** — import Google Shopping feeds and auto-classify against taxonomy
- **Category health dashboard** — admin view of coverage, gaps, classification quality
