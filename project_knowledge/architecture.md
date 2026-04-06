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

---

## Payments

CreditClaw's financial rails. Multiple methods, all centered on USDC wallets on Base (L2).

| Method | What it does | Status |
|--------|-------------|--------|
| **Stripe Crypto Onramp** | Fiat → USDC wallet funding via card or bank | Live |
| **Wallet Debits** | Atomic balance deduction at purchase time | Live |
| **Payment Links** | Bots generate Stripe Checkout URLs to receive payments | Live |
| **x402 (Agent Pay)** | HTTP 402-based autonomous payments. Agent gets crypto signature, resubmits with `X-PAYMENT` header. Settled on Base chain (EIP-3009/EIP-712) | Live |
| **Base Pay** | One-tap USDC payment from a Base wallet | Live |
| **QR Wallet** | Direct USDC transfer via QR code | Live |
| **Stripe Issuing** | Virtual Visa/Mastercard per bot | Not built |
| **Stripe Connect** | Per-owner money flow isolation | Not built |

**Wallets** are Privy-managed server wallets on Base. Each owner gets one. Funding goes through Stripe Onramp (fiat → USDC). Spending is via atomic wallet debits with guardrails (per-transaction limits, category blocking, approval modes).

**x402** is the key agentic protocol — lets agents pay programmatically without human intervention. Deduplication keys prevent double-spending.

---

## Merchant Scan

The ASX scan evaluates how "agent-ready" a store is. Five components work together:

### 1. Scan Queue

Batch processing system for high-volume scanning.

- Accepts arrays of domains, normalizes and deduplicates
- Checks both `scan_queue` and `brand_index` to avoid redundant scans
- `FOR UPDATE SKIP LOCKED` pattern for parallel worker safety
- Stale reset: scans stuck in `scanning` for >30min get reclaimed
- Duplicate detection toggle (`allowRescans`) for intentional re-evaluation

### 2. Scan Engine

Three Perplexity API calls per scan:

- **Classify** (`classifyBrand`) — identifies brand type (brand/retailer/marketplace), pricing tier, primary sectors
- **Audit** (`auditSite`) — extracts technical signals: JSON-LD, robots.txt AI policies, MCP endpoints, guest checkout, product feeds
- Classify + Audit run in parallel, then:
- **Category Resolution** (`resolveProductCategories`) — maps the brand's offerings to Google Product Taxonomy IDs, filtered by sector

### 3. Scoring Engine

Applies Rubric v2.0.0 to audit evidence. Three pillars, 100 points:

- **Clarity (35pts)** — structured data, product feeds, agent metadata
- **Discoverability (30pts)** — search API/MCP, site search, page load, product page quality
- **Reliability (35pts)** — guest checkout, order management, cart predictability, bot tolerance

11 weighted signals. Output: overall score + per-pillar breakdown + per-signal evidence.

### 4. Skill Generation

Automatic output from every scan:

- **SKILL.md** — human/LLM-readable markdown. Store metadata, checkout methods, shopping tips, sample `curl` command
- **skill.json** — machine-readable JSON. Taxonomy links, ASX score breakdowns, access tiers (`open`/`keyed`/`private`)

### 5. Maturity Auto-Promotion

- Brands start at `draft`
- Auto-promoted to `community` when they have: valid ASX score + generated SKILL.md + populated brand data
- Manual tiers (`beta` / `verified` / `official` / `partner`) are never overwritten by auto-promotion

---

## Merchant Index (Recommend API)

`POST /api/v1/recommend` — agents describe what they need, get ranked merchants + matching products. Three stages:

### Stage 1: Category Resolution

- Extracts structured intent from natural language (via Perplexity Sonar LLM)
- Maps extracted category terms to taxonomy IDs using Postgres Full-Text Search against `category_keywords` table
- Ranks by `ts_rank` + category depth (deeper = more specific = better match)
- Returns top 5 resolved categories

### Stage 2: Merchant Ranking

- Finds merchants tagged to resolved categories via `brand_index` + `brand_categories`
- Recursive SQL query walks the category tree (specific sub-categories outrank broad parents)
- Ranking: brand name match → match depth → ASX score as tiebreaker
- Returns merchants with metadata including SKILL.md URL

### Stage 3: Product Search

- Generates embedding vector for the search query
- pgvector cosine similarity search against `product_listings` table
- Lateral join filtered by `brand_id` — products grouped under their ranked merchant
- Top 3 products per merchant, similarity scored

---

## Skill System

- **SKILL.md** — markdown instructions teaching an agent how to shop at a specific store
- **skill.json** — machine-readable metadata (categories, capabilities, checkout methods)
- **Registry API** — `/api/v1/registry` endpoints for listing, searching, fetching skills
- **CLI** — `npx shopy add <brand>` (planned, not yet built)

---

## Multitenant Platform

- Single Next.js codebase, hostname-based routing
- Tenant resolved from cookies (set at edge), threaded through server + client
- Shared DB, tenant is attribution-only (`signup_tenant` on owners)
- Per-tenant theming, landing pages, and feature flags
- **CreditClaw** (`creditclaw.com`) — financial rails for AI agents
- **shopy.sh** — merchant-facing ASX Score scanner and leaderboard
- **brands.sh** — developer-facing skill registry

---

## Key Tables

| Table | Purpose |
|-------|---------|
| `brand_index` | Central brand/merchant catalog. One row per domain. |
| `brand_claims` | Ownership claims linking brands to user accounts |
| `brand_categories` | Many-to-many: brands → Google Taxonomy category IDs |
| `product_listings` | Product data with pgvector embeddings for similarity search |
| `category_keywords` | Keyword → Google Taxonomy category mapping for recommend API |
| `scan_queue` | Pending/processing/completed scan jobs |
| `owners` | User accounts with `signup_tenant` attribution |

## System Status

| Component | Status |
|-----------|--------|
| ASX Scanner | Running |
| Scan Queue + duplicate detection | Running |
| Maturity auto-promotion | Deployed |
| Category keywords | Partial (~1,286 / 5,638) |
| Recommend API (all 3 stages) | Running |
| Payments (wallet, x402, onramp, links) | Running |
| Stripe Issuing | Not built |
| Stripe Connect | Not built |
| Scan history | Not built |
| Skill distribution Phase 2 | Not built |
| Shopy CLI (`npx shopy add`) | Not built |

See `_README.md` for folder navigation and reading order.
