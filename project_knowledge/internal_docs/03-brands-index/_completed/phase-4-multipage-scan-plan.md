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

## Architecture: Rubric-Based Scoring (Implemented)

### What changed since the original plan

The scoring architecture was redesigned before the agent scan work began. The 3-layer 
cake (regex score → Claude enhance → page boost) is replaced by a single-authority 
rubric engine:

- **The rubric** (`rubric.ts`) defines all 57 criteria across 10 signals and 3 pillars. 
  It is the single source of truth for scoring — a pure data file.
- **Detectors** (`detectors.ts`) run regex checks on HTML/sitemap/robots.txt and produce 
  an evidence map (flat key-value object of boolean/number/string facts).
- **The agent** explores the site and fills in additional evidence keys that regex can't 
  detect (guest checkout, variant selectors, checkout complexity).
- **The scoring engine** (`scoring-engine.ts`) takes the rubric + evidence map and 
  produces the final `ASXScoreResult` deterministically.
- **A methodology page** at `/agentic-shopping-score/methodology` shows the full rubric 
  publicly — three tables, one per pillar, with all criteria and point values.

### Current state (rubric-based pipeline)

```
fetchScanInputs(domain)          → homepage + sitemap + robots
  ↓
detectAll(html, sitemap, robots) → EvidenceMap (regex-detected boolean facts)
  ↓
computeScoreFromRubric(rubric, evidence) → ASXScoreResult (deterministic)
  ↓
analyzeScanWithClaude(html)      → one Claude call, homepage only (LEGACY — to be replaced)
  ↓
enhanceScores(base, findings)    → boost scores from Claude findings (LEGACY — to be replaced)
  ↓
buildVendorSkillDraft(findings)  → construct VendorSkill from Claude output
  ↓
generateVendorSkill(draft)       → render SKILL.md
  ↓
upsertBrandIndex(...)            → persist everything
```

The `computeASXScore()` wrapper in `compute.ts` calls `detectAll()` → 
`computeScoreFromRubric()` internally. The scan route still calls `analyzeScanWithClaude()` 
and `enhanceScores()` as a second pass, but these are legacy — the rubric engine already 
scores everything the regex detectors find.

### Proposed state (agentic pipeline)

```
fetchScanInputs(domain)          → homepage + sitemap + robots (unchanged)
  ↓
detectAll(html, sitemap, robots) → EvidenceMap (regex-detected facts)
  ↓
agenticScan(input)               → Claude Agent SDK explores the site:
  │                                  Agent reads homepage → identifies store
  │                                  Agent calls fetch_page() for product/cart/search pages
  │                                  Agent calls record_evidence() to set evidence keys
  │                                  Agent calls complete_scan() with summary
  │                                  Returns: { agentEvidence, findings, fetchedPages }
  ↓
computeScoreFromRubric(rubric, mergedEvidence) → final ASXScoreResult
  ↓
buildVendorSkillDraft(...)       → construct VendorSkill (merges brandData + agent findings)
  ↓
generateVendorSkill(draft)       → render SKILL.md (unchanged)
  ↓
upsertBrandIndex(...)            → persist everything
```

Key difference from the original plan: **no `enhanceScores()`, no `boostFromAgentPages()`**. 
The agent writes directly to the evidence map, and one call to `computeScoreFromRubric()` 
produces the final score. Single scoring authority.

---

## File Structure (Current)

```
lib/agentic-score/
  rubric.ts          ← Pure data: 57 criteria, 10 signals, 3 pillars, types
  scoring-engine.ts  ← computeScoreFromRubric() + recommendations + CSV/prompt utilities
  detectors.ts       ← All 10 regex evidence extractors (consolidated from old signals/)
  compute.ts         ← Thin wrapper: detectAll → computeScoreFromRubric
  index.ts           ← Barrel exports
  agent-scan.ts      ← TO CREATE: Agent SDK engine
  fetch.ts           ← Firecrawl + SSRF protection (unchanged)
  extract-meta.ts    ← Meta extraction (unchanged)
  types.ts           ← Shared types (unchanged)
  domain-utils.ts    ← Domain normalization (unchanged)
  enhance.ts         ← LEGACY — to be deleted when agent replaces it
  llm.ts             ← LEGACY — to be deleted when agent replaces it

app/agentic-shopping-score/
  page.tsx            ← Scanner form page
  scanner-form.tsx    ← Form component
  methodology/
    page.tsx          ← Scoring rubric tables (implemented)
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

---

## Part 2: Agentic Scan Engine

### New file: `lib/agentic-score/agent-scan.ts`

Uses the Claude Agent SDK with custom tools via an in-process MCP server. All built-in 
tools disabled — the agent can ONLY use our custom tools.

### Tool definitions (using `tool()` + Zod)

The agent now works with **evidence keys** from the rubric, not ad-hoc findings fields.

```typescript
import { tool, createSdkMcpServer, query } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";

// Shared state for the scan session
let agentEvidence: EvidenceMap = {};
let agentFindings: Record<string, unknown> = {};
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

// --- Tool 2: record_evidence ---
// The agent sets evidence keys that map directly to rubric criteria.
// The system prompt includes the full rubric so the agent knows which keys to set.
const recordEvidenceTool = tool(
  "record_evidence",
  "Set evidence keys that feed the scoring rubric. Each key maps to a specific " +
  "criterion in the rubric. Set a key to true when you confirm the criterion is met. " +
  "Only set keys for things you've actually verified on the site. " +
  "You can call this multiple times — keys are merged (never overwritten to false).",
  {
    evidence: z.record(z.union([z.boolean(), z.number(), z.string()])),
  },
  async ({ evidence }) => {
    for (const [key, value] of Object.entries(evidence)) {
      if (value !== false && value !== null && value !== undefined) {
        agentEvidence[key] = value;
      }
    }
    return { content: [{ type: "text", text: `Evidence recorded: ${Object.keys(evidence).join(", ")}` }] };
  },
  { annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false } }
);

// --- Tool 3: record_findings ---
// The agent also records structured findings for SKILL.md generation.
const recordFindingsTool = tool(
  "record_findings",
  "Save structured findings about this store for the SKILL.md file. " +
  "Call this whenever you've learned something new. Findings are merged progressively.",
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
    tips: z.array(z.string()).optional(),
  },
  async (incoming) => {
    mergeFindings(agentFindings, incoming);
    return { content: [{ type: "text", text: "Findings recorded." }] };
  },
  { annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false } }
);

// --- Tool 4: complete_scan ---
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
const scanServer = createSdkMcpServer({
  name: "scan",
  version: "1.0.0",
  tools: [fetchPageTool, recordEvidenceTool, recordFindingsTool, completeScanTool],
});

for await (const message of query({
  prompt: buildInitialMessage(input),
  options: {
    model: "claude-sonnet-4-6-20260320",
    systemPrompt: SYSTEM_PROMPT,
    tools: [],  // Disable ALL built-in tools
    mcpServers: { scan: scanServer },
    allowedTools: [
      "mcp__scan__fetch_page",
      "mcp__scan__record_evidence",
      "mcp__scan__record_findings",
      "mcp__scan__complete_scan",
    ],
    permissionMode: "acceptEdits",
    maxBudgetUsd: 0.15,
  },
})) {
  if (message.type === "result" && message.subtype === "success") {
    // Agent finished
  }
}

return { agentEvidence, findings: agentFindings, fetchedPages, complete: true };
```

### System prompt

The system prompt now includes the full rubric (via `rubricToPromptText()`) so the 
agent knows exactly which evidence keys to set:

```
You are a site analyst for CreditClaw, an AI procurement platform. Your job is to 
explore an e-commerce website and understand how an AI shopping agent would interact 
with it.

You will be given the homepage HTML of a store. Explore the site to understand three 
things:

1. PRODUCT DISCOVERY — How would an agent find and identify products?
2. PRODUCT STRUCTURE — How are products displayed? What variants, pricing, IDs exist?
3. CHECKOUT FLOW — How would an agent complete a purchase?

## Scoring Rubric

Below is the full scoring rubric. Your job is to investigate and set evidence keys 
using the record_evidence tool. Automated detectors have already set evidence for 
keys marked as "detect" source. Focus on keys marked "agent" or "either" — these 
are the ones only you can verify by actually visiting pages.

{rubricToPromptText(SCORING_RUBRIC)}

## Tools

- Use fetch_page to visit product pages, cart, search results, or other pages.
- Use record_evidence to set rubric evidence keys (e.g., guestCheckout: true).
- Use record_findings to save structured data for the SKILL.md file.
- Use complete_scan when you're done.

Call record_evidence and record_findings whenever you learn something new. Don't wait 
until the end — save as you go.

You are analyzing: {domain}
```

### Key design decision: two recording tools

The agent has **two** recording tools because they serve different purposes:

1. **`record_evidence`** — sets boolean/numeric keys that feed the rubric scoring engine. 
   These are machine-consumed. Example: `{ guestCheckout: true, variantSelectors: true }`.
2. **`record_findings`** — saves structured fields for the SKILL.md file (search URL 
   templates, payment methods, tips). These are human-consumed.

Some fields overlap (e.g., `guestCheckout` appears in both). This is intentional — the 
evidence map drives scoring, the findings drive SKILL.md content.

### Return type

```typescript
interface AgenticScanResult {
  agentEvidence: EvidenceMap;
  findings: Record<string, unknown>;
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
| Tool restriction | `tools: []` + `allowedTools` | Only our 4 custom tools |
| Domain lock | `fetch_page` handler validates URL hostname | Same domain only |
| SSRF protection | `resolveAndValidate()` in `fetch_page` handler | Blocks private IPs |
| Page size | `fetch_page` handler truncates HTML | 20,000 chars per page |
| Permission mode | `permissionMode: "acceptEdits"` | Auto-approve tool calls |

### Token budget estimate

- System prompt (with rubric): ~2,500 tokens
- Initial message (homepage + sitemap + robots): ~10,000 tokens
- Per tool round-trip (Claude reasoning + tool call + result): ~8,000 tokens
- Typical scan (3-4 page fetches): ~35,000-45,000 tokens total
- Cost: ~$0.06-0.10 per scan

### Graceful degradation

If the agentic scan fails for any reason (API error, timeout, budget exceeded):
- Return whatever evidence was accumulated via `record_evidence` so far
- Return whatever findings were recorded
- Return whatever pages were fetched
- The pipeline continues with detector-only evidence — `computeScoreFromRubric()` 
  still produces a score, just without agent-verified criteria

### Files to create/modify

| File | Change |
|---|---|
| `lib/agentic-score/agent-scan.ts` | **NEW** — Agent SDK integration: tool definitions, MCP server, query() call |
| `lib/agentic-score/types.ts` | Add `PageFetch`, `AgenticScanResult` interfaces |
| `lib/agentic-score/index.ts` | Add `agenticScan` + types exports |
| `app/api/v1/scan/route.ts` | Replace `analyzeScanWithClaude()` + `enhanceScores()` with `agenticScan()` + evidence merge |

---

## ~~Part 3: Signal Boosting from Agent-Fetched Pages~~ (REMOVED)

**This part is no longer needed.** The rubric engine replaces the 3-layer scoring model. 
Instead of boosting scores from fetched pages, the agent sets evidence keys directly via 
`record_evidence`, and `computeScoreFromRubric()` produces the final score in one pass.

The old `boost-pages.ts` file is not created.

---

## Part 3: Brand Data Enrichment for SKILL.md

*(Renumbered from Part 4)*

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

// 2. Run regex detectors → baseline evidence map
const detectorEvidence = detectAll(
  input.homepageHtml, input.sitemapContent, input.robotsTxtContent, input.pageLoadTimeMs
);

// 3. Agentic scan — Claude Agent explores the site (NEW)
let agentResult: AgenticScanResult = { 
  agentEvidence: {}, findings: {}, fetchedPages: [], complete: false 
};
try {
  agentResult = await agenticScan(input, detectorEvidence);
} catch {
  // Falls back to detector-only evidence
}

// 4. Merge evidence: detectors + agent (agent can confirm/override "either" keys)
const mergedEvidence = { ...detectorEvidence, ...agentResult.agentEvidence };

// 5. Single scoring pass — rubric is the only authority
const scoreResult = computeScoreFromRubric(SCORING_RUBRIC, mergedEvidence);

// 6. Build VendorSkill draft (merges brandData + agent findings)
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
Part 2: Build agentic scan engine (agent-scan.ts) — core new module
  ↓
Part 3: Brand data enrichment in buildVendorSkillDraft()
  ↓
Integration: Wire everything together in scan/route.ts
  ↓
Part 4: Legacy cleanup — delete obsolete files
```

Part 3 can be done in parallel with Part 2.

---

## Risk Assessment

| Risk | Mitigation |
|---|---|
| Agent makes bad navigation decisions | `maxBudgetUsd: 0.15` hard cap. Progressive `record_evidence` means partial data is preserved. Domain lock prevents wandering off-site. |
| Scan takes too long | Agent SDK manages the loop. `maxBudgetUsd` prevents runaway token usage. Typical scan: 30-60s. |
| Firecrawl rate limits (up to 5 pages/scan) | 500 pages/month ÷ 5 = 100 scans/month on free tier. Quality over quantity. Upgrade plan when volume justifies. |
| Token cost ~$0.06-0.10/scan | Acceptable — each scan replaces two separate pipelines (scan + skill builder). `maxBudgetUsd` prevents surprises. |
| Agent SDK adds complexity | Actually simpler — no manual while loop, no conversation history management. The SDK handles all of that. |
| Built-in tools token overhead (~16k tokens) | Set `tools: []` to strip all built-ins. Only our 4 custom tools in context. |

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

- `generateVendorSkill()` in `lib/procurement-skills/generator.ts` — untouched
- `fetchScanInputs()` in `fetch.ts` — untouched (still fetches homepage + sitemap + robots)
- AXS Rating system — untouched
- 100-point scoring scale — same total
- `lib/procurement-skills/taxonomy/` — sector, tier, and type definitions stay
- `lib/procurement-skills/types.ts` — VendorSkill type stays (used by generator)
- `SCORING_RUBRIC` in `rubric.ts` — data stays the same, engine reads it dynamically
- `upsertBrandIndex()` NEVER OVERWRITE rules — preserved

---

## Part 4: Legacy Cleanup

The agentic scan + rubric engine unify what was previously multiple overlapping systems. 
This section captures everything that becomes redundant and should be removed.

### 4a. Already cleaned up (DONE)

These were removed during the rubric refactor:

| File / Directory | What it was | Status |
|---|---|---|
| `lib/agentic-score/signals/clarity.ts` | JSON-LD, product feed, clean HTML signal functions | **DELETED** — logic moved to `detectors.ts` |
| `lib/agentic-score/signals/speed.ts` | Search API, site search, page load signal functions | **DELETED** — logic moved to `detectors.ts` |
| `lib/agentic-score/signals/reliability.ts` | Access auth, order mgmt, checkout, bot tolerance | **DELETED** — logic moved to `detectors.ts` |
| `lib/agentic-score/signals/` | Directory | **DELETED** |
| `lib/agentic-score/recommendations.ts` | Template-based recommendation generator | **DELETED** — logic moved to `scoring-engine.ts` |

### 4b. Remove after agent scan is wired (TODO)

| File | Action | Why |
|---|---|---|
| `lib/agentic-score/llm.ts` | **DELETE** | `analyzeScanWithClaude()` replaced by `agenticScan()` |
| `lib/agentic-score/enhance.ts` | **DELETE** | `enhanceScores()` replaced by rubric engine — agent writes to evidence map, one `computeScoreFromRubric()` call produces the score |
| `lib/agentic-score/index.ts` | Remove `analyzeScanWithClaude`, `enhanceScores` exports; remove `LLMScanFindings` type export | Clean up barrel |

### 4c. Remove the legacy Skill Builder pipeline (TODO)

The entire `lib/procurement-skills/builder/` directory was the original skill builder — 
a separate multi-step analysis pipeline (fetch pages → LLM checkout analysis → probes).
The agentic scan now does everything it did, better. It has exactly two callers:

| Caller | File | What it does |
|---|---|---|
| Skill analyze endpoint | `app/api/v1/skills/analyze/route.ts` | Takes a URL, runs `analyzeVendor()`, creates a skill draft |
| Skill submissions endpoint | `app/api/v1/skills/submissions/route.ts` | Community submission — runs `analyzeVendor()`, creates a draft |

**Migration:** Both endpoints should be rewritten to call `agenticScan()` instead. The 
`buildVendorSkillDraft()` function in `scan/route.ts` already does this translation — 
extract it into a shared utility so both the scan endpoint and the submissions endpoint 
can use it.

After migration:

| File | Action |
|---|---|
| `lib/procurement-skills/builder/analyze.ts` | **DELETE** — zero callers |
| `lib/procurement-skills/builder/llm.ts` | **DELETE** — zero callers |
| `lib/procurement-skills/builder/fetch.ts` | **DELETE** — duplicate of `agentic-score/fetch.ts` |
| `lib/procurement-skills/builder/probes.ts` | **DELETE** — capabilities detected by agent |
| `lib/procurement-skills/builder/types.ts` | **DELETE** — types no longer needed |

### 4d. Clean up schema references (TODO)

| File | Action |
|---|---|
| `shared/schema.ts` | Remove `analyzeVendorSchema` — only used by the deleted `skills/analyze/route.ts` endpoint |

### 4e. Archive superseded plan documents (TODO)

These documents describe architectures that no longer exist. Move to 
`docs/archive/` to keep history without creating confusion:

| File | Why it's superseded |
|---|---|
| `docs/260217_procurement-skills-technical-plan-v3.md` | Original 3-layer procurement architecture. Builder pipeline is being removed. |
| `docs/build context/Future/Product_index/agentic-shopping-score-build-plan.md` | Phase 1-2 build plan. Contains "DO NOT modify analyzeVendor()" warnings that are now wrong. Completed work. |
| `docs/build context/Future/Product_index/phase-3-scan-api-technical-plan.md` | Phase 3 plan. Completed. References the static `analyzeScanWithClaude()` pipeline. |

The Phase 4 plan (this document) is the single source of truth for the scan architecture.

### 4f. Update replit.md (TODO)

Update pipeline documentation to reflect the rubric-based flow:

```
Pipeline: normalizeDomain → cache check → fetchScanInputs → detectAll → 
agenticScan (Claude Agent SDK) → merge evidence → computeScoreFromRubric → 
buildVendorSkillDraft → generateVendorSkill → upsertBrandIndex
```

Remove references to `analyzeScanWithClaude`, `enhanceScores`, and the builder pipeline.

### 4g. What stays in `lib/procurement-skills/`

After cleanup, the `lib/procurement-skills/` directory retains:

```
lib/procurement-skills/
├── generator.ts          ← generateVendorSkill() — renders SKILL.md (untouched)
├── types.ts              ← VendorSkill, VendorCapability types (untouched)
├── taxonomy/
│   ├── sectors.ts        ← VendorSector type + sector list (untouched)
│   └── tiers.ts          ← BrandTier type + tier list (untouched)
└── (builder/ DELETED)
```

---

## File Change Summary

### New files

| File | Purpose |
|---|---|
| `lib/agentic-score/agent-scan.ts` | Agentic scan engine: tool definitions, MCP server, Agent SDK query() |

### Already created/modified (DONE)

| File | Change |
|---|---|
| `lib/agentic-score/rubric.ts` | Pure data: 57 criteria, types, `SCORING_RUBRIC` const |
| `lib/agentic-score/scoring-engine.ts` | `computeScoreFromRubric()`, recommendations, CSV/prompt utilities |
| `lib/agentic-score/detectors.ts` | Consolidated regex evidence extractors (10 detector functions) |
| `lib/agentic-score/compute.ts` | Simplified: `detectAll()` → `computeScoreFromRubric()` |
| `lib/agentic-score/index.ts` | Updated exports for rubric architecture (partial — legacy exports still present, will be cleaned up in Part 4b) |
| `app/agentic-shopping-score/methodology/page.tsx` | Public scoring rubric tables |
| `docs/asx-scoring-rubric.csv` | CSV export of full rubric |

### Current reality snapshot

The scan route (`app/api/v1/scan/route.ts`) still uses the legacy pipeline:
`computeASXScore()` → `analyzeScanWithClaude()` → `enhanceScores()`. This works but 
uses the old boost pattern. Internally `computeASXScore()` now uses the rubric engine, 
but `enhanceScores()` still applies a second-pass boost. This legacy wiring is replaced 
in the integration step after Part 2.

### To modify (TODO)

| File | Change |
|---|---|
| `package.json` | Add `@anthropic-ai/claude-agent-sdk` |
| `lib/agentic-score/types.ts` | Add `PageFetch`, `AgenticScanResult` interfaces |
| `lib/agentic-score/index.ts` | Add `agenticScan` exports, remove legacy `analyzeScanWithClaude` + `enhanceScores` exports |
| `app/api/v1/scan/route.ts` | Replace legacy pipeline with rubric-based flow |
| `app/api/v1/skills/analyze/route.ts` | Rewrite to use `agenticScan()` |
| `app/api/v1/skills/submissions/route.ts` | Rewrite to use `agenticScan()` |
| `shared/schema.ts` | Remove `analyzeVendorSchema` |
| `replit.md` | Update pipeline documentation |

### To delete (TODO)

| File | Reason |
|---|---|
| `lib/agentic-score/llm.ts` | Replaced by `agent-scan.ts` |
| `lib/agentic-score/enhance.ts` | Replaced by rubric engine |
| `lib/procurement-skills/builder/analyze.ts` | Zero callers after migration |
| `lib/procurement-skills/builder/llm.ts` | Zero callers after migration |
| `lib/procurement-skills/builder/fetch.ts` | Duplicate of `agentic-score/fetch.ts` |
| `lib/procurement-skills/builder/probes.ts` | Capabilities detected by agent |
| `lib/procurement-skills/builder/types.ts` | Types no longer needed |

### Already deleted (DONE)

| File | Reason |
|---|---|
| `lib/agentic-score/signals/clarity.ts` | Consolidated into `detectors.ts` |
| `lib/agentic-score/signals/speed.ts` | Consolidated into `detectors.ts` |
| `lib/agentic-score/signals/reliability.ts` | Consolidated into `detectors.ts` |
| `lib/agentic-score/recommendations.ts` | Moved into `scoring-engine.ts` |

### Archived docs (TODO)

| File | Destination |
|---|---|
| `docs/260217_procurement-skills-technical-plan-v3.md` | `docs/archive/` |
| `docs/build context/Future/Product_index/agentic-shopping-score-build-plan.md` | `docs/archive/` |
| `docs/build context/Future/Product_index/phase-3-scan-api-technical-plan.md` | `docs/archive/` |

---

## Notes: Scoring Architecture Ideas

### ✅ Idea 1: Agent as investigator, rubric as scorer — IMPLEMENTED

The rubric (`rubric.ts`) is a standalone data file defining all 57 criteria. The scoring 
engine reads it and produces scores deterministically from an evidence map. Detectors 
pre-populate factual evidence. The agent fills in agent-assessed criteria. 
`enhanceScores()` and `boostFromAgentPages()` are eliminated.

### Idea 2: Add "Product Page Quality" signal

The #1 thing brand managers want to know: "Can an AI agent actually buy from my product 
pages?" This would be an agent-assessed signal covering:
- Machine-readable pricing (structured data vs rendered-only)
- Variant selection (standard form elements vs complex JS)
- Add-to-cart simplicity (clear button vs multi-step wizard)
- Product ID in URL (direct navigation possible)
- Breadcrumb/category context

This signal can ONLY be scored by the agent (homepage regex can't assess product pages). 
It's the flagship feature of the multi-page scan.

### Idea 3: Add assessment fields to agent's record_evidence

Let the agent express qualitative judgments that map to rubric criteria:
- `productPageQuality: "excellent" | "good" | "fair" | "poor"`
- `checkoutComplexity: "simple" | "moderate" | "complex"`
- `cartAccessibility: "open" | "requires_auth" | "blocked"`
- `priceTransparency: "visible" | "requires_interaction" | "hidden"`

### Idea 4: Rename "Speed" pillar to "Discoverability"

Current Speed pillar contains Search API/MCP (10), Site Search (10), Page Load (5). 
Only Page Load is actually about speed. The others are about whether an agent can 
find products. "Discoverability" or "Navigation" communicates more clearly to brand 
managers reading the report.

### Idea 5: Agent-generated recommendations (replace template lookup)

Currently, recommendations come from a static template table in `scoring-engine.ts`. 
The agent is in a far better position to write specific, actionable recommendations 
because it has actually visited the site. Example:

- Template says: "Add JSON-LD structured data"
- Agent could say: "Your product pages at /products/* have no structured data, but your 
  homepage does. Extend your Shopify theme's product.liquid template to include Product 
  schema with Offer pricing."

### Idea 6: Returns/refund policy and price transparency

Brand managers care about:
- **Returns policy clarity** — Is there a clear, machine-readable returns policy?
- **Price transparency** — Are prices shown without login or zipcode?
- **Multi-currency / international** — Currency switching, international shipping.

These could be criteria within the rubric rather than standalone signals.

### ✅ Idea 7: Rubric as a standalone human-readable document — IMPLEMENTED

The rubric exists as a TypeScript const (`SCORING_RUBRIC`) with CSV export 
(`rubricToCsv()`) and prompt text export (`rubricToPromptText()`). It's also publicly 
visible at `/agentic-shopping-score/methodology` as three interactive tables. A product 
person can read the TypeScript data or the CSV to understand and modify scoring criteria.
