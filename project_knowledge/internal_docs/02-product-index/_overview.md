---
name: "Product Index — System Overview"
description: How the product index works. Schema, ingestion, embedding, retrieval. Read this before touching any product-level code.
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

## Key Files

| File | Role |
|---|---|
| `shared/schema.ts` (L1339–1367) | `product_listings` table + types |
| `features/product-index/embeddings/embed.ts` | Embedding model loader + embed functions |
| `scripts/ingest-shopify-products.ts` | Shopify product ingestion CLI |
| `scripts/refresh-products.ts` | Batch refresh for all indexed merchants |
| `app/api/v1/recommend/route.ts` | Recommend API with product search |

## Current Limitations

- **Shopify-only ingestion** — only the Shopify `/products.json` adapter is built. WooCommerce, BigCommerce, and XML feed adapters are not yet implemented (see `_research/open-product-feeds.md` for opportunities).
- **Full re-embed on refresh** — every product gets re-embedded even if unchanged
- **No delta sync** — no `updated_at` tracking to skip unchanged products
- **No availability-only updates** — stock changes require full product re-processing
- **Single variant** — only first variant is indexed (misses size/color variants)
- **No GTIN deduplication** — same product sold by multiple retailers stored as separate entries
- **No feed detection** — the system doesn't auto-detect which feed type a merchant supports during scanning
