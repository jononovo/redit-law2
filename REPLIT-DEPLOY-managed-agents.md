# Deploy note — Managed Agents restructure · for the Replit agent

The in-house agent feature was refactored into a `managed-agents` module. This **renames database objects**, so the deployed dev + prod databases need a migration. Do the SQL **before** deploying the new code (the new code reads the new tables). Order per environment: **run SQL → smoke test → deploy**.

## Context (what changed)

The old "agent checkouts / in-house agent" feature became a first-class **managed agents** module (Crossmint's Agent Checkout is the first "managed agent runtime"). The old tables/columns are throwaway (no real user data) and are replaced:

| Old (drop) | New (create) |
|---|---|
| `agent_checkouts` table | `managed_agent_checkouts` table |
| `owners.crossmint_buyer_profile_id` column | `managed_agents.buyer_profile_id` |
| `owners.default_agent_checkout_card_id` column | `managed_agents.default_card_id` |
| `bots.bot_type = 'inhouse'` rows + `bots_inhouse_owner_uidx` index | `bots.bot_type = 'managed'` (auto-recreated) |
| — | `managed_agents` table (one row per owner+runtime) |

No `bots.managed_runtime` column and no new `bots` index — the one-agent-per-(owner,runtime) uniqueness lives entirely on `managed_agents`.

## Step 1 — Run this SQL on **dev AND prod** (both have the old schema)

All additive-or-drop, no real data at risk. Idempotent (safe to re-run).

```sql
-- Remove the old (throwaway) feature objects
DROP TABLE IF EXISTS agent_checkouts;
ALTER TABLE owners DROP COLUMN IF EXISTS crossmint_buyer_profile_id;
ALTER TABLE owners DROP COLUMN IF EXISTS default_agent_checkout_card_id;
DROP INDEX IF EXISTS bots_inhouse_owner_uidx;
-- The old in-house bot rows are auto-recreated as bot_type='managed' on the
-- next dashboard load; nothing references them yet, so just delete them.
DELETE FROM bots WHERE bot_type = 'inhouse';

-- Create the new shape
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
  id serial PRIMARY KEY,
  checkout_id text NOT NULL UNIQUE,
  crossmint_checkout_id text UNIQUE,
  owner_uid text NOT NULL,
  bot_id text NOT NULL,
  card_id text NOT NULL,
  product_url text NOT NULL,
  request text NOT NULL,
  merchant_context text,
  max_cost_cents integer,
  status text NOT NULL DEFAULT 'created',
  answered_action_id text,
  rail3_transaction_id text,
  receipt jsonb,
  last_event text,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS managed_agent_checkouts_owner_idx ON managed_agent_checkouts (owner_uid);
```

Apply with direct SQL (Replit SQL runner or psql), **not** `npm run db:push --force`. `shared/schema.ts` already matches, so a plain `npm run db:push` afterward should report **"no changes"** — use that as the verification.

## Step 2 — Crossmint key (no new secret)

The managed-agent checkouts now **reuse the existing** `NEXT_PUBLIC_CROSSMINT_CLIENT_API_KEY` (no separate key). In the Crossmint console, that client key needs the **agent-checkouts** + **agent-checkouts.buyer-profiles** scopes enabled (all 8). If a `CROSSMINT_AGENT_CHECKOUT_CLIENT_KEY` secret was added earlier, it's now unused and can be deleted.

## Step 3 — Deploy

Pull `main` into the Repl, confirm Step 1's SQL ran on that environment, then Deploy.

## Notes
- Dashboard route is `/agent-checkouts` (the public `/managed-agents` URL is the existing "Managed Agents" marketing page — unchanged).
- Production-only, real money on first real checkout — test with a cheap item + a Max Cost.
