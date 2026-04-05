---
name: Product Index (Brand Catalog)
description: The central brand_index table powering the catalog, skill pages, and APIs. Read this before modifying brand storage, catalog filtering, or the skills UI.
---

# Product Index (Brand Catalog)

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
  ├── /api/v1/registry (skill registry)     → paginated list with maturity filter
  ├── /api/v1/brands (brand list API)       → paginated, filterable, lite mode
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
| `app/api/v1/bot/skills/route.ts` | Agent-facing catalog search API |

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

---

## LITE_COLUMNS Optimization

`LITE_COLUMNS` is a Drizzle projection defined in `server/storage/brand-index.ts` that selects only the columns needed for catalog list views. It deliberately excludes:

- `brandData` — can be 10KB+ per row
- `skillMd` — can be 5KB+ per row
- `recommendations` — variable size JSONB

This matters at scale: loading 50 cards per page with full payloads would be ~750KB of JSON. With LITE_COLUMNS it's ~15KB.

---

## Filtering System

`lib/catalog/parse-filters.ts` converts URL search params into a typed filter object and vice versa:

- `sector` → single sector slug
- `maturity` → array (default: server applies `DEFAULT_MATURITIES` of `["verified", "official", "beta", "community"]`)
- `checkout`, `capability` → array filters matched against array columns using `&&` (overlap) operator
- `q` → full-text search against `search_vector`
- `sort` → `score`, `rating`, `name`, `newest`
- `page`, `limit` → pagination

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

---

## Gotchas

### search_vector is trigger-managed, not Drizzle-managed

The `search_vector` column and its update trigger were created via raw SQL in migration 0007. Drizzle doesn't know about it. Running `drizzle-kit push` will try to **drop** this column because it's not in the schema. Always use `--force` cautiously and check what it wants to drop.

### brandData JSONB is untyped at the DB level

The `brandData` column stores the full `VendorSkill` object, but there's no JSON schema validation in PostgreSQL. If the scan code changes the shape of `VendorSkill`, old rows have stale structures. Code that reads `brandData` should handle missing/renamed fields gracefully.

### Slug collisions on upsert

`upsertBrandIndex` generates slugs from brand names. If two brands share a similar name, it tries appending `-1` through `-5`. After 5 collisions it throws.

### Domain is the unique key, not slug

The `domain` column has a unique constraint and is used as the conflict target for upserts. The `slug` is generated but not the dedup key. This means rescanning the same domain updates the existing row, but the slug stays stable (it's not regenerated on update).

### Pagination sort stability

The default brands API sort (`overallScore DESC`) is not stable — brands with identical scores can appear on adjacent pages in different order across requests. A secondary sort key (like `slug`) would fix this but hasn't been added yet. This is a known minor issue.
