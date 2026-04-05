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
| `metadata-and-taxonomy.md` | Metadata & Taxonomy | 27-sector system, Google Product Taxonomy, tiers, capabilities, skill.json |
| `product-index.md` | Product Index | Brand catalog, LITE_COLUMNS, filtering, generateStaticParams, search_vector |
| `multitenant-system.md` | Multitenant | Hostname routing, tenant configs, theming, adding new tenants |

### Build plans for new features

| File | Feature | Summary |
|------|---------|---------|
| `brands-sh-merchant-index-plan.md` | **Merchant Index** | Query pipeline (Stages 1-2): category resolution via pre-computed keywords, merchant ranking with ancestor walking, API response shape, skill format & distribution via `brands-sh/shop` GitHub repo, deployment (Replit → Cloudflare edge). Build phases 1-2. |
| `brands-sh-product-search-plan.md` | **Product Search** | Stage 3: brand-first feed strategy, 7-step ingestion pipeline (feed → validate → GTIN → category map → embed → store), per-merchant Zvec vector collections, optional AI enrichment layer, edge deployment. Build phases 3-4. |

## Reading order for new developers / agents

1. **This README** — orientation
2. **`scan-taxonomy-skills-pipeline.md`** — understand how the current scan → skill pipeline works
3. **`product-index.md`** — understand the brand_index table, columns, filtering, search_vector
4. **`brands-sh-merchant-index-plan.md`** — the merchant recommendation index build plan (what to build next)
5. **`brands-sh-product-search-plan.md`** — the product search build plan (builds on top of the merchant index)
6. Other files as needed for specific features
