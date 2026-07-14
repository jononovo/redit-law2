---
name: managed-agents-restructure
description: "Execution plan — rename/move the agent-checkouts feature into a versatile `managed-agents` module (Crossmint checkout = runtime #1). Includes Replit dev+prod DB migration."
created: 2026-07-14
last_updated: 2026-07-14
---

# Managed Agents — restructure plan

> **Rename and relocate the "in-house agent / agent-checkouts" feature (shipped in PR #83) into a first-class `managed-agents` module, so the codebase clearly distinguishes user-linked agents (external bots holding API keys, inbound) from managed agents (remote runtimes we orchestrate outbound). Crossmint's Agent Checkout becomes runtime #1 of a versatile module; the master agent and other providers slot in later as siblings — with clean seams and honest names, no speculative frameworks.**

## Why (the distinction being encoded)

1. **User-linked agents** — hold a `cck_` API key, call us inbound. Everything in `bots` today.
2. **Managed agents** — no credentials of their own; *we* drive a remote runtime on the owner's behalf. First: Crossmint's hosted browser session (funds via Rail 3 virtual cards). Later: self-hosted master agent (multi-rail), possibly other third parties.

The current code files this under `features/payment-rails/agent-checkouts/` — a payments-plumbing home that implies "this is a rail." It isn't; it's an orchestration domain. This restructure fixes placement, naming, and the DB's one-managed-agent-forever assumption **before** more runtimes exist.

## Deployment reality (corrects the research premise)

The schema **was applied to Replit dev AND prod** (owner-confirmed), and `bots/mine` provisioning is live — so deployed DBs contain `bot_type='inhouse'` bot rows (one per owner who loaded the dashboard) and possibly empty `agent_checkouts`. No real users depend on any of it. So renames are still free **in code**, but the DB needs a real migration on dev + prod (§4), not "local only."

---

## Target shape (one page)

| Concern | Target |
|---|---|
| Feature code | `features/managed-agents/` — shared files at root, `crossmint-checkout/` subfolder (moved from `payment-rails/agent-checkouts/`); future `master-agent/` sibling |
| Storage | `server/storage/managed-agents/{agents.ts, checkouts.ts}`, spread into `storage` |
| Tables | new `managed_agents` (per-owner-per-runtime settings); rename `agent_checkouts` → `managed_agent_checkouts`; drop the two `owners` columns |
| bots | `bot_type='managed'` + new `managed_runtime` column; `bots_managed_owner_runtime_uidx` partial composite unique |
| API | `/api/v1/managed-agents/checkouts/**` + `/managed-agents/default-card` |
| Page | `app/(dashboard)/managed-agents/`; sidebar label from a runtime registry |
| Constants | `lib/managed-agents.ts` runtime registry ("Captain Crunch" = one `displayName` field, trademark caveat kept) |
| Components | `components/managed-agent/` (moved from `components/inhouse-agent/`) |
| Tests | `tests/managed-agents/` |
| Docs | `internal_docs/04-payment-tools/managed-agents/` (overview + moved runtime doc) |

**Restraint (per owner's repeated guidance — do NOT over-build):** no `core/` folder for one runtime (the subfolder boundary *is* the seam), no `[runtime]` URL path segment, no `settings jsonb`, no provider-plugin abstraction. Runtime #2's scaffolding is added when runtime #2 ships. This pass is *structure and names only* — zero behavior change.

---

## 1. Database — new schema (`shared/schema.ts`)

**New `managed_agents` table** (one row per owner+runtime; absorbs the two `owners` columns):
```ts
export const managedAgents = pgTable("managed_agents", {
  id: serial("id").primaryKey(),
  ownerUid: text("owner_uid").notNull(),
  runtime: text("runtime").notNull(),          // 'crossmint-checkout'
  botId: text("bot_id").notNull().unique(),    // -> bots.botId
  buyerProfileId: text("buyer_profile_id"),    // Crossmint buyer profile (was owners.crossmint_buyer_profile_id)
  defaultCardId: text("default_card_id"),       // rail3 cardId (was owners.default_agent_checkout_card_id)
  createdAt, updatedAt,
}, (t) => [ uniqueIndex("managed_agents_owner_runtime_uidx").on(t.ownerUid, t.runtime) ]);
```
- Typed columns, not jsonb (schema precedent: jsonb only for vendor/unstable payloads).
- Drop `owners.crossmint_buyer_profile_id` and `owners.default_agent_checkout_card_id`.

**Rename `agent_checkouts` → `managed_agent_checkouts`** (same columns incl. `answered_action_id`). `createAgentCheckoutSchema` → `createManagedAgentCheckoutSchema`, `achk_` id prefix → `mac_` (opaque; deployed rows are throwaway).

**bots discriminator:**
```ts
managedRuntime: text("managed_runtime"),   // new nullable column
// replace bots_inhouse_owner_uidx with:
uniqueIndex("bots_managed_owner_runtime_uidx")
  .on(t.ownerUid, t.managedRuntime).where(sql`${t.botType} = 'managed'`)
```

## 2. Code moves + renames

**Files (git mv to preserve history):**
- `features/payment-rails/agent-checkouts/{client,service,buyer-profile,ids,serialize,api-errors}.ts` → `features/managed-agents/crossmint-checkout/`
- `server/storage/payment-rails/agent-checkouts.ts` → split into `server/storage/managed-agents/agents.ts` (managed_agents + `ensureManagedBot`) and `.../checkouts.ts` (run-ledger CRUD)
- `lib/inhouse-agent.ts` → `lib/managed-agents.ts` (registry, below); `lib/agent-checkouts.ts` → `lib/managed-agent-checkouts.ts`
- `app/api/v1/agent-checkouts/**` → `app/api/v1/managed-agents/checkouts/**` + `app/api/v1/managed-agents/default-card/route.ts`
- `app/(dashboard)/inhouse-agent/` → `app/(dashboard)/managed-agents/`
- `components/inhouse-agent/` → `components/managed-agent/`; `add-agent-cta-card.tsx` stays
- `tests/agent-checkouts/` → `tests/managed-agents/`

**`lib/managed-agents.ts` (registry — agent-platforms.ts pattern; branding isolated):**
```ts
export const MANAGED_BOT_TYPE = "managed";
export const MANAGED_AGENTS_ROUTE = "/managed-agents";
export type ManagedRuntime = "crossmint-checkout";
export const MANAGED_AGENT_RUNTIMES: Record<ManagedRuntime, { displayName: string; description: string }> = {
  "crossmint-checkout": { displayName: "Captain Crunch", description: "..." }, // display only; may change (trademark)
};
```

**Identifier renames:** `INHOUSE_BOT_TYPE`→`MANAGED_BOT_TYPE`; `ensureInhouseBot`→`ensureManagedBot(ownerUid, ownerEmail, runtime)`; `setOwnerBuyerProfileId`/`setOwnerDefaultCheckoutCard` → operate on `managed_agents` keyed by (ownerUid, runtime); `AgentCheckout*` types keep names (they're the run ledger) but move.

**Shared-file touchpoints:**
- `app/api/v1/bots/mine/route.ts`: `inhouse_agent: {...}` → `managed_agents: [...]` (array); calls `ensureManagedBot(..., 'crossmint-checkout')`.
- `server/storage/core.ts:50`: `IS DISTINCT FROM 'inhouse'` → `'managed'`.
- `app/(dashboard)/{agents,overview}/page.tsx`: consume `managed_agents[]`; `InhouseAgentCard`→`ManagedAgentCard` reads `displayName` from registry.
- `components/dashboard/sidebar.tsx`: label = registry displayName, href = `MANAGED_AGENTS_ROUTE`.
- `server/storage/{index,types}.ts`: rename method group + interface members.
- `features/payment-rails/crossmint-env.ts`: `AGENT_CHECKOUT_CROSSMINT_CLIENT_KEY` — **already being reused as `NEXT_PUBLIC_CROSSMINT_CLIENT_API_KEY`** (separate owner decision); fold that in here.
- `.env.example`, `tests/_README.md` row.

## 3. Docs
- New `internal_docs/04-payment-tools/managed-agents/managed-agents.md` — the vocabulary, the two tables, the runtime seam, and the **explicit non-members**: `rail3_agents` (a Crossmint *cards-API* vendor resource — naming collision, stays in payment-rails) and shipping addresses (source of truth stays in `agent-interaction`; buyer profile is derived).
- Move `agent-checkouts-inhouse-agent.md` in as the crossmint-checkout runtime doc (Tier-1 path/name updates; Tier-3 "Why It Exists" untouched).
- Update `payments_overview.md` folder table + the two schema-comment doc pointers.
- On completion, fold this plan's outcome into that overview and delete this file from `currently_building/`.

## 4. Replit DB migration (dev AND prod — hand to the Replit agent)

Run **after** the code deploys (new schema present). All additive-or-drop; no real data at risk. Check-first, then migrate:

```sql
-- 1. Old feature is throwaway: drop the run ledger and the two owners columns.
DROP TABLE IF EXISTS agent_checkouts;
ALTER TABLE owners DROP COLUMN IF EXISTS crossmint_buyer_profile_id;
ALTER TABLE owners DROP COLUMN IF EXISTS default_agent_checkout_card_id;

-- 2. Retire the old provisioned bots (auto-recreated as 'managed' on next dashboard load).
DROP INDEX IF EXISTS bots_inhouse_owner_uidx;
DELETE FROM bots WHERE bot_type = 'inhouse';

-- 3. New shape.
ALTER TABLE bots ADD COLUMN IF NOT EXISTS managed_runtime text;
CREATE UNIQUE INDEX IF NOT EXISTS bots_managed_owner_runtime_uidx
  ON bots (owner_uid, managed_runtime) WHERE bot_type = 'managed';
CREATE TABLE IF NOT EXISTS managed_agents (
  id serial PRIMARY KEY,
  owner_uid text NOT NULL,
  runtime text NOT NULL,
  bot_id text NOT NULL UNIQUE,
  buyer_profile_id text,
  default_card_id text,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS managed_agents_owner_runtime_uidx ON managed_agents (owner_uid, runtime);
CREATE TABLE IF NOT EXISTS managed_agent_checkouts (
  -- identical columns to the old agent_checkouts (id, checkout_id UNIQUE, crossmint_checkout_id UNIQUE,
  -- owner_uid, bot_id, card_id, product_url, request, merchant_context, max_cost_cents, status,
  -- answered_action_id, rail3_transaction_id, receipt jsonb, last_event, created_at, updated_at)
  -- full DDL generated at build time to match shared/schema.ts exactly
  id serial PRIMARY KEY
);
```
(The `managed_agent_checkouts` DDL is emitted in full when the branch is built, matching `shared/schema.ts`; `shared/schema.ts` matching means a follow-up `npm run db:push` reports "no changes" as verification.)

## 5. Sequence
1. Code restructure + local schema (direct SQL locally), `npm run db:push` shows no-changes, typecheck clean, tests green (`tests/managed-agents/`), build compiles.
2. Verify the app still renders the managed agent on `/agents` + `/managed-agents` (browser or dev server).
3. PR → merge to main.
4. Pull into Repl → **run §4 SQL on dev, smoke-test, then prod** → Deploy.

## Status
**Done in code 2026-07-14 — awaiting Replit DB migration + deploy.** Executed with two corrections from the preflight verification: (1) NO `bots.managed_runtime` column/index — the one-per-(owner,runtime) invariant lives only on `managed_agents` (the bots column would have duplicated it); `ensureManagedAgent` is race-safe via a transaction guarded by `managed_agents_owner_runtime_uidx`. (2) Storage is a single file (`server/storage/managed-agents/index.ts`), not split. Dashboard route is `/managed-agents` — owner decision 2026-07-14: the former marketing page at that URL moved to `/managed-payment-agents`. Local schema applied, tsc clean, 50 tests pass, build compiles. Replit migration (dev + prod) lives in `REPLIT-DEPLOY-managed-agents.md` at repo root — run it BEFORE the code deploy. Fold this file's outcome into `internal_docs/04-payment-tools/managed-agents/` and delete it once deployed.
