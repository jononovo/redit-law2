---
name: Brands Index
description: Central brand registry — brand_index table, catalog UI, taxonomy, and skill output.
---

# 03 — Brands Index

## What This Module Covers

- `brand_index` table — single source of truth for all merchants (~85 columns)
- Catalog UI — `/skills`, `/skills/[vendor]`, `/c/[sector]`
- Taxonomy — 28 sectors, 7 tiers, 8 capabilities, 5,638 product categories
- Skill output — SKILL.md and skill.json derived from brand_index data
- Brand claims — domain-match auto-verify, admin review queue

## Docs

| File | What it covers |
|------|----------------|
| `product-index.md` | brand_index table structure, catalog UI, filtering, LITE_COLUMNS, generateStaticParams, gotchas |
| `metadata-and-taxonomy.md` | Sector/tier/capability system, Google Product Taxonomy, skill.json taxonomy block, constants |

## Related

- `02-agent-shopping-skills/merchant-index.md` — the recommend API that queries this data
- `01-agentic-shopping-score/` — the scanner that populates brand_index rows
- `_research/skill-json-schema.md` — skill.json field spec
- `_research/step-1-catalog-scale-readiness-plan.md` — scale prep plan (completed)
