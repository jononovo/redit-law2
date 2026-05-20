---
name: Master Agent — Future Build Notes
description: Holding doc for the in-house "Master Agent" capability. Today, each CreditClaw user gets their own real Crossmint agent (one-per-owner, see Rail 3 per-user agent refactor). The Master Agent thesis is to add a CreditClaw-operated agent runtime that can actually execute work (browser control, transactions) on behalf of users. Open question whether the Crossmint side is one shared agentId or a backend orchestration layer over each user's own agent.
created: 2026-05-20
status: idea — not started
---

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

## Open questions (do not answer in this doc — these are tracked here so we don't lose them)

1. **Auth model** — above. Single most important question.
2. **One agent or a pool** (if Path A) — concentrates per-agent rate limits. Pool keyed by region or load balances at the cost of complexity.
3. **Browser runtime** — Browserbase vs self-hosted Playwright cluster vs Anthropic Computer Use API. Cost, latency, observability all differ.
4. **Tool/instruction surface** — free-form natural language vs curated toolset. Probably starts curated (checkout-only).
5. **Per-user budget / quota.** Master Agent runs cost real money. Caps per user, possibly tier-gated.
6. **Liability and compliance.** When the Master Agent executes on a user's card, CreditClaw is the actor of record. AML/KYC, dispute handling, fraud monitoring scale up. Needs a real conversation with whoever owns compliance before launch. **Gating non-technical concern.**
7. **Disclosure** — surface that the runtime is shared vs. keep the alias illusion. Probably alias in UI, technical truth in docs/terms.
8. **Bot ↔ Master Agent interaction** — if a user has both their own bot and uses the Master Agent occasionally, how does the audit trail surface that? Per-orderIntent agentId already disambiguates in DB; question is just UI.

## What this doc is not

Not a plan. A holding place. When we're ready to build, write a real plan under `currently_building/master-agent/` with its own scoped phases. This doc exists so we don't lose the thread.
