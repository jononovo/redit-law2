---
name: CreditClaw — Vision, Identity & Brand
description: Everything about CreditClaw in one place — product vision, positioning, branding, design language, ecosystem context, and key files. Tier 3 protected.
---

# CreditClaw

## Vision

Financial rails for AI agents. Agents can't hold bank accounts — CreditClaw bridges that gap.

- Human owners fund wallets, set spending limits
- Platform issues virtual Visa/Mastercard for bot purchases
- Agents spend at any online merchant — no merchant integration needed
- Granular guardrails: per-transaction limits, category blocking, approval modes
- Bot-first registration: bots sign up with a claim token, human links later

**What CreditClaw is not:** not a credit line (that's ClawCredit), not a crypto service, not a payment processor between bots. We never store card details (Stripe does).

**Positioning:** the connective tissue between merchants and AI agents. Card-based = universal. Works at any merchant, any platform. No merchant integration required.

## The Flywheel

1. **shopy.sh** scans merchants → scores them → generates SKILL.md files
2. **brands.sh** hosts those skills → agents discover merchants
3. **CreditClaw** gives agents the money to shop there
4. More transactions → more data → better recommendations → more merchants scanned

## Identity

- **Name:** CreditClaw
- **Tagline:** "Pocket money for your bots!"
- **Logo:** `/assets/images/logo-claw-chip.png`
- **Mascot:** `/assets/images/hero-claw.png` (coral lobster, 3D clay/claymation)
- **Emoji:** 🦞
- **Audience:** Consumers and bot owners who want AI agents to purchase autonomously with safety rails

## Design Language

**"Fun Consumer"** — playful, approachable, modern fintech without cold corporate feel.

**Visual style:** Soft Clay 3D, rounded geometry, vibrant pastels, claymation texture, isometric views.

**Typography:**
- `Plus Jakarta Sans` — Bold/ExtraBold for headings, Regular/Medium for body
- `JetBrains Mono` — transaction IDs, code snippets, technical data

**Colors:**

| Name | Value | Usage |
|------|-------|-------|
| Lobster Orange | `hsl(10 85% 55%)` | Primary actions, brand accents |
| Ocean Blue | `hsl(200 95% 60%)` | Secondary actions, trust indicators |
| Fun Purple | `hsl(260 90% 65%)` | Accents, gradients, "magic" moments |
| Deep Navy | `hsl(222 47% 11%)` | Primary text, strong contrast |
| Soft Cloud | `hsl(210 40% 98%)` | Page backgrounds |
| Success Green | `hsl(142 71% 45%)` | Validation success, enabled states |

**UI rules:**
- `1rem` / `16px` rounded corners on buttons, cards, inputs
- Soft colorful shadows + `backdrop-blur-md` for depth
- Glassmorphism on nav bars and floating elements
- Grainy noise-textured gradients (Orange → Blue → Purple) for section backgrounds
- Buttons: primary = solid black or Lobster Orange (rounded full caps), secondary = white with subtle borders
- Light mode

**Form validation:**
- `.form-field-error` — red border + red ring glow (`--destructive`)
- `.form-field-valid` — green border + green ring glow (`--success`), use sparingly
- `.form-field-error-text` — small red text below field (0.75rem)
- Dark backgrounds (on-card fields): use `.card-field-error` / `.card-field-valid` from `lib/card/card.css`
- Prefer inline field highlighting over toast notifications

**Brand assets:**
- Hero: 3D clay lobster claw holding black CreditClaw card
- Favicon: the Golden Claw Chip
- Logo: golden credit card EMV chip with claw-shaped internal lines

## Key Features

- Stripe wallet funding (Rail 1 — live)
- Direct wallet debits for purchases (Rail 5 — live)
- Payment links — bots generate Stripe Checkout URLs to receive payments (live)
- Virtual card issuance via Stripe Issuing (not yet built)
- Multi-rail spending controls and approval workflows
- Bot management, onboarding wizard, bot-owner pairing

## Routes

- `/` — landing page with mascot, bot signup, live metrics, waitlist
- `/how-it-works`, `/allowance`, `/safety` — CreditClaw-specific content pages
- `/overview` — dashboard home
- `/stripe-wallet`, `/sub-agent-cards` — rail dashboards
- `/onboarding` — guided setup wizard
- `/setup/rail5` — card setup flow
- CreditClaw docs: `/docs/api/...`

## Ecosystem — OpenClaw

CreditClaw exists within the **OpenClaw** ecosystem — an open-source AI agent framework. OpenClaw bots run locally, connect to LLMs, and perform tasks through messaging platforms.

| Service | Role |
|---------|------|
| **ClawHub** | Skills marketplace — bots install plugins |
| **Moltbook** | Social network for AI agents |
| **SendClaw** | Email service for bots |
| **ClawCredit** | Credit line service (competitor — different risk model) |
| **Moltroad** | Agent-to-agent services marketplace |
| **Bankrbot** | Crypto banking on Base (competitor — crypto-native) |
| **Stripe ACP** | Agentic Commerce Protocol (competitor — requires merchant integration) |

**Our advantage:** universality. A card works everywhere. No merchant needs to integrate with us.

## Technology

- **x402 Protocol** — HTTP 402 for autonomous payments. EIP-3009/EIP-712 signatures on Base chain, USDC. We're both a payer (via `/bot/sign`) and receiver (via checkout pages).
- **Agent Skills Standard** — open spec (Anthropic, Microsoft, OpenAI). We extend it with commerce metadata: checkout flow, payment protocols, shipping policies.
- **MCP** — Anthropic's tool connection standard. We probe for `mcp_endpoint` during scans.

## Key Terms

- **SKILL.md** — markdown doc teaching an agent how to shop at a store
- **ClawHub** — public registry where skills are published
- **Claim token** — one-time code a bot gives its owner to link accounts
- **Heartbeat** — periodic check-in routine bots run to poll for updates

## Future Direction

- Stripe Issuing for real card numbers per bot
- Stripe Connect for money flow isolation per owner
- Ledger system with full double-entry accounting

## Key Files

| File | Purpose |
|------|---------|
| `components/tenants/creditclaw/landing.tsx` | Landing page |
| `components/tenants/creditclaw/how-it-works.tsx` | How it works page |
| `lib/tenants/tenant-configs.ts` | Tenant config (CreditClaw section) |
| `public/tenants/creditclaw/config.json` | Dynamic config |
| `docs/content/sections.ts` | Doc sections filtered by tenant |
