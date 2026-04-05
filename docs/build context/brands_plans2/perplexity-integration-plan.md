# Perplexity Sonar Integration — Technical Plan

## Problem

The scanner asks Claude to do two fundamentally different jobs in one agent loop:

1. **Entity classification** — What is this brand? What sector? What do they sell?
2. **Technical page audit** — Does the site have structured data, guest checkout, API docs, etc.?

Claude works from raw HTML, which makes it terrible at #1 (reads "burger" from a JS-rendered page instead of knowing it's Patagonia) but good at #2 (can inspect page elements and follow links).

Perplexity Sonar is search-grounded — it already knows what every brand is. Tested 10 domains, all 10 returned perfect name/sector/tier/capabilities in ~2 seconds, zero scraping.

## Solution

Add a Perplexity Sonar pre-step for brand metadata. Strip entity classification duties from Claude entirely. Delete the HTML meta parser. Extract duplicated logic into a shared module. Net result: cleaner code, fewer lines, better data.

## Architecture

```
CURRENT:
  domain → fetchScanInputs (Firecrawl)
         → extractMeta (HTML title tag — produces garbage)
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

## Data Flow — Resolution Chains

### Name
```
existing DB name → Perplexity name → domain-derived label
```
Claude's name guess is NOT in this chain. It produced "burger", "Previous Slide", "reCAPTCHA". Domain-derived (`patagonia.com` → `"Patagonia"`) is a better last resort than Claude's HTML guesses.

### Sector
```
existing DB sector (if not "uncategorized") → Perplexity sector → "uncategorized"
```
Claude's sector guess is NOT in this chain. It defaulted everything to "specialty".

### Tier / SubSectors
```
existing DB → Perplexity → null / []
```

### Description
```
existing DB → Perplexity description → "{resolvedName} at {domain}"
```
NOTE: `description` is `.notNull()` in the schema, so we always need a value. The inline fallback handles the case where Perplexity fails.

### Capabilities
```
mergeArrayField(existing DB, Perplexity capabilities)
```
Agent findings for capabilities are removed. Perplexity returns accurate capabilities because we pass our exact enum values in the prompt.

### Technical Fields (guestCheckout, searchUrlTemplate, tips, etc.)
```
agent findings (Claude) — these are what Claude is good at
```
Claude keeps full ownership of page-level technical analysis.

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
- Remove dead validation code in `record_findings` handler (lines 418-425) that validated sector/tier/capabilities

### MODIFY: `app/api/v1/scan/route.ts`

1. **Import** `classifyBrand` from classify-brand.ts
2. **Import** shared functions from scan-utils.ts
3. **Delete** local copies of `buildVendorSkillDraft`, `mergeEvidence`, `mergeArrayField`, `toValidSector`, `toValidCapabilities`, `VALID_SECTORS`, `VALID_CAPABILITIES`
4. **Delete** `extractMeta` import and `const meta = extractMeta(...)` call
5. **Parallelize** Perplexity + Firecrawl:
   ```ts
   const [classification, input] = await Promise.all([
     classifyBrand(domain).catch(() => null),
     fetchScanInputs(domain),
   ]);
   ```
6. **Update resolution chains** — use exact chains from "Data Flow" section above. Do NOT reference `agentFindings.name`, `.sector`, `.subSectors`, `.tier`, `.capabilities` in resolution. Those fields stay in the agent findings object (Claude might still send them) but the route ignores them for entity metadata.
7. **Merge Perplexity capabilities into `buildVendorSkillDraft` input**:
   ```ts
   const enrichedFindings = {
     ...agentFindings,
     capabilities: classification?.capabilities ?? [],
     guestCheckout: agentFindings.guestCheckout ?? classification?.guestCheckout ?? false,
   };
   draft = buildVendorSkillDraft(slug, domain, resolvedName, resolvedSector, enrichedFindings);
   ```

### MODIFY: `lib/scan-queue/process-next.ts`

Mirror the exact same changes as route.ts:
- Import from classify-brand.ts and scan-utils.ts
- Delete local duplicated functions
- Delete `extractMeta` import and usage
- Add parallel classifyBrand call
- Same resolution chains
- Same enrichedFindings merge

### DELETE: `lib/agentic-score/extract-meta.ts`

HTML title-tag parsing that produces garbage ("burger", "Previous Slide", "reCAPTCHA"). This is an AI analysis feature — if AI classification fails, a `<title>` tag isn't going to save it. Delete the file, remove the export from `lib/agentic-score/index.ts`.

### MODIFY: `lib/agentic-score/index.ts`

Remove the `export { extractMeta } from "./extract-meta";` line.

## Verified: No Other Breakage

- `extractMeta` is only imported in `route.ts`, `process-next.ts`, and re-exported from `index.ts`. No other consumers.
- `agentFindings.hasApi` and `agentFindings.hasMcp` are still used in the upsert — those stay in the record_findings tool. ✓
- `description` has `.notNull()` constraint — covered by inline fallback. ✓
- `buildVendorSkillDraft` receives name/sector as separate params (not from findings) — unaffected. ✓
- `buildVendorSkillDraft` reads `findings.capabilities` — covered by enrichedFindings merge. ✓
- Scoring rubric, evidence detectors, scoring engine — completely untouched. ✓
- brands.sh landing page, skill detail page — no changes needed. ✓

## Net Code Impact

| File | Before | After |
|------|--------|-------|
| `classify-brand.ts` | — | ~60 lines (new) |
| `scan-utils.ts` | — | ~70 lines (new, extracted) |
| `extract-meta.ts` | 28 lines | **DELETED** |
| `index.ts` | export line | removed 1 line |
| `route.ts` | 337 lines | ~260 lines |
| `process-next.ts` | 356 lines | ~280 lines |
| `agent-scan.ts` | 476 lines | ~435 lines |

Estimated net: **~130 lines of shared/new code replace ~230 lines of duplicated/deleted code.** Net reduction of ~100 lines.

## Graceful Degradation

If Perplexity is down or `PERPLEXITY_API_KEY` is missing:
- `classifyBrand()` returns `null`
- Name falls back to domain-derived label (`patagonia.com` → `"Patagonia"`)
- Sector falls back to `"uncategorized"`
- Capabilities stay empty
- Description falls back to `"{name} at {domain}"`
- Scoring still completes normally (technical audit is independent)
- Console warning: `[scan] Perplexity classification failed for {domain}: {error}`

## Testing

Re-scan 4 problem domains and verify:
1. **patagonia.com** → name: "Patagonia", sector: "sports"
2. **chewy.com** → name: "Chewy", sector: "pets"
3. **wayfair.com** → name: "Wayfair", sector: "home"
4. **bestbuy.com** → name: "Best Buy", sector: "electronics"

Verify capabilities populated, descriptions meaningful, tiers assigned.
Also verify a scan works with `PERPLEXITY_API_KEY` unset (graceful fallback to domain-derived name + uncategorized sector).
