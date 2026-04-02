# Phase 4: Agentic Multi-Page Scan

## Objective

Replace the static single-page Claude analysis with an agentic scan — one Claude 
conversation where Claude drives the exploration of a website using tool_use. Claude 
decides what pages to visit, fetches them via tools, and progressively builds up 
findings. Also merge existing curated `brandData` into SKILL.md generation.

---

## Architecture: Agentic Scan

### Current state (static pipeline)

```
fetchScanInputs(domain)          → homepage + sitemap + robots
  ↓
computeASXScore(input)           → regex-only scoring on homepage
  ↓
analyzeScanWithClaude(html)      → one Claude call, homepage only, flat prompt
  ↓
enhanceScores(base, findings)    → boost scores from Claude findings
  ↓
buildVendorSkillDraft(findings)  → construct VendorSkill from Claude output
  ↓
generateVendorSkill(draft)       → render SKILL.md
  ↓
upsertBrandIndex(...)            → persist everything
```

Problems:
- Claude only sees the homepage — misses product pages, cart, search
- Page discovery uses hardcoded regex URL patterns
- All pages dumped into one prompt (overwhelms Claude, no progressive learning)
- No intelligence about WHICH pages matter for THIS specific store

### Proposed state (agentic pipeline)

```
fetchScanInputs(domain)          → homepage + sitemap + robots (unchanged)
  ↓
computeASXScore(input)           → regex-only scoring on homepage (unchanged)
  ↓
agenticScan(input)               → Claude agent explores the site:
  │                                  1. Reads homepage, identifies store type
  │                                  2. Calls fetch_page() to visit a product page
  │                                  3. Reads product page, discovers cart/search URLs
  │                                  4. Calls fetch_page() for cart and search
  │                                  5. Analyzes everything, records findings
  │                                  Returns: AgenticScanResult (findings + fetched pages)
  ↓
enhanceScores(base, findings)    → boost scores from Claude findings (unchanged)
  ↓
boostFromPages(base, pages)      → NEW: boost signal scores from additional page HTML
  ↓
buildVendorSkillDraft(...)       → construct VendorSkill (now also merges brandData)
  ↓
generateVendorSkill(draft)       → render SKILL.md (unchanged)
  ↓
upsertBrandIndex(...)            → persist everything
```

---

## Part 1: SDK Upgrade + Agent Infrastructure

### Upgrade Anthropic SDK

Current: `@anthropic-ai/sdk` v0.37.0 → **DONE: upgraded to v0.82.0**

### Model selection

Use `claude-sonnet-4-6-20260320` (Sonnet 4.6, March 2026) for all scan operations.
Update the model constant in `llm.ts` and use the same model in the new `agent-scan.ts`.

### Files to modify

| File | Change |
|---|---|
| `package.json` | **DONE** — upgraded `@anthropic-ai/sdk` to v0.82.0 |
| `lib/agentic-score/llm.ts` | Update model constant to `claude-sonnet-4-6-20260320` |

---

## Part 2: Agentic Scan Engine

### New file: `lib/agentic-score/agent-scan.ts`

This is the core new module. It runs a single Claude conversation with tool_use where 
Claude autonomously explores the website.

### Tools Claude gets

**1. `fetch_page`**
```typescript
{
  name: "fetch_page",
  description: "Fetch a page from this website. Returns the HTML content. Use this to visit product pages, cart, search results, or any other page you need to analyze.",
  input_schema: {
    type: "object",
    properties: {
      url: { 
        type: "string", 
        description: "Full URL to fetch (must be on the same domain being scanned)" 
      },
      page_type: { 
        type: "string", 
        enum: ["product", "cart", "search", "category", "checkout", "other"],
        description: "What type of page this is"
      },
      reason: { 
        type: "string", 
        description: "Why you want to visit this page — what you expect to learn" 
      }
    },
    required: ["url", "page_type", "reason"]
  }
}
```

Server-side implementation:
- Validate URL is on the same domain (prevent cross-site crawling)
- Run SSRF validation (`resolveAndValidate()`)
- Fetch via Firecrawl (JS rendering) with 15s timeout
- Strip `<script>`, `<style>`, comments
- Return first 20,000 characters of stripped HTML
- Track page count against budget

**2. `record_findings`**
```typescript
{
  name: "record_findings",
  description: "Save structured findings about this store. Call this whenever you've learned something new. You can call it multiple times — findings are merged.",
  input_schema: {
    type: "object",
    properties: {
      name: { type: "string" },
      sector: { type: "string", enum: [sector list] },
      subSectors: { type: "array", items: { type: "string" } },
      tier: { type: "string", enum: [tier list] },
      searchUrlTemplate: { type: "string" },
      searchPattern: { type: "string" },
      productIdFormat: { type: "string" },
      guestCheckout: { type: "boolean" },
      taxExemptField: { type: "boolean" },
      poNumberField: { type: "boolean" },
      freeShippingThreshold: { type: ["number", "null"] },
      estimatedDeliveryDays: { type: "string" },
      businessShipping: { type: "boolean" },
      cartUrl: { type: "string" },
      checkoutProviders: { type: "array", items: { type: "string" } },
      paymentMethods: { type: "array", items: { type: "string" } },
      capabilities: { type: "array", items: { type: "string" } },
      hasApi: { type: "boolean" },
      hasMcp: { type: "boolean" },
      jsonLdTypes: { type: "array", items: { type: "string" } },
      variantSelectors: { type: "array", items: { type: "string" } },
      priceFormat: { type: "string" },
      tips: { type: "array", items: { type: "string" } }
    }
  }
}
```

Server-side implementation:
- Deep-merge incoming findings with accumulated findings
- Booleans: OR-merge (false → true upgrades, never downgrades)
- Arrays: set-union (never removes items)
- Strings: last-write-wins (Claude refines as it learns more)

**3. `complete_scan`**
```typescript
{
  name: "complete_scan",
  description: "Call this when you have finished exploring the site and recorded all findings.",
  input_schema: {
    type: "object",
    properties: {
      summary: { 
        type: "string", 
        description: "Brief summary of what you found and how an agent should shop here" 
      },
      confidence: { 
        type: "string", 
        enum: ["high", "medium", "low"],
        description: "How confident you are in the findings" 
      }
    },
    required: ["summary", "confidence"]
  }
}
```

Server-side implementation:
- Set a flag to break the agent loop
- Store summary + confidence in result

### System prompt

```
You are a site analyst for CreditClaw, an AI procurement platform. Your job is to 
explore an e-commerce website and understand how an AI shopping agent would interact 
with it.

You will be given the homepage HTML of a store. Explore the site to understand three 
things:

1. PRODUCT DISCOVERY — How would an agent find and identify products?
2. PRODUCT STRUCTURE — How are products displayed? What variants, pricing, IDs exist?
3. CHECKOUT FLOW — How would an agent complete a purchase?

You have tools to fetch additional pages. Use them strategically:

- Start by analyzing the homepage. Identify the store, its sector, and find links to 
  product pages, cart, and search.
- Fetch a product page to understand product structure (variants, pricing, add-to-cart).
- From the product page, identify the cart URL and search pattern.
- Fetch the cart page to understand checkout flow (guest checkout, payment methods, 
  tax exemption, PO numbers).
- Fetch a search results page to verify the search pattern works and understand result 
  structure.

Call record_findings whenever you learn something new. Don't wait until the end — 
save findings progressively so nothing is lost if the scan is interrupted.

Call complete_scan when you've gathered enough information or run out of useful pages 
to visit.

You are analyzing: {domain}
```

### Initial user message

```
Here is the homepage of {domain}:

{stripped homepage HTML, up to 25,000 chars}

{if sitemap exists:}
Here is the sitemap.xml (may contain product URLs):
{sitemap content, up to 10,000 chars}

{if robots.txt exists:}
Here is robots.txt:
{robots.txt content, up to 5,000 chars}

Explore this site. Start by analyzing what you see on the homepage, then use 
fetch_page to visit the most important pages for understanding how an agent would 
shop here.
```

### Agent loop

```typescript
async function agenticScan(input: ScoreInput): Promise<AgenticScanResult> {
  const anthropic = new Anthropic({ apiKey });
  const tools = [fetchPageTool, recordFindingsTool, completeScanTool];
  const messages = [{ role: "user", content: buildInitialMessage(input) }];
  
  const findings: LLMScanFindings = {};
  const fetchedPages: PageFetch[] = [];
  let scanComplete = false;
  let toolCallCount = 0;
  
  const MAX_TOOL_CALLS = 6;
  const SCAN_TIMEOUT_MS = 90_000;
  const scanStart = Date.now();
  
  while (!scanComplete && toolCallCount < MAX_TOOL_CALLS) {
    if (Date.now() - scanStart > SCAN_TIMEOUT_MS) break;
    
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools,
      messages,
    });
    
    // Add assistant response to conversation
    messages.push({ role: "assistant", content: response.content });
    
    if (response.stop_reason === "end_turn") break;
    
    if (response.stop_reason === "tool_use") {
      const toolResults = [];
      
      for (const block of response.content) {
        if (block.type !== "tool_use") continue;
        toolCallCount++;
        
        let result: string;
        switch (block.name) {
          case "fetch_page":
            result = await handleFetchPage(block.input, input.domain, fetchedPages);
            break;
          case "record_findings":
            result = handleRecordFindings(block.input, findings);
            break;
          case "complete_scan":
            result = handleCompleteScan(block.input);
            scanComplete = true;
            break;
        }
        
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: result,
        });
      }
      
      messages.push({ role: "user", content: toolResults });
    }
  }
  
  return { findings, fetchedPages, complete: scanComplete };
}
```

### Return type

```typescript
interface AgenticScanResult {
  findings: LLMScanFindings;      // All accumulated findings
  fetchedPages: PageFetch[];       // Pages Claude fetched (for signal boosting)
  complete: boolean;               // Whether Claude called complete_scan
  summary?: string;                // Claude's summary of the store
  confidence?: "high" | "medium" | "low";
}

interface PageFetch {
  url: string;
  pageType: "product" | "cart" | "search" | "category" | "checkout" | "other";
  html: string;                    // Stripped HTML (for signal scoring)
  statusCode: number;
}
```

### Guardrails

| Guardrail | Value | Rationale |
|---|---|---|
| Max `fetch_page` calls | 5 | Homepage + product + cart + search + 1 spare |
| Max total tool calls | 6 | 5 fetches + 1 complete_scan (record_findings doesn't count) |
| Scan timeout | 90 seconds | Firecrawl pages ~5-10s each, Claude reasoning ~2-3s each step |
| Max HTML per page | 20,000 chars | Enough for meaningful analysis, keeps token budget manageable |
| Domain lock | Same domain only | `fetch_page` rejects any URL not on the target domain |
| SSRF protection | resolveAndValidate() | Every `fetch_page` URL goes through SSRF check |

### Token budget estimate

- System prompt: ~500 tokens
- Initial message (homepage + sitemap + robots): ~10,000 tokens
- Per tool round-trip (Claude reasoning + tool call + result): ~8,000 tokens
- Typical scan (3-4 page fetches): ~35,000-45,000 tokens total
- Cost: ~$0.06-0.10 per scan (higher than static, but much richer output)

### Graceful degradation

If the agentic scan fails for any reason (API error, timeout, budget exceeded):
- Return whatever findings were accumulated via `record_findings` so far
- Return whatever pages were fetched (for signal boosting)
- The pipeline continues with partial data — same as current behavior when Claude 
  fails entirely (regex-only scores persist)

### Files to create/modify

| File | Change |
|---|---|
| `lib/agentic-score/agent-scan.ts` | **NEW** — agentic scan engine with tool definitions, agent loop, tool handlers |
| `lib/agentic-score/llm.ts` | Keep for backward compatibility, but scan route will call `agenticScan()` instead |
| `lib/agentic-score/types.ts` | Add `PageFetch`, `AgenticScanResult` interfaces |
| `app/api/v1/scan/route.ts` | Replace `analyzeScanWithClaude()` call with `agenticScan()` call |

---

## Part 3: Signal Boosting from Agent-Fetched Pages

### Approach: additive enhancement layer (no signal refactor)

All 10 existing signal functions remain untouched. They continue scoring on homepage HTML 
only. A new function `boostFromAgentPages()` takes the base score result + the pages 
Claude fetched and applies floor-based boosts.

This follows the same pattern as `enhanceScores()` — additive, never lowers scores.

### New file: `lib/agentic-score/boost-pages.ts`

```typescript
export function boostFromAgentPages(
  baseResult: ASXScoreResult,
  pages: PageFetch[],
): ASXScoreResult
```

### Boost rules by signal

| Signal | Page type | What to check | Boost logic |
|---|---|---|---|
| `json_ld` (max 20) | product | `<script type="application/ld+json">` with Product type | If product page has Product JSON-LD, boost to floor of 12. If has Offer too, floor of 16. |
| `clean_html` (max 10) | product | Semantic markup: `<main>`, `<article>`, headings | If product page has better semantic structure, boost to floor of 6 |
| `order_management` (max 10) | product, cart | Add-to-cart form, quantity input, variant selectors | If product page has add-to-cart + variants, floor of 5. If cart page has item management, floor of 7. |
| `checkout_flow` (max 10) | cart | Checkout button, payment indicators, guest checkout | If cart page reveals checkout flow, floor of 5. If guest checkout visible, floor of 7. |
| `access_auth` (max 10) | cart | Does cart load without redirect to login? | If cart page loads directly (200, no login form), floor of 7. |
| `site_search` (max 10) | search | Does search page return results? | If search page has product results, floor of 7. |
| `bot_tolerance` (max 10) | any | Did Firecrawl succeed on all pages? | If 3+ pages fetched successfully, floor of 5. |

### Files to create

| File | Change |
|---|---|
| `lib/agentic-score/boost-pages.ts` | **NEW** — additive score boosting from agent-fetched pages |

---

## Part 4: Brand Data Enrichment for SKILL.md

### Current state

`buildVendorSkillDraft()` constructs a `VendorSkill` from Claude findings only. Curated 
`brandData` in the DB is ignored.

### Proposed change

`buildVendorSkillDraft()` accepts an optional `brandData` parameter and merges three 
sources in priority order:

1. **Existing `brandData`** (highest priority — human-curated)
2. **Agent findings** (fills gaps not covered by curated data)
3. **Hardcoded defaults** (last resort)

### Merge rules

| Field | Source priority |
|---|---|
| `name` | brandData > findings > extractMeta > domain |
| `sector` | existing (if not "uncategorized") > findings > "uncategorized" |
| `checkoutMethods` | brandData > ["browser_automation"] |
| `capabilities` | set-union(brandData, findings) |
| `search.*` | brandData > findings > defaults |
| `checkout.*` | brandData > findings > false |
| `shipping.*` | brandData > findings > defaults |
| `tips` | brandData > findings > generic |
| `taxonomy` | brandData (if present) |
| `buying` | brandData (if present) |
| `deals` | brandData (if present) |

### Files to modify

| File | Change |
|---|---|
| `app/api/v1/scan/route.ts` | Pass `existing?.brandData` to `buildVendorSkillDraft()` |

---

## Updated Pipeline Flow in scan/route.ts

```typescript
// 1. Fetch homepage + sitemap + robots (unchanged)
const input = await fetchScanInputs(domain);

// 2. Regex-only base scoring on homepage (unchanged)
const baseScoreResult = computeASXScore(input);

// 3. Agentic scan — Claude explores the site (NEW)
let agentResult: AgenticScanResult = { findings: {}, fetchedPages: [], complete: false };
try {
  agentResult = await agenticScan(input);
} catch {
  // Falls back to regex-only scores
}

// 4. Enhance scores from Claude findings (unchanged, same function)
const enhancedResult = enhanceScores(baseScoreResult, agentResult.findings);

// 5. Boost scores from pages Claude fetched (NEW)
const finalResult = boostFromAgentPages(enhancedResult, agentResult.fetchedPages);

// 6. Build VendorSkill draft (updated to merge brandData)
const draft = buildVendorSkillDraft(slug, domain, name, sector, 
  agentResult.findings, existing?.brandData);

// 7. Generate SKILL.md (unchanged)
const skillMd = generateVendorSkill(draft);

// 8. Persist (unchanged)
await storage.upsertBrandIndex({ ... });
```

---

## Execution Order

```
Part 1: SDK upgrade + model update
  ↓
Part 2: Agentic scan engine (agent-scan.ts)  ← core new module
  ↓
Part 3: Signal boosting from fetched pages (boost-pages.ts)
  ↓
Part 4: Brand data enrichment in buildVendorSkillDraft()
  ↓
Integration: Wire everything together in scan/route.ts
```

Parts 3 and 4 are independent of each other and can be done in parallel after Part 2.

---

## Risk Assessment

| Risk | Mitigation |
|---|---|
| Claude makes bad decisions (visits wrong pages) | Guardrails: max 5 fetches, domain lock, 90s timeout. Even with bad choices, `record_findings` progressively saves what it learns — partial data is still useful. |
| Agent loop takes too long | 90s hard timeout. Most scans complete in 30-50s (3-4 Firecrawl fetches at ~8s each + Claude reasoning). |
| Firecrawl rate limits (5 calls/scan) | 500 pages/month ÷ 5 = 100 scans/month on free tier. Quality over quantity. Upgrade Firecrawl plan when volume justifies it. |
| Token cost ~$0.06-0.10/scan | 2-3x current cost. Acceptable for quality improvement — each scan replaces what used to be two separate pipelines (scan + skill builder). |
| SDK upgrade breaks existing code | `analyzeScanWithClaude()` in `llm.ts` remains unchanged. New agentic scan is a separate module. Switch in `route.ts` is isolated to one call site. |
| Claude doesn't call `complete_scan` | Loop exits on `end_turn` stop_reason OR max tool calls. Accumulated findings are still returned. |

---

## What We Do NOT Change

- `analyzeVendor()` in `lib/procurement-skills/builder/` — untouched
- `generateVendorSkill()` in `lib/procurement-skills/generator.ts` — untouched  
- `computeASXScore()` and all signal functions — untouched
- `enhanceScores()` in `enhance.ts` — untouched
- `fetchScanInputs()` in `fetch.ts` — untouched (still fetches homepage + sitemap + robots)
- AXS Rating system — untouched
- Existing signal max point values — same 100-point scale

---

## New Files Summary

| File | Purpose |
|---|---|
| `lib/agentic-score/agent-scan.ts` | Agentic scan engine: tools, agent loop, handlers |
| `lib/agentic-score/boost-pages.ts` | Signal boosting from agent-fetched pages |

## Modified Files Summary

| File | Change |
|---|---|
| `package.json` | **DONE** — upgraded to v0.82.0 |
| `lib/agentic-score/types.ts` | Add `PageFetch`, `AgenticScanResult` |
| `app/api/v1/scan/route.ts` | Replace `analyzeScanWithClaude()` with `agenticScan()`, add `boostFromAgentPages()`, pass `brandData` to `buildVendorSkillDraft()` |
