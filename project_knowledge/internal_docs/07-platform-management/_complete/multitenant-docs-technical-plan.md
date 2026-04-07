# Multi-Tenant Documentation System — Technical Plan

**Status:** Proposed  
**Priority:** High — part of Step 3 completion  
**Depends on:** None (multitenant system is done)

---

## Problem

The current `/docs` system is 100% CreditClaw-specific:
- `app/docs/layout.tsx` has hardcoded CreditClaw logo and branding
- `docs/content/sections.ts` defines CreditClaw-only sections (Wallets, Bots, Guardrails, etc.)
- All markdown content in `docs/content/` is CreditClaw product documentation
- When a shopy.sh user clicks "CLI Reference" or "API" in the footer, they land on CreditClaw docs with CreditClaw's logo — wrong tenant experience

The system needs to serve different documentation per tenant while sharing the same rendering infrastructure.

---

## Current Architecture

```
app/docs/
  layout.tsx          ← Client component, sidebar + mobile drawer
  page.tsx            ← Redirects to first section's first page
  [...slug]/
    page.tsx          ← Server component, reads markdown, renders
    doc-renderer.tsx  ← Client wrapper around react-markdown
    copy-markdown-button.tsx

docs/content/
  sections.ts         ← Defines all sections, audience filtering, page lookup
  getting-started/    ← CreditClaw user docs
  bots/
  wallets/
  guardrails/
  selling/
  settings/
  transactions/
  skills/
  api/                ← CreditClaw developer docs
    introduction.md
    authentication.md
    endpoints/
    webhooks/
    agent-integration/
  site/               ← Static site page content
```

**Key code patterns:**
- `sections.ts` exports a `DocSection[]` array with `audience: "user" | "developer"` for filtering
- Layout renders a sidebar with audience tabs ("User Guide" / "Developers")
- `[...slug]/page.tsx` reads markdown from `docs/content/{section.slug}/{page.slug}.md`
- All routing is driven by the sections array — `generateStaticParams()` builds routes from it

---

## Proposed Architecture

### Content Organization

Add a `tenant` field to each `DocSection`. Sections without a tenant (or `tenant: "shared"`) are visible to all tenants. Tenant-specific sections only appear when that tenant is active.

```
docs/content/
  sections.ts                ← Add tenant field to DocSection type

  # CreditClaw-only sections (existing, unchanged)
  getting-started/
  bots/
  wallets/
  guardrails/
  selling/
  settings/
  transactions/
  skills/
  api/

  # Shopy-only sections (new)
  shopy/
    getting-started/
      what-is-shopy.md
      asx-score-explained.md
    cli/
      installation.md
      commands.md
    registry-api/
      overview.md
      endpoints.md
    agent-integration/
      reading-skills.md
      feedback-protocol.md
```

### Schema Change: `DocSection`

```typescript
export type Tenant = "creditclaw" | "shopy" | "brands" | "shared";

export interface DocSection {
  title: string;
  slug: string;
  audience: Audience;
  tenant: Tenant;       // NEW — which tenant sees this section
  pages: DocPage[];
}
```

All existing CreditClaw sections get `tenant: "creditclaw"`. New shopy sections get `tenant: "shopy"`. Sections that both tenants should see (e.g., a future "API Authentication" section) get `tenant: "shared"`.

### Section Filtering

Update `getSectionsByAudience()` to also filter by tenant:

```typescript
export function getSections(audience: Audience, tenant: Tenant): DocSection[] {
  return sections.filter(
    (s) => s.audience === audience && (s.tenant === tenant || s.tenant === "shared")
  );
}
```

### Layout Tenant-Awareness

`app/docs/layout.tsx` currently hardcodes:
- CreditClaw logo (`/assets/images/logo-claw-chip.png`)
- "CreditClaw" text label
- Audience tabs ("User Guide" / "Developers")

**Changes:**
1. Read the tenant ID from the `tenant-id` cookie (already set by middleware)
2. Load tenant config from `public/tenants/{tenantId}/config.json`
3. Swap logo, name, and audience tab labels based on tenant
4. Filter sidebar sections by tenant

For shopy.sh, the audience tabs become:
- "For Merchants" (audience: "user") — what shopy is, ASX Score explained
- "For Developers" (audience: "developer") — CLI, registry API, agent integration

### Page-Level Tenant Routing

The `[...slug]/page.tsx` server component reads markdown from disk. For shopy sections, the content lives under `docs/content/shopy/`. The slug routing already handles this since the section slug includes the `shopy/` prefix:

```typescript
// Section: { slug: "shopy/getting-started", ... }
// URL: /docs/shopy/getting-started/what-is-shopy
// File: docs/content/shopy/getting-started/what-is-shopy.md
```

No changes needed to the `[...slug]/page.tsx` page component — the existing `findPage()` and file path resolution already support nested slugs.

### Index Page Redirect

`app/docs/page.tsx` redirects to the first section's first page. This needs to become tenant-aware so shopy visitors land on shopy's first doc page, not CreditClaw's.

```typescript
export default function DocsIndexPage() {
  const tenantId = getTenantFromCookies(); // or from headers
  const firstSection = getSections("user", tenantId)[0] 
                    || getSections("developer", tenantId)[0];
  // redirect to first page...
}
```

**Issue:** This is currently a server component. Getting the tenant ID from cookies in a server component requires `cookies()` from `next/headers`. This is fine for server components but requires `dynamic = 'force-dynamic'` or similar to prevent static generation from caching the wrong tenant's redirect.

---

## Shopy Documentation Content Plan

The shopy.sh docs should cover the core functions of the tenant — what shopy is, how developers and agents interact with it.

### For Merchants (audience: "user")

| Section | Pages |
|---|---|
| **Getting Started** | What is shopy.sh, Understanding Your ASX Score |
| **The Standard** | Overview of the agentic commerce standard (links to `/standard` for full spec) |
| **Improving Your Score** | Structured data, checkout flows, search optimization, bot tolerance |

### For Developers / Agents (audience: "developer")

| Section | Pages |
|---|---|
| **CLI** | Installation (`npx shopy`), Commands reference (add, search, update, list) |
| **Registry API** | Overview, Search endpoint, Download endpoint, Version manifests |
| **Skill Format** | SKILL.md structure, Commerce frontmatter fields, Validation |
| **Agent Integration** | Reading skills, Feedback protocol, ASX Score in skill selection |

### Content Strategy

- **Keep it focused.** Shopy docs cover ONLY shopy.sh functionality — the standard, the CLI, the registry, and the catalog. No CreditClaw product features (wallets, bots, guardrails, checkout pages).
- **Cross-link sparingly.** A shopy doc page can link to `/standard` (the spec page) or `/skills` (the catalog). It should NOT link to CreditClaw docs pages.
- **Tone:** Technical, authoritative, developer-first. Matches the shopy brand — mono aesthetic, sharp, no marketing fluff.

---

## Implementation Plan

### Phase 1: Schema + Layout (infrastructure)

1. Add `tenant: Tenant` to `DocSection` interface in `sections.ts`
2. Add `tenant: "creditclaw"` to all existing sections
3. Update `getSectionsByAudience()` → `getSections(audience, tenant)`
4. Make `layout.tsx` tenant-aware (read cookie, swap logo/name, filter sections)
5. Make `page.tsx` (index redirect) tenant-aware
6. Verify CreditClaw docs still work identically — zero visual change

### Phase 2: Shopy Content

1. Create `docs/content/shopy/` directory structure
2. Write shopy doc pages (markdown files)
3. Add shopy sections to `sections.ts` with `tenant: "shopy"`
4. Verify shopy docs render correctly with shopy branding

### Phase 3: Nav Integration

1. Update `public/tenants/shopy/config.json` — point "Docs" footer link to `/docs`
2. Add "Docs" to shopy header nav links
3. Verify the docs sidebar shows only shopy sections when accessed from shopy.sh

---

## Files Changed

| File | Change |
|---|---|
| `docs/content/sections.ts` | Add `Tenant` type, add `tenant` field, update filter functions |
| `app/docs/layout.tsx` | Read tenant cookie, swap branding, pass tenant to sidebar filter |
| `app/docs/page.tsx` | Tenant-aware first-page redirect |
| `docs/content/shopy/` (new directory tree) | All shopy markdown content files |
| `public/tenants/shopy/config.json` | Update docs nav links |

---

## Risk Assessment

| Risk | Mitigation |
|---|---|
| Breaking existing CreditClaw docs | Phase 1 adds `tenant: "creditclaw"` to existing sections — no content changes, just metadata |
| Static generation caching wrong tenant | Use `dynamic = 'force-dynamic'` on the docs index redirect, or rely on middleware setting the header (already works for other pages) |
| Slug collisions between tenants | Shopy slugs are prefixed with `shopy/` — no collision possible with existing creditclaw slugs |
| Cookie-based tenant in client layout | The docs layout is already a `"use client"` component. Reading cookies client-side via `document.cookie` or a context provider works. The `TenantProvider` context likely already exists and can be used. |

---

## Open Questions

1. **Should `brands.sh` also get docs?** Not now — brands.sh is a catalog/discovery tenant. Its docs needs are minimal. Can be added later using the same `tenant` field pattern.
2. **Should shopy docs use a different prose style?** The existing prose classes on the doc renderer work well. The shopy aesthetic difference (sharp corners, mono) is mostly in the layout/sidebar, not the markdown content itself. Code blocks and tables already look clean in the current prose styling.
3. **Shared sections?** Some content (e.g., "API Authentication") might apply to both CreditClaw and shopy. Use `tenant: "shared"` for these. None needed for v1 — keep tenants fully separate initially.
