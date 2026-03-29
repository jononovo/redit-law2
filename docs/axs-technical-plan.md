# Agentic Experience Score (AXS) — Technical Plan

## Overview

The Agentic Experience Score (AXS) is CreditClaw's framework for evaluating how well brands support AI agent commerce. It consists of two complementary scoring systems:

1. **Agentic Readiness Score** (static, 0–100) — A deterministic analysis of a brand's technical infrastructure
2. **AXS Rating** (dynamic, 1–5) — A crowdsourced performance rating from real agent and human interactions

Both scores are stored on the `brand_index` table and exposed through the `/api/v1/bot/skills` API.

---

## Architecture

### Data Model

**Primary table:** `brand_index` (PostgreSQL via Drizzle ORM)

| Column | Type | Score System | Description |
|--------|------|-------------|-------------|
| `agent_readiness` | integer | Readiness Score | Computed 0–100 from static criteria |
| `axs_rating` | numeric | AXS Rating | Weighted average of 3 feedback dimensions |
| `rating_search_accuracy` | numeric | AXS Rating | Discovery dimension (1–5) |
| `rating_stock_reliability` | numeric | AXS Rating | Ordering dimension (1–5) |
| `rating_checkout_completion` | numeric | AXS Rating | Purchasing dimension (1–5) |
| `rating_count` | integer | AXS Rating | Total feedback entries contributing |

**Feedback source:** `brand_feedback` table — stores individual ratings from agents and humans.

### Key Files

| File | Purpose |
|------|---------|
| `shared/schema.ts` | `brandIndex` and `brandFeedback` table definitions |
| `server/storage/brand-index.ts` | `computeReadinessScore()`, search/filter/sort logic |
| `lib/feedback/aggregate.ts` | `aggregateBrandRatings()` — computes AXS Rating from feedback |
| `lib/procurement-skills/types.ts` | `computeAgentFriendliness()` — legacy 1–5 score (to be deprecated) |
| `lib/procurement-skills/builder/probes.ts` | Automated protocol detection (x402, ACP, APIs) |
| `lib/procurement-skills/builder/analyze.ts` | Skill analysis pipeline with confidence scoring |
| `app/axs/page.tsx` | Public-facing AXS methodology page |
| `app/api/v1/bot/skills/[vendor]/feedback/route.ts` | Feedback submission API |
| `app/api/internal/feedback/aggregate/route.ts` | Aggregation trigger endpoint |

---

## Score 1: Agentic Readiness Score (0–100)

### Purpose

Answers: "How ready is this brand for agentic commerce on paper?"

A deterministic score computed from a brand's technical features. No user interaction required — calculated automatically when a brand is created or updated.

### Three Pillars

The readiness score maps to three pillars covering the full agent purchasing lifecycle:

#### Pillar 1: Discovery

Can the agent reference or find the brand and key products easily?

| Criterion | Points | Field | Detection Method |
|-----------|--------|-------|------------------|
| MCP Protocol Support | +25 | `has_mcp` | Probe `/.well-known/acp.json` or manual flag |
| Search API | +20 | `has_api` | Probe `/api-docs`, `/developers`, etc. |
| Product Feed | +5 | `product_feed` | Manual or LLM-detected |
| Internal Site Search | 0 (tracked) | `site_search` | LLM analysis of fetched pages |
| Full-Text Search Vector | N/A | `search_vector` | Auto-generated tsvector with trigger |

**Additional discovery fields on `brand_index`:**
- `tags` (text[]) — keyword tags for search
- `carries_brands` (text[]) — brands this retailer carries
- `sub_sectors` (text[]) — detailed category classifications
- `description` (text) — brand summary for search indexing

#### Pillar 2: Ordering & Navigation

Can the agent browse, search, and build a cart via API, MCP, or browser control?

| Criterion | Points | Field | Detection Method |
|-----------|--------|-------|------------------|
| Guest Checkout | +15 | `ordering = 'guest'` | LLM analysis + manual |
| Programmatic Checkout | +10 | `capabilities[] includes 'programmatic_checkout'` | API probe |
| Native API | 0 (tracked) | `checkout_methods[]` | Probe for public API endpoints |
| Browser Automation | 0 (tracked) | `checkout_methods[]` | Fallback if no API detected |
| ACP Support | 0 (tracked) | `checkout_methods[]` | Probe `/.well-known/acp.json` |
| x402 Support | 0 (tracked) | `checkout_methods[]` | Probe for HTTP 402 + headers |

**Additional ordering fields:**
- `capabilities` (text[]) — full capability set (price_lookup, stock_check, order_tracking, cart_management, bulk_pricing, etc.)
- `checkout_provider` (text) — underlying processor (stripe, adyen, shopify)
- `ordering` (text) — guest | registered | approval_required

#### Pillar 3: Purchasing

Can the agent complete checkout and pay with agentic payment methods?

| Criterion | Points | Field | Detection Method |
|-----------|--------|-------|------------------|
| Verified Maturity | +5 | `maturity = 'verified'` | CreditClaw team audit |
| Active Deals | +5 | `has_deals` | Manual or probe |
| Tax Exemption | 0 (tracked) | `tax_exempt_supported` | Business path probe |
| PO Numbers | 0 (tracked) | `po_number_supported` | Business path probe |
| Business Account | 0 (tracked) | `business_account` | Business path probe |

**Additional purchasing fields:**
- `payment_methods_accepted` (text[]) — visa, mastercard, amex, etc.
- `delivery_options` (text[]) — shipping methods
- `free_shipping_threshold` (numeric) — minimum order for free shipping

### Computation

```typescript
// server/storage/brand-index.ts
function computeReadinessScore(row: Partial<InsertBrandIndex>): number {
  let score = 0;
  if (row.hasMcp) score += 25;           // Discovery
  if (row.hasApi) score += 20;           // Discovery
  if (row.ordering === "guest") score += 15;  // Ordering
  if (caps.includes("programmatic_checkout")) score += 10;  // Ordering
  if (row.hasDeals) score += 5;          // Purchasing
  if (row.productFeed) score += 5;       // Discovery
  if (row.maturity === "verified") score += 5;  // Purchasing
  return Math.min(score, 100);
}
```

### When It Runs

- On `upsertBrandIndex()` — when a brand is created or updated
- On `recomputeReadiness(slug)` — explicit recalculation
- During `seed-brand-index.ts` — bulk population from legacy vendor registry
- During Skill Builder publish — `app/api/v1/skills/drafts/[id]/publish/route.ts`

### Automated Detection Pipeline

The Skill Builder (`lib/procurement-skills/builder/`) automates initial capability detection:

1. **Protocol Probing** (`probes.ts`):
   - x402: checks for HTTP 402 status and `x-402-receipt` / `x-402-payment` headers
   - ACP: checks `/.well-known/acp.json` for valid JSON manifest
   - Native APIs: scans `/developers`, `/api-docs`, `/api/v1`, etc.
   - Business features: scans `/business`, `/b2b`, `/tax-exempt`, `/net-terms`

2. **LLM Analysis** (`llm.ts`):
   - Uses Claude 3.5 Sonnet to extract from fetched HTML
   - Detects: name, slug, sector, search patterns, checkout logistics, shipping info
   - Generates operational tips for agents
   - Baseline confidence: 0.7 (name: 0.9, slug: 0.85)

3. **Confidence Scoring** (`analyze.ts`):
   - API/protocol detection: 0.9 confidence
   - Browser automation fallback: 0.5 confidence
   - Business feature detection: 0.8 confidence (0.4 if not found)
   - Fields below 0.7 confidence flagged for human review

---

## Score 2: AXS Rating (1–5)

### Purpose

Answers: "How well does this brand actually perform when agents interact with it?"

A weighted average from real-world feedback submitted by AI agents and human reviewers after purchase attempts.

### Three Feedback Dimensions

Each maps to a pillar:

| Dimension | Pillar | What It Measures |
|-----------|--------|-----------------|
| `search_accuracy` (1–5) | Discovery | How accurately catalog search returns relevant products |
| `stock_reliability` (1–5) | Ordering | Whether in-stock items are actually available at checkout |
| `checkout_completion` (1–5) | Purchasing | How reliably checkout completes without errors |

### Feedback Collection

**API endpoint:** `POST /api/v1/bot/skills/{vendor}/feedback`

```json
{
  "search_accuracy": 4,
  "stock_reliability": 5,
  "checkout_completion": 3,
  "checkout_method": "browser_automation",
  "outcome": "success",
  "comment": "optional"
}
```

**Authentication:**
- Authenticated bots (API key): max 1 feedback per brand per hour
- Anonymous agents: max 5 per brand per hour (tracked by IP)
- Logged-in humans: via session auth

**Outcome values:** `success`, `checkout_failed`, `search_failed`, `out_of_stock`, `price_mismatch`, `flow_changed`

### Aggregation Algorithm

```typescript
// lib/feedback/aggregate.ts
// Triggered via POST /api/internal/feedback/aggregate?slug=<optional>

// 1. Recency weighting
function computeRecencyWeight(createdAt: Date): number {
  const ageDays = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
  if (ageDays <= 7)  return 1.0;   // Fresh — full weight
  if (ageDays <= 30) return 0.8;   // Recent
  if (ageDays <= 60) return 0.6;   // Aging
  return 0.4;                       // Old (>60 days; >90 days excluded entirely)
}

// 2. Source weighting
function getSourceWeight(source: string, authenticated: boolean): number {
  if (source === "human") return 2.0;         // Highest trust
  if (authenticated) return 1.0;               // Authenticated agent
  return 0.5;                                  // Anonymous agent
}

// 3. Combined weight per feedback entry
// weight = recencyWeight × sourceWeight

// 4. Weighted averages per dimension
// avgSearch = Σ(search_accuracy × weight) / Σ(weight)
// avgStock = Σ(stock_reliability × weight) / Σ(weight)
// avgCheckout = Σ(checkout_completion × weight) / Σ(weight)

// 5. Final AXS Rating
// axsRating = (avgSearch + avgStock + avgCheckout) / 3

// 6. Minimum threshold
// Total weight must be ≥ 5 to publish a score
// Below threshold → all ratings set to NULL (not zero)
```

### When It Runs

- On-demand via `POST /api/internal/feedback/aggregate` (protected by `INTERNAL_API_SECRET`)
- Can target a single brand (`?slug=amazon`) or all brands
- Expected to be triggered by cron job or post-feedback webhook

---

## Legacy: `computeAgentFriendliness` (Deprecated)

### Current State

`computeAgentFriendliness` in `lib/procurement-skills/types.ts` computes a 1–5 score from `VendorSkill` objects. It duplicates the readiness score logic on a different scale:

- Guest checkout: +1
- No auth required: +1
- Programmatic checkout: +2
- Success rate > 85%: +1
- Search API/MCP: +1 each
- Capped at 5

### Why It's Redundant

The UI already converts `agent_readiness` (0–100) to a 1–5 star display:
```typescript
Math.min(Math.floor((brand.agentReadiness ?? 0) / 20) + 1, 5)
```

Both `computeAgentFriendliness` and this conversion measure the same thing — static technical readiness.

### Migration Path

`computeAgentFriendliness` is still used in:
- `lib/procurement-skills/generator.ts` — skill markdown generation
- `lib/procurement-skills/package/skill-json.ts` — skill JSON packaging
- `lib/procurement-skills/package/description-md.ts` — description generation

**Recommended approach:**
1. Replace calls in generator/package files with `agentReadiness` from the database (passed through or computed inline)
2. Remove `computeAgentFriendliness` function
3. The `agent_friendliness` field in generated markdown/JSON should derive from `agent_readiness / 20`

---

## API Surface

### Bot Skills API

`GET /api/v1/bot/skills`

**Query parameters for scoring:**
- `min_rating` — minimum AXS Rating (1–5)
- `min_search_rating` — minimum search accuracy
- `min_stock_rating` — minimum stock reliability
- `min_checkout_rating` — minimum checkout completion
- `sort=rating` — sort by AXS Rating (DESC, NULLS LAST)
- `sort=readiness` — sort by Readiness Score (default)

**Response shape (per brand):**
```json
{
  "slug": "amazon",
  "agent_readiness": 75,
  "agent_friendliness": 4,
  "ratings": {
    "axs_rating": 4.2,
    "search_accuracy": 4.5,
    "stock_reliability": 4.0,
    "checkout_completion": 4.1,
    "count": 47
  }
}
```

### Feedback API

`POST /api/v1/bot/skills/{vendor}/feedback`

See "Feedback Collection" section above.

### Aggregation API (Internal)

`POST /api/internal/feedback/aggregate`

- Protected by `INTERNAL_API_SECRET` header
- Optional `?slug=<brand_slug>` to target a single brand
- Returns `{ updated: number, skipped: number }`

---

## UI Integration

### Public AXS Page (`/axs`)

Static informational page explaining:
- Two-score system overview (Readiness + AXS Rating)
- Three pillars with scoring criteria and point values
- AXS Rating computation methodology
- Contributor types and weighting
- Link to browse the Shopping Skills catalog

### Vendor Card (`app/skills/vendor-card.tsx`)

Displays both scores:
- **Agent Score:** 1–5 stars derived from `agentReadiness / 20`
- **AXS Rating:** Numeric display (e.g., "4.2") with feedback count, shown only when `axsRating` is non-null

### Vendor Detail Page (`app/skills/[vendor]/page.tsx`)

- Agent Friendliness stars with label
- AXS Rating panel with bar charts for each dimension (search, stock, checkout)
- Structured data (JSON-LD) includes `aggregateRating` from `axsRating`

### Navigation

- `Shopping Skills` → `/skills` (brand catalog)
- `AXS` → `/axs` (methodology page)

---

## Future Considerations

### Score Refinements
- Weight individual readiness criteria differently per pillar (e.g., MCP worth more for Discovery than guest checkout)
- Add protocol-specific sub-scores within each pillar
- Introduce a combined "AXS Score" that blends readiness and performance

### Feedback Improvements
- Auto-submit feedback from CreditClaw checkout routes (capture success/failure automatically)
- Add `latency_ms` and `retry_count` to feedback for performance tracking
- Decay anonymous agent weight further if spam is detected

### Brand Self-Assessment
- Let claimed brands run the probe pipeline on their own site
- Show improvement suggestions per pillar ("Add an MCP endpoint to improve your Discovery score by +25")

### `computeAgentFriendliness` Deprecation
- Replace all 3 call sites with `agentReadiness`-derived value
- Remove function from `lib/procurement-skills/types.ts`
- Update generated skill markdown/JSON frontmatter from `agent_friendliness: X/5` to `agent_readiness: X/100`
