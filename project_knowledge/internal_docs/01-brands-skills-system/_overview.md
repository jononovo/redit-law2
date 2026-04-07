---
name: Brands & Skills System Overview
description: The unified pipeline that scans merchants, scores them, classifies them, generates shopping skills, and serves everything through the Brand Index. Read this first before working on scanning, skills, taxonomy, or the catalog.
---

# Brands & Skills System — Overview

This is the platform's growth engine. A single pipeline that takes an unknown domain and turns it into a fully classified, scored, skill-equipped entry in the Brand Index — ready for AI agents and humans to discover and use.

The system spans three architecture modules that work as one pipeline:

| Module | What it owns | Key folders |
|--------|-------------|-------------|
| **Agentic Shopping Score** | Scanner, scoring rubric, scan queue | `lib/agentic-score/`, `lib/scan-queue/` |
| **Agent Shopping Skills** | SKILL.md generation, skill.json, Recommend API | `lib/procurement-skills/`, `lib/embeddings/` |
| **Brands Index** | `brand_index` table, catalog UI, taxonomy, brand claims | `lib/catalog/`, `lib/brand-claims/` |

---

## The Pipeline: Domain → Catalog Entry

```
User submits domain (or scan queue processes it)
  │
  ├─→ POST /api/v1/scan  ─OR─  scan-queue worker
  │
  ├─→ Cache check: brand_index row < 30 days old? → return cached
  │
  ├─→ PARALLEL:
  │     ├── classifyBrand(domain) ──── Perplexity Sonar
  │     │     → name, sector, brandType, tier, capabilities, description
  │     │
  │     └── auditSite(domain) ──────── Perplexity Sonar
  │           → 40+ boolean/string/numeric signals about AI-readiness
  │
  ├─→ computeScoreFromRubric() ──── 11 signals, 3 pillars, 100 pts
  ├─→ buildVendorSkillDraft()  ──── VendorSkill object
  ├─→ generateVendorSkill()    ──── SKILL.md markdown
  ├─→ resolveMaturity()        ──── auto-promote draft → community
  │
  ├─→ upsertBrandIndex()      ──── write to brand_index (domain = unique key)
  │
  ├─→ SEQUENTIAL (non-critical):
  │     └── resolveProductCategories() ──── Perplexity Sonar
  │           → maps to Google Product Taxonomy IDs
  │           → writes to brand_categories junction table
  │
  └─→ Response: score + breakdown + recommendations + skillMdUrl
```

**Three Perplexity calls per scan:**
1. **Classification** (parallel) — brand name, sector, tier, brand type
2. **Site Audit** (parallel) — 40+ technical signals
3. **Category Resolution** (sequential, after upsert) — Google Product Taxonomy mapping

Each call is independently fail-safe. A scan always completes even if one or more calls fail — it just produces degraded data.

---

## How Everything Connects

### Scanning & Scoring (input)
The ASX Scanner evaluates how "AI-ready" a merchant's website is. It produces a 0–100 score, per-signal breakdown, and improvement recommendations. Every scan creates or updates a `brand_index` row, so the catalog grows automatically.

→ Deep dive: `asx-scanner.md`
→ Full pipeline: `scan-taxonomy-skills-pipeline.md`

### Taxonomy & Classification (structure)
A 28-sector, 7-tier classification system built on Google Product Taxonomy (5,638 categories). Brands are classified by sector, brand type (8 types from DTC brand to mega merchant), and market tier. Brand type determines how deep category resolution goes.

→ Deep dive: `metadata-and-taxonomy.md`

### Skill Generation (output)
Each scan produces two machine-consumable artifacts:
- **SKILL.md** — markdown that teaches an agent how to shop at that store (checkout flow, tips, known issues)
- **skill.json** — structured metadata (taxonomy, scoring, access tiers, checkout details)

Both are served publicly: `/brands/{slug}/skill` and `/brands/{slug}/skill-json`.

→ Deep dive: `scan-taxonomy-skills-pipeline.md` § Step 4 and § skill.json Output

### Brand Index (storage & serving)
The `brand_index` table is the single source of truth — one row per domain with ~85 columns. All surfaces read from it: catalog UI (`/skills`), detail pages (`/skills/[vendor]`), sector pages (`/c/[sector]`), bot API (`/api/v1/bot/skills`), and the Recommend API.

→ Deep dive: `product-index.md`

### Merchant Discovery (query)
The Recommend API lets agents ask "where can I buy running shoes?" and get ranked merchants with skill URLs. Three stages: category FTS → recursive merchant ranking → optional product vector search.

→ Deep dive: `merchant-index.md`

### Maturity Progression (lifecycle)
Brands start as `draft`, auto-promote to `community` when they have a score + SKILL.md + brand data. Higher levels (`beta`, `verified`, `official`) require manual review or brand claims.

→ Deep dive: `maturity-promotion.md`

---

## Key Tables

| Table | Purpose |
|-------|---------|
| `brand_index` | One row per domain. Central catalog (~85 columns). Source of truth. |
| `brand_categories` | Junction: brands → Google Taxonomy category IDs |
| `product_categories` | 5,638 taxonomy entries (Google + custom). Seeded, not user-managed. |
| `category_keywords` | Keyword → taxonomy ID for FTS-based category resolution |
| `brand_claims` | Ownership claims: domain → user account |
| `brand_feedback` | Agent/human ratings per brand (search accuracy, stock reliability, checkout completion) |
| `scan_queue` | Background scan job queue |

---

## Key Files

| File | Purpose |
|------|---------|
| `app/api/v1/scan/route.ts` | Public scan API entry point |
| `lib/scan-queue/process-next.ts` | Background queue worker (same pipeline) |
| `lib/agentic-score/classify-brand.ts` | Perplexity brand classification |
| `lib/agentic-score/audit-site.ts` | Perplexity site audit |
| `lib/agentic-score/resolve-categories.ts` | Perplexity category resolution |
| `lib/agentic-score/scoring-engine.ts` | Score computation from evidence |
| `lib/agentic-score/rubric.ts` | ASX rubric (11 signals, 100 pts) |
| `lib/agentic-score/scan-utils.ts` | VendorSkill builder, resolveMaturity() |
| `lib/procurement-skills/generator.ts` | SKILL.md markdown generation |
| `lib/procurement-skills/skill-json.ts` | skill.json builder |
| `lib/procurement-skills/taxonomy/` | Sector, tier, capability, brand-type definitions |
| `server/storage/brand-index.ts` | brand_index CRUD (upsert, search, facets) |
| `server/storage/brand-categories.ts` | Category junction CRUD |
| `app/skills/page.tsx` | Catalog page (SSR) |
| `app/skills/catalog-client.tsx` | Catalog client (filtering, pagination) |
| `app/skills/[vendor]/page.tsx` | Brand detail page (SSR) |
| `app/brands/[slug]/skill/route.ts` | SKILL.md HTTP endpoint |
| `app/brands/[slug]/skill-json/route.ts` | skill.json HTTP endpoint |
| `app/api/v1/bot/skills/route.ts` | Agent-facing catalog search API |
| `app/api/v1/recommend/route.ts` | Merchant discovery / Recommend API |
| `lib/catalog/parse-filters.ts` | URL ↔ filter state, DEFAULT_MATURITIES |
| `lib/brand-claims/` | Brand ownership verification |
| `lib/feedback/aggregate.ts` | Feedback aggregation (weighted rolling average) |

---

## Docs in This Folder

| File | What it covers |
|------|----------------|
| `_overview.md` (this file) | High-level system narrative — start here |
| `asx-scanner.md` | Scanner architecture, rubric, evidence system, gotchas |
| `scan-taxonomy-skills-pipeline.md` | End-to-end pipeline from domain to skill output |
| `maturity-promotion.md` | Auto-promotion from draft to community |
| `merchant-index.md` | Recommend API — category resolution, merchant ranking, skill distribution |
| `product-index.md` | brand_index table, catalog UI, LITE_COLUMNS, filtering |
| `metadata-and-taxonomy.md` | 28 sectors, 7 tiers, 8 capabilities, Google Product Taxonomy |

### _completed/
Archived implementation plans (phases 3–8, brand index v3, scan page UX, etc.)

### _research/
Analysis docs, taxonomy schema research, product search plans, skill format advice.

---

## How the Three Tenants Use This System

| Tenant | How it uses the Brands & Skills system |
|--------|---------------------------------------|
| **CreditClaw** (`creditclaw.com`) | Agents query `/api/v1/bot/skills` to discover merchants before checkout. SHOPPING-GUIDE.md in the CreditClaw skill references this API. |
| **shopy.sh** | Public-facing ASX Score scanner. Users submit domains, see scores, browse the leaderboard. Drives catalog growth. |
| **brands.sh** | Developer-facing skill registry. Hosts the catalog UI, skill files, and registry API. The "npm for agentic commerce." |

All three tenants share the same `brand_index` table, the same scanning pipeline, and the same skill generation code. The difference is framing and entry point.
