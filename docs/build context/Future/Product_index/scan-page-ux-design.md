# Agent Shopping Experience Checker — Page UX & URL Design

## Related Documents

| Document | What It Covers |
|---|---|
| `product-index-taxonomy-plan.md` | Google Product Taxonomy adoption, UCP category model |
| `agent-readiness-and-product-index-service.md` | Service tiers, gateway, scoring signals, database schema |
| `shopy-sh-commerce-skill-standard.md` | shopy.sh open standard — SKILL.md format for commerce |
| `scan-page-ux-design.md` | This document — page layout, UX flow, URL structure |

---

## Concept

A free, public-facing tool — styled like Ahrefs' Website Authority Checker or CheckPageRank. Clean page, big domain input, instant results. No login required. The value proposition is immediately clear: **can AI shopping agents find, search, and buy from your store?**

The page serves three purposes:

1. **Lead generation** — every scan grows the CreditClaw brand index
2. **Onboarding funnel** — free scan → premium scan → full index subscription
3. **SEO magnet** — ranks for "agent shopping experience", "AI shopping agent checker", "can AI agents buy from my store"

---

## URL Structure

### Primary Tool Pages

| Route | Purpose | SEO Target Keywords |
|---|---|---|
| `/agent-shopping-experience-checker` | Main scanner — domain input + results | "agent shopping experience checker", "AI shopping agent score", "can AI agents buy from my store" |
| `/agent-shopping-experience-checker/[domain]` | Results page for a specific domain | "{domain} AI shopping experience", "{domain} agent shopping experience score" |
| `/agent-shopping-experience-checker/[domain]/history` | Score trend over time | "{domain} agent shopping experience history" |

### Why "Shopping" in the URL

The word "shopping" is critical. "Agent readiness" could mean anything — customer service agents, support agents, call center agents. "Agent shopping experience" immediately communicates:
- This is about **commerce** — buying and selling products
- This is about **AI shopping agents** — ChatGPT, Claude, Gemini acting as shopping assistants
- The tool measures the quality of that experience — not just whether you're "ready", but how good or bad the experience actually is

It also targets better SEO keywords. "AI shopping agent" is a more specific and commercially valuable phrase than "AI agent" alone.

### Supporting Pages

| Route | Purpose |
|---|---|
| `/agent-shopping-experience-checker` | Scanner tool (this page) |
| `/skills` | Existing skill catalog |
| `/c/[sector]` | Existing sector pages |
| `/c/[sector]/[subSector]` | Sub-sector pages (Phase 11 Part B) |
| `/leaderboard` | Top-rated domains by AXS score (future) |

---

## Page 1: The Scanner (`/agent-shopping-experience-checker`)

### Layout — Above the Fold

Inspired by: `ahrefs.com/website-authority-checker` and `checkpagerank.net`

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                   │
│  [CreditClaw Logo]                              [Nav: Skills │ …] │
│                                                                   │
│                                                                   │
│              Can AI Shopping Agents                              │
│              Buy From Your Store?                                │
│                                                                   │
│    Check how easily ChatGPT, Claude, and Gemini can find your   │
│    products, search your catalog, and complete a purchase.       │
│                                                                   │
│  ┌───────────────────────────────────────────┬──────────────┐    │
│  │  Enter your store's domain (e.g. staples… │  Check Score  │    │
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
│  3. Get your Agent Shopping Experience Score (0–100)              │
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
- **Redirect on complete:** Navigate to `/agent-shopping-experience-checker/[domain]`

---

## Page 2: Results (`/agent-shopping-experience-checker/[domain]`)

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
│  │  Agent Shopping Experience Score                          │    │
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
│  │  - Agent Shopping Experience Score: 67/100                 │    │
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

### Layout — Brand Comparison

Show one comparable brand from the CreditClaw database alongside the scanned domain. The comparison brand is selected by: same sector first, then closest sub-sector overlap, then nearest overall score. If no comparable brand exists in the database for this sector, skip this section entirely.

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                   │
│  How You Compare                                                 │
│  ───────────────                                                 │
│                                                                   │
│  We compared your score to a similar brand in Office Supplies    │
│  that we've already scanned.                                     │
│                                                                   │
│  ┌─────────────────────────┬──────────────┬──────────────┐       │
│  │ Metric                  │ staples.com  │ officedepot… │       │
│  ├─────────────────────────┼──────────────┼──────────────┤       │
│  │ Overall Score           │    67/100    │    72/100    │       │
│  ├─────────────────────────┼──────────────┼──────────────┤       │
│  │ Structured Product Data │    14/20     │    16/20     │       │
│  │ Search Functionality    │    10/15     │    11/15     │       │
│  │ Checkout Accessibility  │     8/15     │    12/15     │       │
│  │ API Availability        │    12/15     │    10/15     │       │
│  │ Sitemap Quality         │     8/10     │     9/10     │       │
│  │ Bot Friendliness        │     7/10     │     7/10     │       │
│  │ Mobile/Responsive       │     4/5      │     4/5      │       │
│  │ MCP/UCP Support         │     4/10     │     3/10     │       │
│  └─────────────────────────┴──────────────┴──────────────┘       │
│                                                                   │
│  Each metric row has a color indicator:                           │
│  🟢 You score higher  ⚪ Tied  🔴 They score higher              │
│                                                                   │
│  "You're ahead on API Availability and MCP/UCP Support.          │
│   Your biggest gap is Checkout Accessibility — see                │
│   recommendations above."                                        │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

**Selection logic for the comparison brand:**

1. Query `brand_index` for brands in the same primary sector
2. If multiple matches, prefer brands with overlapping sub-sectors
3. Among those, pick the one with the closest overall score (not the highest — we want a peer, not a leader)
4. Never show the scanned domain as its own comparison
5. If zero brands exist in the sector, skip comparison entirely — no empty state, just omit the section

**What the comparison is NOT:**

- Not competitive intelligence — we're not crawling the competitor deeper than their own scan
- Not a ranking — we don't say "you're #3 in your sector"
- Not product-level — purely domain-level signal comparison
- The comparison brand's data comes entirely from their own previous Tier 1 scan (already in `brand_index` and `scan_history`)

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
<!-- /agent-shopping-experience-checker -->
<title>Agent Shopping Experience Checker — Can AI Agents Buy From Your Store? | CreditClaw</title>
<meta name="description" content="Free tool to check how easily AI shopping agents like ChatGPT, Claude, and Gemini can find your products, search your catalog, and complete a purchase. Get your score and actionable recommendations." />
<meta property="og:title" content="Agent Shopping Experience Checker | CreditClaw" />
<meta property="og:description" content="Can AI shopping agents buy from your store? Check your Agent Shopping Experience Score — see exactly where ChatGPT, Claude, and Gemini struggle with your catalog and checkout." />

<!-- /agent-shopping-experience-checker/[domain] -->
<title>{domain} Agent Shopping Experience Score: {score}/100 | CreditClaw</title>
<meta name="description" content="{domain} scored {score}/100 on CreditClaw's Agent Shopping Experience Checker. See how well AI shopping agents can find, search, and buy from this store." />
<meta property="og:title" content="{domain} — Agent Shopping Experience: {score}/100" />
<meta property="og:description" content="Can AI shopping agents buy from {domain}? Full score breakdown across 8 signals, actionable recommendations, and a free downloadable SKILL.md." />
```

---

## Sharing & Virality

After getting their score, merchants should want to share it (especially if it's high). Include:

- **Share buttons:** "Share your score" with pre-filled text: "Our store scored {score}/100 on CreditClaw's Agent Shopping Experience Checker! See how your store compares: {url}"
- **Embeddable badge:** A small badge merchants can add to their site: "Agent Shopping Experience: {score}/100 — Verified by CreditClaw"
- **Score image:** Auto-generated OG image showing the score (so link previews look good when shared on social)

---

## Data Flow

```
1. User enters domain on /agent-shopping-experience-checker
2. POST /api/v1/scan { domain: "staples.com" }
3. Server crawls public surface (fetch + cheerio, 5-15 seconds)
4. Server calculates score from 8 weighted signals
5. Server generates SKILL.md via LLM (Claude)
6. Server finds one comparable brand in same sector (if available)
7. Server saves to:
   - brand_index (upsert — create or update existing record)
   - scan_history (new row — preserves historical scores)
8. Redirect to /agent-shopping-experience-checker/staples.com
9. Results page reads from brand_index + scan_history
10. Comparison table shown if a comparable brand was found
11. SKILL.md available for download
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
