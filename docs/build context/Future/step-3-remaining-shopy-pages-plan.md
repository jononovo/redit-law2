# Step 3 Remaining: shopy.sh Pages — Technical Plan

**Status:** Proposed  
**Priority:** High — completes the shopy.sh tenant  
**Depends on:** None (multitenant system is done, all infrastructure is in place)

---

## Overview

Step 3 is ~70% complete. The core shopy.sh pages — landing, how-it-works, score scanner, catalog, AXS explainer, and docs — are all built and working. Three pages remain:

| Page | Route | Purpose | Complexity |
|---|---|---|---|
| **Standard** | `/standard` | Render the agentic commerce standard as a formatted reference document | Low-Medium |
| **Guide** | `/guide` | Non-technical merchant explainer with visual diagrams | Medium |
| **Leaderboard** | `/leaderboard` | Top vendors by ASX Score and AXS Rating | Medium |

---

## Page 1: `/standard` — The Agentic Commerce Standard

### What it is

A rendered version of `docs/build context/Future/Product_index/agentic-commerce-standard.md` (720 lines) — the canonical definition of the agentic procurement metadata standard and the ASX/AXS scoring framework. This is the authoritative reference document that shopy.sh positions itself as the steward of.

### Design direction

This is a spec document, not a marketing page. Think MDN Web Docs or the OpenAPI specification page — clean, scannable, with a persistent table of contents sidebar for navigation.

- **Layout:** Two-column on desktop — sticky sidebar nav (left), markdown content (right). Single column on mobile with a collapsible TOC.
- **Visual style:** Follows the shopy.sh mono aesthetic (black/white, no rounded corners, green terminal accent). The content itself uses the existing `@tailwindcss/typography` prose classes already set up in the docs system.
- **Tables, code blocks, and diagrams** in the markdown should render correctly — the existing `react-markdown` + `remark-gfm` + `@tailwindcss/typography` stack handles this.
- **Non-dev callout card** at the top: _"Not a developer? Here's what this means for your brand →"_ linking to `/guide`. This is specified in the brand identity doc as an inline contextual card pattern.

### Implementation approach

**Option A — Static import + MDX/react-markdown rendering:**  
Copy the markdown file to a location the app can import (e.g., `content/standard.md` or read it at build time via `fs.readFileSync` in a server component). Render with `react-markdown` + `remark-gfm`. Generate the sidebar TOC by parsing `##` headings from the markdown.

This is the simplest approach and matches how the existing `/docs` pages work — server-rendered markdown with prose styling.

**Option B — Hardcoded React page:**  
Convert the markdown content into a custom React page with styled sections, icons, and interactive elements. More control over presentation but high maintenance cost for a 720-line spec doc that will evolve.

**Recommendation:** Option A. The standard is a living document that will be updated as the spec evolves. Markdown-first means edits are text changes, not component refactors. The `/docs` system already proves this pattern works.

### Files to create/modify

| File | Action |
|---|---|
| `app/standard/page.tsx` | New — server component, reads markdown, renders with TOC sidebar |
| `content/agentic-commerce-standard.md` | New — copy from `docs/build context/Future/Product_index/` to app-accessible location |
| `public/tenants/shopy/config.json` | Add `/standard` to nav links |

### Key details

- **Tenant-awareness:** The standard is shopy.sh's identity document but should be accessible from all tenants (CreditClaw links to it too). Use `generateMetadata()` with tenant-aware titles — "Agentic Commerce Standard | shopy.sh" vs "Agentic Commerce Standard | CreditClaw".
- **SEO:** This is a high-value SEO page. Full server-side rendering, canonical URL at `https://shopy.sh/standard`, structured metadata, and `generateMetadata()` with the document title and description.
- **Anchor links:** Each `##` heading gets an auto-generated `id` for deep linking (e.g., `/standard#asx-score`). The sidebar TOC links to these anchors.

---

## Page 2: `/guide` — Non-Technical Merchant Explainer

### What it is

A plain-language walkthrough for brand owners, marketing managers, and e-commerce professionals who aren't developers. The brand identity doc specifies exactly what this page covers:

1. **What is agentic commerce?** — 2-3 sentences + a simple diagram: customer → AI agent → your store
2. **Why does this matter for your brand?** — "If AI agents can't find your products, they'll shop somewhere else"
3. **What is an ASX Score?** — "A score from 0-100 that tells you how easy it is for AI agents to shop at your store"
4. **How do I check my score?** — Inline score checker or link to the scanner
5. **How do I improve my score?** — Simple checklist (no code)
6. **What happens next?** — Listed in catalog → agents discover → agents shop → sales grow

### Design direction

This is NOT a spec page — it's the opposite. Think Stripe's "What is Stripe?" page or Shopify's merchant onboarding explainers. Visual, step-by-step, with diagrams and illustrations.

- **Layout:** Single-column, full-width sections, generous whitespace. Each section is a self-contained block with a heading, short text, and a visual element (diagram, icon grid, or illustration).
- **Visual style:** Still follows the shopy.sh clean/mono aesthetic, but warmer and more approachable than the technical pages. Use the existing component patterns from `how-it-works.tsx` — section labels, step numbers, card grids.
- **Inline scanner:** Section 4 ("How do I check my score?") should include a domain input field that links to `/agentic-shopping-score?domain={input}` or embeds a simplified version of the scanner form.
- **Improvement checklist:** Section 5 should be a visual checklist — checkmarks, green/amber/red indicators, plain-language descriptions. No code, no technical jargon. "Make sure your products have clear names and prices" not "Implement JSON-LD Product schema markup".
- **CTA at bottom:** "Ready to get started? Check your score →" linking to the scanner.

### Implementation approach

A custom React server component with hardcoded sections. Unlike the standard page, this is a designed marketing page, not a rendered document. The content is specific and visual enough that markdown rendering wouldn't capture the intended UX.

### Files to create/modify

| File | Action |
|---|---|
| `app/guide/page.tsx` | New — server component with `generateMetadata()` |
| `components/tenants/shopy/guide.tsx` | New — the actual guide content component (tenant-specific styling) |
| `public/tenants/shopy/config.json` | Add `/guide` to nav links |

### Key details

- **Tenant-awareness:** This page is primarily a shopy.sh page. On CreditClaw, the equivalent content lives on the how-it-works page. The guide should use shopy branding but be accessible from both tenants.
- **Diagrams:** The "customer → AI agent → your store" flow diagram from the brand identity doc. Can be built with simple CSS/HTML boxes and arrows (no need for an image or SVG — keep it in code for easy iteration). Reference the visual pattern used in how-it-works.tsx step flow.
- **Scanner integration:** The inline domain input in section 4 should prepopulate the scanner page. A simple form that navigates to `/agentic-shopping-score?domain={value}` — the scanner page already accepts URL parameters.

---

## Page 3: `/leaderboard` — Top Vendors by Score

### What it is

A ranked list of the top-performing vendors by ASX Score and AXS Rating. This is the competitive element — merchants want to see where they rank, and developers want to know which stores are most agent-ready.

### Design direction

Think Product Hunt's leaderboard or Lighthouse score comparisons. Data-dense but clean.

- **Layout:** Full-width table/list with rank, brand name, domain, sector, ASX Score, AXS Rating, and a visual score bar. Sortable columns. Two views: "By ASX Score" (default) and "By AXS Rating".
- **Visual style:** The shopy.sh mono aesthetic — no rounded corners, clean typography, data-forward. Score values should be prominent with color-coded badges matching the existing scanner result colors (90+ green, 70-89 amber, below 70 red/gray).
- **Filters:** Sector filter (dropdown or pill buttons). Optional: minimum score threshold, minimum rating count.
- **Pagination:** Show top 50 by default. "Load more" or pagination for the full list.
- **Brand links:** Each row links to the brand detail page at `/skills/{slug}`.
- **Score delta (future):** When brand versioning lands (Step 4B), show trending arrows (↑↓) next to scores indicating change since last scan.

### Implementation approach

**Server component with client-side interactivity:**
- Server-side: Fetch the initial top 50 brands sorted by `overallScore DESC` via `storage.searchBrands()`. The storage layer already supports score-based sorting and pagination.
- Client-side: A `"use client"` component handles tab switching (ASX Score / AXS Rating), sector filtering, and pagination via the internal brand search API.

This mirrors the existing catalog page architecture — `app/skills/page.tsx` (server component, initial fetch) → `app/skills/catalog-client.tsx` (client component, filtering/pagination). Use the same pattern.

### Data source

All data comes from the existing `brand_index` table. No new tables or API endpoints needed. The `storage.searchBrands()` method already supports:
- `sortBy: "overallScore" | "axsRating"` 
- `sortDir: "asc" | "desc"`
- `sector` filter
- `minScore` filter
- `minAxsRating` filter
- `limit` and `offset` for pagination
- `lite: true` for lean column set (name, slug, domain, logoUrl, sector, tier, score, rating)

### Files to create/modify

| File | Action |
|---|---|
| `app/leaderboard/page.tsx` | New — server component with `generateMetadata()`, initial data fetch |
| `app/leaderboard/leaderboard-client.tsx` | New — client component for tab switching, filtering, pagination |
| `public/tenants/shopy/config.json` | Add `/leaderboard` to nav links |

### Key details

- **Empty state:** With only ~14 seeded brands currently, the leaderboard may look sparse. Show all brands regardless of count. The page becomes more compelling as the catalog grows. Consider showing a "Submit your store for scanning" CTA if < 50 brands.
- **Score badges:** Reuse the score display pattern from the existing vendor cards in the catalog — the `VendorCard` component in `app/skills/vendor-card.tsx` already has score badges.
- **SEO:** High-value page for search. "Top AI-ready stores", "Most agent-friendly e-commerce brands". Full SSR with `generateMetadata()`.
- **Canonical URL:** `https://shopy.sh/leaderboard` — this is a shopy.sh identity page but accessible from all tenants.
- **AXS Rating tab:** Only show brands that have `ratingCount >= 3` (or similar threshold) in the AXS Rating view. Brands without enough feedback should be excluded from the rating tab to avoid misleading data.

---

## Build Order

These three pages are independent of each other. They can be built in any order or in parallel.

**Recommended sequence:**
1. **Standard** — smallest scope, highest SEO value, and referenced by other pages (the guide links to it)
2. **Leaderboard** — uses existing data and patterns, compelling showcase of the catalog
3. **Guide** — most design work, benefits from having the standard and leaderboard to link to

---

## Nav Config Updates

After all three pages are built, update `public/tenants/shopy/config.json` header links to include the new pages. Suggested nav:

```json
"links": [
  { "label": "Standard", "href": "/standard" },
  { "label": "Score Scanner", "href": "/agentic-shopping-score" },
  { "label": "Catalog", "href": "/skills" },
  { "label": "Leaderboard", "href": "/leaderboard" },
  { "label": "AXS", "href": "/axs" }
]
```

The `/guide` page doesn't need a primary nav link — it's reached via contextual callout cards on the standard and how-it-works pages. It can go in the footer under a "For Merchants" column.
