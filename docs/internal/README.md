---
name: Internal Documentation Index
description: Overview of all internal docs and reading order. Start here.
---

# Internal Developer Documentation

Concise technical documentation for agents and developers. Each file explains why a feature exists, how it works, and what the most complex elements are. See `guide.md` for the writing convention.

---

## Reading Order for New Developers / Agents

1. **This README** — orientation and folder structure
2. **`guide.md`** — how to write and update internal docs
3. **`scanning/scan-taxonomy-skills-pipeline.md`** — the core pipeline (scan → classify → score → taxonomy → skills)
4. **`catalog/product-index.md`** — the brand_index table, catalog filtering, and skill pages
5. **`catalog/merchant-index.md`** — the recommend API (how agents find merchants)
6. Other files as needed for specific features

---

## Folder Structure

### `scanning/` — ASX Scanner & Scan Pipeline

| File | Description |
|------|-------------|
| `scan-taxonomy-skills-pipeline.md` | End-to-end flow: scan → classify → score → taxonomy → SKILL.md → skill.json |
| `asx-scanner.md` | Perplexity-powered scan, rubric v1.1.0, 11 signals, 3 API calls per scan |
| `maturity-promotion.md` | Auto-promotion from draft → community after successful scans |
| `scan-history-plan.md` | **Plan:** Append-only scan log for score trending (not yet built) |

### `catalog/` — Brand Catalog & Merchant Index

| File | Description |
|------|-------------|
| `product-index.md` | Brand catalog — brand_index table, LITE_COLUMNS, filtering, search_vector |
| `metadata-and-taxonomy.md` | 28-sector system, Google Product Taxonomy, tiers, capabilities, skill.json |
| `merchant-index.md` | Recommend API — category resolution, merchant ranking, skill distribution |
| `product-search-plan.md` | **Plan:** Stage 3 product ingestion with pgvector search (not yet built) |

### `platform/` — Infrastructure

| File | Description |
|------|-------------|
| `multitenant-system.md` | Hostname routing, tenant configs, theming, adding new tenants |

---

## Current System Status

| Component | Status | Brands | Keywords | Products |
|---|---|---|---|---|
| ASX Scanner | Running | 28 scanned | — | — |
| Maturity promotion | Deployed | 27 community, 1 draft | — | — |
| Category keywords | Partial | — | ~1,286 / 5,638 | — |
| Recommend API (Stages 1-2) | Running | — | — | — |
| Product search (Stage 3) | Not built | — | — | 6,774 in product_listings |
| Scan history | Not built | — | — | — |
| Skill distribution (Phase 2) | Not built | — | — | — |
