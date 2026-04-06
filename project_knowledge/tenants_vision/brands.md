---
name: brands.sh — Vision, Identity & Brand
description: Everything about brands.sh in one place — product vision, branding, design language, and key files. Tier 3 protected.
---

# brands.sh

## Vision

Developer-facing skill registry — "npm for AI shopping agents." Hosts SKILL.md files that teach agents how to browse and buy from specific stores. The registry grows automatically as merchants are scanned on shopy.sh.

- Searchable registry of merchant skills
- Machine-readable skill.json for programmatic discovery
- Registry API for agent platforms to query
- CLI distribution (`npx shopy add <brand>`) — planned, not yet built

## How It Feeds the Flywheel

1. Merchant gets scanned on **shopy.sh** → SKILL.md generated
2. Skill published to **brands.sh** registry
3. Agent developers find and install skills → agents shop at those stores
4. More agents shopping → more feedback → better AXS Ratings → more merchants discover the ecosystem

## Identity

- **Name:** brands.sh
- **Tagline:** "The skill registry for AI shopping agents."
- **Logo:** `/tenants/brands/images/logo.png`
- **Emoji:** 📦
- **Audience:** developers and AI agent builders who need machine-readable shopping instructions

## Design Language

Dark, terminal-influenced, data-forward. CLI aesthetic.

| Token | Value |
|-------|-------|
| Primary | `hsl(220 15% 15%)` — deep dark blue-grey |
| Accent | `hsl(220 10% 30%)` — muted blue-grey |
| Secondary | `hsl(220 8% 50%)` — steel grey |
| Mode | Dark (`bg-neutral-950`) |

## Landing Page

`components/tenants/brands/landing.tsx`

- CLI hint (`npx shopy add <brand>`)
- Searchable, filterable brand registry table (Sector + Tier columns)
- "Create Skill" domain scanner
- Terminal/CLI aesthetic
- No ScoreBadge — scores live on shopy.sh
- Imports shared label maps from `lib/procurement-skills/taxonomy/`

## Skill Detail Pages

`app/skills/[vendor]/page.tsx` — ISR-enabled (`revalidate=3600`).
- Shows SKILL.md + skill.json + score breakdown
- Null-safe — gracefully renders when `brandData` is missing, falls back to `brand.*` fields
- Sections (search/checkout/shipping/deals/tips) only render when vendor data exists
- Skill preview panel with expand/collapse + download
- Brand claim button, copy skill URL

## Routes

- `/skills` — registry catalog (hybrid SSR, initial 50 brands + facets)
- `/skills/[vendor]` — individual skill page
- `/skills/submit` — submit a new brand for scanning
- `/c/[sector]` — sector landing pages (only sectors with published brands)
- `/api/v1/registry` — registry API

## Key Files

| File | Purpose |
|------|---------|
| `components/tenants/brands/landing.tsx` | Landing page with registry table |
| `components/tenants/brands/how-it-works.tsx` | How it works page |
| `app/skills/[vendor]/page.tsx` | Skill detail page (SSR) |
| `app/skills/page.tsx` | Catalog page (hybrid SSR) |
| `app/skills/vendor-card.tsx` | Shared vendor card component |
| `app/skills/catalog-client.tsx` | Client-side catalog with filtering |
| `app/c/[sector]/page.tsx` | Sector landing pages |
| `lib/tenants/tenant-configs.ts` | Tenant config (brands section) |
| `public/tenants/brands/config.json` | Dynamic config |
| `app/api/v1/registry/` | Registry API routes |
