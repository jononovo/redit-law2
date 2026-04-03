# brands.sh — Skill Registry Redesign Plan

## Context

brands.sh is currently rendering as a score directory — showing brand names, sectors, tiers, and ASX scores in a table. This is wrong. brands.sh should be a **skill registry** — think ClawHub or npm — oriented around the SKILL.md files that the scanner generates.

The `/skills/[vendor]` detail page already exists and is well-built (checkout methods, capabilities, search discovery, SKILL.md preview, install command). But:
1. The scanner pipeline has a critical bug — `brandData` is never saved
2. The `checkoutMethods` field on `brand_index` is never populated by the scanner
3. The landing page surfaces score data instead of skill data
4. The overall framing is "find a brand" instead of "find and install a skill"
5. `skill.json` — the machine-readable metadata companion to SKILL.md — is not generated at all yet

### What a Skill Is (for context)

A **skill** is a structured instruction package that teaches an AI agent how to shop at a specific store. It has two files:

| File | Format | Purpose | Audience |
|---|---|---|---|
| `SKILL.md` | Markdown with YAML frontmatter | **How** to shop — step-by-step guide (search, browse, cart, checkout) | AI agents executing purchases |
| `skill.json` | JSON | **What** this merchant is — structured index data for routing and discovery | Routing systems, discovery APIs, CLIs, comparison tools |

The SKILL.md tells an agent *how* to buy. The skill.json tells systems *whether* this merchant is relevant to a query — before the agent ever loads the full skill.

A skill package lives in a directory:
```
skills/
  amazon/
    SKILL.md
    skill.json
  staples/
    SKILL.md
    skill.json
```

Skills are distributed via:
- The brands.sh web registry (browse + detail pages)
- The REST API: `GET /api/v1/bot/skills/{vendor}` (SKILL.md), `GET /api/v1/registry/{vendor}/skill.json`
- The CLI: `npx shopy add amazon`
- Edge CDN for zero-latency agent discovery
- Optionally self-hosted by merchants at `/.well-known/agentic-commerce.json`

### Reference: ClawHub.ai

ClawHub is the skill registry for OpenClaw (the "npm for AI agents"). Key UI patterns worth adopting:

| Element | ClawHub | brands.sh Target |
|---|---|---|
| **Homepage hero** | Search bar + "npm for AI agents" messaging | Search bar + "skills for shopping agents" messaging |
| **Browse/list** | Skill cards with name, author, description, downloads, stars | Skill rows with name, domain, capabilities, checkout method, maturity |
| **Detail page** | Header → stats → security panel → rendered SKILL.md → install command → related skills | Already built at `/skills/[vendor]` — needs crash fix only |
| **Install command** | `clawhub install skill-name` | `npx shopy add brand-slug` (from existing CLI plan) |
| **Aesthetic** | Dark, minimal, utilitarian — like npm/crates.io | Already dark (`bg-neutral-950`), matches shopy design system |

---

## Scan Pipeline Audit (verified April 3, 2026)

### What the scanner produces today

The scan pipeline works in two phases:

**Phase 1: Evidence gathering** (`lib/agentic-score/agent-scan.ts`)
- Claude agent browses the site (up to 8 pages, 20 tool turns)
- Collects evidence for ASX scoring rubric (clarity, discoverability, reliability)
- Calls `record_findings` tool with structured data: name, sector, subSectors, tier, capabilities, guestCheckout, searchUrlTemplate, tips, etc.
- Calls `record_evidence` for each rubric criterion with citation

**Phase 2: Score + skill generation** (`app/api/v1/scan/route.ts`, `lib/scan-queue/process-next.ts`)
- Computes ASX score from evidence via `computeScoreFromRubric()`
- Builds a `VendorSkill` draft via `buildVendorSkillDraft()` — full structured skill object
- Generates SKILL.md text via `generateVendorSkill(draft)`
- Upserts to `brand_index` table

### What's broken

**Bug 1: `brandData` is never saved.**
Both the scan route (line 297) and queue processor (line 227) do:
```tsx
brandData: existing?.brandData ?? {},  // draft is thrown away
```
The `draft` VendorSkill object is only used for SKILL.md text generation, then discarded.

**Bug 2: `checkoutMethods` is never saved to `brand_index`.**
The upsert call doesn't include `checkoutMethods` at all. The `buildVendorSkillDraft` hardcodes `checkoutMethods: ["browser_automation"]` (line 109), but even that hardcoded value never reaches the database because the upsert doesn't set the field.

**Bug 3: `capabilities` sometimes empty.**
The upsert does pass `capabilities` via `mergeArrayField()`, pulling from `agentFindings.capabilities`. But if the agent doesn't call `record_findings` with capabilities (or calls it before browsing enough), the array stays empty. The `draft` object has capabilities too (via `toValidCapabilities(findings.capabilities)`) but since the draft is thrown away, there's no second chance.

**Not yet implemented: `skill.json` generation.**
The `skill.json` spec is fully documented in `docs/build context/Shopy/skill-json-schema.md` but no code generates it. The scan produces enough data to populate most of the `skill.json` schema (identity, taxonomy.sector, scoring, access, checkout basics, shipping, skillQuality). UCP category mapping (taxonomy.categories) is documented but not yet wired into the agent prompt.

### Verified test scan: staples.com

| Field | Result |
|---|---|
| overallScore | 36 |
| skillMd | 1975 chars (populated correctly) |
| brandData | `{}` (empty — Bug 1) |
| capabilities | `[]` (empty — Bug 3) |
| checkoutMethods | `[]` (empty — Bug 2) |

### Verified DB state for all brands

| Brand | brandData | skillMd | checkoutMethods | capabilities | /skills/[slug] |
|---|---|---|---|---|---|
| home-depot | 20 keys | 2677 chars | `[]` | `[price_lookup, stock_check, ...]` | 200 |
| bombas | `{}` | 2409 chars | `[]` | `[price_lookup, stock_check, ...]` | 500 |
| allbirds | `{}` | 1985 chars | `[]` | `[price_lookup, stock_check, ...]` | 500 |
| rei | `{}` | 1935 chars | `[]` | `[price_lookup, stock_check, ...]` | 500 |
| target | `{}` | 1967 chars | `[]` | `[price_lookup, stock_check, ...]` | 500 |
| zappos | `{}` | 1967 chars | `[]` | `[price_lookup, stock_check, ...]` | 500 |
| staples | `{}` | 1975 chars | `[]` | `[]` | 500 (new scan) |

Home Depot's `brandData` was populated manually or by an earlier version of the scanner.

---

## Scope

### Task 1: Fix scanner pipeline — save `brandData` and `checkoutMethods`

**Files:** `app/api/v1/scan/route.ts` (line 275-311), `lib/scan-queue/process-next.ts` (line 205-241)

**Fix:** Keep a reference to the `draft` VendorSkill and save it:

```tsx
let skillMd: string | null = null;
let draft: VendorSkill | null = null;
try {
  draft = buildVendorSkillDraft(slug, domain, resolvedName, resolvedSector, agentFindings);
  skillMd = generateVendorSkill(draft);
} catch {
  // non-critical
}

// In the upsert:
brandData: draft ?? existing?.brandData ?? {},
checkoutMethods: draft?.checkoutMethods ?? existing?.checkoutMethods ?? [],
```

This is a small, targeted change. `buildVendorSkillDraft` and `generateVendorSkill` are NOT modified.

**Acceptance:** Re-scan staples.com → `brandData` has 15+ keys, `checkoutMethods` is `["browser_automation"]`, `/skills/staples` returns 200.

---

### Task 2: Add null guards to `/skills/[vendor]` detail page

**File:** `app/skills/[vendor]/page.tsx`

Even after fixing the scanner, existing brands with empty `brandData` will still crash until re-scanned. The detail page needs defensive coding.

**Fix:** Fall back to `brand.*` top-level fields when `vendor.*` (brandData) properties are missing:

```tsx
const vendorName = vendor?.name ?? brand.name;
const vendorUrl = vendor?.url ?? `https://${brand.domain}`;
const vendorSector = vendor?.sector ?? brand.sector;
```

Conditionally render sections (checkout methods, search discovery, buying config) only when their source data exists. The page should always render — showing the SKILL.md content and whatever top-level data exists.

**Acceptance:** All `/skills/[slug]` URLs return 200 regardless of `brandData` state.

---

### Task 3: Redesign the brands.sh landing page

**File:** `components/tenants/brands/landing.tsx`

**Goal:** Transform from a score table into a skill registry listing.

#### Hero section

**Change to:**
- Title: "The skill registry for agentic shopping." (or similar — skill-first framing)
- Subtitle: "SKILL.md files that teach AI agents how to search, browse, and buy from real stores."
- Stats bar below search: `{total} skills indexed` · `{sectors} sectors` · install command hint: `npx shopy add <slug>`
- CTA: "Submit a new skill" → links to `/agentic-shopping-score`

#### Table columns

**Current columns:** Brand | Sector | Tier | Score | →

**New columns:** Skill | Capabilities | Checkout | Maturity | →

| Column | Source | Display |
|---|---|---|
| **Skill** | `brand.name` + `brand.domain` | Name + small domain text (like npm package name) |
| **Capabilities** | `brand.capabilities[]` | Compact pills — first 3, then "+N more" |
| **Checkout** | `brand.checkoutMethods[]` | Preferred method label (first in array) |
| **Maturity** | `brand.maturity` | Badge: verified/official/beta/community/draft |
| **→** | Link | `/skills/${brand.slug}` |

Drop Score and Tier columns — those belong on shopy.sh.

#### Design rules

- No `rounded-xl/2xl/lg` — use `rounded-none`
- No shadows
- Cards: `border border-neutral-800`
- Section labels: `text-sm font-mono text-neutral-400 tracking-wide` uppercase
- Dark: `bg-neutral-950`

---

### Task 4: Update BrandRow type and remove score-centric components

**File:** `components/tenants/brands/landing.tsx`

- Update `BrandRow` type to include `capabilities`, `checkoutMethods`, `maturity`
- Remove `ScoreBadge` component
- Remove `overallScore` and `tier` from type and display
- Add capability and checkout display helpers

---

## Files Changed

| File | Change |
|---|---|
| `app/api/v1/scan/route.ts` | Save `draft` to `brandData`, add `checkoutMethods` to upsert |
| `lib/scan-queue/process-next.ts` | Same fix — save `draft` to `brandData`, add `checkoutMethods` |
| `app/skills/[vendor]/page.tsx` | Null guards on `vendor.*` access for graceful degradation |
| `components/tenants/brands/landing.tsx` | Redesign — skill registry layout |

## Files NOT Changed

| File | Reason |
|---|---|
| `app/api/v1/brands/route.ts` | API already returns capabilities, checkoutMethods, maturity |
| `components/tenants/shopy/landing.tsx` | Shopy stays score-oriented — different tenant |
| `app/brands/[slug]/page.tsx` | This is the shopy score detail page — unrelated |
| `lib/procurement-skills/generator.ts` | DO NOT MODIFY — skill generation logic itself is correct |
| `lib/procurement-skills/types.ts` | VendorSkill type is correct — no changes needed |
| `lib/agentic-score/agent-scan.ts` | Agent scan tool schema is correct |
| `shared/schema.ts` | No schema changes needed |

## Out of Scope (Future)

- **`skill.json` generation** — The spec is documented (`docs/build context/Shopy/skill-json-schema.md`) but not yet implemented. The scan produces most of the needed data. Implementation would involve: (1) a `buildSkillJson()` function mapping VendorSkill + scoring data to the skill.json schema, (2) storing it on brand_index or serving it dynamically, (3) a new API endpoint at `/api/v1/registry/{vendor}/skill.json`. This is the natural next step after the pipeline fix.
- **UCP category mapping** — The spec defines how agents map merchants to Google Product Taxonomy categories during scans. Not yet wired into the agent prompt. Would enrich `skill.json.taxonomy.categories`.
- **Skill submission flow** — Allow non-admin users to submit a SKILL.md for review.
- **Skill versioning** — Track SKILL.md versions over time (like ClawHub).
- **Download/install counts** — Track `npx shopy add` usage per skill.
- **Stars/ratings** — Community engagement on skills.
- **Security assessment panel** — ClawHub-style automated skill audit.
- **Semantic search** — Vector-based skill search (currently keyword-based).
- **CLI integration** — `npx shopy add` command (covered in `docs/build context/Shopy/shopy-cli-technical-plan.md`).
