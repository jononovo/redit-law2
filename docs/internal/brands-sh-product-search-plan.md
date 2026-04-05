# brands.sh — Product Search & Ingestion

*Covers: Stage 3 product search, feed ingestion pipeline, GTIN handling, brand-first strategy, per-merchant Zvec collections, AI enrichment (optional), edge deployment. For Stages 1-2 (categories, merchants, API response, skills), see `brands-sh-merchant-index-plan.md`.*

### Related Documents

| Document | Relevance |
|---|---|
| `brands-sh-merchant-index-plan.md` | Stages 1-2, API response shape, skill format, deployment overview |
| `docs/build context/Shopy/3. product-index-taxonomy-plan.md` | GPT taxonomy, `product_categories` + `brand_categories` schema |
| `docs/build context/Product_index/agent-readiness-and-product-index-service.md` | Tier 3 vision, catalog enrichment, distribution |

---

## How Stage 3 Connects to Stages 1-2

Stage 2 produces a ranked list of 10 merchants. Stage 3 takes the top merchants and searches their product collections. Products are nested under each merchant in the API response. Merchants without product feeds get an empty `products[]` array — the agent uses their `skill_url` instead.

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
Step 4: GPT Category Mapping
  Map each product to a GPT category ID.
  If feed includes Google product category → use directly.
  If not → match product name against category_keywords table (same FTS from Stage 1).
  │
  ▼
Step 5: Embed
  Embed product name + description with e5-small-v2 (batch, ~16ms per product).
  No AI/LLM call — small embedding model, not a language model.
  │
  ▼
Step 6: Store
  Insert into merchant's Zvec collection with all scalar metadata.
  Write collection file to disk / object storage.
  │
  ▼
Step 7 (optional): AI Enrichment
  LLM generates agent summary + purchase intent phrases per product.
  Re-embed with enriched text for better vector search recall.
  Quality improvement, not a requirement. Ship without it first.
```

### What each step uses

| Step | AI? | Technology |
|---|---|---|
| Feed acquisition | No | HTTP fetch, API client, file parse |
| Validation | No | Schema validation, URL checks |
| GTIN extraction | No | Field mapping from feed schema |
| GPT category mapping | No (usually) | Direct from feed, or FTS fallback |
| Embedding | No (not LLM) | e5-small-v2 ONNX |
| Storage | No | Zvec insert |
| AI enrichment | **Yes (optional, batch)** | LLM generates summaries + intent phrases |

### Feed Sources (in order of preference)

1. **Brand API** — Shopify Storefront API, custom REST/GraphQL. Best quality, most structured.
2. **Google Shopping feed** — XML product feed. Most brands already have one for Google Merchant Center. Includes GTIN, price, availability, images, Google product category.
3. **Affiliate network feeds** — ShareASale, CJ, Rakuten. Access to brand product data without direct API relationships.
4. **Sitemap + page crawl** — Parse sitemap.xml for product URLs, crawl each page, extract JSON-LD/microdata. Fallback when no feed or API exists.

---

## GTIN Handling

Capture GTIN / UPC / EAN / MPN for every product where available. Store it even if not used immediately.

```sql
-- Fields on product_index
upc   TEXT,    -- Universal Product Code
gtin  TEXT,    -- Global Trade Item Number (EAN-13, UPC-A, etc.)
mpn   TEXT,    -- Manufacturer Part Number
```

**Why it matters for the future:** when retailers are added alongside brands, GTIN clusters the same product across sellers into one entity with multiple offers. By capturing GTIN now, the infrastructure is ready when deduplication becomes necessary.

**For brand-first (current phase):** GTIN is stored but not actively used for dedup. Each brand's products are unique within their own catalog.

---

## Per-Merchant Zvec Collections

One Zvec collection per merchant with an indexed catalog. At query time, only the top 3 recommended merchants (from Stage 2) are searched — not all 3,000.

### Schema

```python
schema = zvec.CollectionSchema(
    name="merchant_{slug}",
    vectors=zvec.VectorSchema("product_embedding", zvec.DataType.VECTOR_FP32, 384),
    scalars=[
        zvec.ScalarSchema("name", zvec.DataType.STRING),
        zvec.ScalarSchema("price_cents", zvec.DataType.INT64),
        zvec.ScalarSchema("in_stock", zvec.DataType.BOOL),
        zvec.ScalarSchema("gpt_category_id", zvec.DataType.INT64),
        zvec.ScalarSchema("image_url", zvec.DataType.STRING),
        zvec.ScalarSchema("product_url", zvec.DataType.STRING),
        zvec.ScalarSchema("brand", zvec.DataType.STRING),
        zvec.ScalarSchema("gtin", zvec.DataType.STRING),
        zvec.ScalarSchema("currency", zvec.DataType.STRING),
    ]
)
```

### Query Pipeline

Searches only merchants that have Zvec collections. Merchants without feeds return empty `products[]`.

```typescript
async function searchProducts(query, merchants, categoryIds, maxPerMerchant = 5) {
  const embedding = await embed(query); // e5-small-v2, ~16ms
  return Promise.all(merchants.map(async (m) => {
    if (!collectionExists(`merchant_${m.slug}`)) return { ...m, products: [] };
    const results = await loadCollection(`merchant_${m.slug}`).query(
      zvec.VectorQuery("product_embedding", vector=embedding),
      filters={ gpt_category_id: { $in: categoryIds }, in_stock: true },
      topk=maxPerMerchant
    );
    return { ...m, products: results };
  }));
}
```

### Embedding Model

`intfloat/e5-small-v2` — 118M params, 16ms on CPU via ONNX. Best accuracy-to-speed ratio per 2026 benchmarks. Used at ingestion (batch) and query time (single embedding).

### Refresh Cadence

| Feed type | Refresh |
|---|---|
| Brand API (Shopify, custom) | Weekly default, daily for high-velocity brands |
| Google Shopping XML | Weekly |
| Affiliate feeds | Weekly |
| Sitemap crawl | Monthly |

Only re-embed products that changed since last ingestion (compare price, stock, name hash).

### Storage

| Merchants | Disk | RAM/query |
|---|---|---|
| 10 | ~500MB-1GB | ~100MB (3 loaded) |
| 100 | ~5-10GB | ~100MB |
| 1,000 | ~50-100GB | ~100MB |

Per-tenant search indexes are standard: Elasticsearch (per tenant), Algolia (per customer), Pinecone (namespaces), SQLite (per user).

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

## Edge Deployment (Phase 4)

When agent query volume grows, move the product search layer to Cloudflare alongside Stages 1-2.

| Component | Cloudflare service | Replaces |
|---|---|---|
| Product embeddings | **Workers AI** (built-in models) | ONNX on Replit |
| Product search | **Vectorize** (per-merchant indexes) | Zvec files |

Zvec and Vectorize serve the same purpose — per-merchant vector search. Zvec is in-process (for local/Replit). Vectorize is managed edge (for Cloudflare). Same data, same schema, different engine.

### Timing (product search stage only)

```
Local (Zvec):        ~20ms per query
Cloudflare (Vectorize): ~10ms per query
```

---

## Build Sequence (Phases 3-4)

```
Phase 3 — Product ingestion & search (priority, ship ASAP):
  9. Build ingestion pipeline (feed fetch → validate → GTIN extract → category map → embed → store)
  10. Connect first brand product feed (1-2 brands with Shopify or Google Shopping feeds)
  11. Set up Zvec + e5-small-v2
  12. Build per-merchant Zvec collections from ingested feeds
  13. Integrate product results into /api/v1/recommend response
  14. Scale to more brands as feeds are connected
  15. (Optional) Add AI enrichment layer when search recall needs improvement

Phase 4 — Edge deployment (when volume warrants):
  16. Publish merchant data + keywords to Cloudflare KV
  17. Deploy query Worker
  18. Set up Vectorize indexes + Workers AI
  19. Move agent-facing traffic to Cloudflare edge
```

For Phases 1-2 (core pipeline, skills, distribution), see `brands-sh-merchant-index-plan.md`.
