# Perplexity Sonar Integration — Technical Plan

## Problem

The current scanner asks Claude to do two fundamentally different jobs in one agent loop:

1. **Entity classification** — What is this brand? What sector? What do they sell?
2. **Technical page audit** — Does the site have structured data, guest checkout, API docs, etc.?

Claude works from raw HTML, which makes it terrible at #1 (it reads "burger" from a JS-rendered page instead of knowing it's Patagonia) but good at #2 (it can actually inspect page elements and follow links).

Meanwhile, Perplexity Sonar is a search-grounded model — it already knows what every brand is, what they sell, what category they're in. Our test of 10 domains returned perfect results for all 10 in ~2 seconds each, with zero scraping.

## Solution

Add a Perplexity Sonar pre-step that resolves all brand metadata before the Claude agent scan runs. Claude then focuses purely on technical evidence gathering for the scoring rubric.

## Architecture

```
CURRENT FLOW:
  domain → fetchScanInputs (Firecrawl) → detectAll (regex) → agenticScan (Claude does EVERYTHING) → upsert

NEW FLOW:
  domain → classifyBrand (Perplexity Sonar) → fetchScanInputs (Firecrawl) → detectAll (regex) → agenticScan (Claude: scoring only) → upsert
```

The Perplexity call is independent of HTML fetching, so they run in parallel.

## New File

### `lib/agentic-score/classify-brand.ts`

Single-purpose module. One exported function:

```ts
export interface BrandClassification {
  name: string;
  sector: VendorSector;
  tier: BrandTier;
  subCategories: string[];
  capabilities: VendorCapability[];
  description: string;
  guestCheckout: boolean;
  hasSearchApi: boolean;
  hasMobileApp: boolean;
}

export async function classifyBrand(domain: string): Promise<BrandClassification | null>
```

**Implementation details:**
- Calls `https://api.perplexity.ai/chat/completions` with model `sonar`
- System prompt: "You classify e-commerce merchants. Return ONLY valid JSON, no markdown."
- User prompt: passes the domain and our exact enum values for sector, tier, capabilities
- `temperature: 0.1` for deterministic output
- Parses response, validates against our enums, returns typed object
- Returns `null` on any failure (network, bad JSON, missing key) — never blocks the scan
- Timeout: 15 seconds

**No new dependencies needed** — uses native `fetch` against the REST API.

## Changes to Existing Files

### 1. `app/api/v1/scan/route.ts`

**Lines ~219-228** — After rate limit check and domain normalization, before `fetchScanInputs`:

```ts
// Run Perplexity classification and Firecrawl fetch in parallel
const [classification, input] = await Promise.all([
  classifyBrand(domain).catch(() => null),
  fetchScanInputs(domain),
]);
```

**Lines ~263-273** — Replace name/sector/tier resolution to prefer Perplexity over agent findings:

```ts
// Priority: existing DB value > Perplexity classification > agent findings > HTML meta fallback
const resolvedName = existing?.name
  ?? classification?.name
  ?? (agentFindings.name as string | undefined)
  ?? meta.name;

const resolvedSector = (existing?.sector && existing.sector !== "uncategorized")
  ? existing.sector
  : classification?.sector
  ?? (agentFindings.sector as string | undefined)
  ?? "uncategorized";

const resolvedSubSectors = (existing?.subSectors && existing.subSectors.length > 0)
  ? existing.subSectors
  : classification?.subCategories
  ?? (Array.isArray(agentFindings.subSectors) ? agentFindings.subSectors as string[] : []);

const resolvedTier = existing?.tier
  ?? classification?.tier
  ?? (agentFindings.tier as string | undefined)
  ?? null;
```

**Lines ~286-313** — In the `upsertBrandIndex` call, merge Perplexity capabilities with agent/existing:

```ts
capabilities: mergeArrayField(
  existing?.capabilities,
  mergeArrayField(
    classification?.capabilities?.map(c => c as string),
    draft?.capabilities?.map(c => c as string) ?? agentFindings.capabilities as string[] | undefined,
  ),
),
description: existing?.description ?? classification?.description ?? meta.description,
```

**Lines ~276-282** — Pass Perplexity data into `buildVendorSkillDraft` so the SKILL.md gets correct capabilities:

The `buildVendorSkillDraft` function already takes `findings` — we merge Perplexity classification fields into `agentFindings` before passing:

```ts
const enrichedFindings = {
  ...agentFindings,
  // Perplexity fills gaps the agent missed
  ...(classification ? {
    name: agentFindings.name ?? classification.name,
    sector: agentFindings.sector ?? classification.sector,
    capabilities: agentFindings.capabilities ?? classification.capabilities,
    guestCheckout: agentFindings.guestCheckout ?? classification.guestCheckout,
  } : {}),
};
```

### 2. `lib/scan-queue/process-next.ts`

Mirror the exact same changes. This file duplicates the scan route logic for background queue processing.

**Same pattern:**
- Import `classifyBrand`
- Run in parallel with `fetchScanInputs`
- Same resolution priority for name/sector/tier/capabilities
- Same `enrichedFindings` merge before `buildVendorSkillDraft`

### 3. `lib/agentic-score/agent-scan.ts`

**No structural changes.** The Claude agent keeps its current tools and prompt. It still tries to resolve name/sector/capabilities via `record_findings`, but those values become fallbacks — Perplexity's answers take priority in the route layer.

Future optimization (not in this PR): strip the entity-classification instructions from the Claude system prompt since Perplexity handles it. This would save tokens and reduce agent confusion, but it's a separate change.

## Files Touched

| File | Change |
|------|--------|
| `lib/agentic-score/classify-brand.ts` | **NEW** — Perplexity Sonar classification function |
| `app/api/v1/scan/route.ts` | Add parallel classifyBrand call, update resolution priority |
| `lib/scan-queue/process-next.ts` | Same changes mirrored |
| `lib/agentic-score/agent-scan.ts` | No changes |
| `lib/agentic-score/fetch.ts` | No changes |
| `lib/agentic-score/extract-meta.ts` | No changes |

## Files NOT Touched

- `lib/agentic-score/rubric.ts` — scoring rubric stays the same
- `lib/agentic-score/scoring-engine.ts` — score computation stays the same
- `lib/procurement-skills/generator.ts` — SKILL.md generation stays the same
- `shared/schema.ts` — no schema changes needed
- `components/tenants/brands/landing.tsx` — no UI changes

## Testing

After implementation, re-scan the 4 problem domains and verify:
1. **patagonia.com** → name: "Patagonia", sector: "sports"
2. **chewy.com** → name: "Chewy", sector: "pets"
3. **wayfair.com** → name: "Wayfair", sector: "home"
4. **bestbuy.com** → name: "Best Buy", sector: "electronics"

Also verify capabilities are populated (not empty arrays) and descriptions are meaningful (not "Online store at domain.com").

## Graceful Degradation

If Perplexity is down or the API key is missing:
- `classifyBrand()` returns `null`
- The resolution chain falls through to agent findings → HTML meta → domain-derived name
- The scan still completes — just with lower-quality metadata (same as today)
- Console warning logged: `[scan] Perplexity classification failed for {domain}: {error}`

## Cost

Perplexity Sonar: ~$1 per 1000 requests (search queries). Each scan = 1 API call. Negligible compared to the Claude agent loop (which runs 5-20 turns at ~$0.10-0.50 per scan).
