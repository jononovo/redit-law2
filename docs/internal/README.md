# Internal Developer Documentation

Private technical documentation for the CreditClaw / shopy.sh / brands.sh engineering team. These docs cover implementation details, fragile areas, expansion plans, and operational notes that don't belong in the public-facing docs.

## What goes here

- **Feature deep-dives** — how each major system works internally, where the sharp edges are, and what to watch out for when changing things
- **Build plans** — technical plans for new features with decided architecture, schemas, and build sequences
- **Expansion notes** — what needs to happen to grow or extend each feature
- **Fragile areas** — known coupling, implicit dependencies, and things that break silently
- **Operational guides** — step-by-step runbooks for common developer tasks (adding a tenant, running migrations, etc.)

## What does NOT go here

- Public user guides → `docs/content/`
- Active build plans still being executed → `docs/build context/`
- Brand/design guidelines → `docs/brand.md`

## Pages

### How existing systems work

| File | Feature | Summary |
|------|---------|---------|
| `scan-taxonomy-skills-pipeline.md` | **Pipeline Overview** | End-to-end flow: scan → classify → score → taxonomy → SKILL.md → skill.json. Start here for understanding the current system. |
| `asx-scanner.md` | ASX Scanner | Perplexity-powered scan, rubric v1.1.0, 11 signals, 3 API calls per scan |
| `metadata-and-taxonomy.md` | Metadata & Taxonomy | 28-sector system, Google Product Taxonomy, tiers, capabilities, skill.json |
| `product-index.md` | Product Index | Brand catalog, LITE_COLUMNS, filtering, generateStaticParams, search_vector |
| `multitenant-system.md` | Multitenant | Hostname routing, tenant configs, theming, adding new tenants |

### Merchant Index & Product Search (the recommend pipeline)

| File | Feature | Status | Summary |
|------|---------|--------|---------|
| `brands-sh-merchant-index-plan.md` | **Merchant Index** | Stages 1-2 BUILT, Phase 2 pending | Category resolution via FTS, merchant ranking with ancestor CTE, intake LLM, `/api/v1/recommend` endpoint. Skills distribution pending front matter discussion. |
| `brands-sh-product-search-plan.md` | **Product Search** | Not started | Stage 3: brand-first feed strategy, Shopify/Google Shopping ingestion, pgvector embeddings in Postgres, product results nested in recommend response. |

### Current status of the Merchant Index pipeline

**What's working today:**
- `POST /api/v1/recommend` — structured queries with category IDs or text terms, tier/brand filtering, Zod validation
- `GET /api/v1/recommend?q=...` — natural language queries via Perplexity Sonar intake → FTS category resolution → recursive CTE merchant ranking
- ~1,051 of 5,638 categories have LLM-generated keywords (script is resumable)
- 19 merchants in the database (all `draft` maturity)

**What's next:**
1. Finish keyword population (keep running the batch script)
2. Grow merchant count (more scans via scan queue)
3. Phase 2 skills distribution (needs front matter discussion)
4. Stage 3 product search (see product search plan)

## Reading order for new developers / agents

1. **This README** — orientation and current status
2. **`scan-taxonomy-skills-pipeline.md`** — understand how the current scan → skill pipeline works
3. **`product-index.md`** — understand the brand_index table, columns, filtering, search_vector
4. **`brands-sh-merchant-index-plan.md`** — the merchant recommendation index (Stages 1-2 built, what's outstanding)
5. **`brands-sh-product-search-plan.md`** — Stage 3 product search (next major build)
6. Other files as needed for specific features
