---
name: Master Agent — Future Build Notes
description: Stub for the in-house "Master Agent" capability. Today, each CreditClaw user gets their own real Crossmint agent (one-per-owner, see Rail 3 per-user agent refactor). The Master Agent thesis is to replace that with a shared, in-house agent runtime that can actually execute work (browser control, transactions) on behalf of users — exposed under per-user aliases so the user experience is "you have your own agent".
created: 2026-05-20
status: idea — not started
---

## What it is

A CreditClaw-operated agent (or small pool of agents) that can take instructions from a signed-in user and execute real work: browse merchant sites, complete checkouts on Rail 3 cards, run scripted tasks. Today the only thing that touches Crossmint's `agentId` is Rail 3 — so the Master Agent's first concrete role is being **the Crossmint agent that signs Rail 3 orderIntents for users who haven't connected their own bot**.

## Why we want it

- **Day-zero capability for new users.** A user signs up, vaults a card, and can immediately have the Master Agent buy something for them. No bot install, no SDK, no setup.
- **Differentiation.** "Bring your own agent" is one product. "We give you an agent that already works" is a different (better) product.
- **Forward-compat with the current model.** Users who later install their own bot just stop using the Master Agent for that workload. Both paths coexist.

## How the per-user-agent refactor sets this up

The Rail 3 per-user agent change (`currently_building/rail3/rail3-per-user-agent-plan.md`) introduced an `agentAlias` column on `rail3_agents`. In Phase 1, `agentAlias == agentId` (the user's real Crossmint agent). In Phase 2:

- `agentAlias` = a CreditClaw-issued per-user label (UUID or human-readable).
- `agentId` = points at the Master Agent's Crossmint `agentId` (shared across users, or one of a small pool).
- UI keeps saying "your agent" — the alias is what the user sees.

Switching from Phase 1 to Phase 2 for a given user = one `UPDATE rail3_agents SET agent_id = <master_agent_id> WHERE owner_uid = ...`. No schema migration, no Crossmint orderIntent rebinding (new orderIntents from that point forward sign under the Master Agent; existing orderIntents stay on the per-user agent — acceptable, they can be revoked + recreated if needed).

## Open questions (do not answer in this doc — these are tracked here so we don't lose them)

1. **One agent or a pool?** Single shared `agentId` is simplest but concentrates all Crossmint per-agent guardrails/rate limits. A small pool keyed by region or load balances that out at the cost of complexity. Need to actually hit the limits first; defer.
2. **Browser runtime.** Browserbase vs self-hosted Playwright cluster vs Anthropic Computer Use API vs combination. Cost, latency, observability all differ. Needs a spike.
3. **Tool/instruction surface.** What can the Master Agent be asked to do? Free-form natural language? A curated set of tools? Probably starts curated (checkout-only) then expands.
4. **Per-user budget / quota.** Master Agent runs cost real money. Need spend caps per user, possibly gated by paid tier.
5. **Liability and compliance.** When the Master Agent executes a transaction on a user's card, CreditClaw is the actor of record. AML/KYC, dispute handling, fraud monitoring all scale up. Needs a real conversation with whoever owns compliance before launch. **This is the gating concern, not a technical one.**
6. **Disclosure to user.** Do we surface that the agent is shared infrastructure or keep the alias illusion? Probably alias illusion in product UI, technical truth in docs/terms.
7. **Crossmint userLocator vs agentId boundary.** `createOrderIntent` already takes a per-user `userLocator` separate from `agentId` — meaning one Crossmint agent acting on behalf of N users is structurally supported. Confirm in Crossmint docs that this is a sanctioned pattern at scale, not just incidentally allowed.
8. **Bot ↔ Master Agent interaction.** If a user has both their own bot and uses the Master Agent occasionally, how does the audit trail surface that? Per-orderIntent agentId already disambiguates in DB; question is just UI.

## What this doc is not

Not a plan. A holding place. When we're ready to build, write a real plan under `currently_building/master-agent/` with its own scoped phases. This doc exists so we don't lose the thread and so future-us remembers that the `agentAlias` column in `rail3_agents` was put there on purpose.
