# Scanner Pipeline Rebuild — Research & Plan

_Date: 2026-04-03_

This document covers everything that's broken in the current scanner pipeline, the files involved, the alternative approaches researched, and a recommended path forward.

---

## Part 1: What's Broken

### 1.1 Brand Name Resolution (Critical)

**Symptom:** Scanned brands get wrong names — "burger" (Patagonia), "Previous Slide" (Wayfair), "reCAPTCHA" (Best Buy).

**Root cause chain:**
1. The AI agent (`agenticScan` in `lib/agentic-score/agent-scan.ts`) calls `record_findings` with text scraped from UI elements instead of the actual brand name
2. The `extractMeta` fallback (`lib/agentic-score/extract-meta.ts`) parses `<title>` tags, but many sites serve redirect pages, CAPTCHA pages, or access-denied pages to server-side fetches — producing titles like "Hang Tight! Routing to checkout..." or "Access to this page has been denied"
3. Name resolution at line 263 of `app/api/v1/scan/route.ts`: `existing?.name ?? agentFindings.name ?? meta.name` — for new brands, the agent's bad name wins with no sanity check

**Files involved:**
- `app/api/v1/scan/route.ts` (line 263) — name resolution logic
- `lib/agentic-score/extract-meta.ts` — title-tag parsing
- `lib/agentic-score/agent-scan.ts` (lines 211-237) — `record_findings` tool schema

**What a fix needs:** A domain-derived name fallback (capitalize first segment of domain, e.g., `patagonia.com` → `Patagonia`) that's used when the agent/meta name looks suspicious (contains words like "reCAPTCHA", "Slide", "Loading", "Denied", etc.). Or better: use an external API that already knows brand names.

---

### 1.2 Sector Classification (Critical)

**Symptom:** All 4 freshly scanned brands got `sector: "specialty"` (the fallback). Chewy should be `pets`, Wayfair should be `home`, Patagonia should be `fashion`, Best Buy should be `electronics`.

**Root cause:** The agent prompt says `sector` should be "One of: retail, office, fashion, ..." but the agent either:
- Doesn't call `record_findings` at all
- Sets an invalid sector that gets rejected by validation
- The prompt treats `record_findings` as step 4 (lowest priority), so the agent may time out or skip it

**Additional data quality issue:** Legacy brands have sectors outside the valid enum: `footwear`, `apparel`, `outdoor`, `uncategorized`. These were assigned before the taxonomy was formalized.

**Files involved:**
- `lib/agentic-score/agent-scan.ts` (line 217) — sector field in tool schema
- `lib/agentic-score/agent-scan.ts` (lines 418-419) — sector validation
- `lib/procurement-skills/taxonomy/sectors.ts` — valid sector enum (21 values)
- `app/api/v1/scan/route.ts` (lines 265-267) — sector resolution logic

---

### 1.3 Empty Capabilities (Critical)

**Symptom:** Zero of 4 freshly scanned brands received any capabilities. All show `capabilities: []`.

**Root cause:** The agent collects scoring evidence (e.g., "guest checkout detected", "variant selectors found") but doesn't translate those findings into capability enum values. The agent needs to make a second cognitive leap: "I found a cart/add-to-cart button" → this means `programmatic_checkout` capability. The current prompt doesn't guide this translation.

**Valid capabilities** (10 values): `price_lookup`, `stock_check`, `programmatic_checkout`, `business_invoicing`, `bulk_pricing`, `tax_exemption`, `account_creation`, `order_tracking`, `returns`, `po_numbers`

**Files involved:**
- `lib/agentic-score/agent-scan.ts` (line 229) — capabilities field
- `lib/procurement-skills/taxonomy/capabilities.ts` — valid capability enum
- `app/api/v1/scan/route.ts` (lines 307-310) — capability merge logic

---

### 1.4 Checkout Methods Always Default (Design Gap)

**Symptom:** Every scan produces `checkoutMethods: ["browser_automation"]` regardless of what the site actually supports.

**Root cause:** `buildVendorSkillDraft` hardcodes `checkoutMethods: ["browser_automation"]` at line 109. The `record_findings` tool has `checkoutProviders` and `paymentMethods` fields, but these map to different concepts than the `CheckoutMethod` enum (`native_api`, `acp`, `x402`, `crossmint_world`, `self_hosted_card`, `browser_automation`).

**Files involved:**
- `app/api/v1/scan/route.ts` (line 109) — hardcoded default
- `lib/procurement-skills/taxonomy/checkout-methods.ts` — valid enum (6 values)

---

### 1.5 No Taxonomy Object (Structural Gap)

**Symptom:** `buildVendorSkillDraft` never creates a `taxonomy` object. Only Home Depot has one (from manual enrichment or a different code path).

The `VendorSkill` type supports `taxonomy?: { sector, subSectors, tier, tags }` but the draft builder doesn't populate it even when the agent provides `subSectors`, `tier`, and `tags` via `record_findings`.

**Files involved:**
- `app/api/v1/scan/route.ts` (lines 97-143) — `buildVendorSkillDraft`
- `lib/procurement-skills/types.ts` — VendorSkill type definition

---

### 1.6 Bot-Blocking / CAPTCHA Degradation

**Symptom:** Sites like Best Buy serve CAPTCHA pages. Even with Firecrawl (which handles JS rendering), some sites still block the scanner. The agent then analyses the CAPTCHA/blocked page HTML and extracts garbage metadata from it.

**Current fetch pipeline:**
1. `fetchScanInputs` tries Firecrawl first (`scrapeUrl` with `html` format), falls back to raw `fetch`
2. Agent's `fetch_page` tool also tries Firecrawl, falls back to `safeFetchWithRedirects`
3. User-Agent: `CreditClaw-ASXScanner/1.0 (+https://creditclaw.com/axs)`

**Files involved:**
- `lib/agentic-score/fetch.ts` — Firecrawl integration, `fetchScanInputs`
- `lib/agentic-score/agent-scan.ts` (lines 139-173) — `agentFetchPage`

---

## Part 2: Current Architecture

```
Domain Input
    ↓
fetchScanInputs (Firecrawl → raw fetch fallback)
    ↓ homepage HTML, sitemap, robots.txt
    ├── extractMeta (title tag → name, description)
    ├── detectAll (regex detectors → evidence map)
    └── agenticScan (Claude agent → evidence + findings)
            ↓ Agent tools:
            ├── fetch_page (Firecrawl → raw fetch)
            ├── record_evidence (rubric scoring signals)
            ├── record_findings (name, sector, caps, tips)
            └── complete_scan
    ↓
computeScoreFromRubric (merge evidence → score)
    ↓
buildVendorSkillDraft (findings → VendorSkill object)
    ↓
generateVendorSkill (VendorSkill → SKILL.md text)
    ↓
upsertBrandIndex (save to DB)
```

**Key observation:** The scoring pipeline works well. The metadata pipeline (name, sector, capabilities, taxonomy) is where everything falls down. These are fundamentally different problems — scoring needs page-level evidence, metadata needs entity-level knowledge about the brand.

---

## Part 3: Alternative Approaches Researched

### 3.1 Exa AI (Search API + Websets)

**What it is:** Neural/semantic web search engine with structured data extraction. Purpose-built for entity research.

**Relevant capabilities:**
- **Company search by domain:** Exa's retrieval model is fine-tuned for company search. Given a domain, it returns structured data including industry, description, and entity attributes
- **Websets (batch enrichment):** Define criteria like "e-commerce companies" and Exa finds/verifies/enriches matches at scale. Could be used to batch-classify all brands in the catalog
- **Enrichment fields:** Can extract company category, industry vertical, description from the web — exactly what we need for sector classification

**Pricing:**
- API: Free tier 1,000 searches/month, paid plans from ~$20/month for 10K searches
- Websets: Credit-based, starts free (1,000 credits), paid plans from $200/month
- Per-search cost is very low ($0.001-0.005 per query)

**Fit for our problem:** HIGH for sector/category classification, MEDIUM for name resolution. Exa is essentially an entity lookup service — give it a domain, get back structured company metadata. This bypasses the entire "scrape the site and hope the AI interprets it correctly" problem.

**Limitation:** Doesn't provide the page-level evidence we need for scoring. Would be a supplement to (not replacement for) the current scanner.

---

### 3.2 Perplexity Sonar API

**What it is:** Real-time web search + LLM synthesis with structured JSON output mode.

**Relevant capabilities:**
- **Structured JSON output:** Ask "What sector does chewy.com operate in? Return JSON with name, sector, subCategories" and get a clean structured response
- **Grounded answers:** Perplexity searches the web in real-time and synthesizes answers with citations — so it can answer questions about any merchant based on current web data
- **No scraping required:** It searches Google/Bing results, reads pages itself, and returns synthesized answers. Bypasses bot-blocking entirely

**Pricing:**
- sonar (base): $1/M input tokens + $1/M output tokens + per-request fee
- sonar-pro: $3/M input + $15/M output + per-request fee
- Estimated cost per brand classification: ~$0.01-0.05 depending on model

**Fit for our problem:** HIGH for everything metadata-related. A single Perplexity call like "For the e-commerce site at chewy.com, return JSON with: brand_name, sector (from this enum: ...), capabilities, checkout_methods, sub_categories, company_description" could solve name + sector + capabilities in one shot, with no scraping needed.

**Limitation:** Less precise for page-level scoring evidence (checkout flows, DOM analysis). Would need to keep the current scanner for ASX scoring.

---

### 3.3 Google Merchant Center API

**What it is:** Google's API for managing merchant product data, feeds, and categories.

**Relevant capabilities:**
- **Google Product Taxonomy:** 5,595+ categories — the industry standard for product classification
- **Merchant data:** If a merchant has a Google Merchant Center account, their product feed data (categories, products, prices) is accessible via API

**Limitations (significant):**
- **Requires the merchant's own authentication** — you can only access data for merchants you own/manage. There is no public "look up any merchant" endpoint
- **Not a discovery tool:** Cannot look up merchant categories by domain
- **Content API being shut down** Aug 2026 — must use new Merchant API v1
- **Only useful for merchants who have Google Shopping feeds** — many don't

**Fit for our problem:** LOW for our use case. The Google Merchant API is designed for merchants to manage their own data, not for third parties to classify merchants. We'd need the merchant to grant us API access, which defeats the purpose.

**Alternative Google approach:** Google Custom Search JSON API could theoretically search "site:chewy.com" to find category pages, but it's **closed to new customers** (sunset Jan 2027). Vertex AI Search is the replacement but is enterprise-priced.

---

### 3.4 Firecrawl Extract (Current + Enhanced)

**What it is:** We already use Firecrawl for HTML scraping. Firecrawl also has a newer `/extract` endpoint that uses AI to extract structured data.

**Relevant capabilities:**
- **`/extract` endpoint:** Define a JSON schema (name, sector, capabilities) and Firecrawl uses an LLM to extract structured data from the page. Could replace our current Claude agent for metadata extraction
- **JS rendering:** Already handles SPAs and dynamic content
- **Anti-bot:** Handles Cloudflare, CAPTCHAs in many cases

**Pricing:**
- Scrape/crawl: 1 credit per page, plans from $19/month (3,000 credits)
- Extract: Token-based, billed separately from scrape credits

**Fit for our problem:** MEDIUM. Could improve HTML quality for the agent, and `/extract` could be an alternative path for structured metadata. But it still requires scraping the target site, so bot-blocking issues persist. And it doesn't have the entity-knowledge advantage of Exa/Perplexity.

---

### 3.5 Hybrid Approach (Recommended Direction)

Split the pipeline into two distinct phases:

**Phase A: Entity Metadata (Exa or Perplexity)**
- Input: domain name
- Output: brand name, sector, sub-categories, company description, primary checkout approach
- Method: Single API call to Exa search or Perplexity sonar
- No scraping required, no bot-blocking issues, high accuracy
- Cost: ~$0.01-0.05 per brand

**Phase B: Technical Scoring (Current pipeline, improved)**
- Input: homepage HTML + page visits
- Output: ASX score, rubric evidence, SKILL.md
- Method: Current Firecrawl + Claude agent pipeline
- Focus the agent purely on scoring evidence (remove metadata responsibility from agent)
- The agent already does this well — 18-34 citations per scan

This separation addresses the root cause: the current pipeline asks the Claude agent to do two fundamentally different jobs (entity classification + page-level technical audit) with one set of tools and one prompt. The agent is good at the technical audit but bad at entity classification because it's working from raw HTML, not web knowledge.

---

## Part 4: Specific Problems & Fix Approaches

### 4.1 Name Resolution Fix

| Approach | Complexity | Reliability | Notes |
|---|:---:|:---:|---|
| **A. Domain-derived fallback** | Low | Medium | `patagonia.com` → `Patagonia`. Catches the worst failures but won't handle cases like `rei.com` → should be `REI` not `Rei` |
| **B. Name validation heuristic** | Low | Medium | Reject names containing `CAPTCHA`, `Slide`, `Loading`, `Denied`, etc. Fall back to domain-derived name |
| **C. Perplexity/Exa lookup** | Medium | High | Ask "What is the company name for the website patagonia.com?" — will always be correct |
| **D. OpenGraph/meta tag priority** | Low | Medium | `og:site_name` is more reliable than `<title>` for brand names |

**Recommended:** C (external lookup) for production quality, with B+D as immediate low-cost improvements.

### 4.2 Sector Classification Fix

| Approach | Complexity | Reliability | Notes |
|---|:---:|:---:|---|
| **A. Improve agent prompt** | Low | Low | Tell the agent to prioritize `record_findings`. Won't fix bot-blocking degradation |
| **B. Exa company search** | Medium | High | Exa's entity model already knows industry verticals for most companies |
| **C. Perplexity structured query** | Medium | High | "What sector does chewy.com operate in? Choose from: retail, office, fashion..." |
| **D. Agent post-processing** | Medium | Medium | After scoring, run a second Claude call with just the domain + evidence summary to classify sector |
| **E. MCC code lookup** | High | High | Map domain to Merchant Category Code via payment processor data. Very accurate but requires partnership/API access |

**Recommended:** B or C for accuracy. A as a quick incremental improvement.

### 4.3 Capability Detection Fix

| Approach | Complexity | Reliability | Notes |
|---|:---:|:---:|---|
| **A. Derive from scoring evidence** | Medium | High | The agent already detects guest checkout, cart buttons, search forms — map these to capabilities programmatically |
| **B. Improve agent prompt** | Low | Low | Explicitly tell the agent which evidence maps to which capability |
| **C. Post-scan inference** | Medium | High | After scoring, look at which rubric evidence was found and auto-derive capabilities. E.g., `guestCheckout=true` → `programmatic_checkout` capability |

**Recommended:** A or C — the evidence is already being collected, we just need to translate it to capabilities. This is a code change, not an API change.

### 4.4 Taxonomy Object Construction

**Fix:** Update `buildVendorSkillDraft` to construct the `taxonomy` object from `resolvedSector`, `resolvedSubSectors`, `resolvedTier`, and any tags from `agentFindings.tags`.

**Complexity:** Low — straightforward code addition.

### 4.5 Checkout Method Detection

**Fix:** Map detected evidence to checkout methods. If the agent finds a Shopify checkout → `self_hosted_card`. If it finds an API endpoint → `native_api`. Default stays `browser_automation` but should be overridable by evidence.

**Complexity:** Medium — needs a mapping table from evidence to checkout methods.

---

## Part 5: Files Involved

| File | What It Does | What Needs to Change |
|---|---|---|
| `app/api/v1/scan/route.ts` | Scan orchestration, name/sector resolution, `buildVendorSkillDraft`, upsert | Name validation, sector resolution, taxonomy construction, capability derivation, checkout method mapping |
| `lib/agentic-score/agent-scan.ts` | AI agent loop, tool schemas, system prompt | Potentially simplify to scoring-only (remove metadata burden from agent) |
| `lib/agentic-score/extract-meta.ts` | Title-tag name extraction | Add `og:site_name` priority, name validation |
| `lib/agentic-score/fetch.ts` | Firecrawl + raw fetch | No change needed (works well) |
| `lib/procurement-skills/taxonomy/sectors.ts` | Valid sector enum | May need to add missing sectors or create aliases |
| `lib/procurement-skills/taxonomy/capabilities.ts` | Valid capability enum | No change (enum is fine, detection is the problem) |
| `lib/procurement-skills/taxonomy/checkout-methods.ts` | Valid checkout method enum | No change |
| `lib/procurement-skills/types.ts` | VendorSkill type | May need to ensure taxonomy is required not optional |
| `lib/scan-queue/process-next.ts` | Background queue processor (mirrors scan route) | Must mirror any changes made to scan route |

---

## Part 6: Recommended Build Sequence

### Phase 0: Quick Wins (no new APIs)

1. **Name validation heuristic** — reject garbage names, fall back to domain-derived name
2. **Add `og:site_name` extraction** to `extractMeta`
3. **Derive capabilities from scoring evidence** — map detected rubric evidence to capability enum
4. **Build taxonomy object** in `buildVendorSkillDraft`
5. **Fix legacy sectors** — one-time DB migration to map `footwear`→`fashion`, `apparel`→`fashion`, `outdoor`→`sports`, `uncategorized`→rescan

### Phase 1: External Metadata API (choose one)

Research and prototype:
- [ ] **Exa search API** — test with 10 domains, measure accuracy of sector/name extraction
- [ ] **Perplexity sonar** — test structured JSON output for brand classification
- [ ] Compare cost, accuracy, latency, and reliability

Integrate the winner as the "entity metadata" step that runs before the technical scan.

### Phase 2: Pipeline Separation

- Refactor scan route to clearly separate metadata resolution from technical scoring
- Entity metadata (name, sector, capabilities, description) comes from external API or cached knowledge
- Technical scoring (ASX score, rubric evidence, page-level analysis) comes from current Claude + Firecrawl pipeline
- Agent prompt simplified to focus purely on scoring evidence

---

## Part 7: Questions to Resolve

1. **Exa vs Perplexity:** Which gives better sector/category accuracy for e-commerce sites? Need to test both with the same 10-20 domains.
2. **Cost at scale:** The backlog says "tens of thousands of scans within weeks." At $0.01-0.05 per brand for metadata, 10K brands = $100-500. Is that acceptable?
3. **Caching:** Metadata (name, sector) changes very rarely. Should we cache external API results for 90+ days vs. 30 days for scoring?
4. **UCP taxonomy (Step 6 in backlog):** Google Product Taxonomy has 5,595 categories. Our sector enum has 21. Should the external API return GPT category IDs directly? This ties into the UCP implementation planned in the backlog.
5. **Firecrawl `/extract` endpoint:** Worth testing as an alternative to the Claude agent for structured metadata? Could reduce costs and improve reliability for the metadata portion.
6. **Which API keys do we already have?** Firecrawl key exists. Need to check if Exa or Perplexity keys are available or need to be set up.

---

## Appendix A: Test Results (2026-04-03)

See `docs/build context/brands/current-state_research.md` for full test data from 4 scans (Best Buy, Chewy, Patagonia, Wayfair).

## Appendix B: Active Build Backlog Dependencies

The scanner fix is a prerequisite for:
- **Step 4 (Registry API + CLI):** `skill.json` serializes from `brand_index` — bad metadata = bad skill.json
- **Step 4B (Brand Versioning):** Versioning broken metadata just versions the bugs
- **Step 5 (Premium Scan):** Builds on Tier 1 output
- **Step 6 (UCP Taxonomy):** Auto-detect UCP categories during scanning requires working sector detection first

See `docs/build context/active-build-backlog.md` for the full backlog.
