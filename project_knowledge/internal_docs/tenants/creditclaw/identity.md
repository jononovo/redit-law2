---
name: CreditClaw Identity
description: CreditClaw's product identity, branding, and tenant-specific implementation details.
---

# CreditClaw

## Purpose

Financial infrastructure for AI agents. Human owners fund a wallet, the platform issues virtual Visa/Mastercard that bots use at any online merchant. Spending limits and guardrails give owners control.

## Audience

Consumers and bot owners who want their AI agents to make purchases autonomously but with safety rails.

## Branding

- **Name:** CreditClaw
- **Tagline:** "Pocket money for your bots!"
- **Logo:** `/assets/images/logo-claw-chip.png`
- **Mascot:** `/assets/images/hero-claw.png`
- **Emoji:** 🦞

## Theme

| Token | Value |
|-------|-------|
| Primary | `hsl(10 85% 55%)` — vibrant orange/red |
| Accent | `hsl(260 90% 65%)` — purple |
| Secondary | `hsl(200 95% 60%)` — blue |
| Mode | Light |

## Landing Page

`components/tenants/creditclaw/landing.tsx`

- Hero section with mascot
- Bot signup section
- Live metrics (total spent, active bots)
- Feature list
- Waitlist form

## Key Features

- Card wallet (virtual card issuance)
- Stripe wallet (funding)
- Transaction history
- Bot management and onboarding
- Spending permissions and guardrails

## Tenant-Specific Routes

- `/how-it-works`
- `/allowance`
- `/safety`
- `/cards`, `/transactions`, `/settings` (shared but core to CreditClaw)

## Key Files

| File | Purpose |
|------|---------|
| `components/tenants/creditclaw/landing.tsx` | Landing page |
| `lib/tenants/tenant-configs.ts` | Tenant config (CreditClaw section) |
| `public/tenants/creditclaw/config.json` | Dynamic config |
| `docs/content/sections.ts` | Doc sections filtered by tenant |
