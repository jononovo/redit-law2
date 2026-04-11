---
name: CreditClaw — Vision, Identity & Brand
description: Product vision, positioning, branding, design system, ecosystem context, and key files. Tier 3 protected.
---

# CreditClaw

## Vision

Financial rails for AI agents. Agents can't hold bank accounts — CreditClaw bridges that gap.

- Human owners fund wallets, set spending limits
- Platform issues virtual Visa/Mastercard for bot purchases
- Agents spend at any online merchant — no merchant integration needed
- Granular guardrails: per-transaction limits, category blocking, approval modes
- Bot-first registration: bot signs up → gets claim token → human links later

**Not:** a credit line (that's ClawCredit), a crypto service, or a bot-to-bot payment processor. We never store card details (Stripe does).

**Positioning:** connective tissue between merchants and AI agents. Card-based = universal. No merchant integration required.

## Flywheel

1. **shopy.sh** scans merchants → scores → generates SKILL.md
2. **brands.sh** hosts skills → agents discover merchants
3. **CreditClaw** gives agents the money to buy
4. More transactions → more data → better recommendations → more merchants scanned

## Identity

- **Tagline:** "Pocket money for your bots!"
- **Mission:** The fun, safe way to give your OpenClaw agent an allowance
- **Tone:** Playful, helpful, lighthearted, trustworthy — "consumer-tech" not "enterprise-saas"
- **Logo:** `/assets/images/logo-claw-chip.png` — golden EMV chip with claw-shaped internal lines
- **Mascot:** `/assets/images/hero-claw.png` — coral lobster, 3D clay/claymation
- **Emoji:** 🦞
- **Audience:** consumers and bot owners — autonomous purchases with safety rails

## Design System

**Aesthetic:** "Fun Consumer" — Soft Clay 3D, rounded geometry, vibrant pastels, claymation texture, isometric views, minimalist 3D render with soft lighting. Playful fintech, not cold corporate.

**Fonts:** `Plus Jakarta Sans` (Bold/ExtraBold headings, Regular/Medium body) · `JetBrains Mono` (transaction IDs, code, technical data)

**Colors:**

| Name | Value | Usage |
|------|-------|-------|
| Lobster Orange | `hsl(10 85% 55%)` | Primary actions, brand accents |
| Ocean Blue | `hsl(200 95% 60%)` | Secondary actions, trust indicators |
| Fun Purple | `hsl(260 90% 65%)` | Accents, gradients, "magic" moments |
| Deep Navy | `hsl(222 47% 11%)` | Primary text, strong contrast |
| Soft Cloud | `hsl(210 40% 98%)` | Page backgrounds |
| Success Green | `hsl(142 71% 45%)` | Validation success, enabled states (matches Tailwind `green-500`) |
| White | `#FFFFFF` | Cards, input fields, popovers |

**UI:**
- `1rem` / `16px` rounded corners on buttons, cards, inputs
- Soft colorful shadows + `backdrop-blur-md` for depth
- Glassmorphism on nav bars and floating elements
- Grainy noise-textured gradients (Orange → Blue → Purple) for section backgrounds
- Primary buttons: solid black or Lobster Orange, rounded full caps
- Secondary buttons: white with subtle borders
- Icon buttons: circular, transparent until hovered
- Light mode

**Form validation:**
- `.form-field-error` — red border + red ring glow (`--destructive`). Apply to `<input>`, `<select>`, `<textarea>`
- `.form-field-valid` — green border + green ring glow (`--success`), use sparingly
- `.form-field-error-text` — 0.75rem red text below field
- On dark surfaces (card fields): `.card-field-error` / `.card-field-valid` from `lib/card/card.css`
- Inline field highlighting over toast notifications

**Assets:** hero = 3D clay lobster claw holding black card · favicon = Golden Claw Chip · avatars = diverse human photos + colorful initial avatars

## Features (Current)

- Crypto wallet funding via Stripe Onramp (Rail 1 — live)
- Direct wallet debits (Rail 5 — live)
- Virtual card issuance via Stripe Issuing (not yet built)
- Multi-rail spending controls + approval workflows
- Bot management, onboarding wizard, bot-owner pairing

## Routes

- `/` — landing: mascot hero, bot signup, live metrics, waitlist
- `/how-it-works`, `/allowance`, `/safety` — content pages
- `/overview` — dashboard home
- `/stripe-wallet`, `/sub-agent-cards` — rail dashboards
- `/onboarding` — guided setup wizard
- `/setup/rail5` — card setup flow
- `/docs/api/...` — CreditClaw docs

## Ecosystem — OpenClaw

OpenClaw = open-source AI agent framework. Bots run locally, connect to LLMs, act through messaging platforms (WhatsApp, Telegram, Discord).

| Service | Role |
|---------|------|
| **ClawHub** | Skills marketplace — bots install plugins |
| **Moltbook** | Social network for agents |
| **SendClaw** | Email for bots |
| **ClawCredit** | Credit line (competitor — borrow-now model vs our prepaid) |
| **Moltroad** | Agent-to-agent services marketplace |
| **Bankrbot** | Crypto banking on Base (competitor — crypto-native vs our fiat-native) |
| **Stripe ACP** | Agentic Commerce Protocol (competitor — requires merchant integration) |

**Our edge:** universality. A card works everywhere. No merchant integration needed.

## Technology

- **x402** — HTTP 402 for autonomous payments. EIP-3009/EIP-712 on Base, USDC. We're both payer (`/bot/sign`) and receiver (checkout pages).
- **Agent Skills Standard** — open spec (Anthropic, Microsoft, OpenAI). We extend with commerce metadata: checkout flow, payment protocols, shipping.
- **MCP** — Anthropic's tool standard. We probe `mcp_endpoint` during scans.

## Key Terms

- **SKILL.md** — markdown doc teaching an agent to shop at a store
- **ClawHub** — public registry where skills are published
- **Claim token** — one-time code a bot gives its owner to link accounts
- **Heartbeat** — periodic bot check-in to poll for updates

## Future

- Stripe Issuing — real card numbers per bot
- Stripe Connect — money flow isolation per owner
- Ledger — full double-entry accounting

## Key Files

| File | Purpose |
|------|---------|
| `components/tenants/creditclaw/landing.tsx` | Landing page |
| `components/tenants/creditclaw/how-it-works.tsx` | How it works |
| `lib/tenants/tenant-configs.ts` | Tenant config |
| `public/tenants/creditclaw/config.json` | Dynamic config |
| `docs/content/sections.ts` | Doc sections filtered by tenant |
