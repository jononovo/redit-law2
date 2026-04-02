# Phase 4: Agentic Multi-Page Scan

## Objective

Replace the static single-page Claude analysis with an agentic scan powered by the 
**Claude Agent SDK** (`@anthropic-ai/claude-agent-sdk`). The agent autonomously explores 
a website — fetching pages, analyzing content, and recording findings — using the same 
agent loop architecture that powers Claude Code. Custom tools are defined via an 
in-process MCP server. All built-in tools are disabled initially; future phases can 
enable WebSearch, WebFetch, or filesystem tools as needed without changing architecture.

Also merge existing curated `brandData` into SKILL.md generation.

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
- No intelligence about WHICH pages matter for THIS specific store
- Single static prompt — no progressive learning across pages
- Completely separate from skill builder pipeline (redundant work)

### Proposed state (agentic pipeline)

```
fetchScanInputs(domain)          → homepage + sitemap + robots (unchanged)
  ↓
computeASXScore(input)           → regex-only scoring on homepage (unchanged)
  ↓
agenticScan(input)               → Claude Agent SDK explores the site:
  │                                  Agent reads homepage → identifies store
  │                                  Agent calls fetch_page() for a product page
  │                                  Agent reads product page → finds cart/search
  │                                  Agent calls fetch_page() for cart and search
  │                                  Agent calls record_findings() progressively
  │                                  Returns: AgenticScanResult
  ↓
enhanceScores(base, findings)    → boost scores from Claude findings (unchanged)
  ↓
boostFromPages(base, pages)      → NEW: boost signal scores from fetched page HTML
  ↓
buildVendorSkillDraft(...)       → construct VendorSkill (now also merges brandData)
  ↓
generateVendorSkill(draft)       → render SKILL.md (unchanged)
  ↓
upsertBrandIndex(...)            → persist everything
```

---

## Part 1: SDK Installation + Model

### Install Claude Agent SDK

```bash
npm install @anthropic-ai/claude-agent-sdk
```

This is a separate package from `@anthropic-ai/sdk` (which we already have at v0.82.0). 
The Agent SDK provides:
- `query()` — creates the autonomous agent loop
- `tool()` — type-safe custom tool definitions with Zod schemas
- `createSdkMcpServer()` — in-process MCP server to host custom tools
- Built-in tools (Read, Write, Bash, Glob, Grep, WebSearch, WebFetch, etc.)
- Hooks, subagents, sessions, permission controls

### Model

Use `claude-sonnet-4-6-20260320` (Sonnet 4.6) via the `model` option in `query()`.

### Files to modify

| File | Change |
|---|---|
| `package.json` | Add `@anthropic-ai/claude-agent-sdk` |
| `lib/agentic-score/llm.ts` | Model constant already updated to `claude-sonnet-4-6-20260320` (**DONE**) |

---

## Part 2: Agentic Scan Engine

### New file: `lib/agentic-score/agent-scan.ts`

Uses the Claude Agent SDK with custom tools via an in-process MCP server. All built-in 
tools disabled — the agent can ONLY use our custom tools.

### Tool definitions (using `tool()` + Zod)

```typescript
import { tool, createSdkMcpServer, query } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";

// Shared state for the scan session
let findings: LLMScanFindings = {};
let fetchedPages: PageFetch[] = [];

// --- Tool 1: fetch_page ---
const fetchPageTool = tool(
  "fetch_page",
  "Fetch a page from this website. Returns the rendered HTML content. " +
  "Use this to visit product pages, cart, search results, or any other page " +
  "you need to analyze. URLs must be on the same domain being scanned.",
  {
    url: z.string().describe("Full URL to fetch (must be on the target domain)"),
    page_type: z.enum(["product", "cart", "search", "category", "checkout", "other"])
      .describe("What type of page this is"),
    reason: z.string().describe("Why you want to visit this page"),
  },
  async ({ url, page_type, reason }) => {
    // Domain lock: reject cross-site URLs
    // SSRF validation: resolveAndValidate()
    // Fetch via Firecrawl (JS rendering) with 15s timeout
    // Strip <script>, <style>, comments
    // Return first 20,000 chars of stripped HTML
    // Track against page budget
    const html = await safeFetchPage(url, targetDomain);
    fetchedPages.push({ url, pageType: page_type, html, statusCode: 200 });
    return { content: [{ type: "text", text: html }] };
  },
  { annotations: { readOnlyHint: true, openWorldHint: true } }
);

// --- Tool 2: record_findings ---
const recordFindingsTool = tool(
  "record_findings",
  "Save structured findings about this store. Call this whenever you've learned " +
  "something new. You can call it multiple times — findings are merged progressively. " +
  "Don't wait until the end; save as you go.",
  {
    name: z.string().optional(),
    sector: z.enum([...VALID_SECTORS]).optional(),
    subSectors: z.array(z.string()).optional(),
    tier: z.enum([...VALID_TIERS]).optional(),
    searchUrlTemplate: z.string().optional(),
    searchPattern: z.string().optional(),
    productIdFormat: z.string().optional(),
    guestCheckout: z.boolean().optional(),
    taxExemptField: z.boolean().optional(),
    poNumberField: z.boolean().optional(),
    freeShippingThreshold: z.number().nullable().optional(),
    estimatedDeliveryDays: z.string().optional(),
    businessShipping: z.boolean().optional(),
    cartUrl: z.string().optional(),
    checkoutProviders: z.array(z.string()).optional(),
    paymentMethods: z.array(z.string()).optional(),
    capabilities: z.array(z.string()).optional(),
    hasApi: z.boolean().optional(),
    hasMcp: z.boolean().optional(),
    jsonLdTypes: z.array(z.string()).optional(),
    variantSelectors: z.array(z.string()).optional(),
    priceFormat: z.string().optional(),
    tips: z.array(z.string()).optional(),
  },
  async (incoming) => {
    // Deep-merge: booleans OR-merge, arrays set-union, strings last-write-wins
    mergeFindings(findings, incoming);
    return { content: [{ type: "text", text: "Findings recorded." }] };
  },
  { annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false } }
);

// --- Tool 3: complete_scan ---
const completeScanTool = tool(
  "complete_scan",
  "Call this when you have finished exploring the site and recorded all findings.",
  {
    summary: z.string().describe("Brief summary of the store and how an agent should shop here"),
    confidence: z.enum(["high", "medium", "low"]).describe("Confidence in the findings"),
  },
  async ({ summary, confidence }) => {
    return { content: [{ type: "text", text: `Scan complete. Summary: ${summary}` }] };
  },
  { annotations: { readOnlyHint: true } }
);
```

### MCP Server + query() call

```typescript
// Create in-process MCP server with our custom tools
const scanServer = createSdkMcpServer({
  name: "scan",
  version: "1.0.0",
  tools: [fetchPageTool, recordFindingsTool, completeScanTool],
});

// Run the agent
for await (const message of query({
  prompt: buildInitialMessage(input),  // homepage HTML + sitemap + robots
  options: {
    model: "claude-sonnet-4-6-20260320",
    systemPrompt: SYSTEM_PROMPT,
    tools: [],  // Disable ALL built-in tools
    mcpServers: { scan: scanServer },
    allowedTools: [
      "mcp__scan__fetch_page",
      "mcp__scan__record_findings",
      "mcp__scan__complete_scan",
    ],
    permissionMode: "acceptEdits",
    maxBudgetUsd: 0.15,  // Hard cost cap per scan
  },
})) {
  // Stream messages — the SDK handles the agent loop automatically
  // We just monitor for the result
  if (message.type === "result" && message.subtype === "success") {
    // Agent finished
  }
}

return { findings, fetchedPages, complete: true };
```

### Key advantages over manual tool_use loop

1. **No manual while loop** — the SDK handles the agent loop, conversation history, 
   tool dispatch, and termination
2. **`maxBudgetUsd`** — built-in cost guardrail, no manual token counting
3. **Future extensibility** — to add WebSearch, filesystem access, or subagents later, 
   just add to `allowedTools`. No architecture change needed.
4. **Hooks** — can add pre/post tool execution hooks for logging, rate limiting, etc.
5. **Sessions** — can resume scans or review past scan conversations for debugging

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
Here is the sitemap.xml (may contain product URLs you can fetch):
{sitemap content, up to 10,000 chars}

{if robots.txt exists:}
Here is robots.txt:
{robots.txt content, up to 5,000 chars}

Explore this site. Start by analyzing what you see on the homepage, then use 
fetch_page to visit the most important pages for understanding how an agent would 
shop here.
```

### Return type

```typescript
interface AgenticScanResult {
  findings: LLMScanFindings;
  fetchedPages: PageFetch[];
  complete: boolean;
  summary?: string;
  confidence?: "high" | "medium" | "low";
}

interface PageFetch {
  url: string;
  pageType: "product" | "cart" | "search" | "category" | "checkout" | "other";
  html: string;
  statusCode: number;
}
```

### Guardrails

| Guardrail | Mechanism | Value |
|---|---|---|
| Cost cap | `maxBudgetUsd` option | $0.15 per scan |
| Tool restriction | `tools: []` + `allowedTools` | Only our 3 custom tools |
| Domain lock | `fetch_page` handler validates URL hostname | Same domain only |
| SSRF protection | `resolveAndValidate()` in `fetch_page` handler | Blocks private IPs |
| Page size | `fetch_page` handler truncates HTML | 20,000 chars per page |
| Permission mode | `permissionMode: "acceptEdits"` | Auto-approve tool calls |

### Token budget estimate

- System prompt: ~500 tokens
- Initial message (homepage + sitemap + robots): ~10,000 tokens
- Per tool round-trip (Claude reasoning + tool call + result): ~8,000 tokens
- Typical scan (3-4 page fetches): ~35,000-45,000 tokens total
- Cost: ~$0.06-0.10 per scan

### Graceful degradation

If the agentic scan fails for any reason (API error, timeout, budget exceeded):
- Return whatever findings were accumulated via `record_findings` so far
- Return whatever pages were fetched (for signal boosting)
- The pipeline continues with partial data — same as current behavior when Claude 
  fails entirely (regex-only scores persist)

### Files to create/modify

| File | Change |
|---|---|
| `lib/agentic-score/agent-scan.ts` | **NEW** — Agent SDK integration: tool definitions, MCP server, query() call, message handling |
| `lib/agentic-score/llm.ts` | Keep for backward compatibility. Scan route will call `agenticScan()` instead |
| `lib/agentic-score/types.ts` | Add `PageFetch`, `AgenticScanResult` interfaces |
| `app/api/v1/scan/route.ts` | Replace `analyzeScanWithClaude()` with `agenticScan()` |

---

## Part 3: Signal Boosting from Agent-Fetched Pages

### Approach: additive enhancement layer (no signal refactor)

All 10 existing signal functions remain untouched. They continue scoring on homepage HTML 
only. A new function `boostFromAgentPages()` takes the base score result + the pages 
the agent fetched and applies floor-based boosts.

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

// 3. Agentic scan — Claude Agent explores the site (NEW)
let agentResult: AgenticScanResult = { findings: {}, fetchedPages: [], complete: false };
try {
  agentResult = await agenticScan(input);
} catch {
  // Falls back to regex-only scores
}

// 4. Enhance scores from Claude findings (unchanged, same function)
const enhancedResult = enhanceScores(baseScoreResult, agentResult.findings);

// 5. Boost scores from pages the agent fetched (NEW)
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
Part 1: Install Claude Agent SDK + verify model
  ↓
Part 2: Build agentic scan engine (agent-scan.ts)  ← core new module
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
| Agent makes bad navigation decisions | `maxBudgetUsd: 0.15` hard cap. Progressive `record_findings` means partial data is preserved. Domain lock prevents wandering off-site. |
| Scan takes too long | Agent SDK manages the loop. `maxBudgetUsd` prevents runaway token usage. Typical scan: 30-60s. |
| Firecrawl rate limits (up to 5 pages/scan) | 500 pages/month ÷ 5 = 100 scans/month on free tier. Quality over quantity. Upgrade plan when volume justifies. |
| Token cost ~$0.06-0.10/scan | Acceptable — each scan replaces two separate pipelines (scan + skill builder). `maxBudgetUsd` prevents surprises. |
| Agent SDK adds complexity | Actually simpler — no manual while loop, no conversation history management. The SDK handles all of that. |
| Built-in tools token overhead (~16k tokens) | Set `tools: []` to strip all built-ins. Only our 3 custom tools in context. |

---

## Future Extensibility (why Agent SDK matters)

The Agent SDK makes it trivial to add capabilities later without architecture changes:

| Future capability | How to add |
|---|---|
| Web search during scan | Add `"WebSearch"` to `allowedTools` |
| Fetch external docs (API references) | Add `"WebFetch"` to `allowedTools` |
| Read local brand data files | Add `"Read"` to `allowedTools`, set `cwd` |
| Multi-agent scan (product specialist + checkout specialist) | Use `agents` option to define subagents |
| Scan history / debugging | Use `sessions` — review past scan conversations |
| Pre/post processing hooks | Use `hooks` for logging, metrics, rate limiting |
| Cost monitoring across scans | Aggregate `ResultMessage.cost` values |

None of these require changing the core architecture. Just update `options`.

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
| `lib/agentic-score/agent-scan.ts` | Agentic scan engine: tool definitions, MCP server, Agent SDK query() |
| `lib/agentic-score/boost-pages.ts` | Signal boosting from agent-fetched pages |

## Modified Files Summary

| File | Change |
|---|---|
| `package.json` | Add `@anthropic-ai/claude-agent-sdk`; `@anthropic-ai/sdk` already at v0.82.0 |
| `lib/agentic-score/types.ts` | Add `PageFetch`, `AgenticScanResult` |
| `app/api/v1/scan/route.ts` | Replace `analyzeScanWithClaude()` with `agenticScan()`, add `boostFromAgentPages()`, pass `brandData` to `buildVendorSkillDraft()` |
