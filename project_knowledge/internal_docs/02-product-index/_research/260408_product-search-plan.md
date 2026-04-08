---
name: "Plan: Product Search & Ingestion (Stage 3)"
description: Product feed ingestion, per-merchant vector search, GTIN handling. Not yet built. Read this before implementing product-level search.
created: 2026-04-07
last_updated: 2026-04-07
---

# Plan: Product Search & Ingestion (Stage 3)

**Status:** Not built. Schema designed, implementation pending.

Stages 1-2 tell an agent *where* to buy something. Stage 3 tells the agent *what* to buy. Without products, agents get a list of merchants and a SKILL.md but have to navigate each store from scratch. With products, agents see specific items with prices, images, and direct purchase URLs.

### Related Documents

| Document | Relevance |
|---|---|
| `merchant-index.md` | Stages 1-2 (BUILT), API response shape, skill format |
| `../scanning/scan-taxonomy-skills-pipeline.md` | How brands get scanned |

---

## Strategy: Brands First

Prioritize product feeds from **brands** (Nike, Gucci, Coach) over **retailers** (Amazon, Walmart, Foot Locker).

- **No deduplication needed.** Nike has one catalog with one price per product.
- **Cleaner data.** Brand feeds are authoritative.
- **Simpler ingestion.** One source of truth per product.

Retailers still appear as recommended merchants (Stage 2) with skill files. They don't get product-level indexing until GTIN-based deduplication is built.

---

## Data Model

### `product_listings` table

```sql
CREATE TABLE product_listings (
  id            SERIAL PRIMARY KEY,
  brand_id      INTEGER NOT NULL REFERENCES brand_index(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  description   TEXT,
  price_cents   INTEGER NOT NULL,
  currency      TEXT NOT NULL DEFAULT 'USD',
  in_stock      BOOLEAN NOT NULL DEFAULT true,
  image_url     TEXT,
  product_url   TEXT NOT NULL,
  category_id   INTEGER REFERENCES product_categories(id),
  brand_name    TEXT,
  upc           TEXT,
  gtin          TEXT,
  mpn           TEXT,
  feed_source   TEXT,
  feed_item_id  TEXT,
  embedding     VECTOR(384),
  last_synced   TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(brand_id, feed_item_id)
);
```

**Why Postgres + pgvector:** We're already on Postgres with pgvector available. Per-merchant vector files add operational complexity. Postgres IVFFlat indexes with a `brand_id` filter give us per-merchant vector search without new infrastructure.

### Key decisions

- **`VECTOR(384)`** — e5-small-v2 produces 384-dimensional embeddings
- **`UNIQUE(brand_id, feed_item_id)`** — prevents duplicate products on re-ingestion
- **`category_id` FK** — maps each product to the Google taxonomy (same ID space)
- **`brand_name` separate from merchant** — a Foot Locker listing for Nike shoes has `brand_id` pointing to Foot Locker but `brand_name = "Nike"`

---

## Ingestion Pipeline

```
Feed Acquisition → Validation → GTIN Extraction → Category Mapping → Embed → Store
```

### Feed Sources (priority order)

1. **Shopify Storefront API** — public, read-only, no auth for product data
2. **Google Shopping feed** — XML, includes GTIN and Google product category
3. **Affiliate network feeds** — ShareASale, CJ, Rakuten
4. **Sitemap + page crawl** — fallback

### Embedding Model

`intfloat/e5-small-v2` — 118M params, 384 dimensions, ~16ms on CPU via ONNX. Runs in-process, no external API call.

---

## Query Pipeline

After Stage 2 produces ranked merchants, Stage 3 searches products for the top 3:

```typescript
async function searchProducts(query, merchants, categoryIds, maxPerMerchant = 5) {
  const embedding = await embed(query);
  const topMerchants = merchants.filter(m => m.recommended);
  // For each: pgvector cosine search filtered by brand_id + in_stock
}
```

- Only searches top 3 recommended merchants
- Returns at most 5 products per merchant
- ~5-10ms per merchant with IVFFlat index

---

## Build Sequence

1. Enable pgvector extension, add `product_listings` table
2. Install ONNX runtime, build embedding function
3. First merchant ingestion (pick 2-3 Shopify brands)
4. Wire into recommend API response
5. Scale to more merchants, build refresh scheduler
6. Optional: AI enrichment for better search recall
