---
name: System Architecture
description: High-level technical overview of all moving pieces. Read this after vision.md to understand where things live and which folder to dive into.
---

# System Architecture

## Core Loop

```
Domain submitted → ASX Scan → Score + SKILL.md + brand data
  → upsert brand_index → auto-promote maturity
  → resolve product categories from Google Taxonomy
  → generate skill.json (machine-readable)
```

Every scan grows the catalog. The catalog powers the registry API, sector pages, and agent discovery.

## System Components

### ASX Scanner
- Evaluates a domain's AI-readiness across 3 pillars: Clarity (35pts), Discoverability (30pts), Reliability (35pts)
- 11 signals, Rubric v2.0.0
- 3 Perplexity API calls per scan (classify + audit in parallel, then category resolution)
- Output: score, signal breakdown, SKILL.md, skill.json, brand metadata

### Brand Catalog (`brand_index`)
- Central table powering all catalog views — skill pages, sector pages, registry API
- 28-sector classification system built on Google Product Taxonomy (~5,600 categories + 43 custom)
- Maturity levels: `draft` → `community` (auto) → `beta` / `verified` / `official` (manual)
- `LITE_COLUMNS` projection for list views, full row for detail pages

### Recommend API (Merchant Index)
- `POST /api/v1/recommend` — agents describe what they need, get ranked merchant list + matching products
- Category keyword resolution → merchant matching → product vector search (pgvector embeddings)
- Returns ranked merchants with per-merchant product results (similarity scored)

### Skill System
- **SKILL.md** — markdown instructions teaching an agent how to shop at a specific store
- **skill.json** — machine-readable metadata (categories, capabilities, checkout methods)
- **Registry API** — `/api/v1/registry` endpoints for listing, searching, fetching skills
- **CLI** — `npx shopy add <brand>` (planned, not yet built)

### Multitenant Platform
- Single Next.js codebase, hostname-based routing
- Tenant resolved from cookies (set at edge), threaded through server + client
- Shared DB, tenant is attribution-only (`signup_tenant` on owners)
- Per-tenant theming, landing pages, and feature flags
- **CreditClaw** (`creditclaw.com`) — financial rails for AI agents (cards, wallets, spending limits)
- **shopy.sh** — merchant-facing ASX Score scanner and leaderboard
- **brands.sh** — developer-facing skill registry ("npm for AI shopping agents")

## Data Flow

```
Perplexity (classify + audit)
  → computeScoreFromRubric()
  → buildVendorSkillDraft() → generateVendorSkill() (SKILL.md)
  → resolveMaturity() (draft → community)
  → upsertBrandIndex() (brand_index table)
  → resolveProductCategories() (Google Taxonomy)
  → buildSkillJson() (skill.json, built on read)
```

## Key Tables

| Table | Purpose |
|-------|---------|
| `brand_index` | Central brand/merchant catalog. One row per domain. |
| `brand_claims` | Ownership claims linking brands to user accounts |
| `product_listings` | Raw product data from merchant feeds (Stage 3 input) |
| `category_keywords` | Keyword → Google Taxonomy category mapping for recommend API |
| `owners` | User accounts with `signup_tenant` attribution |

## System Status

| Component | Status |
|-----------|--------|
| ASX Scanner | Running |
| Maturity auto-promotion | Deployed |
| Category keywords | Partial (~1,286 / 5,638) |
| Recommend API + product search | Running |
| Scan history | Not built (plan exists) |
| Skill distribution Phase 2 | Not built |
| Shopy CLI (`npx shopy add`) | Not built |

See `_README.md` for folder navigation and reading order.
