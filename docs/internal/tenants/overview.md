---
name: Tenant Overview
description: Quick reference for all three tenants — purpose, audience, style. Read this before working on any tenant-specific feature or branding.
---

# Tenant Overview

One codebase, three products. Each tenant has its own domain, audience, visual identity, and feature set. They share the same database and infrastructure (see `platform/multitenant-system.md`).

---

## CreditClaw

- **Domain:** `creditclaw.com`
- **Audience:** Consumers / bot owners
- **Purpose:** Financial rails for AI agents. Virtual card issuance, wallet funding, spending limits.
- **Tagline:** "Pocket money for your bots!"
- **Style:** Vibrant, playful. Primary orange/red, accent purple, secondary blue. Light theme. Mascot-driven landing.
- **Key features:** Card wallet, Stripe wallet, transactions, bot management, spending guardrails
- **Docs:** User docs (27 pages), developer docs (13 pages)
- **Detail:** `creditclaw/`

## shopy.sh

- **Domain:** `shopy.sh`
- **Audience:** Merchants
- **Purpose:** Measures how "agent-friendly" a store is. Free ASX Score scanner drives catalog growth.
- **Tagline:** "Make your store shoppable by AI agents."
- **Style:** Minimalist, clean. Near-black primary, grey accents. Light theme. Scanner-centric landing.
- **Key features:** ASX Score scanner, merchant guide, agentic commerce standard, recent scores leaderboard
- **Docs:** 8 pages (getting started, CLI, skill format, agent integration)
- **Detail:** `shopy/`

## brands.sh

- **Domain:** `brands.sh`
- **Audience:** Developers / AI agent builders
- **Purpose:** Skill registry — "npm for AI shopping agents." Hosts SKILL.md files that teach agents how to shop.
- **Tagline:** "The skill registry for AI shopping agents."
- **Style:** Terminal/CLI aesthetic. Deep dark blue-grey, muted accents. Dark theme (`bg-neutral-950`). Developer-centric.
- **Key features:** Searchable skill catalog, skill submission, registry API, CLI (`npx shopy add`)
- **Docs:** Served through shopy.sh docs
- **Detail:** `brands/`

---

## Feature Flags by Tenant

| Feature | CreditClaw | shopy.sh | brands.sh |
|---------|-----------|----------|-----------|
| showCatalog | No | No | Yes |
| showScanner | No | Yes | No |
| showStandard | No | Yes | No |
| showGuide | No | Yes | No |
| showLeaderboard | No | No | Yes |

---

## Design Rules (all tenants)

- No `rounded-xl`, `rounded-2xl`, or `rounded-lg` — keep corners tight
- No shadows
- `useTenant()` is client-side only — never call in server components
- Dark backgrounds use `bg-neutral-950`
