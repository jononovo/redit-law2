# Perplexity Sonar Integration — Technical Plan

## Problem

The scanner asks Claude to do two fundamentally different jobs in one agent loop:

1. **Entity classification** — What is this brand? What sector? What do they sell?
2. **Technical page audit** — Does the site have structured data, guest checkout, API docs, etc.?

Claude works from raw HTML, which makes it terrible at #1 (reads "burger" from a JS-rendered page instead of knowing it's Patagonia) but good at #2 (can inspect page elements and follow links).

Perplexity Sonar is search-grounded — it already knows what every brand is. Tested 10 domains, all 10 returned perfect name/sector/tier/capabilities in ~2 seconds, zero scraping.

## Solution

Add a Perplexity Sonar pre-step for brand metadata. Strip entity classification duties from Claude. Extract duplicated logic into a shared module. Net result: cleaner code, fewer lines, better data.

## Architecture

```
CURRENT:
  domain → fetchScanInputs (Firecrawl)
         → detectAll (regex)
         → agenticScan (Claude does EVERYTHING including brand ID)
         → duplicated helper functions in route.ts AND process-next.ts
         → upsert

NEW:
  domain → classifyBrand (Perplexity) ─┐
         → fetchScanInputs (Firecrawl) ─┤  [parallel]
                                        ↓
         → detectAll (regex)
         → agenticScan (Claude: technical audit ONLY)
         → shared helper functions from scan-utils.ts
         → upsert
```

## File Changes

### NEW: `lib/agentic-score/classify-brand.ts`

Single exported function:

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

- Calls Perplexity Sonar REST API (`sonar` model, `temperature: 0.1`)
- Passes our exact enum values in the prompt so output maps directly
- Returns `null` on any failure — never blocks a scan
- No new npm dependencies (uses native fetch)

### NEW: `lib/agentic-score/scan-utils.ts`

Extract these duplicated items from route.ts and process-next.ts:

- `VALID_SECTORS` array
- `VALID_CAPABILITIES` array
- `toValidSector()` function
- `toValidCapabilities()` function
- `mergeArrayField()` function
- `mergeEvidence()` function
- `buildVendorSkillDraft()` function

Currently all of these are copy-pasted identically in both files. One source of truth.

### MODIFY: `lib/agentic-score/agent-scan.ts`

**Strip entity classification from `record_findings` tool.**

Remove these properties from the tool schema:
- `name` (Perplexity provides this)
- `sector` (Perplexity provides this)
- `subSectors` (Perplexity provides this)
- `tier` (Perplexity provides this)
- `capabilities` (Perplexity provides this)

Keep these (Claude finds them from page analysis):
- `guestCheckout`, `taxExemptField`, `poNumberField`
- `searchUrlTemplate`, `searchPattern`, `productIdFormat`
- `freeShippingThreshold`, `estimatedDeliveryDays`, `businessShipping`
- `tips`, `checkoutProviders`, `paymentMethods`
- `hasApi`, `hasMcp`

**Update system prompt** (lines 252-276):
- Remove instruction #4 about capturing "name, sector, capabilities"
- Add: "Brand identification (name, sector, category) is handled separately. Focus on technical page audit evidence only."

**Remove unused constants** (lines 57-71):
- `VALID_SECTORS` array — no longer needed without sector in record_findings
- `VALID_TIERS` array — same
- `VALID_CAPABILITIES` array — same
- Associated validation logic in the record_findings handler (lines 418-425)

### MODIFY: `app/api/v1/scan/route.ts`

1. **Import** `classifyBrand` from classify-brand.ts
2. **Import** shared functions from scan-utils.ts
3. **Delete** local copies of `buildVendorSkillDraft`, `mergeEvidence`, `mergeArrayField`, `toValidSector`, `toValidCapabilities`, `VALID_SECTORS`, `VALID_CAPABILITIES`
4. **Parallelize** Perplexity + Firecrawl:
   ```ts
   const [classification, input] = await Promise.all([
     classifyBrand(domain).catch(() => null),
     fetchScanInputs(domain),
   ]);
   ```
5. **Update resolution priority** for name/sector/tier/subSectors:
   `existing DB → Perplexity → agent findings → HTML meta`
6. **Merge Perplexity capabilities** into the capabilities field

### MODIFY: `lib/scan-queue/process-next.ts`

Mirror the exact same changes as route.ts:
- Import from classify-brand.ts and scan-utils.ts
- Delete local duplicated functions
- Add parallel classifyBrand call
- Same resolution priority

### KEEP: `lib/agentic-score/extract-meta.ts`

28-line last-resort fallback. Stays as-is. With Perplexity in the chain it will rarely be the source of the final name, but it's a harmless safety net.

## Net Code Impact

| File | Before | After |
|------|--------|-------|
| `classify-brand.ts` | — | ~60 lines (new) |
| `scan-utils.ts` | — | ~70 lines (new, extracted) |
| `route.ts` | 337 lines | ~270 lines (removed ~80 lines of duplicated helpers, added ~15 lines of Perplexity integration) |
| `process-next.ts` | 356 lines | ~290 lines (same cleanup) |
| `agent-scan.ts` | 476 lines | ~440 lines (removed entity fields from tool, removed unused enums) |

Estimated net: **~130 lines of shared/new code replace ~200 lines of duplicated code.** Net reduction of ~70 lines.

## Graceful Degradation

If Perplexity is down or `PERPLEXITY_API_KEY` is missing:
- `classifyBrand()` returns `null`
- Resolution chain falls through to agent findings → HTML meta
- Scan still completes with lower-quality metadata (same as current behavior)
- Console warning: `[scan] Perplexity classification failed for {domain}: {error}`

## Testing

Re-scan 4 problem domains and verify:
1. **patagonia.com** → name: "Patagonia", sector: "sports"
2. **chewy.com** → name: "Chewy", sector: "pets"
3. **wayfair.com** → name: "Wayfair", sector: "home"
4. **bestbuy.com** → name: "Best Buy", sector: "electronics"

Verify capabilities populated, descriptions meaningful, tiers assigned.
Also verify a scan works with `PERPLEXITY_API_KEY` unset (graceful fallback).
