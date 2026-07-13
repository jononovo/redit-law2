---
name: db:push blocker + failing-test baseline
description: Why npm run db:push hangs and which vitest failures are pre-existing noise.
---

**`npm run db:push` hangs on an interactive prompt** about a pre-existing `rail5_transactions` unique-constraint change unrelated to whatever you're pushing.
**Why:** Drizzle push detects a destructive constraint diff and waits for stdin; in agent shells this looks like a silent hang.
**How to apply:** For small additive schema changes, apply via direct `psql "$DATABASE_URL"` SQL (e.g. `ALTER TABLE ... ALTER COLUMN ... DROP NOT NULL`) and keep `shared/schema.ts` in sync. Use `db:push:force` only when the destructive change is actually intended.

**Prod schema pending (apply on next deploy, dev already has them):**
- `ALTER TABLE bots ADD COLUMN agent_platform text;`
- `CREATE TABLE support_requests (id serial PRIMARY KEY, owner_uid text NOT NULL, owner_email text, request_type text NOT NULL, support_request_type text, message text NOT NULL, created_at timestamp NOT NULL DEFAULT now());` plus indexes on `owner_uid` and `created_at`.

**Pre-existing vitest/tsc failures (as of July 2026)** — not caused by current work:
- `tests/rail5-card-transaction-pipeline` — TS errors (tsc only): `reason` missing on `GuardrailDecision` allow-variant. Vitest passes.
- `tests/brand-claims/api.test.ts` — "partial unique index prevents two verified claims" fails.
- `tests/brand-registry-api` — occasionally flaky (fetches the local dev server).
Baseline: 1 file failed / 1 test failed out of ~261. The old `server-only` load failure in bot-onboarding-management-comms was fixed by aliasing `server-only` to a stub in vitest.config.ts — keep that alias.
