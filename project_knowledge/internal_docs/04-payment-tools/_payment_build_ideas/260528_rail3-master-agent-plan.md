---
name: Rail 3 — Master Agent Plan
description: Holding doc for the in-house "Master Agent" capability. Today, each CreditClaw user gets their own real Crossmint agent (one-per-owner, see Rail 3 per-user agent refactor). The Master Agent thesis is to add a CreditClaw-operated agent runtime that can actually execute work (browser control, transactions) on behalf of users. Open question whether the Crossmint side is one shared agentId or a backend orchestration layer over each user's own agent.
created: 2026-05-20
last_updated: 2026-06-04
status: idea — not started, blocked on the auth-model question below
---

> **Where this lives.** Parked under `internal_docs/04-payment-tools/rail3/` because the single blocking question is a Rail 3 auth question. Once the runtime decision is made and this has more than one sibling doc, graduate to its own `currently_building/master-agent/` folder.
> **Open-points tracker:** `_open-points.md` (sibling) lists this plan alongside the refresh-token plan.

## What it is

A CreditClaw-operated agent runtime that takes instructions from a signed-in user and executes real work: browses merchant sites, completes checkouts on Rail 3 cards, runs scripted tasks. Today the only thing that touches Crossmint's `agentId` is Rail 3 — so the Master Agent's first concrete role is **transacting on behalf of users who haven't connected their own bot**.

## Why we want it

- **Day-zero capability for new users.** Sign up, vault a card, and the Master Agent can immediately do work. No bot install, no SDK, no setup.
- **Differentiation.** "Bring your own agent" is one product. "We give you an agent that already works" is a different (better) product.

## Critical open question — Crossmint auth model

**Can one Crossmint `agentId` be reused across multiple end-users, or is the agent JWT-scoped to its creator?**

From the docs: `POST /agents` is called with `Authorization: Bearer <user_jwt>` and no `userLocator` field in the body. The agent appears to be implicitly scoped to whichever user's JWT created it. The docs don't explicitly state whether a different user's JWT can later create an orderIntent referencing that `agentId`.

This is the gating technical question for the Master Agent design:

- **If yes (shared agentId works across users):** Master Agent = one (or a small pool of) Crossmint agents in our org account. Per-user UX illusion is just labeling.
- **If no (agent is JWT-bound to creator):** Master Agent = our backend orchestration layer that operates each user's own Crossmint agent (the per-user agent we already provision in Phase 1). No shared agentId; the user-facing "agent" they see *is* their own Crossmint agent, plus our automation on top.

Either way, the Phase 1 per-user agent refactor is not throwaway:
- Path A: Phase 1 agents get archived and new cards route through the shared agent.
- Path B: Phase 1 agents are exactly the agents the Master Agent runtime operates.

Resolve by emailing Crossmint support or testing in staging before any Master Agent build starts.

### What to test first (resolves the auth model question)

Cheapest way to answer this without waiting on Crossmint support:

1. Sign up two distinct Firebase users (User A, User B) against the **same** Crossmint staging project. Both end up with separate `userLocator`s.
2. As User A, run `provisionAgentForOwner({jwt: A_jwt, ...})` → get `agentId_A`.
3. As User A, save a PM (`pm_A`), enroll it, create an orderIntent referencing `agentId_A + pm_A` with User A's JWT. Expect: succeeds, phase reaches `active` after passkey.
4. **As User B**, save a PM (`pm_B`), enroll it, attempt `createOrderIntent({jwt: B_jwt, agentId: agentId_A, paymentMethodId: pm_B, mandates})`.
   - **If 200 with phase `requires-verification`:** Path A is viable. Agent is shared. Master Agent = one (or pooled) org-level agent.
   - **If 403 / 404 / "agent not found":** Path B confirmed. Agent is JWT-bound to creator. Master Agent = orchestration layer over each user's own agent.
5. Independently verify by reading `GET /agents/:id` as User B — does Crossmint even surface another user's agent? Same fork in the road.

This is a 30-minute test once both Firebase users exist. Do it before scoping any Master Agent work. Capture the result in this doc.

### Does Path A obviate the refresh-token plan?

**Partially, and only for the bot-spend flow.** If Path A wins:

- The Master Agent can be operated with our **server API key** (no per-user JWT) for both `createOrderIntent` *and* `fetchOneTimeCredentials`, since the agent is org-owned.
- Per-user agentic-enrollment of PMs still happens with each user's JWT (the PM ceremony is per-card, not per-agent), so the Phase A flow in the canonical doc is unchanged.
- `rail3-firebase-refresh-token-plan.md` becomes **only** needed for the "user brought their own bot" flow — i.e. when a user's own per-user agent is doing the spending, not the Master Agent. If we decide to drop BYO-bot in favor of Master-Agent-only, the refresh-token plan is fully obviated and can be archived.

If Path B wins, the refresh-token plan stays as the only viable way to do headless spend, full stop.

**Decision dependency:** do not start the refresh-token implementation if Path A has a realistic chance and the auth-model test hasn't been run. ~30 minutes of testing can avoid ~3 days of work building a feature we may not need. The test goes first.

## Design direction (converged 2026-06-04)

Captured from a design pass. Still **gated by the auth-model test above** — this is the shape we'll build *once that's resolved*, not a green light to start.

### Where the Master Agent sits among the payment mechanisms

The Master Agent is **one of several** ways an agent can transact via CreditClaw — not the only one. The main skill stays **runtime-agnostic**; we never force a runtime on BYO agents:

- **A. Browser extension** (`plugins/secure-fill-extension`) — any agent driving Chrome, secure fill in the user's own browser.
- **B. OpenClaw plugin** (`public/Plugins/OpenClaw`) — secure form filling for that platform.
- **C. browser-use** — an *optional secondary* skill ("Agents using browser-use") for external agents who want it. Never baked into the main skill.
- **Master Agent** — CreditClaw-operated runtime that uses browser-use internally (surface C's engine, but operated by us).

### Browser runtime: browser-use (framework, not harness)

For the Master Agent's own runtime, use the **browser-use framework** (curated `Tools`), **not** the minimal "Browser Harness" (raw-CDP, agent-writes-its-own-tools mid-task) — the harness is too open-ended for something transacting on real cards.

- This is the **server-side, CreditClaw-controlled** surface, so the `activeTab` / extension-permission constraints are irrelevant — we own the browser launch.
- `sensitive_data` keeps card credentials (`fetchOneTimeCredentials`) out of the LLM's *text* context. **Vision stays optional and on by default** — it's needed to succeed on sites we don't control, so don't make turning it off a requirement. The narrower rule: secret values (PAN/CVV) must never land in a screenshot sent to the model — handle that at the secret-entry step only (skip or mask the shot there), not by blinding the agent for the whole run. Sites we know well can run deterministic + vision-off; unknown sites keep vision on. The "operator shouldn't hold plaintext" caveat is **moot** — CreditClaw is the operator of record (Q#6).
- Cloud (stealth / managed / persistent profiles) vs self-host (data-residency for card data) — decide against Q#6.
- Runtime choice is **orthogonal** to the Path A/B auth fork.

### Module + tenant shape

Two layers, kept distinct:

- **Engine (logic + data):** `features/master-agent/` — browser-use orchestration, its own `storage/` fragment, its own `schema/master-agent-tables.ts`, plus thin `app/api/v1/master-agent/*` route shells. **Embedded** in the app: imports shared auth / Crossmint client / guardrails **directly** (no duplication, no adapter layer — we are *not* extracting it).
- **Presentation (its own tenant + domain):** a new tenant `master-agent` on its own hostname, `components/tenants/master-agent/` + `public/tenants/master-agent/config.json`. The new domain stays in the **same Next.js app/deployment** (middleware hostname routing), so shared auth/DB/Crossmint come for free — domain isolation *without* a separate app.

**Cohesion goal:** all Master Agent logic lives in `features/master-agent/` (server) + `components/tenants/master-agent/` (client), so an agent pointed at those two folders sees the whole feature. Enforce **one-way imports** — master-agent imports shared; nothing else imports master-agent internals. Drop a `features/master-agent/README.md` as the map.

This respects the tenant invariant (*tenants are presentation only*): the new tenant **renders** the master-agent engine, same as shopy/brands render the scan pipeline. The engine is a new shared engine, not a per-tenant branch.

**Tenant registration touchpoints** (the existing pattern's cost — tenant id maps are hardcoded, no single registry): `middleware.ts` (hostname→id), `app/layout.tsx` (`ids` array + `TENANT_THEMES`), `app/page.tsx`, `app/how-it-works/page.tsx`, `app/docs/layout.tsx`, plus new `public/tenants/master-agent/config.json` + `components/tenants/master-agent/`.

**Reuse check before building:** `app/managed-agents/page.tsx` and `app/action/page.tsx` already exist — build on whatever managed-agents surface is partly scaffolded rather than starting fresh.

### Rail coverage — mandate-driven

The Master Agent must spend across **multiple rails, selected per mandate**:

- **Rail 1** (Privy stablecoin wallet + x402) — **in scope for v1.**
- **Rail 3** (Crossmint Card Permissions — virtual cards via orderIntents) — **in scope for v1.**
- **Rail 5** (split-knowledge "Sub-Agent Cards") — **deferred.** Rail 5 is BYO-agent *by design*: CreditClaw holds only the decryption key, the bot holds the ciphertext, and an external sub-agent decrypts at checkout — so CreditClaw never assembles the full PAN and stays out of PCI scope. The Master Agent **is** CreditClaw, so it would hold the key *and* receive the ciphertext, decrypt in-house, and pull the plaintext PAN (and PCI scope) inside our perimeter. That's the blocker — not "we'd store the PAN," but that the *decryption moves in-house*. Rail 3 and Rail 1 don't have this problem: Crossmint carries PCI for Rail 3, and Rail 1 has no PAN at all.

**v1 = Rail 1 + Rail 3**, rail chosen per the spend mandate. Rail-selection logic (which rail for which mandate — currency, merchant acceptance, limits) is a new concern to design at build time; not specified here.

## Open questions (do not answer in this doc — these are tracked here so we don't lose them)

1. **Auth model** — above. Single most important question.
2. **One agent or a pool** (if Path A) — concentrates per-agent rate limits. Pool keyed by region or load balances at the cost of complexity.
3. **Browser runtime** — leading candidate now **browser-use** (framework — see Design direction) vs Browserbase / self-hosted Playwright / Anthropic Computer Use. Remaining sub-decision: browser-use Cloud vs self-host (data residency). Cost, latency, observability all differ.
4. **Tool/instruction surface** — free-form natural language vs curated toolset. Probably starts curated (checkout-only) — aligns with browser-use's curated `Tools`, not the free-form harness.
5. **Per-user budget / quota.** Master Agent runs cost real money. Caps per user, possibly tier-gated.
6. **Liability and compliance.** When the Master Agent executes on a user's card, CreditClaw is the actor of record. AML/KYC, dispute handling, fraud monitoring scale up. Needs a real conversation with whoever owns compliance before launch. **Gating non-technical concern.**
7. **Disclosure** — surface that the runtime is shared vs. keep the alias illusion. Probably alias in UI, technical truth in docs/terms.
8. **Bot ↔ Master Agent interaction** — if a user has both their own bot and uses the Master Agent occasionally, how does the audit trail surface that? Per-orderIntent agentId already disambiguates in DB; question is just UI.

## What this doc is not

Not a plan. A holding place. When we're ready to build, write a real plan under `currently_building/master-agent/` with its own scoped phases. This doc exists so we don't lose the thread.
