---
name: Merchant Index & Skill System
description: The recommend API pipeline — category resolution, merchant ranking, and skill distribution. Read this before modifying the /api/v1/recommend endpoint or category keywords.
---

# Merchant Index & Skill System

**Status:** Stages 1-2 built and working. Stage 3 (product search) not started. Skill distribution (Phase 2) pending front matter discussion.

---

## Why It Exists

AI shopping agents need two things to buy a product: **which merchant to use** and **how to shop there**. The Merchant Index answers both questions in a single API call. An agent asks "where can I buy running shoes?" and gets back ranked merchants with ASX scores, matched product categories, and a SKILL.md URL for each merchant that teaches the agent how to navigate that store.

Without this, agents either hardcode a few merchants (limits them) or rely on general web search (unreliable, no checkout guidance). The Merchant Index is what makes brands.sh useful to agents — it's the product catalog for merchants themselves.

The system serves three tenants (CreditClaw, brands.sh, shopy) through the same pipeline.

### Related Documents

| Document | Relevance |
|---|---|
| `product-search-plan.md` | Stage 3: product ingestion, per-merchant vector search, GTIN, feed strategy |
| `../scanning/scan-taxonomy-skills-pipeline.md` | How brands get scanned and classified |

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

### Access modes

| Access mode | Entry point | AI call? |
|---|---|---|
| **Structured** | `POST /api/v1/recommend` | No |
| **Natural language** | `GET /api/v1/recommend?q=...` | One fast LLM call (~1-5s via Perplexity Sonar) |
| **MCP / CLI** | `search_merchants` tool | Depends on input |

---

## Stage 1: Category Resolution

### The Keyword Table

**Table:** `category_keywords` in `shared/schema.ts`
- `category_id` — FK to `product_categories(id)`, unique index
- `keywords` — `text[]` array of 15 keywords per category
- `keywords_tsv` — `tsvector` column with GIN index, using `to_tsvector('english', ...)` for proper English stemming

### Keyword Generation

**File:** `scripts/generate-category-keywords.ts`

Batch script using Perplexity Sonar (15 categories per call, resumable, atomic transactions). ~1,286 of 5,638 categories populated. Run `npx tsx scripts/generate-category-keywords.ts` to continue.

### FTS Query

```sql
SELECT category_id, category_name, category_path,
  ts_rank(keywords_tsv, websearch_to_tsquery('english', $1)) AS rank
FROM category_keywords
WHERE keywords_tsv @@ websearch_to_tsquery('english', $1)
ORDER BY rank DESC LIMIT 5;
```

---

## Stage 2: Merchant Ranking

Merchants are tagged at varying category depths. The query walks up the tree so shallowly-tagged merchants still surface, but deeply-tagged ones rank higher.

### How ranking works

1. **Brand match** first — if the user asked for Nike, Nike goes to position 1
2. **Match depth** second — a merchant tagged at "Electronics > Computers > Laptops" (depth 3) outranks one tagged at just "Electronics" (depth 1) for a "laptops" query
3. **ASX score** third — among equal-depth matches, higher-scored merchants rank higher

This means BestBuy (tagged at Laptops, depth 3) beats Walmart (tagged at Electronics, depth 1) for laptop queries, even though Walmart has a higher ASX score. The specificity of the category match matters more than the overall score.

---

## The API Endpoint

**File:** `app/api/v1/recommend/route.ts`

### POST (structured)

```json
{
  "category_ids": [328],
  "categories": ["laptops"],
  "tier": "mid_range",
  "brand": "bestbuy",
  "limit": 10
}
```

### GET (natural language)

```
GET /api/v1/recommend?q=where+can+I+buy+a+laptop&tier=mid_range&limit=10
```

### Response shape

Returns: `query`, `intent`, `resolved_categories`, `merchants[]` (with `products[]` placeholder), `total_merchant_matches`, `meta` (timing, stages executed).

---

## Skill Format & Distribution

Per-merchant SKILL.md files are already generated and served:
- **Generator:** `lib/procurement-skills/generator.ts`
- **Serving:** `GET /brands/{slug}/skill` (text/markdown, 24h cache)
- **JSON:** `GET /brands/{slug}/skill-json` (application/json, 24h cache)

### Planned: two skill types (not yet built)

| | Master skill | Per-merchant skill |
|---|---|---|
| Purpose | API reference — how to query the index | Store navigation — how to shop at one store |
| Name | `brands-sh` | `{slug}-shopping` |
| URL | `https://brands.sh/skill.md` | `https://brands.sh/brands/nike/skill` |

**Changes to skill front matter or format MUST be discussed with the user before implementation.**

---

## Gotchas

### category_keywords is partially populated

Only ~1,286 of 5,638 categories have keywords. Categories without keywords can't be found via FTS. The script is resumable — just run it more times.

### Merchant ranking includes all maturity levels

The CTE query currently includes all maturity levels including `draft` because only ~28 merchants exist. This filter should be tightened as the catalog grows.

### Intake is inline, not a separate module

The `runIntake()` function lives directly in `app/api/v1/recommend/route.ts`. If it needs to be shared (e.g., with MCP), extract it.
