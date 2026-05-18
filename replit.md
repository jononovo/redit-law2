# CreditClaw Platform — Agent Operating Guide

This file is the agent's operating manual. For deep technical detail on any module, read **`project_knowledge/technical_overview.md`** (full system reference) and the relevant subfolder under **`project_knowledge/internal_docs/`**. Don't load those unless the task needs them.

## What this project is

One Next.js 16 codebase, three tenants, hostname-routed via middleware:

- **CreditClaw** (`creditclaw.com`) — Financial rails for AI agents: crypto wallets, virtual cards, spending controls, approvals.
- **shopy.sh** — Consumer-facing ASX Score scanner + leaderboard for merchant AI-readiness (0–100).
- **brands.sh** — Developer-facing skill registry hosting per-merchant SKILL.md / skill.json.

All three tenants share the same database, the same scan pipeline, and the same `brand_index` table. Tenant differences are presentation only — never branch shared engines per tenant.

## Tenant theming cheat sheet

When building UI, identify which tenant(s) it belongs to and follow the design language:
- **CreditClaw** — Plus Jakarta Sans, 3D clay/claymation aesthetic, rounded corners (1rem), pastel oranges/blues/purples.
- **shopy.sh** — Monospace section labels, no rounded corners on cards, no shadows, dark sections with green terminal accent, `gap-px bg-neutral-200` grid dividers.
- **brands.sh** — Skill-registry framing, shared label maps from `features/brand-engine/procurement-skills/taxonomy/`.
  

## Stack

Next.js 16 (App Router only) · Firebase Auth (httpOnly session cookies + Bearer fallback) · PostgreSQL + Drizzle ORM · Tailwind CSS v4 · shadcn/ui · React Query · TypeScript.


## Conventions

- **Descriptive names:** `evaluateCardGuardrails()` not `evaluate()`. `dashboard-overview.md` not `overview.md`. Long beats short.
- **Separation of concerns:** one file = one responsibility. Cross-cutting (guardrails, approvals, webhooks) lives in its own `features/{thing}/` folder, never accumulating rail-specific business logic.
- **Feature-first folder layout:** new code under `features/{feature}/`, grouped by responsibility (`client.ts`, `wallet/`, `orders/`, `fulfillment.ts`), not by layer.
- **Storage modularization:** `server/storage/` has one file per domain area (`rail1.ts`, `rail5.ts`, `brand-index.ts`, `approvals.ts`, `orders.ts`, …). `types.ts` is the single source of truth for `IStorage`. `index.ts` composes them. Consumers always import from `@/server/storage`.
- **API paths never change** during refactors — only internal `lib/` imports get rewired.
- **Finish what you start.** A 90%-done feature is 0% shippable. Wire API + storage + UI + error handling + edge cases in the same session.
- **Tests:** automated tests for pure business logic (scoring, payment math, validation rules) live in `tests/`. See `tests/_README.md`.
- **Test IDs:** every interactive element and meaningful display element gets a `data-testid` attribute (`button-submit`, `input-email`, `card-product-${id}`).

## Modules — one line each (full detail in `project_knowledge/technical_overview.md`)

| # | Module | What it owns |
|---|---|---|
| 1 | Brands & Skills | Single scan pipeline → score + SKILL.md + brand_index row, taxonomy, recommend API, catalog UI. |
| 2 | Product Index | pgvector embeddings for product search (`features/product-index/`, `product_listings`). |
| 3 | Payment Tools | Outbound rails: Rail 1 (Privy crypto wallet, live), Rail 2 (CrossMint card wallet, not live), Rail 3 (Crossmint Card Permissions — vaulted real card + N virtual cards as orderIntents, live; see `project_knowledge/currently_building/rail3/`), Rail 5 (self-hosted encrypted cards, live). |
| 4 | Agent Interaction | Webhooks, Cloudflare tunnels, bot messaging, central orders, unified approvals. |
| 5 | Agent Plugins | Per-platform plugins (`Plugins/OpenClaw/`). |
| 6 | Platform Management | Auth, bot lifecycle, pairing, feature flags, admin (`/admin123`). |
| 7 | Multi-tenant Structure | Hostname routing, per-tenant theming via `public/tenants/{id}/config.json`. |
| 8 | Agent Shops | Inbound checkout (x402, Base Pay, Stripe Onramp, USDC Direct), storefronts, invoices. |
| 9 | Agent Testing | Two test types (basic checkout single-page, full-shop 7-page) with observer mode + scoring. |

## Critical concept: unified scan pipeline

There is **one** scan pipeline. `POST /api/v1/scan` (user-triggered) and the queue worker (`features/brand-engine/scan-queue/process-next.ts`) run identical work: `classifyBrand` + `auditSite` (parallel Perplexity) → `computeScoreFromRubric` → `buildVendorSkillDraft` → `generateVendorSkill` → `upsertBrandIndex` → `resolveProductCategories`. Every scan produces both a score and a SKILL.md, written to one `brand_index` row.

Shopy emphasizes the score (leaderboard at `/`, scanner at `/agentic-shopping-score`). Brands emphasizes the skill (catalog at `/skills`). CreditClaw uses the row to power agent recommendations. **Same pipeline, three surfaces.** When adding a data point, add it once at the pipeline, expose it per surface — never branch the pipeline.

## Key paths agents will touch often

- `shared/schema.ts` — all DB tables and types.
- `server/storage/` — domain-grouped storage fragments.
- `features/brand-engine/` — scan pipeline, scoring, taxonomy, skills, catalog.
- `features/payment-rails/{rail1,rail2,rail5}/` — outbound payment rails.
- `features/agent-interaction/` — webhooks, approvals, orders, guardrails, shipping.
- `features/platform-management/` — auth, bot management, feature flags.
- `features/agent-shops/` — inbound checkout and storefronts.
- `components/tenants/{creditclaw,shopy,brands}/` — tenant-specific UI.
- `components/wallet/` — shared wallet/card UI across all rails.
- `app/api/v1/` — public + bot + owner APIs.
- `app/admin123/` — admin tooling (gated by `admin` flag).



## Workflow

- App runs via the `Start application` workflow (`npx next dev -p 5000 -H 0.0.0.0`).
- Restart via the `workflows` skill if the port is stuck.
- Tests: `npx vitest run`.
- Skill variants build: `npx tsx skill-variants/build-variants.ts`.
- Database changes go through Drizzle migrations. Use the `database` skill for prod queries or schema sync questions.

## How to extend `project_knowledge/`

When you add a feature complex enough that future agents will need to understand it, **don't bloat this file**. Add a new doc under the relevant `project_knowledge/internal_docs/{NN-area}/` folder following `project_knowledge/_how-to-write-docs-guide.md`, then add at most one line to the relevant module row above pointing to it.

`replit.md` is the operating manual. `project_knowledge/technical_overview.md` is the system reference. `project_knowledge/internal_docs/` is the deep dive. Keep them in that order of abstraction.

## User preferences

- Prefer **reuse over rebuild**. Risk-averse on touching working surfaces (e.g. brands tenant filter bar). Favor lift-and-shift extractions (alias the new shared component to the old local one) over invasive refactors.
- Prefer **explicit failure over silent fallbacks**. Don't paper over missing data with defaults that hide bugs.
- Prefer **functional over mocked/placeholder**. Don't ship UI wired to fake data unless the request explicitly asks for a stub.
- Prefer **descriptive long names** over short generic ones, in both code and docs.
- When asked to remove something, **remove it cleanly** — don't leave dead helper variables behind. Over-engineering gets called out.
- Architect code review (`code_review` skill) is expected after non-trivial changes.
- When the system flags `replit.md` as too large, **propose a trim pass** rather than letting it grow.


## Working with me

- **No unrequested scope.** Avoid adding checks, guardrails, abstractions, or features I didn't ask for. If protection seems genuinely needed, raise it as one short sentence rather than building it.
- **Direct orders are final.** When I tell you what I want, proceed. Avoid asking for confirmation, proposing alternatives, or listing edge cases unless I asked. Save questions for things you genuinely cannot move forward without.
- **Be terse.** Short bullets, technical, skip the recap of what I just said and the disclaimers. If I want detail I'll ask.
- **No edge-case over-engineering.**  Enterprise concerns are not in scope. If a code review surfaces such a finding, note it once in one line and move on — do not ask whether to implement it.