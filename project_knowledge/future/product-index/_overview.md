---
name: "Product Index — System Overview"
description: How the product index works. Schema, ingestion, embedding, retrieval. Read this before touching any product-level code.
created: 2026-04-07
last_updated: 2026-04-08
---

# Product Index — System Overview

The product index stores per-product data (name, price, availability, image, URL) with vector embeddings for semantic search. It sits beneath the Brand Index — brands tell agents *where* to shop, products tell agents *what* to buy.

## Architecture

```
Brand Index (brand_index)
    │
    ├── product_listings        — individual products with embeddings
    ├── product_categories      — Google Product Taxonomy (5,638 entries)
    ├── category_keywords       — FTS keywords mapped to category IDs
    └── brand_categories        — junction: brand ↔ categories
```

## Connection to the Brand Scan Pipeline

The scan pipeline (Module 1) already collects data that feeds directly into product ingestion:

**Platform detection (`auditSite` → `platformTech`):** The `auditSite()` call in the scan pipeline asks Perplexity to identify the merchant's e-commerce platform. The field is in the audit response and is listed as a required field in the JSON schema. However, **`platformTech` is currently discarded** — `buildVendorSkillDraft()` in `scan-utils.ts` does not include it in the VendorSkill object that gets stored as `brand_data`. The `skill-json.ts` tries to read `brandData.platformTech` for the `checkout.platform` field, but it is always `null`. This is a gap to fix: either persist `platformTech` in the VendorSkill draft, or store it as a separate field on `brand_index`. Once persisted, it becomes the hook for routing to the correct ingestion adapter.

**Detection reliability (tested April 2026):** Perplexity-based detection is a "best guess" — it's not probing actual endpoints. Direct HTTP fingerprinting is more reliable for Shopify (check for `cdn.shopify.com` in headers, `_shopify_` cookies, or `/products.json` returning 200 with valid JSON). For WooCommerce, check `/wp-json/`. For Magento, look for `Magento_` or `requirejs-config` in HTML. See `_research/open-product-feeds.md` for the full detection matrix with test results.

**Product feed scoring (`product_feed` signal):** The ASX scoring rubric includes a `product_feed` signal (10 pts in the Clarity pillar) that evaluates sitemap quality and product URL discoverability. Brands that score high on this signal are the best candidates for automatic product ingestion — they have accessible, structured product data.

**Category mapping (`brand_categories`):** The scan pipeline's `resolveProductCategories()` step maps each brand to Google Product Taxonomy IDs via the `brand_categories` junction table. The recommend API uses these mappings to find merchants matching a query's categories. Products inherit this category context through their `brand_id` relationship.

## Schema

### `product_listings` table (`shared/schema.ts`)

| Column | Type | Purpose |
|---|---|---|
| `id` | serial PK | |
| `brand_id` | integer FK → brand_index | Which merchant sells this |
| `name` | text | Product title |
| `description` | text | Stripped HTML description |
| `price_cents` | integer | Price in cents |
| `currency` | text | Default `USD` |
| `in_stock` | boolean | Availability flag |
| `image_url` | text | Primary image |
| `product_url` | text | Direct link to product page |
| `category_id` | integer FK → product_categories | Google taxonomy mapping |
| `brand_name` | text | Product brand (may differ from merchant — e.g. Nike shoes sold by Foot Locker) |
| `upc` / `gtin` / `mpn` | text | Product identifiers for deduplication |
| `feed_source` | text | `shopify`, `xml`, etc. |
| `feed_item_id` | text | Source system ID |
| `embedding` | vector(384) | Semantic embedding |
| `last_synced` | timestamp | Last refresh time |

**Indexes:** `UNIQUE(brand_id, feed_item_id)` prevents duplicate products. B-tree indexes on `brand_id` and `category_id`. No IVFFlat index on embedding currently defined in schema — cosine search uses sequential scan filtered by `brand_id` (fast enough at current scale since lateral joins scope to one merchant at a time).

## Embedding Model

**Model:** `Xenova/all-MiniLM-L6-v2` — 384-dimensional vectors, quantized ONNX, runs in-process via `@xenova/transformers`.

**Location:** `features/product-index/embeddings/embed.ts`

**Functions:**
- `embed(text)` → `number[]` — single text to 384D vector (mean pooling + normalization)
- `embedBatch(texts)` → `number[][]` — sequential batch embedding

**Embed text formula:** `"{title} {vendor} {product_type} {description}"` truncated to 512 chars.

## Ingestion

### Shopify ingestion (`scripts/ingest-shopify-products.ts`)

```
CLI: npx tsx scripts/ingest-shopify-products.ts <domain>
```

**Pipeline:**
1. Look up `brand_id` from `brand_index` by domain
2. Fetch `https://{domain}/products.json` — paginated (250/page, max 10 pages = 2,500 products)
3. Tries bare domain first, falls back to `www.` subdomain
4. For each product:
   - Take first variant for price/availability
   - Strip HTML from description
   - Resolve `product_type` → `category_id` via FTS on `category_keywords`
   - Generate 384D embedding from combined text
   - Upsert by `(brand_id, feed_item_id)` — insert new, update existing
5. 500ms delay between pages to avoid rate limiting

**Category resolution:** FTS query against `category_keywords.keywords_tsv` using `websearch_to_tsquery`. Results cached in-memory per product_type during the run.

### Refresh (`scripts/refresh-products.ts`)

```
CLI: npx tsx scripts/refresh-products.ts
```

Finds all merchants that already have products in `product_listings`, re-runs the ingestion script for each. 2-second delay between merchants. Reports stale products (>14 days since last sync).

## Retrieval — Recommend API

**Endpoint:** `POST /api/v1/recommend` and `GET /api/v1/recommend?q=...`

**Location:** `app/api/v1/recommend/route.ts`

### Two modes

**POST** `/api/v1/recommend` — structured input. Accepts explicit `categories`, `category_ids`, `brand`, `price_tier`, `intent`. Skips Stage 1 (query understanding) when structured fields are provided.

**GET** `/api/v1/recommend?q=...` — natural language. Runs the full pipeline starting from Stage 1.

### Pipeline (up to 4 stages)

**Stage 1 — Query Understanding (GET only):**
Perplexity Sonar extracts intent from natural language: categories, brand names, price tier, intent type. Skipped when POST provides structured fields.

**Stage 2 — Category Resolution:**
Extracted category terms → FTS against `category_keywords` → top 5 category IDs. Weighting formula: `ts_rank * (1.0 + (4 - LEAST(depth, 4)) * 0.15)` — shallower categories get a slight boost (broader matches surface first), with exact name matches getting a 3x multiplier.

**Stage 3 — Merchant Ranking:**
Recursive CTE over `brand_categories` + `brand_index`. Ranks by: brand match (if specified) → match depth in taxonomy → ASX score. Top merchants marked as `recommended`.

**Stage 4 — Product Search (`attachProducts`):**
```sql
SELECT b.brand_id, p.name, p.price_cents, ...
       1 - (embedding <=> {query_vector}::vector) AS similarity
FROM unnest({brand_ids}::int[]) AS b(brand_id)
CROSS JOIN LATERAL (
  SELECT ... FROM product_listings
  WHERE brand_id = b.brand_id AND embedding IS NOT NULL
  ORDER BY embedding <=> {query_vector}::vector
  LIMIT 3
) p
```
Uses `CROSS JOIN LATERAL` — runs a per-merchant cosine similarity search across the top ranked merchants. Returns top 3 products per merchant.

### Response metadata

The response includes execution tracking that provides scaffolding for future federated search:

```json
{
  "meta": {
    "query_time_ms": 245,
    "intake_time_ms": 180,
    "stages_executed": ["intake", "categories", "merchants", "products"]
  }
}
```

This pattern extends naturally to additional stages (e.g. `"amazon"`, `"affiliate"`) — each with its own timing — without changing the response shape.

### Existing bot-facing access

The bot skills API (`GET /api/v1/bot/skills`) already exposes the Brand Index to agents with filtering by sector, tier, capabilities, checkout methods, etc. The Registry API (`GET /api/v1/registry`) serves the same data publicly with caching. Both use the `storage.searchBrands()` interface.

Product search for external agents would follow the same pattern: same `withBotApi` auth middleware, same JSON response conventions, same caching headers. The Recommend API is the natural endpoint to extend — or a new `GET /api/v1/products/search` that wraps the same pipeline.

### Storage layer note

Product listing queries currently use raw SQL in `recommend/route.ts` — there is no `productListings` abstraction in `server/storage/`. As product search expands (federated sources, new endpoints), extracting a `searchProducts(query, brandIds)` storage method would centralize the vector search logic.

## Key Files

| File | Role |
|---|---|
| `shared/schema.ts` (L1339–1367) | `product_listings` table + types |
| `features/product-index/embeddings/embed.ts` | Embedding model loader + embed functions |
| `scripts/ingest-shopify-products.ts` | Shopify product ingestion CLI |
| `scripts/refresh-products.ts` | Batch refresh for all indexed merchants |
| `app/api/v1/recommend/route.ts` | Recommend API with product search |
| `features/brand-engine/agentic-score/audit-site.ts` | `auditSite()` — detects `platformTech` stored in `brandData` |
| `features/brand-engine/agentic-score/scoring-engine.ts` | Scoring rubric including `product_feed` signal |
| `features/brand-engine/procurement-skills/skill-json.ts` | Surfaces `platformTech` in `skill.json` under `checkout.platform` |
| `app/api/v1/registry/route.ts` | Public brand registry — pattern for future product search endpoint |

## Current Limitations

- **Shopify-only ingestion** — only the Shopify `/products.json` adapter is built. WooCommerce, BigCommerce, and XML feed adapters are not yet implemented (see `_research/open-product-feeds.md` for opportunities). Platform detection already exists via `brandData.platformTech` — the gap is adapters, not detection.
- **Full re-embed on refresh** — every product gets re-embedded even if unchanged
- **No delta sync** — no `updated_at` tracking to skip unchanged products
- **No availability-only updates** — stock changes require full product re-processing
- **Single variant** — only first variant is indexed (misses size/color variants)
- **No GTIN deduplication** — same product sold by multiple retailers stored as separate entries
- **No product storage abstraction** — product queries are raw SQL in the recommend route, not centralized in `server/storage/`
- **No streaming** — the recommend API returns a single synchronous JSON response. SSE/streaming would be needed for federated search where external sources respond at different speeds.
- **No external sources** — product search is local-only (pgvector). Amazon Creators API, affiliate networks, and other live sources are not yet integrated (see `_research/open-product-feeds.md` for the federated search plan).
