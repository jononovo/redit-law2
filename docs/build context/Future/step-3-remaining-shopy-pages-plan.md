# Step 3 Remaining: shopy.sh Pages — Technical Plan

**Status:** Proposed  
**Priority:** High — completes the shopy.sh tenant  
**Depends on:** None (multitenant system is done, all infrastructure is in place)

---

## Shopy Brand Design System (Reference)

Before building, every page must follow the established shopy.sh visual language. The canonical reference is `components/tenants/shopy/how-it-works.tsx`.

| Pattern | Implementation | Anti-pattern (CreditClaw) |
|---|---|---|
| **Corners** | Sharp — no `rounded-xl`, `rounded-2xl`, `rounded-lg` on cards/containers | `rounded-2xl` on cards |
| **Shadows** | None — completely flat | `shadow-sm`, `shadow-xl` |
| **Section labels** | `text-sm font-mono text-neutral-400 tracking-wide` uppercase | Colored badge pills, gradient text |
| **Grid cards** | `gap-px bg-neutral-200` for 1px dividers | `gap-6` with shadows |
| **List items** | `→` arrows (`font-mono text-xs`) | Bullets, checkmarks |
| **Dark sections** | `bg-neutral-950`, green accent only in terminal | `bg-gradient-to-r`, multi-color accents |
| **Container** | `max-w-4xl mx-auto` | `max-w-3xl` or `max-w-5xl` |
| **Section dividers** | `border-t border-neutral-200` with `py-20` | Background color bands |
| **Cards** | `border border-neutral-200 p-8` | `rounded-2xl border-neutral-100 shadow-sm` |
| **Dark cards** | `border border-neutral-900 bg-neutral-950 p-8` | Gradient backgrounds |
| **CTAs** | Text links: `text-sm font-semibold text-neutral-900 hover:underline underline-offset-4` | Colored buttons with shadow |
| **Heading style** | `text-3xl md:text-4xl font-extrabold tracking-tight text-neutral-900` | Gradient `bg-clip-text` headings |
| **Body text** | `text-sm text-neutral-500 leading-relaxed font-medium` | `text-neutral-600` without `font-medium` |
| **Color accents** | Green ONLY in terminal/code context (`text-green-400`) | Multi-color: amber, purple, blue accents |
| **Score badges** | From landing: `inline-flex items-center px-2 py-0.5 rounded text-xs font-bold` with score-based bg | Colored pills with icons |

**Critical:** Do NOT reuse components from `app/skills/vendor-card.tsx` or `app/skills/catalog-client.tsx` — those use CreditClaw styling (`rounded-2xl`, `shadow-xl`, colored accents). Instead, extend the patterns from the shopy landing table and how-it-works sections.

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
- **Visual style:** Follows the shopy.sh mono aesthetic — all sharp corners, no shadows, font-mono for code and section labels.
- **Prose styling:** Override `@tailwindcss/typography` defaults to match shopy brand:
  - Code blocks: `bg-neutral-950 text-neutral-300 font-mono` — sharp corners, no rounded
  - Inline code: `bg-neutral-100 text-neutral-800 font-mono px-1.5 py-0.5` — sharp corners
  - Tables: `border border-neutral-200` — sharp corners, 1px borders, no row zebra-striping with color
  - Headings: `font-extrabold tracking-tight text-neutral-900`
  - Links: `text-neutral-900 underline underline-offset-4 hover:decoration-neutral-900`
  - Blockquotes: `border-l-2 border-neutral-300 text-neutral-500` — no colored left border
- **Non-dev callout card** at the top: _"Not a developer? Here's what this means for your brand →"_ linking to `/guide`. Uses the exact card pattern from how-it-works.tsx: `border border-neutral-200 p-8` with `BookOpen` icon. No rounded corners.

### Implementation approach

**Static import + react-markdown rendering.** All dependencies are already installed:
- `react-markdown@10.1.0`
- `remark-gfm@4.0.1`
- `rehype-raw@7.0.0`

Copy the markdown file to `content/agentic-commerce-standard.md` and read it at build time in a server component via `fs.readFileSync`. Render with `react-markdown` + `remark-gfm`. Generate the sidebar TOC by parsing `##` headings from the markdown source.

### Files to create/modify

| File | Action |
|---|---|
| `app/standard/page.tsx` | New — server component, reads markdown, renders with TOC sidebar |
| `content/agentic-commerce-standard.md` | New — copy from `docs/build context/Future/Product_index/` |
| `public/tenants/shopy/config.json` | Update footer "SKILL.md Standard" link from `/docs` to `/standard` |

### Key details

- **Tenant-awareness:** The standard is shopy.sh's identity document but accessible from all tenants. Use `generateMetadata()` with the tenant config for title — "Agentic Commerce Standard | shopy.sh" on shopy, "Agentic Commerce Standard | CreditClaw" on CC.
- **SEO:** Full SSR, canonical URL at `shopy.sh/standard`, structured metadata.
- **Anchor links:** Each `##` heading gets an auto-generated `id` for deep linking (e.g., `/standard#asx-score`). The sidebar TOC uses these anchors.
- **No dark mode on this page** — the spec document should be clean white background with high-contrast text for readability. Keep the shopy aesthetic (sharp, mono) but stay on the light-background track.

---

## Page 2: `/guide` — Non-Technical Merchant Explainer

### What it is

A plain-language walkthrough for brand owners, marketing managers, and e-commerce professionals who aren't developers. The brand identity doc specifies the six sections:

1. **What is agentic commerce?** — 2-3 sentences + a flow diagram: customer → AI agent → your store
2. **Why does this matter for your brand?** — "If AI agents can't find your products, they'll shop somewhere else"
3. **What is an ASX Score?** — "A score from 0-100 that tells you how easy it is for AI agents to shop at your store"
4. **How do I check my score?** — Inline domain input that navigates to `/agentic-shopping-score?domain={value}`
5. **How do I improve my score?** — Plain-language checklist (no code, no jargon)
6. **What happens next?** — Listed in catalog → agents discover → agents shop → sales grow

### Design direction

This is NOT a spec page — it's an onboarding explainer. But it must still follow the shopy aesthetic (flat, sharp, mono). The visual warmth comes from clear copywriting and generous whitespace, not from colored accents or rounded corners.

- **Layout:** Single-column, full-width sections separated by `border-t border-neutral-200` with `py-20` spacing. Each section has an uppercase `font-mono` label, a bold heading, body text, and a visual element.
- **Flow diagram (section 1):** Three boxes connected by arrows, built in HTML/CSS: `border border-neutral-200 p-6` boxes (sharp corners) with `→` arrows between them. Text labels inside: "Your Customer", "AI Agent", "Your Store". Dark variant for the AI Agent box (`bg-neutral-950 text-white`). NOT an SVG or image.
- **Improvement checklist (section 5):** Uses the `→` list-item pattern from how-it-works.tsx. Each item is plain language: "Make sure your products have clear names and prices" not "Implement JSON-LD Product schema markup". Use the grid card pattern (`gap-px bg-neutral-200`) for the checklist items.
- **Inline scanner (section 4):** Reuse the exact form pattern from the how-it-works hero — `Input` with `h-12 bg-neutral-50 border-neutral-200 font-medium` and `Button` with `bg-neutral-900 text-white font-bold`. Links to `/agentic-shopping-score?domain={value}`.
- **CTA (bottom):** Dark section `bg-neutral-950 text-white py-24` with domain scan form — same as how-it-works CTA section.

### Implementation approach

Custom React server component. Unlike the standard page, this is a designed page with specific layout and interactive elements (form inputs), not a rendered document. Markdown rendering would not capture the intended UX.

### Files to create/modify

| File | Action |
|---|---|
| `app/guide/page.tsx` | New — server component with `generateMetadata()`, renders the guide |
| `public/tenants/shopy/config.json` | Add `/guide` to footer under new "Resources" column |

### Key details

- **No separate component file needed.** The guide is a self-contained page — no tenant-specific variants. The same flat/mono aesthetic works across all tenants since it's a shopy-originated document.
- **Section numbering:** Use the `font-mono text-xs text-neutral-400` step number pattern from how-it-works (`01`, `02`, `03`... `06`).
- **Icons:** Use lucide icons at `w-5 h-5 text-neutral-900` with `strokeWidth={1.5}` — same as how-it-works.
- **Link to standard:** Include a subtle link at the bottom: "Read the full technical specification →" linking to `/standard`.

---

## Page 3: `/leaderboard` — Top Vendors by Score

### What it is

A ranked list of the top-performing vendors by ASX Score and AXS Rating. Merchants see where they rank, developers see which stores are most agent-ready.

### Design direction

A data table following the exact pattern from the shopy landing page's skill catalog table — column headers, row links, score badges. NOT card-based (no VendorCards).

- **Layout:** Full-width data table inside a `border border-neutral-200` container (sharp corners). Column headers in a `bg-neutral-50 border-b border-neutral-200` row with `text-xs font-bold text-neutral-400 uppercase tracking-wider`. Data rows in `divide-y divide-neutral-100` with hover `hover:bg-neutral-50`.
- **Columns:** Rank (#), Brand (name + domain), Sector, ASX Score, AXS Rating. On mobile, collapse to Rank, Brand, Score.
- **Score display:** Reuse the `ScoreBadge` component pattern from the shopy landing — `inline-flex items-center px-2 py-0.5 rounded text-xs font-bold` with score-based colors (green-50/green-700 for 80+, yellow-50/yellow-700 for 60+, orange-50/orange-700 for 40+, red-50/red-700 below 40).
- **Tab switching:** Two tabs at the top — "By ASX Score" (default) and "By AXS Rating". Tabs use the shopy flat style: active tab `border-b-2 border-neutral-900 font-bold text-neutral-900`, inactive `text-neutral-400 hover:text-neutral-600`.
- **Sector filter:** Row of flat pill buttons above the table: `border border-neutral-200 px-3 py-1.5 text-xs font-medium` (sharp corners), active state `bg-neutral-900 text-white border-neutral-900`.
- **Brand links:** Each row links to `/skills/{slug}` — same as landing page.
- **Empty state / sparse state:** With ~14 brands, show all of them. Below the table, show a CTA: _"Is your brand missing? Check your ASX Score →"_ linking to `/agentic-shopping-score`. Uses the non-dev callout card pattern from how-it-works.

### Data source

All data comes from the existing `brand_index` table. No new tables or API endpoints needed.

The `storage.searchBrands()` method already supports:
- `sortBy: "overallScore" | "axsRating"` 
- `sortDir: "asc" | "desc"`
- `sector` filter
- `minScore` / `minAxsRating` filters
- `limit` and `offset` for pagination
- `lite: true` for lean column set

### Implementation approach

**Server component with client-side interactivity:**
- Server-side: `app/leaderboard/page.tsx` — server component, fetches initial top 50 sorted by `overallScore DESC` via internal fetch to `/api/v1/brands?sortBy=overallScore&sortDir=desc&limit=50&lite=true`. Passes data as props.
- Client-side: `app/leaderboard/leaderboard-client.tsx` — `"use client"` component for tab switching, sector filtering, and sorting. Fetches updated data via the existing brands API when filters change.

### Files to create/modify

| File | Action |
|---|---|
| `app/leaderboard/page.tsx` | New — server component with `generateMetadata()`, initial data fetch |
| `app/leaderboard/leaderboard-client.tsx` | New — client component for interactivity |
| `public/tenants/shopy/config.json` | Add "Leaderboard" to header nav links |

### Key details

- **SEO:** "Top AI-ready stores", "Most agent-friendly e-commerce brands". Full SSR with `generateMetadata()`.
- **AXS Rating tab:** Only show brands with `ratingCount >= 3` in the rating view. Brands without enough feedback show `—` in the rating column.
- **Rank numbers:** `text-sm font-mono text-neutral-400` in the first column — mono font matches the shopy aesthetic.
- **Section structure:** Matches the landing page — uppercase section label above, then the main heading, then the table. No hero section needed — the table IS the page.

---

## Build Order

These three pages are independent. Recommended sequence:

1. **Standard** — smallest scope, highest SEO value, referenced by other pages (the guide links to it)
2. **Leaderboard** — uses existing data and landing page patterns, compelling catalog showcase
3. **Guide** — most design work, benefits from having the standard and leaderboard to link to

---

## Nav Config Updates

After all three pages are built, update `public/tenants/shopy/config.json`:

**Header links:**
```json
"links": [
  { "label": "Standard", "href": "/standard" },
  { "label": "Score Scanner", "href": "/agentic-shopping-score" },
  { "label": "Shopping Skills", "href": "/skills" },
  { "label": "Leaderboard", "href": "/leaderboard" },
  { "label": "AXS", "href": "/axs" }
]
```

**Footer — add "Resources" column with guide link:**
```json
{
  "title": "Resources",
  "links": [
    { "label": "Merchant Guide", "href": "/guide" },
    { "label": "How It Works", "href": "/how-it-works" },
    { "label": "AXS Scoring", "href": "/axs" }
  ]
}
```

**Footer — update "Developers" column standard link:**
```json
{ "label": "SKILL.md Standard", "href": "/standard" }
```

---

## Validation Checklist

Before marking each page complete, verify:

- [ ] **No rounded corners** on cards/containers (only `rounded` on tiny badges, `rounded-full` on dots)
- [ ] **No shadows** anywhere on the page
- [ ] **Section labels** use `text-sm font-mono text-neutral-400 tracking-wide` uppercase
- [ ] **Container** is `max-w-4xl mx-auto`
- [ ] **Section dividers** use `border-t border-neutral-200` with `py-20`
- [ ] **Card pattern** is `border border-neutral-200 p-8` (no rounded, no shadow)
- [ ] **Text hierarchy** matches: extrabold headings, neutral-500 body text with font-medium
- [ ] **Color accents** are neutral-only (green only in terminal/code contexts)
- [ ] **CTAs** are text links with `hover:underline underline-offset-4`, not colored buttons
- [ ] **All interactive elements** have `data-testid` attributes
- [ ] **`generateMetadata()`** returns tenant-aware title and description
- [ ] **Page renders correctly** on both shopy.sh and creditclaw.com domains
