---
name: brands.sh Identity
description: brands.sh product identity, branding, and tenant-specific implementation details.
---

# brands.sh

## Purpose

Developer-facing skill registry — "npm for AI shopping agents." Hosts SKILL.md files that teach agents how to browse and buy from specific stores. The registry grows automatically as merchants are scanned.

## Audience

Developers and AI agent builders who need machine-readable shopping instructions for their agents.

## Branding

- **Name:** brands.sh
- **Tagline:** "The skill registry for AI shopping agents."
- **Logo:** `/tenants/brands/images/logo.png`
- **Emoji:** 📦

## Theme

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

## Key Features

- Skill catalog (`/skills`) — browsable registry
- Skill detail pages (`/skills/[vendor]`) — SKILL.md + skill.json + score breakdown
- Sector pages (`/c/[sector]`) — brands grouped by sector
- Skill submission (`/skills/submit`)
- Registry API (`/api/v1/registry`)
- CLI distribution (`npx shopy add <brand>`) — planned, not yet built

## Tenant-Specific Routes

- `/skills` — registry catalog
- `/skills/[vendor]` — individual skill page
- `/skills/submit` — submit a new brand
- `/c/[sector]` — sector landing pages

## Key Files

| File | Purpose |
|------|---------|
| `components/tenants/brands/landing.tsx` | Landing page with registry table |
| `lib/tenants/tenant-configs.ts` | Tenant config (brands section) |
| `public/tenants/brands/config.json` | Dynamic config |
| `app/api/v1/registry/` | Registry API routes |
