---
name: managed-agents
description: "Overview of the managed-agents module — first-party agents CreditClaw provisions and orchestrates on the owner's behalf (remote runtimes with no credentials of their own), vs the owner's own external bots. Start here before touching anything under features/managed-agents/, then read the per-runtime doc."
created: 2026-07-14
last_updated: 2026-07-14
---

# Managed Agents

> A **managed agent** is a first-party agent CreditClaw provisions for an owner and drives **outbound** on their behalf. It has no API key of its own — it isn't a caller, it's a thing we orchestrate. The first (and today only) runtime is the Crossmint Agent Checkout runtime, branded "Captain Crunch". This module is the home for that runtime and any future ones.

Read this file first for the module shape; read `crossmint-checkout-runtime.md` (sibling) for the first runtime's full technical detail.

---

## The distinction: user-linked agents vs managed agents

The `bots` table holds two fundamentally different kinds of row. Keeping them straight is the single most important fact about this module.

| | **User-linked agents** | **Managed agents** |
|---|---|---|
| Who owns the code | The owner's own external bot / OpenClaw agent | CreditClaw — we provision it |
| Direction | **Inbound** — the bot calls our API | **Outbound** — we drive a remote runtime for the owner |
| Credentials | Holds an API key; authenticates every call | **None** — nothing external ever holds its key |
| How it appears | A normal `bots` row, `bot_type` null | A `bots` row with `bot_type = 'managed'`, plus a `managed_agents` settings row |
| Owner action | Owner registers/links it, then links cards/wallets | Auto-provisioned lazily on first `bots/mine` load |

A user-linked agent is a caller we authenticate. A managed agent is a capability we run **for** the owner — the owner initiates each action in-session; the runtime executes it using the owner's payment rails, never its own credentials.

## The module

`features/managed-agents/` is the engine home, one subfolder per runtime:

```
features/managed-agents/
  crossmint-checkout/     ← runtime #1: Crossmint Agent Checkout (Captain Crunch)
  <future runtime>/       ← e.g. a self-hosted browser-use master agent, slots in as a sibling
```

Future runtimes (for example the self-hosted master agent sketched in `_payment_build_ideas/260528_rail3-master-agent-plan.md`) slot in as **siblings** of `crossmint-checkout/` — they reuse the shared seam (below) and add their own runs table, without touching the existing runtime.

The runtime registry lives in `lib/managed-agents.ts`: `MANAGED_BOT_TYPE`, `MANAGED_AGENTS_ROUTE`, the `ManagedRuntime` type, `CROSSMINT_CHECKOUT_RUNTIME`, and `MANAGED_AGENT_RUNTIMES` (a record mapping each runtime to its `{ displayName, description }` — branding is data here, not a code constant).

## The two tables

- **`managed_agents`** — the **shared settings/identity table**, one row per **(owner, runtime)** (unique index `managed_agents_owner_runtime_uidx`). Columns: `owner_uid`, `runtime`, `bot_id` (unique — points at the provisioned `bots` row), `buyer_profile_id`, `default_card_id`. This is the **shared seam**: every runtime writes its identity + settings here, so provisioning, linkage, and `bots/mine` shaping are runtime-agnostic.
- **Per-runtime run tables** — each runtime gets its own table for its runs. The Crossmint runtime's is **`managed_agent_checkouts`** (one row per checkout attempt). A future runtime adds its own runs table alongside it rather than overloading this one.

The split is deliberate: the settings table is the common contract; the runs table is where a runtime's specifics live.

## The discriminator

- `bots.bot_type = 'managed'` marks a managed agent's `bots` row. There is **no `bots.managed_runtime` column** and **no bots-level uniqueness index** — the one-per-(owner, runtime) invariant is enforced entirely by `managed_agents_owner_runtime_uidx`.
- Managed bots are **excluded from `getBotsByOwnerUid`**, so they never surface in link-bot dialogs, card/wallet pickers, or agent-count logic — an agent with no API key must never be offered card/wallet linking.
- `GET /api/v1/bots/mine` returns them under a separate **`managed_agents` array** key (alongside `bots` and `pending_pairings`). It's an array because an owner can accrue more than one runtime over time.
- Provisioning is lazy + race-safe: `storage.ensureManagedAgent(ownerUid, ownerEmail, runtime)` creates the `bots` row and the `managed_agents` row in one transaction; a lost race rolls both back, so there are never orphan bots.

## Explicit non-members (naming collisions to NOT confuse)

Three things sound like they belong here but do not:

1. **`rail3_agents` table** — a Crossmint **cards-API vendor resource** ("one Crossmint agent per owner" that owns order intents). Pure Rail 3 plumbing; it stays in `features/payment-rails/rail3/` and is documented in `rail3-virtual-cards.md`. It is **not** a managed agent — it's a Crossmint-side construct, not something we orchestrate outbound.
2. **The public `/managed-agents` page** — the "Managed Agents" **services marketing page**, unrelated to this module. This is exactly why the managed-agents dashboard surface lives at `/agent-checkouts`, not `/managed-agents`: the marketing URL was already taken.
3. **Shipping addresses** — source of truth stays in `agent-interaction`. The Crossmint buyer profile (`managed_agents.buyer_profile_id`) is a **derived artifact** built from the default shipping address, not a second home for address data.

## Runtimes

| Runtime | Doc | Status |
|---|---|---|
| Crossmint Agent Checkout ("Captain Crunch") | `crossmint-checkout-runtime.md` | Built + restructured into this module 2026-07-14; not yet deployed to Replit. |

See `crossmint-checkout-runtime.md` for the first runtime's full build plan, schema, routes, UI, and gotchas.
