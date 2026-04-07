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

---

## Proposed Structure

One flat list of sections in the sidebar. Developer content is folded into the sections it belongs to, as deeper pages within those sections. Tenant-specific sections are labeled with a tag but named by what they cover, not by the tenant name.

### Unified Sections

```
1. Getting Started
   - What is CreditClaw
   - Creating an Account
   - Dashboard Overview
   - API Introduction          ← moved from developer track
   - Authentication            ← moved from developer track

2. Bots & Onboarding
   - Onboarding Wizard
   - Claiming a Bot
   - Managing Your Bots
   - Webhook Health
   - Webhook Setup & Signing   ← merged from api/webhooks/setup
   - Webhook Events            ← merged from api/webhooks/events
   - Webhook Tunnels           ← merged from api/webhooks/tunnels
   - Bot API Reference         ← merged from api/endpoints/bots

3. Wallets & Funding
   - Wallet Types
   - Creating a Wallet
   - Funding Your Wallet
   - Encrypted Cards
   - Freezing & Controls
   - Wallet API Reference      ← merged from api/endpoints/wallets

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
   - Checkout API Reference    ← merged from api/endpoints/checkout-pages
   - Invoice API Reference     ← merged from api/endpoints/invoices
   - Sales API Reference       ← merged from api/endpoints/sales

6. Transactions & Orders
   - Viewing Transactions
   - Orders & Shipping

7. Procurement Skills
   - What Are Skills
   - ASX Score
   - Browsing the Supplier Hub
   - Submitting a Supplier
   - Skills API Reference      ← merged from api/endpoints/skills
   - Scan API Reference        ← merged from api/endpoints/scan

8. Agent Integration
   - Quick Start               ← moved from developer track
   - x402 Protocol             ← moved from developer track
   - MCP Integration           ← moved from developer track

9. Settings
   - Seller Identity
   - Account Settings

10. ASX Scoring [shopy]
    - What is shopy.sh
    - ASX Score Explained

11. Skill Publishing [shopy]
    - SKILL.md Structure        ← from shopy/skill-format
    - Commerce Frontmatter      ← from shopy/skill-format
    - Taxonomy & Sectors        ← from shopy/taxonomy
    - Reading Skills            ← from shopy/agent-integration
    - Feedback Protocol         ← from shopy/agent-integration

12. CLI Tools [shopy]
    - Installation              ← from shopy/cli
    - Commands                  ← from shopy/cli
```

### What Changes

**Merged into parent sections (no longer standalone)**:
- `api/introduction` + `api/authentication` → pages in "Getting Started"
- `api/endpoints/*` → "API Reference" pages at the bottom of each relevant section
- `api/webhooks/*` → pages in "Bots & Onboarding" (webhooks are bot-facing)
- `api/agent-integration/*` → stays as its own section (it's cross-cutting, doesn't fit neatly into one parent)

**Shopy sections renamed by topic, not by tenant**:
- "shopy/getting-started" → "ASX Scoring" (that's what shopy is known for)
- "shopy/cli" → "CLI Tools"
- "shopy/skill-format" + "shopy/taxonomy" + "shopy/agent-integration" → "Skill Publishing"
- Tagged with `[shopy]` in sidebar (visual label, not a URL prefix)

**Removed**:
- `audience` field on `DocSection` — no longer needed
- User Guide / Developers toggle in sidebar — gone
- `getSectionsByAudience()` — gone
- `getAudienceFromSlug()` — simplified or removed

---

## Tenant Entry Points

Add a `docsEntrySlug` field to `TenantConfig` in `lib/tenants/types.ts`:

```typescript
docsEntrySlug?: string;
```

Values:
- CreditClaw: `"getting-started/what-is-creditclaw"`
- shopy.sh: `"asx-scoring/what-is-shopy"`
- brands.sh: `"skill-publishing/structure"` (or wherever brands docs land)

When a tenant's site links to "Documentation", it goes to `/docs/{docsEntrySlug}` instead of always `/docs`.

---

## Sidebar Changes

### Section Tags

Sections that are tenant-specific get a small visual tag (pill/badge) in the sidebar:

```typescript
interface DocSection {
  title: string;
  slug: string;
  tag?: string;        // e.g. "shopy" — displayed as a small label
  pages: DocPage[];
}
```

No filtering — all sections always visible. The tag is just informational ("this section is about shopy.sh stuff").

### No More Audience Toggle

The sidebar header drops the "User Guide" / "Developers" toggle. Just the logo, "Docs" link, and the flat section list.

---

## File Moves

Move `docs/content/` into `app/docs/content/` so all doc-site code lives together:

```
app/docs/
  layout.tsx
  page.tsx
  [...slug]/page.tsx
  content/
    sections.ts
    getting-started/
    bots/
    wallets/
    ...
```

Update imports:
- `@/docs/content/sections` → `@/app/docs/content/sections`
- `globals.css` `@source "../docs"` → remove (already covered by `@source "../app"`)
- File-reading paths in `[...slug]/page.tsx`

---

## Content Edits

Most markdown files stay as-is. The only content changes:

1. **API endpoint pages** may need a brief intro line added since they'll now appear after user-friendly pages in the same section (e.g. "The following is the API reference for wallet operations.")
2. **Shopy getting-started pages** — no content changes, just moved to new section slug
3. **Remove any "see the developer docs for..." cross-references** that won't make sense when everything is in one flow

---

## Migration Steps

1. Move `docs/content/` → `app/docs/content/`
2. Update `sections.ts` — new flat section list, remove `audience` field, add `tag` field
3. Update `app/docs/layout.tsx` — remove audience toggle, render tags, simplify sidebar
4. Update `app/docs/[...slug]/page.tsx` — fix content directory path
5. Update `globals.css` — remove `@source "../docs"`
6. Update `lib/tenants/types.ts` and `tenant-configs.ts` — add `docsEntrySlug`
7. Rename/move markdown files to match new section slugs (shopy files drop the `shopy/` prefix in their folder path)
8. Update any internal cross-references in markdown content
9. Light content edits for API reference pages (add intro lines)
10. Remove `audience`-related helper functions from `sections.ts`
