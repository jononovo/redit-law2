---
name: Metadata & Google Product Taxonomy
description: The 28-sector classification system, tiers, capabilities, and skill.json format. Read this before modifying taxonomy constants, category resolution, or skill output.
---

# Metadata & Google Product Taxonomy

The metadata system classifies merchants and their products using a structured taxonomy based on the Google Product Taxonomy. This classification powers catalog filtering, agent search, and the `skill.json` machine-readable format. The system uses a three-layer model — Sector → Category → Sub-Category — built on top of Google's ~5,600 category tree plus 43 custom entries for non-Google sectors. 28 total sectors: 21 from Google, 6 custom, plus `multi-sector` (set programmatically for department stores, supermarkets, mega merchants).

For the full end-to-end pipeline (scan → classification → categories → skill output), see `../scanning/scan-taxonomy-skills-pipeline.md`.

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
| `lib/agentic-score/resolve-categories.ts` | Perplexity-powered category resolution |
| `server/storage/brand-categories.ts` | Category CRUD operations |
| `scripts/seed-google-taxonomy.ts` | Seeds product_categories (Google + custom) |
| `lib/procurement-skills/skill-json.ts` | skill.json builder including taxonomy block |

---

## Sectors (28 entries)

Defined in `lib/procurement-skills/taxonomy/sectors.ts`. A hybrid of Google Product Taxonomy roots and custom additions. 26 are assignable by the classifier; luxury and multi-sector are set programmatically.

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

### Custom sectors (7)

| Sector Slug | Root ID | Notes |
|------------|---------|-------|
| `food-services` | 100001 | Restaurant delivery, catering, meal kits |
| `travel` | 100010 | Flights, hotels, tours, car rental |
| `education` | 100020 | Online courses, tutoring, test prep |
| `events` | 100030 | Concerts, sports, festivals, conferences |
| `luxury` | 100040 | NOT an assignable sector — tier-driven filter view |
| `specialty` | 100050 | Fallback for uncategorizable brands |
| `multi-sector` | 0 | NOT assignable — set programmatically for department_store, supermarket, mega_merchant |

### Key constants

| Constant | What it contains |
|----------|-----------------|
| `SECTOR_ROOT_IDS` | All 28 sectors → root category IDs |
| `GOOGLE_ROOT_IDS` | Derived — only the 21 Google-mapped sectors |
| `ASSIGNABLE_SECTORS` | 26 entries — luxury and multi-sector excluded from assignment |
| `SECTOR_LABELS` | Display names for all 28 sectors |

### Luxury is special

Luxury is NOT a sector assignment. It's a tier-driven filter view:
- `/c/luxury` queries brands where `tier IN ('ultra_luxury', 'luxury')`
- Injected into facet navigation by `getAllBrandFacets()` when luxury-tier brands exist
- The classifier never assigns `sector = "luxury"` — a luxury brand gets its product sector + `tier = "luxury"`

---

## Tiers (7 values)

| Tier | Description |
|------|-------------|
| `commodity` | Lowest-cost, undifferentiated |
| `budget` | Budget-focused, price-driven |
| `value` | Value-oriented, balancing price and quality |
| `mid_range` | Mainstream brands, moderate pricing |
| `premium` | Higher-end brands, quality focus |
| `luxury` | Luxury goods, exclusive brands |
| `ultra_luxury` | Top-tier luxury, exclusive access |

Tiers affect how agents approach purchasing — a `budget` tier merchant might prioritize coupon checking, while a `premium` merchant might emphasize quality and exclusivity.

---

## Capabilities (8 values)

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

---

## skill.json Taxonomy Block

```json
{
  "taxonomy": {
    "brandType": "brand",
    "sector": "apparel-accessories",
    "tier": "premium",
    "categories": [
      { "id": 5322, "name": "Activewear", "path": "Apparel & Accessories > Clothing > Activewear", "depth": 3, "primary": true }
    ]
  }
}
```

**Source of truth:** The database. skill.json is always derived from `brand_index` columns + `brand_categories`/`product_categories` joins. Never the other way around.

---

## Gotchas

### subSectors vs brand_categories — different things

`subSectors` (text[] on brand_index) = freeform strings for display. `brand_categories` (junction table) = structured taxonomy references. Both exist, serve different purposes. Do not conflate them.

### Taxonomy constants are append-only

The sector, tier, and capability lists are plain TypeScript arrays. Never rename or remove existing values without a migration — existing `brand_index` rows would become orphaned.

### Category resolution is non-critical

The try/catch around `resolveProductCategories()` is intentional. Failure returns empty array — brands get no categories but the scan still succeeds. Never make it blocking.

### Stale data from pre-overhaul scans

Brands scanned before April 3, 2026 may have old sector slugs (`"retail"`, `"home"`, `"pets"`). The facet system filters these out. Rescanning fixes them.
