# Agent Readiness Checker — Page UX & URL Design

## Related Documents

| Document | What It Covers |
|---|---|
| `product-index-taxonomy-plan.md` | Google Product Taxonomy adoption, UCP category model |
| `agent-readiness-and-product-index-service.md` | Service tiers, gateway, scoring signals, database schema |
| `shopy-sh-commerce-skill-standard.md` | shopy.sh open standard — SKILL.md format for commerce |
| `scan-page-ux-design.md` | This document — page layout, UX flow, URL structure |

---

## Concept

A free, public-facing tool — styled like Ahrefs' Website Authority Checker or CheckPageRank. Clean page, big domain input, instant results. No login required. The page serves three purposes:

1. **Lead generation** — every scan grows the CreditClaw brand index
2. **Onboarding funnel** — free scan → premium scan → full index subscription
3. **SEO magnet** — ranks for "agent readiness", "AI commerce checker", "agentic commerce score"

---

## URL Structure

### Primary Tool Pages

| Route | Purpose | SEO Target Keywords |
|---|---|---|
| `/agent-readiness-checker` | Main scanner — domain input + results | "agent readiness checker", "AI commerce score", "agentic readiness" |
| `/agent-readiness-checker/[domain]` | Results page for a specific domain | "{domain} agent readiness", "{domain} AI commerce score" |
| `/agent-readiness-checker/[domain]/history` | Score trend over time | "{domain} agent score history" |

### Alternative URL Candidates (Pick One)

| Option | Pros | Cons |
|---|---|---|
| `/agent-readiness-checker` | Descriptive, keyword-rich, mirrors Ahrefs pattern (`/website-authority-checker`) | Long |
| `/agent-readiness-score` | Shorter, emphasizes the output | Less action-oriented |
| `/agentic-commerce-checker` | Broader scope | Less clear what it does |
| `/store-agent-checker` | Short, clear | Less SEO value |
| `/ai-commerce-checker` | Trending keywords | Less specific to agents |

**Recommended: `/agent-readiness-checker`** — follows the Ahrefs naming convention (`/website-authority-checker`, `/backlink-checker`), is descriptive, and targets the right keywords.

### Supporting Pages

| Route | Purpose |
|---|---|
| `/agent-readiness-checker` | Scanner tool (this page) |
| `/skills` | Existing skill catalog |
| `/c/[sector]` | Existing sector pages |
| `/c/[sector]/[subSector]` | Sub-sector pages (Phase 11 Part B) |
| `/leaderboard` | Top-rated domains by AXS score (future) |

---

## Page 1: The Scanner (`/agent-readiness-checker`)

### Layout — Above the Fold

Inspired by: `ahrefs.com/website-authority-checker` and `checkpagerank.net`

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                   │
│  [CreditClaw Logo]                              [Nav: Skills │ …] │
│                                                                   │
│                                                                   │
│              How Ready Is Your Store                             │
│              for AI Agents?                                      │
│                                                                   │
│    Check your domain's Agent Readiness Score — see how easily    │
│    AI shopping agents can find, search, and buy from your store. │
│                                                                   │
│  ┌───────────────────────────────────────────┬──────────────┐    │
│  │  Enter domain (e.g. staples.com)          │  Check Score  │    │
│  └───────────────────────────────────────────┴──────────────┘    │
│                                                                   │
│         No login required · Free · Results in seconds            │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

**Key design elements:**
- Big, centered headline
- Subhead explains the value in one sentence
- Oversized input field with a prominent CTA button
- Trust line below input ("No login required · Free · Results in seconds")
- Clean, minimal — nothing else above the fold except the input

### Layout — Below the Fold

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                   │
│  What We Check                                                   │
│  ─────────────                                                   │
│                                                                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │ Product  │  │ Search   │  │ Checkout │  │ API &    │        │
│  │ Data     │  │ Quality  │  │ Flow     │  │ MCP      │        │
│  │          │  │          │  │          │  │ Support  │        │
│  │ JSON-LD, │  │ Site     │  │ Cart     │  │ REST,    │        │
│  │ Open     │  │ search,  │  │ access,  │  │ GraphQL, │        │
│  │ Graph,   │  │ filters, │  │ guest    │  │ MCP,     │        │
│  │ Schema   │  │ result   │  │ checkout,│  │ UCP      │        │
│  │ markup   │  │ quality  │  │ bot      │  │ support  │        │
│  │          │  │          │  │ blocking │  │          │        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
│                                                                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │ Sitemap  │  │ Bot      │  │ Mobile   │  │ Payment  │        │
│  │ Quality  │  │ Friendly │  │ Ready    │  │ Options  │        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
│                                                                   │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  How It Works                                                    │
│  ────────────                                                    │
│                                                                   │
│  1. Enter your domain                                            │
│  2. We crawl your public-facing store (no login needed)          │
│  3. Get your Agent Readiness Score (0–100)                       │
│  4. See specific recommendations to improve                     │
│  5. Download a free SKILL.md for your store                     │
│                                                                   │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Recently Scanned                                                │
│  ────────────────                                                │
│                                                                   │
│  ┌────────┬───────┬──────────┐                                  │
│  │ Domain │ Score │ Sector   │                                  │
│  ├────────┼───────┼──────────┤                                  │
│  │ amazon │  82   │ Retail   │                                  │
│  │ staple │  67   │ Office   │                                  │
│  │ grainr │  54   │ B2B      │                                  │
│  └────────┴───────┴──────────┘                                  │
│                                                                   │
│  [See full leaderboard →]                                        │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### Input Behavior

- **Auto-strip protocol:** If user types `https://www.staples.com/`, normalize to `staples.com`
- **Auto-strip trailing paths:** `staples.com/office-supplies` → `staples.com`
- **Validation:** Must be a valid domain format. Show inline error for gibberish.
- **Loading state:** After submit, show a progress indicator with animated steps:
  - "Checking structured data..."
  - "Analyzing search functionality..."
  - "Evaluating checkout flow..."
  - "Detecting APIs and MCP endpoints..."
  - "Calculating your score..."
- **Redirect on complete:** Navigate to `/agent-readiness-checker/[domain]`

---

## Page 2: Results (`/agent-readiness-checker/[domain]`)

### Layout — Score Header

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                   │
│  [CreditClaw Logo]                              [Nav: Skills │ …] │
│                                                                   │
│  ← Back to checker                                               │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │                                                          │    │
│  │  [Logo]  staples.com                                     │    │
│  │                                                          │    │
│  │  Agent Readiness Score                                   │    │
│  │                                                          │    │
│  │        ┌─────────┐                                       │    │
│  │        │         │                                       │    │
│  │        │   67    │    "Fair — agents can find your        │    │
│  │        │  /100   │     products but checkout needs work"  │    │
│  │        │         │                                       │    │
│  │        └─────────┘                                       │    │
│  │     (circular gauge)                                     │    │
│  │                                                          │    │
│  │  Sector: Office Supplies · Scanned: March 27, 2026      │    │
│  │                                                          │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

**Score color coding:**
- 0–39: Red ("Poor")
- 40–59: Orange ("Needs Work")
- 60–79: Yellow ("Fair")
- 80–89: Green ("Good")
- 90–100: Bright Green ("Excellent")

### Layout — Score Breakdown

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                   │
│  Score Breakdown                                                 │
│  ───────────────                                                 │
│                                                                   │
│  ┌──────────────────────────────────┐                            │
│  │ Structured Product Data    14/20 │ ████████████████░░░░       │
│  │ Search Functionality       10/15 │ ████████████████░░░░░      │
│  │ Checkout Accessibility      8/15 │ ████████████░░░░░░░░       │
│  │ API Availability           12/15 │ ███████████████░░░░░       │
│  │ Sitemap Quality             8/10 │ ████████████████░░░░       │
│  │ Bot Friendliness            7/10 │ ██████████████░░░░░░       │
│  │ Mobile/Responsive           4/5  │ ████████████████░░░░       │
│  │ MCP/UCP Support             4/10 │ ████████░░░░░░░░░░░░       │
│  │                                  │                            │
│  │ TOTAL                     67/100 │                            │
│  └──────────────────────────────────┘                            │
│                                                                   │
│  Each signal has a [?] tooltip explaining what it means          │
│  and why it matters for AI agents.                               │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### Layout — Recommendations

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                   │
│  Recommendations                                                 │
│  ───────────────                                                 │
│                                                                   │
│  🔴 HIGH IMPACT                                                  │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ Add an MCP endpoint                            +10 pts  │    │
│  │ Adding a Shopify-compatible /api/mcp endpoint makes     │    │
│  │ your products discoverable by ChatGPT, Claude, and      │    │
│  │ other MCP-aware AI agents.                              │    │
│  └──────────────────────────────────────────────────────────┘    │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ Enable guest checkout                           +7 pts  │    │
│  │ Your checkout requires login. AI agents work best with  │    │
│  │ guest checkout flows — fewer steps, fewer failure points.│    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                   │
│  🟡 MEDIUM IMPACT                                                │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ Add JSON-LD Product markup                      +5 pts  │    │
│  │ Your product pages use Open Graph tags but not JSON-LD  │    │
│  │ Product schema. JSON-LD gives agents richer data.       │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                   │
│  🟢 QUICK WINS                                                   │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ Publish a sitemap with product URLs              +2 pts │    │
│  │ Your sitemap.xml exists but only lists category pages.  │    │
│  │ Include individual product URLs for better discovery.   │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                   │
│  If you implement all recommendations:  67 → 91 (+24 pts)       │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### Layout — Free SKILL.md Download + Premium Upsell

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                   │
│  Your Agent Skill File                                           │
│  ─────────────────────                                           │
│                                                                   │
│  We generated a SKILL.md for your store. Place it at your        │
│  domain root (staples.com/SKILL.md) so AI agents can learn       │
│  how to shop at your store.                                      │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │  # Staples — Agent Procurement Skill                     │    │
│  │  ## Overview                                              │    │
│  │  - Domain: staples.com                                    │    │
│  │  - Sector: Office Supplies                                │    │
│  │  - Agent Readiness Score: 67/100                          │    │
│  │  ...                                                      │    │
│  │  (preview — first 15 lines)                               │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                   │
│  [Download SKILL.md]    [Copy to clipboard]                      │
│                                                                   │
│  ──────────────────────────────────────────────────────────────  │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │                                                          │    │
│  │  Want a Premium Skill?                                   │    │
│  │                                                          │    │
│  │  Our premium scan uses browser automation to walk your   │    │
│  │  full checkout flow — mapping every form field, button,  │    │
│  │  and API call. The result is a production-grade skill    │    │
│  │  file that makes it 10x easier for agents to buy from   │    │
│  │  your store.                                             │    │
│  │                                                          │    │
│  │  Includes:                                               │    │
│  │  ✓ Full checkout flow mapping                            │    │
│  │  ✓ CSS selectors for all key elements                    │    │
│  │  ✓ API endpoint discovery                                │    │
│  │  ✓ Error handling guidance                               │    │
│  │  ✓ Verified AXS Rating (tested, not estimated)          │    │
│  │                                                          │    │
│  │  [Get Premium Scan →]                                    │    │
│  │                                                          │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                   │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │                                                          │    │
│  │  Full Product Index & UCP Distribution                   │    │
│  │                                                          │    │
│  │  We can crawl your entire product catalog weekly,        │    │
│  │  map every product to the Google Product Taxonomy, and   │    │
│  │  submit your products to Shopify's Catalog and Google's  │    │
│  │  Universal Commerce Protocol — making your products      │    │
│  │  discoverable by every AI agent on every platform.       │    │
│  │                                                          │    │
│  │  [Learn about our Index & Distribution plans →]          │    │
│  │                                                          │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### Layout — Comparison to Sector

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                   │
│  How You Compare                                                 │
│  ───────────────                                                 │
│                                                                   │
│  Office Supplies Sector Average: 61/100                          │
│  Your Score: 67/100 (above average)                              │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │                                                          │    │
│  │  Distribution chart showing where this domain falls      │    │
│  │  relative to other scanned domains in the same sector    │    │
│  │                                                          │    │
│  │     ▁▂▃▅▇█▇▅▃▂▁                                        │    │
│  │              ↑                                           │    │
│  │          You (67)                                        │    │
│  │                                                          │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                   │
│  Top scorer in your sector: amazon.com (82)                      │
│  [View full leaderboard →]                                       │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## Scan-in-Progress State

While the scan is running (5–15 seconds), the page shows an animated progress view. This can either be on the same page or as an intermediate page before redirecting to results.

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                   │
│  Scanning staples.com...                                         │
│                                                                   │
│  ✅ Fetching homepage and sitemap                                │
│  ✅ Checking structured data markup                              │
│  ✅ Analyzing search functionality                               │
│  ⏳ Evaluating checkout flow...                                  │
│  ○  Detecting APIs and MCP endpoints                             │
│  ○  Checking bot friendliness                                    │
│  ○  Calculating your score                                       │
│                                                                   │
│  ━━━━━━━━━━━━━━━━━━━━━━━━░░░░░░░░░░  62%                       │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## SEO & Meta Tags

```html
<!-- /agent-readiness-checker -->
<title>Agent Readiness Checker — How AI-Ready Is Your Store? | CreditClaw</title>
<meta name="description" content="Free tool to check how easily AI shopping agents can find, search, and buy from your online store. Get your Agent Readiness Score and actionable recommendations." />
<meta property="og:title" content="Agent Readiness Checker | CreditClaw" />
<meta property="og:description" content="Check your store's Agent Readiness Score. See how AI agents experience your checkout flow and get recommendations to improve." />

<!-- /agent-readiness-checker/[domain] -->
<title>{domain} Agent Readiness Score: {score}/100 | CreditClaw</title>
<meta name="description" content="{domain} scored {score}/100 on CreditClaw's Agent Readiness Checker. See the full breakdown and recommendations for improving AI agent compatibility." />
<meta property="og:title" content="{domain} — Agent Readiness Score: {score}/100" />
<meta property="og:description" content="See how AI shopping agents experience {domain}. Full score breakdown, recommendations, and a free downloadable SKILL.md." />
```

---

## Sharing & Virality

After getting their score, merchants should want to share it (especially if it's high). Include:

- **Share buttons:** "Share your score" with pre-filled text: "Our store scored {score}/100 on CreditClaw's Agent Readiness Checker! See how your store compares: {url}"
- **Embeddable badge:** A small badge merchants can add to their site: "Agent Ready: {score}/100 — Verified by CreditClaw"
- **Score image:** Auto-generated OG image showing the score (so link previews look good when shared on social)

---

## Data Flow

```
1. User enters domain on /agent-readiness-checker
2. POST /api/v1/scan { domain: "staples.com" }
3. Server crawls public surface (fetch + cheerio, 5-15 seconds)
4. Server calculates score from 8 weighted signals
5. Server generates SKILL.md via LLM (Claude)
6. Server saves to:
   - brand_index (upsert — create or update existing record)
   - scan_history (new row — preserves historical scores)
7. Redirect to /agent-readiness-checker/staples.com
8. Results page reads from brand_index + scan_history
9. SKILL.md available for download
```

---

## Mobile Considerations

- The input field should be full-width on mobile with a stacked CTA button below
- Score gauge should scale down but remain prominent
- Breakdown bars should be vertical on mobile (score label above, bar below)
- Recommendations should be collapsible accordions on mobile
- SKILL.md preview should be scrollable with a fixed "Download" button

---

## Accessibility

- Score gauge must have text alternative (not just visual)
- Progress bars must have aria-valuenow/aria-valuemin/aria-valuemax
- Color coding must not be the only indicator (include text labels: "Poor", "Fair", etc.)
- Input field must have proper label and error messaging
- All interactive elements need visible focus states
