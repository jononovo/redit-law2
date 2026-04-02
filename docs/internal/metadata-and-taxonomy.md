# Metadata & Google Product Taxonomy — Internal Developer Guide

> Last updated: 2026-04-02

## Overview

The metadata system classifies merchants and their products using a structured taxonomy based on the Google Product Taxonomy (GPT). This classification powers catalog filtering, agent search, and the `skill.json` machine-readable format. The system uses a three-layer model — Sector → Category → Sub-Category — built on top of Google's ~5,600 category tree.

This is a system in active transition: the codebase currently uses freeform strings for sub-sector classification, with a planned migration to the structured Universal Category Protocol (UCP).

---

## Architecture

```
Google Product Taxonomy (~5,600 categories)
  ↓ simplified into
Universal Category Protocol (UCP)
  ├── Layer 1: Sector (21 stable slugs)     → brand_index.sector
  ├── Layer 2: Category (GPT Level 2-3)     → future: ucp_categories table
  └── Layer 3: Sub-Category (GPT Level 3-5) → future: ucp_categories table
  ↓ currently stored as
brand_index columns
  ├── sector (text)          → single sector slug
  ├── subSectors (text[])    → freeform strings (being replaced)
  ├── tier (text)            → market position
  ├── capabilities (text[])  → functional tags
  └── tags (text[])          → additional classification
  ↓ serialized into
skill.json (machine-readable) + SKILL.md (agent-readable)
```

### Key files

| File | Purpose |
|------|---------|
| `lib/procurement-skills/taxonomy/sectors.ts` | 21 sector slugs with display names and descriptions |
| `lib/procurement-skills/taxonomy/tiers.ts` | Market tier definitions (value → enterprise) |
| `lib/procurement-skills/taxonomy/capabilities.ts` | Functional capability tags and descriptions |
| `shared/schema.ts` (brand_index) | Where taxonomy data lives in the database |
| `docs/build context/Future/Product_index/Shopy/3. product-index-taxonomy-plan.md` | Full UCP implementation roadmap |
| `docs/build context/Future/Product_index/Shopy/skill-json-schema.md` | skill.json spec including taxonomy block |
| `docs/build context/Future/Product_index/agentic-commerce-standard.md` | The standard that defines how metadata is scored |

---

## Layer 1: Sectors (Live)

21 stable slugs defined in `lib/procurement-skills/taxonomy/sectors.ts`:

| Sector | Examples |
|--------|----------|
| `retail` | General merchandise, department stores |
| `electronics` | Consumer electronics, computers |
| `fashion` | Clothing, shoes, accessories |
| `grocery` | Food, beverages, household essentials |
| `health` | Pharmacy, supplements, medical supplies |
| `beauty` | Cosmetics, skincare, personal care |
| `home` | Furniture, decor, appliances |
| `industrial` | B2B supplies, tools, raw materials |
| `automotive` | Parts, accessories, vehicles |
| `sports` | Equipment, apparel, outdoor gear |
| ... | (21 total — see `sectors.ts` for complete list) |

Sectors are assigned during scanning (the LLM classifies the merchant) and can be manually corrected by brand claimants or admins. They power the `/c/[sector]` landing pages and the catalog sector filter.

---

## Layer 2-3: Categories and Sub-Categories (Planned)

The current `subSectors` text array is freeform — scanners and humans type whatever they want. This will be replaced by the UCP system:

### Planned schema

```
ucp_categories table:
  id (serial)
  gptId (integer)       → Google Product Taxonomy numeric ID
  name (text)           → human-readable name
  path (text)           → full path, e.g. "Electronics > Computers > Laptops"
  depth (integer)       → 1-5, matching GPT hierarchy depth
  parentId (integer)    → self-referential FK

brand_categories junction table:
  brandId (integer)     → FK to brand_index
  categoryId (integer)  → FK to ucp_categories
  isPrimary (boolean)   → one primary category per brand
```

### Why GPT?

The Google Product Taxonomy is the most widely adopted product classification system:
- Used by Google Shopping, Facebook Commerce, and most feed management tools
- ~5,600 categories with stable numeric IDs
- Hierarchical (5 levels deep) with clear parent-child relationships
- Updated periodically by Google with backward-compatible additions

Using GPT IDs means our taxonomy is interoperable with existing merchant feeds, shopping APIs, and product data services.

---

## Tiers (Live)

Market position classification defined in `lib/procurement-skills/taxonomy/tiers.ts`:

| Tier | Description |
|------|-------------|
| `value` | Budget-focused, discount retailers |
| `mid-market` | Mainstream brands, moderate pricing |
| `premium` | Higher-end brands, quality focus |
| `luxury` | Luxury goods, exclusive brands |
| `enterprise` | B2B, bulk purchasing, corporate accounts |

Tiers affect how agents approach purchasing decisions — a `value` tier merchant might prioritize coupon/deal checking, while an `enterprise` tier merchant might require PO numbers and approval flows.

---

## Capabilities (Live)

Functional tags in `lib/procurement-skills/taxonomy/capabilities.ts` that describe what a merchant supports:

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

These are detected by the ASX scanner (both static detectors and the agentic scan) and stored in the `capabilities` text array on `brand_index`. Agents use them to decide if a merchant fits a procurement requirement.

---

## skill.json Schema

The machine-readable metadata format served alongside SKILL.md. Defined in `docs/build context/Future/Product_index/Shopy/skill-json-schema.md`.

### Taxonomy block (in skill.json)

```json
{
  "taxonomy": {
    "sector": "electronics",
    "gptId": 222,
    "name": "Electronics",
    "path": "Electronics",
    "depth": 1,
    "subCategories": [
      {
        "gptId": 2082,
        "name": "Computers",
        "path": "Electronics > Computers"
      }
    ]
  }
}
```

**Important:** `skill.json` is derived from the database, not the other way around. The `brand_index` table is the source of truth. The serializer reads columns and assembles the JSON output. Some fields in the `skill.json` spec (returns policy, platform info, API tier, loyalty enrichment) require new `brand_index` columns that don't exist yet — they'll be added incrementally.

---

## How Metadata Feeds Into Scoring

The Agentic Commerce Standard (`agentic-commerce-standard.md`) uses metadata quality as a scoring input:

- **Clarity pillar (35 pts):** Directly measures metadata — JSON-LD structured data, sitemaps, semantic HTML. A site with rich Product/Offer schema.org markup scores high because it's giving agents machine-readable product information.
- **Discoverability pillar (30 pts):** Rewards sites that make their catalog programmatically accessible — search APIs, MCP endpoints, OpenSearch. These are forms of structured metadata access.
- **Reliability pillar (35 pts):** Indirectly related — guest checkout, order management, and checkout flow quality are "operational metadata" that tells agents what to expect.

---

## Fragile Areas & Gotchas

### subSectors is freeform and inconsistent

The current `subSectors` text array has no validation. Different scans of similar merchants produce different sub-sector strings. Searching or filtering by sub-sector is unreliable because the same concept might appear as `"Laptops"`, `"Laptop Computers"`, `"Portable Computers"`, or `"Notebooks"`.

**Workaround until UCP migration:** The catalog filters don't expose sub-sector filtering to users. It's only used for display on brand detail pages.

### Sector assignment is LLM-dependent

The scanner's LLM assigns the sector during scanning. It usually gets it right, but edge cases exist:
- Multi-category merchants (e.g., Amazon) get assigned a single sector
- Niche merchants may get miscategorized (e.g., a pet food subscription service could be `grocery` or `pets`)
- The LLM's classification is not deterministic — rescanning the same site might produce a different sector

### GPT IDs are not yet stored

The planned `gptId` column doesn't exist in `brand_index` yet. The taxonomy plan calls for a separate `ucp_categories` table with a junction to `brand_index`. Until this migration happens, there's no way to map a brand to a specific Google Product Taxonomy category.

### Capability detection is boolean

Capabilities are stored as present/absent (the capability string is in the array or it isn't). There's no "partial" or "quality" dimension. A merchant with a terrible guest checkout experience and one with a seamless one both have `guest_checkout` in their capabilities array.

### Taxonomy constants are not versioned

The sector, tier, and capability lists in `lib/procurement-skills/taxonomy/` are plain TypeScript arrays. There's no versioning — if you rename or remove a value, existing `brand_index` rows with the old value become orphaned. Always add new values; never rename or remove existing ones without a migration.

---

## Expansion Plans

### Near-term
- **UCP category migration** — create `ucp_categories` and `brand_categories` tables, backfill from existing `subSectors` data
- **GPT ID mapping** — assign Google Product Taxonomy IDs to existing sectors and categories
- **skill.json serializer** — build the function that reads `brand_index` and assembles the full `skill.json` output

### Medium-term
- **Product-level taxonomy** — individual products classified to GPT Level 4-5 (e.g., "Electronics > Computers > Laptops > Chromebooks")
- **Taxonomy-aware search** — agents query by GPT category ID instead of freeform text, enabling cross-vendor product comparison
- **Category auto-suggestion** — LLM proposes categories during scanning, validated against the UCP tree

### Longer-term
- **Merchant feed ingestion** — import Google Shopping feeds, Facebook catalogs, or Shopify product data and auto-classify using GPT taxonomy
- **Category health dashboard** — admin view showing category coverage, gaps, and classification quality metrics
- **Taxonomy API** — public endpoint for the UCP tree so third-party tools can classify merchants against our standard
