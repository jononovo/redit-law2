---
name: shopy.sh Identity
description: shopy.sh product identity, branding, and tenant-specific implementation details.
---

# shopy.sh

## Purpose

Merchant-facing tool that measures how "agent-friendly" a store is. The ASX Score scanner is the primary growth engine — every scan creates or updates a brand in the catalog.

## Audience

Merchants and store owners who want to understand and improve their AI-readiness.

## Branding

- **Name:** shopy.sh
- **Tagline:** "Make your store shoppable by AI agents."
- **Logo:** Shared chip logo with shopping cart emoji (🛒)

## Theme

| Token | Value |
|-------|-------|
| Primary | `hsl(0 0% 9%)` — near-black |
| Accent | `hsl(0 0% 20%)` — dark grey |
| Secondary | `hsl(0 0% 45%)` — grey |
| Mode | Light (minimal, clean) |

## Landing Page

`components/tenants/shopy/landing.tsx`

- Prominent ASX Score search bar
- Recent scores leaderboard (brand domains + scores)

## Key Features

- ASX Score scanner (`/agentic-shopping-score`)
- Agentic commerce standard (`/standard`)
- Merchant guide (`/guide`)
- Scoring methodology (`/axs`)

## Tenant-Specific Routes

- `/agentic-shopping-score` — scanner
- `/standard` — technical spec
- `/guide` — merchant guide
- `/axs` — scoring methodology

## Docs

8 pages: Getting Started (what-is-shopy, asx-score-explained), CLI (installation, commands), Skill Format (structure, frontmatter), Agent Integration (reading-skills, feedback-protocol).

URL prefix: `/docs/shopy/...`

## Key Files

| File | Purpose |
|------|---------|
| `components/tenants/shopy/landing.tsx` | Landing page |
| `lib/tenants/tenant-configs.ts` | Tenant config (shopy section) |
| `public/tenants/shopy/config.json` | Dynamic config |
