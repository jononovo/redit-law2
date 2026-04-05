# brands.sh — Merchant Index & Skill System

*Covers: query pipeline (Stages 1-2), API response, skill format, distribution. For product search (Stage 3), see `brands-sh-product-search-plan.md`.*

### Related Documents

| Document | Relevance |
|---|---|
| `brands-sh-product-search-plan.md` | Stage 3: product ingestion, per-merchant vector search, GTIN, feed strategy |
| `docs/build context/Shopy/3. product-index-taxonomy-plan.md` | Original taxonomy planning, `product_categories` + `brand_categories` schema |
| `docs/build context/Product_index/agent-readiness-and-product-index-service.md` | Three-tier service vision, agent gateway |
| `docs/build context/Product_index/creditclaw-agentic-commerce-strategy.md` | ASX Score definition, scoring pillars |

---

## Why This Exists

AI shopping agents need two things to buy a product: **which merchant to use** and **how to shop there**. The Merchant Index answers both questions in a single API call. An agent asks "where can I buy running shoes?" and gets back ranked merchants with ASX scores, matched product categories, and a SKILL.md URL for each merchant that teaches the agent how to navigate that store.

Without this, agents either hardcode a few merchants (limits them) or rely on general web search (unreliable, no checkout guidance). The Merchant Index is what makes brands.sh useful to agents — it's the product catalog for merchants themselves.

The system serves three tenants (CreditClaw, brands.sh, shopy) through the same pipeline. brands.sh is the public-facing merchant directory. CreditClaw uses it for procurement controls. shopy uses it for the CLI skill registry.

---

## What This Is

An agent sends a query. We resolve categories, rank merchants, serve products where available, and provide shopping skill files for every merchant. Three access modes, three progressive disclosure levels, one backend.

| Access mode | Entry point | AI call? |
|---|---|---|
| **Structured** | `POST /api/v1/recommend` | No |
| **Natural language** | `GET /api/v1/recommend?q=...` | One fast LLM call (~1-5s via Perplexity Sonar) |
| **MCP / CLI** | `search_merchants` tool | Depends on input |

Internal and external agents use the same code paths.

### Open/free tier vs full service

**Full service (intake + Stages 1-2-3):** We run the LLM intake, resolve categories, rank merchants, and return products. The agent sends natural language; we handle everything.

**Bare-bones (Stages 1-2-3 only):** External agents do their own intent analysis, then hit the structured POST directly with category IDs or text terms. They get the same category resolution (via `category_keywords` FTS), the same merchant ranking, and the same product results — just without the intake LLM. This is the free/open path.

The `category_keywords` table is the key enabler for the bare-bones offering. An external agent can query it directly to translate its own extracted terms into category IDs, then pass those IDs to the merchant ranking stage. The intake LLM is a convenience layer on top, not a requirement.

The structured POST accepts both:
- `category_ids: number[]` — skip Stage 1 entirely, go straight to merchant ranking
- `categories: string[]` — run Stage 1 FTS to resolve text to IDs, then rank

---

## Architecture

```
"I want a guci bag but cheaper"
  │
  ▼
Intake (natural language only, ~1-5s via Perplexity Sonar)
  LLM → { categories: ["handbags"], brand: "Gucci", tier: "value", intent: "alternative" }
  │
  ▼
Stage 1: Category Resolution (~5ms)
  Postgres FTS against category_keywords → category IDs
  │
  ▼
Stage 2: Merchant Ranking (~5ms)
  brand_categories + brand_index with ancestor walking
  → 10 merchants, top 3 recommended
  │
  ▼
Stage 3: Product Search (~20ms, where available) — NOT YET BUILT
  Per-merchant vector collections for top merchants
  → products nested under each merchant (see product search plan)
  │
  ▼
Response: merchants + products + skill URLs
```

---

## Stage 1: Category Resolution — BUILT ✅

### The Keyword Table

`product_categories.id` IS the Google taxonomy number (e.g., 166 = "Apparel & Accessories"). The seed script inserts Google IDs directly as the primary key. No separate `gpt_id` column exists or is needed — `category_id` in the keyword table already references the Google taxonomy number via the FK.

**Table:** `category_keywords` in `shared/schema.ts`
- `id` — serial PK
- `category_id` — FK to `product_categories(id)`, unique index
- `category_name`, `category_path` — denormalized for join-free reads
- `keywords` — `text[]` array of 15 keywords per category
- `keywords_tsv` — `tsvector` column with GIN index, built using `to_tsvector('english', array_to_string(keywords, ' '))` for proper English stemming
- `generated_at` — timestamp

### Keyword Generation Script

**File:** `scripts/generate-category-keywords.ts`

Batch script that generates keywords for all 5,638 product categories using Perplexity Sonar:
- **Batch size:** 15 categories per API call (40 caused timeouts)
- **Resumable:** Checks existing rows on startup, skips already-populated categories
- **Fallback:** If API fails for a batch, inserts path-derived keywords so the category isn't skipped forever
- **Atomic:** Each batch is wrapped in a DB transaction (insert + tsvector update together)
- **tsvector:** Uses `to_tsvector('english', ...)` not `array_to_tsvector()` — this enables stemming so "shoes" matches "shoe", "running" matches "runner", etc.

**Current state:** ~1,051 of 5,638 categories populated. Script can be re-run anytime to continue filling. Categories are processed in ID order, so lower-numbered Google taxonomy categories (top-level: Animals, Arts, Electronics, Food) are populated first. Higher-numbered categories (Apparel subcategories, Sporting Goods details) need more runs.

**To populate more:** Just run `npx tsx scripts/generate-category-keywords.ts` — it picks up where it left off. Each run processes ~100-150 categories before timeouts. Full population takes ~60+ runs.

### FTS Query

```sql
SELECT category_id, category_name, category_path,
  ts_rank(keywords_tsv, websearch_to_tsquery('english', $1)) AS rank
FROM category_keywords
WHERE keywords_tsv @@ websearch_to_tsquery('english', $1)
ORDER BY rank DESC
LIMIT 5;
```

Returns `category_id` values that are directly usable as `product_categories.id` (which are the Google taxonomy numbers). These feed straight into Stage 2.

---

## Stage 2: Merchant Ranking — BUILT ✅

Merchants are tagged at varying category depths. The query walks up the tree so shallowly-tagged merchants still surface, but deeply-tagged ones rank higher.

```sql
WITH RECURSIVE ancestors AS (
  SELECT DISTINCT id, parent_id, depth, name
  FROM product_categories WHERE id = ANY($1::int[])
  UNION
  SELECT pc.id, pc.parent_id, pc.depth, pc.name
  FROM product_categories pc JOIN ancestors a ON pc.id = a.parent_id
  WHERE a.depth > 0
),
matched_merchants AS (
  SELECT bi.id, bi.slug, bi.name, bi.domain, bi.sector, bi.tier,
    COALESCE(bi.overall_score, 0) AS asx_score,
    bi.skill_md IS NOT NULL AS has_skill,
    MAX(anc.depth) AS match_depth,
    array_agg(DISTINCT anc.name) AS matched_categories,
    CASE WHEN $3 != '' AND (bi.slug = $3 OR bi.name ILIKE $3) THEN 1 ELSE 0 END AS brand_match
  FROM brand_index bi
  JOIN brand_categories bc ON bc.brand_id = bi.id
  JOIN ancestors anc ON anc.id = bc.category_id
  WHERE ($2 = '' OR bi.tier = $2)
  AND bi.maturity IN ('verified', 'official', 'beta', 'community', 'draft')
  GROUP BY bi.id
)
SELECT * FROM matched_merchants
ORDER BY brand_match DESC, match_depth DESC, asx_score DESC
LIMIT $4;
```

Key design decisions in the built version:
- **`UNION` not `UNION ALL`** — deduplicates ancestor rows when multiple seed categories share parents
- **`WHERE a.depth > 0`** — prevents infinite recursion at the root node
- **Empty string instead of NULL** — brand/tier params use `!= ''` checks instead of `IS NULL` to avoid Drizzle parameterization issues with nulls
- **All maturity levels included** — currently only 19 merchants exist, all `draft`. The maturity filter will be tightened once more merchants reach `beta`/`verified`
- **Brand match boost** — when the intake extracts a brand name (e.g., "Gucci"), that brand sorts to the top regardless of match depth

### How ranking works

1. **Brand match** first — if the user asked for Nike, Nike goes to position 1
2. **Match depth** second — a merchant tagged at "Electronics > Computers > Laptops" (depth 3) outranks one tagged at just "Electronics" (depth 1) for a "laptops" query
3. **ASX score** third — among equal-depth matches, higher-scored merchants rank higher

This means BestBuy (tagged at Laptops, depth 3) beats Walmart (tagged at Electronics, depth 1) for laptop queries, even though Walmart has a higher ASX score. The specificity of the category match matters more than the overall score.

---

## The Intake Layer — BUILT ✅

For natural language queries only. Structured requests bypass entirely.

**File:** `app/api/v1/recommend/route.ts` (inline `runIntake()` function)

One Perplexity Sonar call extracts structured intent. Handles typos ("guci" → "Gucci"), brand recognition, tier inference, intent detection.

**Model:** Perplexity Sonar (consistent with the rest of the codebase's LLM usage)
**Latency:** 1-5 seconds (Perplexity is slower than Haiku/Groq but already integrated)
**Cost:** ~$0.001/query

---

## The API Endpoint — BUILT ✅

**File:** `app/api/v1/recommend/route.ts`

### POST (structured)

```
POST /api/v1/recommend
{
  "category_ids": [328],           // skip FTS, go straight to ranking
  "categories": ["laptops"],       // run FTS first
  "tier": "mid_range",             // optional filter
  "brand": "bestbuy",              // optional brand boost
  "limit": 10                      // max 50
}
```

Validated with Zod:
- `category_ids` — array of positive integers, max 20
- `categories` — array of strings (1-100 chars each), max 10
- `tier` — must be one of the 7 valid tiers
- `brand` — string, 1-100 chars
- `limit` — integer, 1-50

### GET (natural language)

```
GET /api/v1/recommend?q=where+can+I+buy+a+laptop&tier=mid_range&limit=10
```

- `q` — required, max 500 chars
- `tier` — optional, validated against tier list
- `limit` — optional, clamped to [1, 50]

### Response shape

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
    category_id: number;
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
    rank: number;               // 1-N
    match_depth: number;
    matched_categories: string[];
    skill_url: string;          // https://brands.sh/brands/{slug}/skill
    has_skill: boolean;
    products: unknown[];        // empty until Stage 3 is built
  }[];
  total_merchant_matches: number;
  meta: {
    query_time_ms: number;
    intake_time_ms: number | null;
    stages_executed: string[];
  };
}
```

### Verified behavior

Tested and working:
- `POST {"categories": ["laptops"], "tier": "mid_range"}` → returns Best Buy (#1, match depth 3, score 78) and Sweetwater (#2, match depth 2, score 76)
- `POST {"category_ids": [328]}` → same results, skips FTS
- `GET ?q=where+can+I+buy+a+laptop` → intake extracts "laptops", resolves to category 328, returns 5 merchants
- Tier filtering works (only returns merchants matching the tier)
- Validation rejects bad tiers, negative limits, oversized arrays

---

## Skill Format & Distribution

### What already exists

Per-merchant SKILL.md files are already generated and served:
- **Generator:** `lib/procurement-skills/generator.ts` — builds SKILL.md from `VendorSkill` data
- **Storage:** `brand_index.skill_md` column (text) — stores generated markdown
- **Serving:** `app/brands/[slug]/skill/route.ts` → `GET /brands/{slug}/skill` (text/markdown, Cache-Control: 86400)
- **JSON companion:** `app/brands/[slug]/skill-json/route.ts` → `GET /brands/{slug}/skill-json` (application/json)
- **Front matter:** Currently uses `creditclaw-shop-{slug}` naming, CreditClaw-specific homepage URLs

### What's planned: two skill types

| | Master skill | Per-merchant skill |
|---|---|---|
| Purpose | API reference — how to query the index | Store navigation — how to shop at one store |
| Name | `brands-sh` | `{slug}-shopping` (e.g. `nike-shopping`) |
| Install | `npx skills add brands-sh/shop --skill brands-sh` | `npx skills add brands-sh/shop --skill nike` |
| URL | `https://brands.sh/skill.md` | `https://brands.sh/brands/nike/skill` |
| Count | 1 | 3,000+ |

### Migration: CreditClaw-scoped → brands.sh-scoped skills

The existing generator produces CreditClaw-branded skills (`creditclaw-shop-{slug}`, `homepage: creditclaw.com/skills/...`). For the `brands-sh/shop` repo, skills need to be tenant-neutral or brands.sh-branded. This is a generator change — the per-merchant SKILL.md body structure stays the same, but the front matter needs updating:

- `name:` → `{slug}-shopping` (not `creditclaw-shop-{slug}`)
- `homepage:` → `https://brands.sh/skills/{slug}` (not `creditclaw.com`)
- `requires:` → remove `[creditclaw]` (brands.sh skills are standalone)

**⚠️ Any changes to skill front matter or format MUST be discussed with the user before implementation.**

### Discovery endpoints

**Primary:** Skills served as `skill_url` in the `/api/v1/recommend` response. No separate discovery step needed.

**Already exists:** `GET /brands/{slug}/skill` (SKILL.md) and `GET /brands/{slug}/skill-json` (skill.json) — both served by Next.js with 24h cache.

---

## What Exists vs What's New

| Component | Status |
|---|---|
| `product_categories` table (Google taxonomy IDs as PKs) | **Exists** — seeded by `scripts/seed-google-taxonomy.ts` |
| `brand_categories` junction table | **Exists** — links brands to categories |
| `brand_index` table | **Exists** — includes `overall_score`, `skill_md`, `sector`, `tier` |
| SKILL.md generation (`lib/procurement-skills/generator.ts`) | **Exists** — currently CreditClaw-branded |
| `/brands/{slug}/skill` route (SKILL.md serving) | **Exists** — text/markdown, 24h cache |
| `/brands/{slug}/skill-json` route | **Exists** — JSON, 24h cache |
| `category_keywords` table | **Built** ✅ — Drizzle schema, GIN index, unique constraint |
| Keyword generation script | **Built** ✅ — `scripts/generate-category-keywords.ts`, resumable, ~1,051/5,638 populated |
| `/api/v1/recommend` endpoint (POST + GET) | **Built** ✅ — Zod validation, FTS, recursive CTE, brand boost |
| Intake LLM layer | **Built** ✅ — Perplexity Sonar, inline in recommend route |
| Master SKILL.md (API reference for agents) | **Not built** — needs front matter discussion |
| `brands-sh/shop` GitHub repo (auto-generated skills) | **Not built** — needs front matter discussion first |
| `.well-known/agent-skills/index.json` | **Not built** |
| Product search (Stage 3) | **Not built** — see `brands-sh-product-search-plan.md` |

---

## Outstanding Work

### Immediate (unblocks further progress)

1. **Finish keyword population** — run `scripts/generate-category-keywords.ts` more times to cover all 5,638 categories (~1,051 done). Each run adds ~100-150 categories. This is a background task, not a code change.

2. **Grow merchant coverage** — only 19 merchants in `brand_index` currently. The recommend API works perfectly but results are limited to what's in the database. More scans = more merchants = better results. The scan queue can batch this.

### Phase 2 — Skills & distribution (not started)

3. **Front matter discussion** — review generator.ts front matter with user before any changes
4. **Write master SKILL.md** — API reference for the recommend endpoint
5. **Set up `brands-sh/shop` GitHub repo** — auto-generated skill files from DB
6. **Wire brands.sh catalog search** — use recommend API for search results on the brands.sh site

### Phase 3 — Product search (not started)

See `brands-sh-product-search-plan.md` for full details. This is where products are ingested per merchant and nested into the recommend response.

---

## Refresh Cadence

| Data | Refresh |
|---|---|
| Google taxonomy | On new Google version (~1x/year) |
| Category keywords | Quarterly or after taxonomy update (re-run the script) |
| Merchant ↔ category mappings | On merchant onboard via `upsertBrandIndex()` |
| ASX scores | Live — updated per scan |
| Product feeds | Weekly (when Stage 3 is built) |
