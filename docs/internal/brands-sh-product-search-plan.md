# brands.sh — Product Search & Ingestion (Stage 3)

*Covers: product feed ingestion, per-merchant vector search, GTIN handling, brand-first strategy. For Stages 1-2 (categories, merchants, recommend API), see `brands-sh-merchant-index-plan.md`.*

### Related Documents

| Document | Relevance |
|---|---|
| `brands-sh-merchant-index-plan.md` | Stages 1-2 (BUILT), API response shape, skill format |
| `docs/build context/Shopy/3. product-index-taxonomy-plan.md` | Original taxonomy planning |
| `docs/build context/Product_index/agent-readiness-and-product-index-service.md` | Three-tier service vision |

---

## Why This Matters

Stages 1-2 tell an agent *where* to buy something. Stage 3 tells the agent *what* to buy. Without products, agents get a list of merchants and a SKILL.md but have to navigate each store from scratch. With products, agents see specific items with prices, images, and direct purchase URLs — they can compare across merchants and go straight to checkout.

The recommend API already returns a `products: []` array on each merchant. Stage 3 populates it.

---

## How Stage 3 Connects to Stages 1-2

Stage 2 produces a ranked list of merchants. Stage 3 takes the top merchants (typically top 3 recommended) and searches their product collections. Products are nested under each merchant in the API response. Merchants without product feeds get an empty `products[]` array — the agent uses their `skill_url` instead.

The API response shape is defined in `brands-sh-merchant-index-plan.md`. Stage 3 populates the `products[]` field on each merchant object.

---

## Product Feed Strategy: Brands First

Prioritize getting product feeds from **brands** (Nike, Gucci, Coach) over **retailers** (Amazon, Walmart, Foot Locker).

- **No deduplication needed.** Nike has one catalog with one price per product. Twenty retailers selling the same Nike shoe creates a deduplication nightmare.
- **Cleaner data.** Brand feeds are authoritative — correct names, official images, accurate stock.
- **Simpler ingestion.** One source of truth per product vs reconciling conflicting data.
- **Better for agents.** Users searching for "Nike Air Max" want to see the product, not 10 different places to buy it. The merchant recommendation layer (Stage 2) tells them where to buy it.

Retailers still appear as recommended merchants (Stage 2) with skill files. They don't get product-level indexing until GTIN-based deduplication is built.

---

## Data Model

### New table: `product_listings`

This is the core product catalog. One row per product per merchant. Products belong to a merchant (FK to `brand_index`) and are categorized via the existing taxonomy (FK to `product_categories`).

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
  brand_name    TEXT,                        -- product brand (may differ from merchant, e.g. Nike product sold by Foot Locker)
  upc           TEXT,
  gtin          TEXT,
  mpn           TEXT,
  feed_source   TEXT,                        -- 'shopify', 'google_shopping', 'affiliate', 'crawl'
  feed_item_id  TEXT,                        -- source-specific product ID for dedup/updates
  embedding     VECTOR(384),                 -- e5-small-v2 embedding for vector search
  last_synced   TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(brand_id, feed_item_id)            -- prevent duplicate products per merchant
);

CREATE INDEX product_listings_brand_id_idx ON product_listings(brand_id);
CREATE INDEX product_listings_category_id_idx ON product_listings(category_id);
CREATE INDEX product_listings_embedding_idx ON product_listings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

**Why Postgres + pgvector instead of Zvec/Vectorize:** We're already on Postgres with pgvector available. Per-merchant Zvec files add operational complexity (file management, loading/unloading, separate query path). Postgres IVFFlat indexes with a `brand_id` filter give us per-merchant vector search without any new infrastructure. At our scale (thousands of products per merchant, not millions), Postgres handles this fine.

### Key decisions

- **`embedding VECTOR(384)`** — e5-small-v2 produces 384-dimensional embeddings. pgvector's IVFFlat index handles similarity search.
- **`UNIQUE(brand_id, feed_item_id)`** — prevents duplicate products when re-ingesting the same feed. `feed_item_id` is the product's ID from the source (Shopify product ID, Google Shopping ID, etc.).
- **`category_id` FK to `product_categories`** — maps each product to the Google taxonomy. If the feed includes a Google product category, use it directly (same ID space). If not, fall back to FTS against `category_keywords`.
- **`brand_name` separate from merchant** — a Foot Locker listing for Nike shoes has `brand_id` pointing to Foot Locker but `brand_name = "Nike"`. Important for brand-specific search.

---

## Ingestion Pipeline

```
Step 1: Feed Acquisition
  Brand publishes feed (Google Shopping XML, CSV, Shopify API, custom API)
  │
  ▼
Step 2: Validation
  Required fields present? (name, price, image_url, product_url)
  Price format correct? Image accessible?
  Flag invalid products, ingest valid ones.
  │
  ▼
Step 3: GTIN Extraction
  Capture GTIN/UPC/EAN/MPN if available in the feed.
  Store alongside product — critical for future dedup when retailers are added.
  │
  ▼
Step 4: Category Mapping
  Map each product to a product_categories ID (= Google taxonomy number).
  If feed includes Google product category → use directly (it's the same ID space).
  If not → match product name against category_keywords table (same FTS from Stage 1).
  │
  ▼
Step 5: Embed
  Embed product name + description with e5-small-v2 (batch, ~16ms per product).
  No AI/LLM call — small embedding model, not a language model.
  │
  ▼
Step 6: Store
  Upsert into product_listings with ON CONFLICT (brand_id, feed_item_id) DO UPDATE.
  │
  ▼
Step 7 (optional): AI Enrichment
  LLM generates agent summary + purchase intent phrases per product.
  Re-embed with enriched text for better vector search recall.
  Quality improvement, not a requirement. Ship without it first.
```

### Feed Sources (in order of preference)

1. **Shopify Storefront API** — Many DTC brands run on Shopify. The Storefront API is public (read-only, no auth for product data). GraphQL queries return products with images, variants, prices, availability.
2. **Google Shopping feed** — XML product feed. Most brands already have one for Google Merchant Center. Includes GTIN, price, availability, images, Google product category.
3. **Affiliate network feeds** — ShareASale, CJ, Rakuten. Access to brand product data without direct API relationships.
4. **Sitemap + page crawl** — Parse sitemap.xml for product URLs, crawl each page, extract JSON-LD/microdata. Fallback when no feed or API exists.

### Embedding Model

`intfloat/e5-small-v2` — 118M params, 384 dimensions, ~16ms on CPU via ONNX. Best accuracy-to-speed ratio for product search. Used at ingestion (batch) and query time (single embedding).

We need the ONNX runtime installed (`@xenova/transformers` or similar). This runs in-process on Replit — no external API call needed.

---

## Query Pipeline (Stage 3 addition to recommend)

After Stage 2 produces ranked merchants, Stage 3 searches products for the top merchants:

```typescript
async function searchProducts(
  query: string,
  merchants: MerchantResult[],
  categoryIds: number[],
  maxPerMerchant: number = 5
) {
  const embedding = await embed(query); // e5-small-v2, ~16ms
  
  const topMerchants = merchants.filter(m => m.recommended); // top 3
  
  return Promise.all(topMerchants.map(async (m) => {
    const products = await db.execute(sql`
      SELECT name, brand_name, price_cents, currency, in_stock,
             image_url, product_url,
             1 - (embedding <=> ${embedding}::vector) AS relevance_score
      FROM product_listings
      WHERE brand_id = ${m.id}
        AND in_stock = true
        AND (${categoryIds.length === 0} OR category_id = ANY(${categoryIds}::int[]))
      ORDER BY embedding <=> ${embedding}::vector
      LIMIT ${maxPerMerchant}
    `);
    return { ...m, products: products.rows };
  }));
}
```

Key points:
- Only searches the **top 3 recommended merchants** — not all results
- Uses pgvector's `<=>` operator for cosine distance
- Filters by `in_stock = true` and optionally by category
- Returns at most 5 products per merchant
- The vector search query per merchant is ~5-10ms with IVFFlat index

---

## GTIN Handling

Capture GTIN / UPC / EAN / MPN for every product where available. Store it even if not used immediately.

**Why it matters for the future:** when retailers are added alongside brands, GTIN clusters the same product across sellers into one entity with multiple offers. By capturing GTIN now, the infrastructure is ready when deduplication becomes necessary.

**For brand-first (current phase):** GTIN is stored but not actively used for dedup. Each brand's products are unique within their own catalog.

---

## Optional: AI Enrichment Layer

Not required for launch. Add when search recall needs improvement.

For each product, an LLM generates:

**Agent summary** (2-4 sentences): descriptive, attribute-rich language for how agents reason about products. Not marketing copy. Answers: what is this, who is it for, what does it do, what are the limits.

**Purchase intent phrases** (15-20 per product): natural language queries an agent might use. "comfortable running shoes for flat feet", "lightweight trail runners under $150", "Nike daily training shoe."

Enriched text is concatenated with product name and re-embedded. Improves vector search recall — "something for my feet on long runs" matches "Nike Pegasus 41" because intent phrases bridge the semantic gap.

**Cost:** ~$0.001 per product. 50K products = ~$50. Batch, not per-query.

**When to add:** test 100 queries against your product index. If recall is below 80%, enrichment will help.

---

## Storage Estimates

| Products | Table size | Index size | Query latency |
|---|---|---|---|
| 1K (5 merchants × 200) | ~5MB | ~10MB | <5ms |
| 10K (50 merchants × 200) | ~50MB | ~100MB | <10ms |
| 100K (500 merchants × 200) | ~500MB | ~1GB | <15ms |
| 1M (5K merchants × 200) | ~5GB | ~10GB | <20ms |

All well within Replit Postgres limits. IVFFlat index needs rebuilding after major data loads (`REINDEX INDEX product_listings_embedding_idx`).

---

## Refresh Cadence

| Feed type | Refresh |
|---|---|
| Shopify Storefront API | Weekly default, daily for high-velocity brands |
| Google Shopping XML | Weekly |
| Affiliate feeds | Weekly |
| Sitemap crawl | Monthly |

Only re-embed products that changed since last ingestion (compare price, stock, name hash against `last_synced`).

---

## Build Sequence

### Step 1: Schema + pgvector setup
- Enable pgvector extension (`CREATE EXTENSION IF NOT EXISTS vector`)
- Add `product_listings` table to `shared/schema.ts`
- Run `db:push` to create the table
- Verify: table exists, vector column works, IVFFlat index created

### Step 2: Embedding infrastructure
- Install ONNX runtime / `@xenova/transformers` for e5-small-v2
- Build `lib/embeddings/embed.ts` — single function that takes text, returns 384-dim vector
- Test: embed a few product names, verify vector dimensions

### Step 3: First merchant ingestion (Shopify)
- Pick 2-3 brands with Shopify stores (check existing scanned merchants for Shopify detection)
- Build ingestion script: `scripts/ingest-shopify-products.ts`
- Fetch products via Storefront API → validate → category map → embed → upsert
- Verify: `SELECT count(*) FROM product_listings WHERE brand_id = X` returns products

### Step 4: Wire products into recommend API
- Add `searchProducts()` to the recommend endpoint
- For top 3 merchants, search product_listings if they have products
- Populate the `products[]` array in the response
- Add `"products"` to `meta.stages_executed` when product search runs

**✅ Verify after Step 4:**
- `POST /api/v1/recommend {"categories": ["shoes"]}` returns merchants with products populated
- Merchants without product feeds still return `products: []`
- Product search adds <20ms to total query time
- `meta.stages_executed` includes "products"

### Step 5: Scale to more merchants
- Build Google Shopping XML feed parser
- Build sitemap/crawl-based ingestion fallback
- Add more merchants' product feeds
- Build refresh scheduler (weekly re-ingest)

### Step 6 (optional): AI enrichment
- Test recall on 100 queries
- If below 80%, add LLM enrichment pipeline
- Re-embed enriched products

---

## What's NOT in scope

- **Cloudflare edge deployment** — we're building on Replit with Postgres. Edge optimization is a separate future decision if query volume demands it.
- **Retailer deduplication** — brand-first means each brand's catalog is unique. GTIN is captured for future use but not actively deduplicated.
- **Real-time inventory sync** — weekly refresh is sufficient. Real-time would require webhooks from each merchant.
