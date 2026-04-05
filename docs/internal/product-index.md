# Product Index (Brand Catalog) — Internal Developer Guide

> Last updated: 2026-04-04

## Overview

The Product Index is the central registry of merchants/brands that AI agents can shop from. It powers the `/skills` catalog, individual brand pages at `/skills/[vendor]`, sector landing pages at `/c/[sector]`, and the API that agents query at runtime. Every scan, manual submission, and admin action writes to this single table.

The system was designed for scale — tens of thousands of brands within weeks, driven by automated ASX scans.

---

## Architecture

```
brand_index table (source of truth)
  ↓
  ├── /skills (catalog UI)                  → searchBrands() with LITE_COLUMNS
  ├── /skills/[vendor] (detail page)        → full row fetch by slug, server+client component split
  ├── /c/[sector] (sector landing)          → filtered by sector column
  ├── /c/luxury (tier filter)               → tier IN ('ultra_luxury', 'luxury')
  ├── /api/v1/bot/skills (agent catalog)    → searchBrands() → formatted VendorSkill objects
  ├── /api/v1/vendors (simple list)         → all brands, minimal fields
  ├── /brands/{slug}/skill (SKILL.md)       → raw markdown, text/markdown, Cache-Control: 86400
  ├── /brands/{slug}/skill-json (skill.json)→ structured JSON, Cache-Control: 86400
  ├── generateStaticParams                  → pre-renders top 1000 verified/official pages
  └── skill.json / SKILL.md                 → serialized from brandData JSONB + skillMd text + brand_categories

brand_categories junction table
  → links brand_index rows to product_categories taxonomy entries
  → powers skill.json taxonomy output
```

### Key files

| File | Purpose |
|------|---------|
| `shared/schema.ts` (brand_index) | Table definition — ~85 columns covering identity, classification, scoring, capabilities, and payloads |
| `shared/schema.ts` (product_categories, brand_categories) | Taxonomy tables |
| `server/storage/brand-index.ts` | All DB operations: search, count, upsert, lite queries |
| `server/storage/brand-categories.ts` | Category junction CRUD |
| `app/skills/page.tsx` | Server component — initial data fetch + SEO metadata |
| `app/skills/catalog-client.tsx` | Client component — interactive filtering, pagination, URL sync |
| `lib/catalog/parse-filters.ts` | URL ↔ filter state parsing (sectors, maturity, capabilities, search) |
| `app/skills/[vendor]/page.tsx` | Skill detail — slim server component (data fetch, metadata, ISR `revalidate=3600`) |
| `app/skills/[vendor]/skill-detail-content.tsx` | Skill detail — client component (renders full page, tenant-aware theming via `useTenant()`) |
| `app/brands/[slug]/skill/route.ts` | Serves raw SKILL.md markdown for a brand (`text/markdown`) |
| `app/brands/[slug]/skill-json/route.ts` | Serves skill.json structured data for a brand (`application/json`) |
| `app/api/v1/bot/skills/route.ts` | Agent-facing catalog search API (list/filter brands, not per-brand skill files) |

---

## The `brand_index` Table

### Identity columns
`id`, `slug`, `name`, `domain` (unique), `url`, `logoUrl`, `description`

### Classification columns
- `sector` — primary sector slug from `lib/procurement-skills/taxonomy/sectors.ts` (27 values, 26 assignable)
- `subSectors` — text array (freeform strings from Perplexity classification — used for display)
- `tier` — market position: `commodity`, `budget`, `value`, `mid_range`, `premium`, `luxury`, `ultra_luxury`
- `maturity` — `draft`, `beta`, `community`, `verified`, `official` (controls visibility and trust level)
- `tags`, `carriesBrands` — text arrays for additional classification

### Capability columns
- `hasMcp`, `hasApi`, `siteSearch` — boolean flags
- `capabilities` — text array (e.g., `guest_checkout`, `po_number`, `tax_exempt`)
- `checkoutMethods` — text array (e.g., `browser`, `api`, `x402`)
- `paymentMethodsAccepted`, `supportedCountries` — text arrays
- `hasDeals`, `ordering` — deal availability, ordering mode

### Scoring columns
- `overallScore` — ASX Score (0–100), the main ranking metric
- `scoreBreakdown` — JSONB with per-signal scores from rubric v1.1
- `axsRating` — crowd-sourced 1–5 star rating
- `ratingCount` — number of ratings
- `ratingSearchAccuracy`, `ratingStockReliability`, `ratingCheckoutCompletion` — sub-ratings

### Payload columns
- `brandData` — JSONB blob containing the full `VendorSkill` object (checkout methods, tips, evidence)
- `skillMd` — the generated SKILL.md markdown text
- `recommendations` — JSONB array of improvement suggestions from the scan

### Claim columns
- `claimedBy` — owner UID who claimed this brand
- `claimedAt`, `claimMethod`, `claimVerifiedAt`

### Search infrastructure
- `search_vector` — `tsvector` column maintained by a database trigger (not Drizzle-managed)
- GIN indexes on all array columns and `search_vector` (migration 0007)
- Partial indexes on boolean flags and common filter predicates

---

## Related Tables

### product_categories (5,638 rows)

The taxonomy tree. `id` is the taxonomy identifier directly — Google Product Taxonomy numeric IDs for Google categories, 100001+ for custom categories. Seeded by `scripts/seed-google-taxonomy.ts`.

### brand_categories (junction)

Links brands to taxonomy categories. Unique constraint on `(brandId, categoryId)`. Populated by the Perplexity category resolver during scanning. Always cleared and re-inserted on rescan.

See `metadata-and-taxonomy.md` and `scan-taxonomy-skills-pipeline.md` for full taxonomy details.

---

## LITE_COLUMNS Optimization

`LITE_COLUMNS` is a Drizzle projection defined in `server/storage/brand-index.ts` that selects only the columns needed for catalog list views. It deliberately excludes:

- `brandData` — can be 10KB+ per row
- `skillMd` — can be 5KB+ per row
- `recommendations` — variable size JSONB

This matters at scale: loading 50 cards per page with full payloads would be ~750KB of JSON. With LITE_COLUMNS it's ~15KB.

The projection also includes a computed `successRate` extracted from `brandData` via SQL: `brandData->'evidence'->>'successRate'`.

---

## Filtering System

`lib/catalog/parse-filters.ts` converts URL search params into a typed filter object and vice versa:

- `sector` → single sector slug
- `maturity` → array (default: server applies `DEFAULT_MATURITIES` of `["verified", "official"]`)
- `checkout`, `capability` → array filters matched against array columns using `&&` (overlap) operator
- `q` → full-text search against `search_vector`
- `sort` → `score`, `rating`, `name`, `newest`
- `page`, `limit` → pagination

The `hasUserInteracted` ref in `catalog-client.tsx` prevents the component from rewriting the URL on mount — only user-initiated filter changes trigger URL updates.

### Facet navigation

`getAllBrandFacets()` in `server/storage/brand-index.ts` returns available filter values:
- Sector facets are filtered to only known slugs from `SECTOR_LABELS`
- The "luxury" facet is injected when any brand has `tier IN ('ultra_luxury', 'luxury')`
- Old/stale sector values from pre-overhaul scans are excluded automatically

---

## generateStaticParams

`app/skills/[vendor]/page.tsx` pre-renders the top 1000 brand pages at build time:

- Fetches brands with `maturities: ["verified", "official"]` and `lite: true`
- Wrapped in try/catch — returns empty array on failure so builds don't break
- Pages use `revalidate = 3600` (1 hour ISR)

At 10K+ brands, only the top 1000 are pre-rendered. The rest are rendered on-demand and cached.

---

## Fragile Areas & Gotchas

### search_vector is trigger-managed, not Drizzle-managed

The `search_vector` column and its update trigger were created via raw SQL in migration 0007. Drizzle doesn't know about it. Running `drizzle-kit push` will try to **drop** this column because it's not in the schema. Always use `--force` cautiously and check what it wants to drop.

### brandData JSONB is untyped at the DB level

The `brandData` column stores the full `VendorSkill` object, but there's no JSON schema validation in PostgreSQL. If the scan code changes the shape of `VendorSkill`, old rows have stale structures. Code that reads `brandData` should handle missing/renamed fields gracefully.

### Slug collisions on upsert

`upsertBrandIndex` generates slugs from brand names. If two brands share a similar name, it tries appending `-1` through `-5`. After 5 collisions it throws. At scale with tens of thousands of brands, generic names (e.g., "The Store") could hit this limit.

### Domain is the unique key, not slug

The `domain` column has a unique constraint and is used as the conflict target for upserts. The `slug` is generated but not the dedup key. This means rescanning the same domain updates the existing row, but the slug stays stable (it's not regenerated on update).

### Array column GIN indexes need maintenance

GIN indexes on array columns (`subSectors`, `tags`, `capabilities`, etc.) can bloat over time with heavy writes. PostgreSQL's autovacuum handles this, but at very high write volumes (thousands of scans per day), manual `REINDEX` may be needed.

---

## Expansion Plans

### Near-term
- **Category-based filtering** — filter catalog by taxonomy category (brand_categories), not just sector
- **Category landing pages** — `/c/electronics/audio` drill-down pages

### Medium-term
- **Product-level index** — `product_listings` table for individual products with GTIN/UPC/MPN, cross-referenced to brands and taxonomy categories
- **Incremental re-scan** — only re-run signals that are likely to have changed
- **Bulk import API** — allow merchants to submit their own catalog data via CSV/API

### Longer-term
- **Real-time score updates** — webhook-driven score recalculation when merchants update their sites
- **Federated search** — agents query the product index across multiple CreditClaw/shopy instances
