# brands.sh — Merchant Index & Skill System

*Covers: query pipeline (Stages 1-2), API response, skill format, distribution, deployment. For product search (Stage 3), see `brands-sh-product-search-plan.md`.*

### Related Documents

| Document | Relevance |
|---|---|
| `brands-sh-product-search-plan.md` | Stage 3: product ingestion, Zvec collections, GTIN, feed strategy |
| `docs/build context/Shopy/3. product-index-taxonomy-plan.md` | GPT taxonomy, `product_categories` + `brand_categories` schema |
| `docs/build context/Product_index/agent-readiness-and-product-index-service.md` | Three-tier service vision, agent gateway |
| `docs/build context/Product_index/creditclaw-agentic-commerce-strategy.md` | ASX Score definition, scoring pillars |

---

## What This Is

An agent sends a query. We resolve categories, rank merchants, serve products where available, and provide shopping skill files for every merchant. Three access modes, three progressive disclosure levels, one backend.

| Access mode | Entry point | AI call? |
|---|---|---|
| **Structured** | `POST /api/v1/recommend` | No |
| **Natural language** | `GET /api/v1/recommend?q=...` | One fast LLM call (~300ms) |
| **MCP / CLI** | `search_merchants` tool | Depends on input |

Internal and external agents use the same code paths.

---

## Architecture

```
"I want a guci bag but cheaper"
  │
  ▼
Intake (natural language only, ~300ms)
  LLM → { categories: ["handbags"], brand: "Gucci", tier: "value", intent: "alternative" }
  │
  ▼
Stage 1: Category Resolution (~5ms)
  Postgres FTS against category_keywords → GPT IDs
  │
  ▼
Stage 2: Merchant Ranking (~5ms)
  brand_categories + brand_index with ancestor walking
  → 10 merchants, top 3 recommended
  │
  ▼
Stage 3: Product Search (~20ms, where available)
  Per-merchant Zvec collections for top merchants
  → products nested under each merchant (see product search plan)
  │
  ▼
Response: merchants + products + skill URLs
```

---

## The Intake Layer

For natural language queries only. Structured requests bypass entirely.

One fast LLM call extracts structured intent. Handles typos ("guci" → "Gucci"), brand recognition, tier inference, intent detection.

**Prompt:**
```
Extract shopping intent. Return JSON only.
Query: "{user_query}"
{
  "categories": string[],
  "brand": string | null,
  "tier": "value" | "mid-range" | "premium" | "luxury" | null,
  "intent": "find" | "compare" | "alternative" | "specific_product",
  "corrected_query": string
}
```

**Model:** Claude Haiku (~300ms) or Groq Llama 3 (~150ms). Structured extraction, not reasoning. ~$0.0001/query.

---

## Stage 1: Category Resolution

### The Keyword Table (only new data structure)

```sql
CREATE TABLE category_keywords (
  id            SERIAL PRIMARY KEY,
  category_id   INTEGER NOT NULL REFERENCES product_categories(id) ON DELETE CASCADE,
  gpt_id        INTEGER NOT NULL,
  category_name TEXT NOT NULL,
  category_path TEXT NOT NULL,
  keywords      TEXT[] NOT NULL,
  keywords_tsv  TSVECTOR NOT NULL,
  generated_at  TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(category_id)
);

CREATE INDEX category_keywords_tsv_idx ON category_keywords USING GIN(keywords_tsv);
CREATE INDEX category_keywords_gpt_id_idx ON category_keywords(gpt_id);
```

### Keyword Generation (Batch Script, Runs Quarterly)

LLM generates 15-20 keywords per category. ~5,600 categories ÷ 50 per batch = 112 calls. Cost: ~$3. Time: ~30 minutes. Re-run quarterly or when Google updates the taxonomy.

### Query

```sql
SELECT gpt_id, category_name, category_path,
  ts_rank(keywords_tsv, websearch_to_tsquery('english', $1)) AS rank
FROM category_keywords
WHERE keywords_tsv @@ websearch_to_tsquery('english', $1)
ORDER BY rank DESC
LIMIT 5;
```

---

## Stage 2: Merchant Ranking (with Ancestor Walking)

Merchants are tagged at varying category depths. The query walks up the tree so shallowly-tagged merchants still surface, but deeply-tagged ones rank higher.

```sql
WITH RECURSIVE ancestors AS (
  SELECT id, gpt_id, parent_id, depth, name
  FROM product_categories WHERE gpt_id = ANY($1::int[])
  UNION ALL
  SELECT pc.id, pc.gpt_id, pc.parent_id, pc.depth, pc.name
  FROM product_categories pc JOIN ancestors a ON pc.id = a.parent_id
),
matched_merchants AS (
  SELECT bi.id, bi.slug, bi.name, bi.domain, bi.sector, bi.tier,
    bi.overall_score AS asx_score,
    bi.skill_md IS NOT NULL AS has_skill,
    MAX(anc.depth) AS match_depth,
    array_agg(DISTINCT anc.name) AS matched_categories
  FROM brand_index bi
  JOIN brand_categories bc ON bc.brand_id = bi.id   -- Drizzle: bc.brandId
  JOIN ancestors anc ON anc.id = bc.category_id     -- Drizzle: bc.categoryId
  WHERE ($2::text IS NULL OR bi.tier = $2)
  AND bi.maturity IN ('verified', 'official', 'beta')
  GROUP BY bi.id
)
SELECT * FROM matched_merchants
ORDER BY match_depth DESC, asx_score DESC
LIMIT 10;
```

As merchant category coverage deepens over time, rankings automatically improve. No query logic changes.

---

## The API Response

Products are nested under each merchant. If a merchant has a product feed, products are populated. If not, the array is empty — the agent uses the `skill_url` to navigate the store directly.

```typescript
interface RecommendResponse {
  query: string;
  intent: {
    categories: string[];
    brand: string | null;
    tier: string | null;
    intent_type: string;
  };
  resolved_categories: {
    gpt_id: number;
    name: string;
    path: string;
    relevance: number;
  }[];
  merchants: {
    slug: string;
    name: string;
    domain: string;
    sector: string;
    tier: string;
    asx_score: number;
    recommended: boolean;       // true for top 3
    rank: number;               // 1-10
    match_depth: number;
    matched_categories: string[];
    skill_url: string;          // https://brands.sh/skills/{slug}/skill.md
    products: {
      name: string;
      brand: string;
      price_cents: number;
      currency: string;
      in_stock: boolean;
      image_url: string;
      product_url: string;
      relevance_score: number;
    }[];                        // empty if no product feed
  }[];
  total_merchant_matches: number;
  meta: {
    query_time_ms: number;
    intake_time_ms: number | null;
    stages_executed: string[];
  };
}
```

### Example Response

```json
{
  "query": "I want a guci bag but cheaper",
  "intent": { "categories": ["handbags"], "brand": "Gucci", "tier": "value", "intent_type": "alternative" },
  "resolved_categories": [
    { "gpt_id": 6551, "name": "Handbags", "path": "Apparel & Accessories > Handbags", "relevance": 0.94 }
  ],
  "merchants": [
    {
      "slug": "coach", "name": "Coach", "domain": "coach.com",
      "sector": "apparel-accessories", "tier": "premium", "asx_score": 72,
      "recommended": true, "rank": 1, "match_depth": 3,
      "matched_categories": ["Handbags"],
      "skill_url": "https://brands.sh/skills/coach/skill.md",
      "products": [
        { "name": "Coach Willow Shoulder Bag", "brand": "Coach", "price_cents": 29500,
          "currency": "USD", "in_stock": true, "image_url": "https://coach.com/images/willow.jpg",
          "product_url": "https://coach.com/products/willow-shoulder-bag", "relevance_score": 0.91 }
      ]
    },
    {
      "slug": "gucci", "name": "Gucci", "domain": "gucci.com",
      "sector": "apparel-accessories", "tier": "luxury", "asx_score": 65,
      "recommended": true, "rank": 2, "match_depth": 3,
      "matched_categories": ["Handbags"],
      "skill_url": "https://brands.sh/skills/gucci/skill.md",
      "products": []
    },
    {
      "slug": "amazon", "name": "Amazon", "domain": "amazon.com",
      "sector": "multi-sector", "tier": "value", "asx_score": 91,
      "recommended": true, "rank": 3, "match_depth": 2,
      "matched_categories": ["Handbags"],
      "skill_url": "https://brands.sh/skills/amazon/skill.md",
      "products": [
        { "name": "Kate Spade Madison Satchel", "brand": "Kate Spade", "price_cents": 15900,
          "currency": "USD", "in_stock": true, "image_url": "https://m.media-amazon.com/images/...",
          "product_url": "https://amazon.com/dp/B0EXAMPLE1", "relevance_score": 0.84 }
      ]
    }
  ],
  "total_merchant_matches": 12,
  "meta": { "query_time_ms": 328, "intake_time_ms": 280, "stages_executed": ["intake", "categories", "merchants", "products"] }
}
```

**What the agent does:**
- Coach: products present → show them
- Gucci: products empty → fetch `skill_url`, navigate gucci.com
- Amazon: products present → show them

---

## Skill Format & Distribution

### Two skill types

| | Master skill | Per-merchant skill |
|---|---|---|
| Purpose | API reference — how to query the index | Store navigation — how to shop at one store |
| Name | `brands-sh` | `{slug}-shopping` (e.g. `nike-shopping`) |
| Install | `npx skills add brands-sh/shop --skill brands-sh` | `npx skills add brands-sh/shop --skill nike` |
| URL | `https://brands.sh/skill.md` | `https://brands.sh/skills/nike/skill.md` |
| Count | 1 | 3,000+ |

### GitHub repo: `brands-sh/shop`

```
brands-sh/shop/
├── brands-sh/SKILL.md              ← master skill
├── nike/
│   ├── SKILL.md                    ← under 500 lines
│   └── references/
│       └── checkout-details.md     ← loaded only when agent starts checkout
├── amazon/
│   ├── SKILL.md
│   └── references/
│       └── checkout-details.md
└── ... (3,000+ merchant folders)
```

Auto-generated from `brand_index`. CI pushes when merchants update. Installs feed the skills.sh leaderboard via telemetry — free distribution.

### Description as trigger mechanism

Anthropic's March 2026 guidance: the description is an activation interface. Agents use it to decide when to load the skill. Be specific.

**Master skill:**
```yaml
---
name: brands-sh
description: >
  Use when you need to find products to buy, compare online stores, get merchant
  recommendations, or shop for anything online. Handles product search by category,
  brand lookup (with typo correction), price tier filtering, and cross-merchant
  product comparison. Returns real products with prices, images, and direct purchase
  URLs where available, plus shopping instruction files for every merchant.
license: Apache-2.0
metadata:
  author: brands.sh
  version: "1.0"
  type: commerce-index
  api_base: https://brands.sh/api/v1
---
```

**Per-merchant skill:**
```yaml
---
name: nike-shopping
description: >
  Use when shopping at nike.com or when the user wants to buy Nike shoes, clothing,
  or athletic gear. Search by category, filter by size and color, add to cart, and
  checkout. Guest checkout available. Supports Apple Pay and PayPal.
license: Apache-2.0
metadata:
  author: brands.sh
  version: "1.2"
  type: commerce-skill
  domain: nike.com
  sector: fashion
  tier: premium
  asx_score: 77
  checkout_methods: ["browser_automation"]
  guest_checkout: true
  gpt_categories: [5322, 166, 988]
---
```

### Per-merchant SKILL.md body (under 500 lines)

Main file has the essential flow. Detailed checkout field mappings go in `references/checkout-details.md` — loaded only when the agent starts checkout (progressive disclosure).

### Discovery endpoints

**Primary:** Skills served as `skill_url` in the `/api/v1/recommend` response. No separate discovery step needed.

**Per-sector listing:** `GET /api/v1/registry/skills?sector=luxury`

**`.well-known`** (for CLI tooling): `brands.sh/.well-known/agent-skills/index.json` — Cloudflare RFC v0.2.0 schema, paginated by sector, with SHA-256 `digest` per skill.

### Versioning

TODO: Design versioning system. Requirements: bump version when merchant checkout flow changes, track version history, allow agents to pin versions. Details TBD.

### Signing

Add if skills.sh requires it or if adoption warrants it. Not blocking for launch. SHA-256 digests in the `.well-known` discovery index provide integrity verification for now.

---

## Deployment

### Phase A: Local (Replit) — start here

| Component | Technology |
|---|---|
| Category keywords | Postgres `category_keywords` table, GIN index |
| Merchant ranking | Postgres `brand_categories` + `brand_index` SQL |
| Intake LLM | External API (Haiku / Groq) |
| Product search | Zvec + e5-small-v2 ONNX (sidecar or in-process) |
| SKILL.md files | Served by Next.js from `brand_index.skill_md` |

### Phase B: Cloudflare Edge — scale

| Component | Cloudflare service | Replaces |
|---|---|---|
| Category keywords | **KV** (~1ms reads globally) | Postgres FTS |
| Merchant index | **KV** (3,000 merchant objects) | Postgres queries |
| Intake LLM | **Workers AI** (Gemma 4 26B A4B at edge) | External API call |
| Product embeddings | **Workers AI** (built-in models) | ONNX on Replit |
| Product search | **Vectorize** (per-merchant indexes) | Zvec files |
| SKILL.md files | **R2** (zero egress, global) | Next.js serving |
| Query pipeline | **Workers** (single function at edge) | Replit API route |

Replit stays as admin/dashboard/scanner (source of truth). Cloudflare is the read layer.

### Timing

```
Local — natural language:     ~330ms (300 intake + 5 + 5 + 20)
Local — structured:            ~30ms (5 + 5 + 20)
Cloudflare — natural language: ~163ms (150 intake + 1 + 1 + 10)
Cloudflare — structured:       ~12ms (1 + 1 + 10)
```

---

## What Exists vs What's New

| Component | Status |
|---|---|
| `product_categories` table | **Exists** |
| `brand_categories` junction table | **Exists** |
| `brand_index` table | **Exists** |
| `category_keywords` table | **New** — one table, GIN index |
| Keyword generation script | **New** — batch, runs quarterly |
| `/api/v1/recommend` endpoint | **New** — GET + POST |
| Intake LLM layer | **New** — one function |
| `brands-sh/shop` GitHub repo | **New** — auto-generated from DB |
| Master SKILL.md | **New** — API reference for agents |

---

## Build Sequence (Phases 1-2)

```
Phase 1 — Core pipeline (ships in days):
  1. Create category_keywords table + migration
  2. Run keyword generation batch script
  3. Build /api/v1/recommend (structured POST)
  4. Add natural language GET with intake LLM

Phase 2 — Skills & distribution:
  5. Write master SKILL.md for brands-sh
  6. Set up brands-sh/shop GitHub repo with CI auto-generation
  7. Add /.well-known/agent-skills/index.json (paginated by sector)
  8. Wire brands.sh catalog search to recommend API
```

For Phases 3-4 (product ingestion, search, edge deployment), see `brands-sh-product-search-plan.md`.

---

## Refresh Cadence

| Data | Refresh |
|---|---|
| GPT taxonomy | On new Google version (~1x/year) |
| Category keywords | Quarterly or after taxonomy update |
| Merchant ↔ category mappings | On merchant onboard via `upsertBrandIndex()` |
| ASX scores | Live — updated per scan |
| GitHub repo | CI push on merchant data change |
