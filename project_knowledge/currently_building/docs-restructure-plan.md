# Documentation Restructure Plan

## Goal

Merge the current two-track docs (user guide vs developer) into a single unified flow. All three tenants share one sidebar. Developer content becomes subsections within existing topics rather than a parallel track. Each tenant gets a labeled entry point.

---

## Current State

- **Two audience tracks**: sidebar has "User Guide" / "Developers" toggle that filters sections by `audience` field
- **Separate developer sections**: API Overview, API Endpoints, Webhooks, Agent Integration are their own top-level sections, disconnected from the user content they relate to
- **Tenant separation by slug prefix**: shopy pages live under `shopy/...`, creditclaw pages have no prefix
- **Content lives at `/docs/content/`** in the project root, separate from `app/docs/` (the routing layer)

### Current Section Structure

**User track (CreditClaw)**: Getting Started → Bots & Onboarding → Wallets & Funding → Spending Controls → Selling → Settings → Transactions → Procurement Skills

**Developer track (CreditClaw)**: API Overview → API Endpoints → Webhooks → Agent Integration

**User track (shopy)**: Getting Started

**Developer track (shopy)**: CLI → Skill Format → Taxonomy → Agent Integration

### Files That Import From Docs

| File | What it imports | What it does |
|------|----------------|-------------|
| `app/docs/layout.tsx` | `sections`, `getSectionsByAudience`, `getAudienceFromSlug`, `getTenantFromSlug` | Sidebar rendering, audience toggle |
| `app/docs/page.tsx` | `getSectionsByAudience`, `normalizeTenantId` | Index redirect — sends `/docs` to first user-track page |
| `app/docs/[...slug]/page.tsx` | `sections`, `findPage`, `getAllPagesFlat`, `getAudienceFromSlug`, `getTenantFromSlug` | Page rendering, prev/next navigation, `generateStaticParams` |
| `app/api/docs/[...slug]/route.ts` | `findPage`, `sitePages` | Raw markdown API (`/api/docs/...`) |
| `app/llms.txt/route.ts` | `sections`, `sitePages`, `getSectionsByAudience` | LLM-friendly index page |
| `app/llms-full.txt/route.ts` | `sections`, `sitePages` | Full concatenated markdown for LLMs |
| `app/sitemap.ts` | `sections` | Sitemap generation |

### File-System Reads (Hardcoded Paths)

These files read markdown from disk using `path.join(process.cwd(), "docs", "content", ...)`:

| File | Read pattern |
|------|-------------|
| `app/docs/[...slug]/page.tsx` | `path.join(cwd, "docs", "content", ...section.slug.split("/"), page.slug + ".md")` |
| `app/api/docs/[...slug]/route.ts` | Same pattern + `sitePages[].file` for site pages |
| `app/llms-full.txt/route.ts` | Same two patterns |

---

## Proposed Structure

One flat list of sections in the sidebar. Developer content is folded into the sections it belongs to, as deeper pages. Tenant-specific sections are labeled with a tag but named by what they cover.

### Unified Sections

```
1. Getting Started
   - What is CreditClaw
   - Creating an Account
   - Dashboard Overview
   - API Introduction                    ← from api/introduction
   - Authentication                      ← from api/authentication

2. Bots & Onboarding
   - Onboarding Wizard
   - Claiming a Bot
   - Managing Your Bots
   - Webhook Health
   - Webhook Setup & Signing             ← from api/webhooks/setup
   - Webhook Events                      ← from api/webhooks/events
   - Webhook Tunnels                     ← from api/webhooks/tunnels
   - Bot API Reference                   ← from api/endpoints/bots

3. Wallets & Funding
   - Wallet Types
   - Creating a Wallet
   - Funding Your Wallet
   - Encrypted Cards
   - Freezing & Controls
   - Wallet API Reference                ← from api/endpoints/wallets

4. Spending Controls
   - Spending Limits
   - Approval Modes
   - Category Controls

5. Selling
   - Shop & Storefront
   - Checkout Pages
   - Payment Methods
   - Invoices
   - Sales Tracking
   - Checkout API Reference              ← from api/endpoints/checkout-pages
   - Invoice API Reference               ← from api/endpoints/invoices
   - Sales API Reference                 ← from api/endpoints/sales

6. Transactions & Orders
   - Viewing Transactions
   - Orders & Shipping

7. Procurement Skills
   - What Are Skills
   - Agentic Shopping (ASX) Score
   - Browsing the Supplier Hub
   - Submitting a Supplier
   - Skills API Reference                ← from api/endpoints/skills
   - Scan API Reference                  ← from api/endpoints/scan

8. Agent Integration
   - Quick Start
   - x402 Protocol
   - MCP Integration

9. Settings
   - Seller Identity
   - Account Settings

10. Agentic Shopping (ASX) Scoring                    [shopy]
    - What is shopy.sh
    - ASX Score Explained

11. Skill Publishing                                  [shopy]
    - SKILL.md Structure                 ← from shopy/skill-format
    - Commerce Frontmatter               ← from shopy/skill-format
    - Taxonomy & Sectors                 ← from shopy/taxonomy
    - Reading Skills                     ← from shopy/agent-integration
    - Feedback Protocol                  ← from shopy/agent-integration

12. CLI Tools                                         [shopy]
    - Installation                       ← from shopy/cli
    - Commands                           ← from shopy/cli
```

### What Changes

**Merged into parent sections (no longer standalone)**:
- `api/introduction` + `api/authentication` → pages in "Getting Started"
- `api/endpoints/*` → "API Reference" pages at the bottom of each relevant section
- `api/webhooks/*` → pages in "Bots & Onboarding" (webhooks are bot-facing)
- `api/agent-integration/*` → stays as its own section (cross-cutting, doesn't fit into one parent)

**Shopy sections renamed by topic, not by tenant**:
- "shopy/getting-started" → "Agentic Shopping (ASX) Scoring"
- "shopy/cli" → "CLI Tools"
- "shopy/skill-format" + "shopy/taxonomy" + "shopy/agent-integration" → "Skill Publishing"
- Tagged with `[shopy]` in sidebar (visual label, not a URL prefix)

**Removed**:
- `audience` field on `DocSection` — no longer needed
- User Guide / Developers toggle in sidebar — gone
- `getSectionsByAudience()` — gone
- `getAudienceFromSlug()` — gone

---

## Tenant Entry Points

Add `docsEntrySlug` to `TenantConfig` in `lib/tenants/types.ts`:

```typescript
docsEntrySlug?: string;
```

Values in `lib/tenants/tenant-configs.ts`:
- CreditClaw: `"getting-started/what-is-creditclaw"`
- shopy.sh: `"asx-scoring/what-is-shopy"`
- brands.sh: `"skill-publishing/structure"` (or wherever brands docs land)

### Where entry points are consumed

1. **`app/docs/page.tsx`** — index redirect. Currently calls `getSectionsByAudience("user", tenantId)` to find the first page. Replace with: read tenant config → redirect to `/docs/{docsEntrySlug}`.
2. **`tenant-configs.ts` nav links** — currently hardcode `{ label: "Documentation", href: "/docs" }`. Change to `{ label: "Documentation", href: "/docs/{docsEntrySlug}" }`.

---

## Sidebar Changes

### New `DocSection` Interface

```typescript
interface DocPage {
  title: string;
  slug: string;
}

interface DocSection {
  title: string;
  slug: string;
  tag?: string;   // e.g. "shopy" — small visual pill in sidebar
  pages: DocPage[];
}
```

Removed: `audience`, `tenant`.

### Sidebar Layout Changes (`app/docs/layout.tsx`)

**Remove**:
- `TENANT_BRANDING` with `userLabel` / `devLabel`
- `audience` prop and the User Guide / Developers toggle links
- `getSectionsByAudience()` call — just render all `sections` directly
- `getAudienceFromSlug()` call

**Add**:
- Render `section.tag` as a small pill/badge next to section title when present
- Simple styling: `<span className="text-[10px] font-medium text-neutral-400 bg-neutral-100 px-1.5 py-0.5 rounded">{section.tag}</span>`

**Keep**:
- Logo + "Docs" link in header
- Mobile drawer (Sheet)
- Active page highlighting
- `SidebarSection` component (just remove audience-related logic)

### Prev/Next Navigation (`app/docs/[...slug]/page.tsx`)

Currently calls `getAllPagesFlat(audience, tenant)` to build the ordered page list for prev/next links. Replace with `getAllPagesFlat()` (no args) — returns all pages across all sections in order.

```typescript
// Before
const audience = getAudienceFromSlug(slug);
const tenant = getTenantFromSlug(slug);
const allPages = getAllPagesFlat(audience, tenant);

// After
const allPages = getAllPagesFlat();
```

---

## File Move: `docs/content/` → `app/docs/content/`

### Directory Structure After Move

```
app/docs/
  layout.tsx                    (existing — updated)
  page.tsx                      (existing — updated)
  [...slug]/
    page.tsx                    (existing — updated)
    doc-renderer.tsx            (existing — no changes)
    copy-markdown-button.tsx    (existing — no changes)
  content/
    sections.ts                 (moved + rewritten)
    getting-started/            (existing — no changes to .md files)
    bots/                       (existing — moved .md files added)
    wallets/                    (existing — moved .md files added)
    guardrails/                 (existing — no changes)
    selling/                    (existing — moved .md files added)
    transactions/               (existing — no changes)
    skills/                     (existing — moved .md files added)
    agent-integration/          (moved from api/agent-integration/)
    settings/                   (existing — no changes)
    asx-scoring/                (moved from shopy/getting-started/)
    skill-publishing/           (new — merged from shopy/skill-format + taxonomy + agent-integration)
    cli-tools/                  (moved from shopy/cli/)
    site/                       (existing — no changes)
```

Root `docs/` folder is deleted after the move.

### Import Path Updates

Every file that imports from `@/docs/content/sections` → `@/app/docs/content/sections`:

| File | Change |
|------|--------|
| `app/docs/layout.tsx` | `@/docs/content/sections` → `@/app/docs/content/sections` |
| `app/docs/page.tsx` | same |
| `app/docs/[...slug]/page.tsx` | same |
| `app/api/docs/[...slug]/route.ts` | same |
| `app/llms.txt/route.ts` | same |
| `app/llms-full.txt/route.ts` | same |
| `app/sitemap.ts` | same |

### File-System Read Path Updates

Three files read `.md` from disk with `path.join(process.cwd(), "docs", "content", ...)`. Change to `path.join(process.cwd(), "app", "docs", "content", ...)`:

| File | Line |
|------|------|
| `app/docs/[...slug]/page.tsx` | Line 47: `path.join(process.cwd(), "docs", "content", ...)` |
| `app/api/docs/[...slug]/route.ts` | Lines 15, 38: same pattern |
| `app/llms-full.txt/route.ts` | Line 18: same pattern |

### CSS Source Update

`app/globals.css` line 5: `@source "../docs"` → **remove** (already covered by `@source "../app"` since `docs/content/sections.ts` moves into `app/`).

---

## Markdown File Moves

### Files That Move Into Existing Section Folders

| Source | Destination | New section |
|--------|------------|-------------|
| `api/introduction.md` | `getting-started/api-introduction.md` | Getting Started |
| `api/authentication.md` | `getting-started/authentication.md` | Getting Started |
| `api/endpoints/bots.md` | `bots/api-reference.md` | Bots & Onboarding |
| `api/webhooks/setup.md` | `bots/webhook-setup.md` | Bots & Onboarding |
| `api/webhooks/events.md` | `bots/webhook-events.md` | Bots & Onboarding |
| `api/webhooks/tunnels.md` | `bots/webhook-tunnels.md` | Bots & Onboarding |
| `api/endpoints/wallets.md` | `wallets/api-reference.md` | Wallets & Funding |
| `api/endpoints/checkout-pages.md` | `selling/checkout-api-reference.md` | Selling |
| `api/endpoints/invoices.md` | `selling/invoice-api-reference.md` | Selling |
| `api/endpoints/sales.md` | `selling/sales-api-reference.md` | Selling |
| `api/endpoints/skills.md` | `skills/api-reference.md` | Procurement Skills |
| `api/endpoints/scan.md` | `skills/scan-api-reference.md` | Procurement Skills |

### Files That Move Into New Folders

| Source | Destination | New section |
|--------|------------|-------------|
| `api/agent-integration/quick-start.md` | `agent-integration/quick-start.md` | Agent Integration |
| `api/agent-integration/x402-protocol.md` | `agent-integration/x402-protocol.md` | Agent Integration |
| `api/agent-integration/mcp.md` | `agent-integration/mcp.md` | Agent Integration |
| `shopy/getting-started/what-is-shopy.md` | `asx-scoring/what-is-shopy.md` | Agentic Shopping (ASX) Scoring |
| `shopy/getting-started/asx-score-explained.md` | `asx-scoring/asx-score-explained.md` | Agentic Shopping (ASX) Scoring |
| `shopy/skill-format/structure.md` | `skill-publishing/structure.md` | Skill Publishing |
| `shopy/skill-format/frontmatter.md` | `skill-publishing/frontmatter.md` | Skill Publishing |
| `shopy/taxonomy/sectors.md` | `skill-publishing/sectors.md` | Skill Publishing |
| `shopy/agent-integration/reading-skills.md` | `skill-publishing/reading-skills.md` | Skill Publishing |
| `shopy/agent-integration/feedback-protocol.md` | `skill-publishing/feedback-protocol.md` | Skill Publishing |
| `shopy/cli/installation.md` | `cli-tools/installation.md` | CLI Tools |
| `shopy/cli/commands.md` | `cli-tools/commands.md` | CLI Tools |

### Folders Deleted After Move

- `api/` (all files redistributed)
- `shopy/` (all files redistributed)

### Files That Stay Put

All files in: `getting-started/`, `bots/` (existing 4 files), `wallets/` (existing 5 files), `guardrails/`, `selling/` (existing 5 files), `settings/`, `transactions/`, `skills/` (existing 4 files), `site/`.

---

## New `sections.ts`

Complete rewrite. Exports:

```typescript
// Types
export interface DocPage { title: string; slug: string; }
export interface DocSection { title: string; slug: string; tag?: string; pages: DocPage[]; }

// Data
export const sections: DocSection[];

// Helpers (kept)
export function findPage(slugParts: string[]): { section: DocSection; page: DocPage; pageIndex: number } | null;
export function getAllPagesFlat(): { section: DocSection; page: DocPage; path: string }[];
export const sitePages: { title: string; slug: string; file: string; url: string }[];

// Removed
// - Audience type
// - DocTenant type  
// - getSectionsByAudience()
// - getAudienceFromSlug()
// - getTenantFromSlug()
// - normalizeTenantId()
```

`getAllPagesFlat()` takes no arguments — returns every page across every section in display order. This powers prev/next navigation.

`findPage()` is unchanged — still matches slug parts against section slugs.

`sitePages` stays — still used by `llms.txt` and the raw markdown API.

---

## `llms.txt` and `llms-full.txt` Updates

### `app/llms.txt/route.ts`

Currently splits output into "User Guide" and "Developer Documentation" headings using `getSectionsByAudience()`. Replace with a single "Documentation" heading that lists all sections:

```typescript
// Before
const userSections = getSectionsByAudience("user");
const devSections = getSectionsByAudience("developer");
// ... two separate loops

// After
import { sections } from "@/app/docs/content/sections";
// ... one loop over sections
```

### `app/llms-full.txt/route.ts`

Import path change only. Already iterates over all `sections` without audience filtering.

---

## `app/sitemap.ts` Update

Import path change only. Already iterates over all `sections` without filtering.

---

## Tenant Config Updates

### `lib/tenants/types.ts`

Add to `TenantConfig`:
```typescript
docsEntrySlug?: string;
```

### `lib/tenants/tenant-configs.ts`

Add `docsEntrySlug` to each tenant config:
- CreditClaw: `docsEntrySlug: "getting-started/what-is-creditclaw"`
- shopy.sh: `docsEntrySlug: "asx-scoring/what-is-shopy"`
- brands.sh: `docsEntrySlug: "skill-publishing/structure"`

Update nav links that currently point to `/docs` to use the entry slug:
- CreditClaw footer "Documentation": `/docs` → `/docs/getting-started/what-is-creditclaw`
- CreditClaw footer "Developer": `/docs/api/introduction` → `/docs/getting-started/api-introduction`
- shopy.sh footer "Documentation": `/docs` → `/docs/asx-scoring/what-is-shopy`
- shopy.sh footer "CLI Reference": `/docs/shopy/cli/installation` → `/docs/cli-tools/installation`
- shopy.sh footer "Skill Format": `/docs/shopy/skill-format/structure` → `/docs/skill-publishing/structure`
- brands.sh header "Docs": `/docs` → `/docs/skill-publishing/structure`
- brands.sh footer "API Reference": `/docs/api/introduction` → `/docs/getting-started/api-introduction`
- brands.sh footer "SKILL.md Standard": `/docs` → `/docs/skill-publishing/structure`
- brands.sh footer "CLI": `/docs` → `/docs/cli-tools/installation`

---

## Content Edits (Markdown)

Most markdown stays as-is. Minor edits needed:

1. **API reference pages that move into user sections**: Add a one-line intro like `> This section covers the API endpoints for wallet operations.` at the top, so they don't feel jarring after user-friendly pages.
2. **Cross-references**: Any markdown that says "see the Developer documentation" or "switch to the Developer tab" needs updating since there's no longer a separate track. Search for links containing `/docs/api/` and update to new slugs.
3. **ASX Score page in skills section**: Rename title from "ASX Score" to "Agentic Shopping (ASX) Score".

---

## Migration Steps (Ordered)

### Phase 1: File Structure
1. Create `app/docs/content/` directory
2. Copy all existing section folders from `docs/content/` to `app/docs/content/` (getting-started, bots, wallets, guardrails, selling, settings, transactions, skills, site)
3. Move and rename API files into their new section folders per the move table above
4. Move and rename shopy files into new section folders per the move table above
5. Create new folders: `agent-integration/`, `asx-scoring/`, `skill-publishing/`, `cli-tools/`
6. Delete old `docs/` root folder

### Phase 2: sections.ts Rewrite
7. Write new `app/docs/content/sections.ts` with flat section list, `tag` field, no `audience`/`tenant` fields
8. Remove `getSectionsByAudience()`, `getAudienceFromSlug()`, `getTenantFromSlug()`, `normalizeTenantId()`
9. Simplify `getAllPagesFlat()` to take no arguments
10. Keep `findPage()` and `sitePages` unchanged

### Phase 3: Consumer Updates
11. Update `app/docs/layout.tsx` — remove audience toggle, render tags, render all sections
12. Update `app/docs/page.tsx` — use tenant config `docsEntrySlug` for redirect
13. Update `app/docs/[...slug]/page.tsx` — fix import path, fix fs read path, simplify prev/next
14. Update `app/api/docs/[...slug]/route.ts` — fix import path, fix fs read path
15. Update `app/llms.txt/route.ts` — fix import path, single "Documentation" heading
16. Update `app/llms-full.txt/route.ts` — fix import path, fix fs read path
17. Update `app/sitemap.ts` — fix import path
18. Update `app/globals.css` — remove `@source "../docs"` line

### Phase 4: Tenant Config
19. Add `docsEntrySlug` to `TenantConfig` type
20. Add `docsEntrySlug` values to all three tenant configs
21. Update nav links in tenant configs to new doc slugs

### Phase 5: Content Polish
22. Add intro lines to API reference markdown files
23. Update cross-references in markdown (search for `/docs/api/` links)
24. Rename "ASX Score" to "Agentic Shopping (ASX) Score" in the skills section page

### Phase 6: Verify
25. Start dev server — confirm no import errors
26. Navigate through all sidebar sections — confirm pages render
27. Test prev/next navigation across section boundaries
28. Test `/docs` redirect per tenant (cookie-based)
29. Test `/llms.txt` and `/llms-full.txt` output
30. Test `/api/docs/...` raw markdown endpoint
31. Test sitemap includes all new URLs
