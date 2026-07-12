---
name: db:push blocker + failing-test baseline
description: Why npm run db:push hangs and which vitest failures are pre-existing noise.
---

**`npm run db:push` hangs on an interactive prompt** about a pre-existing `rail5_transactions` unique-constraint change unrelated to whatever you're pushing.
**Why:** Drizzle push detects a destructive constraint diff and waits for stdin; in agent shells this looks like a silent hang.
**How to apply:** For small additive schema changes, apply via direct `psql "$DATABASE_URL"` SQL (e.g. `ALTER TABLE ... ALTER COLUMN ... DROP NOT NULL`) and keep `shared/schema.ts` in sync. Use `db:push:force` only when the destructive change is actually intended.

**Pre-existing vitest/tsc failures (as of July 2026)** — not caused by current work, verified failing on clean HEAD:
- `tests/rail5-card-transaction-pipeline` — TS errors: `reason` missing on `GuardrailDecision` allow-variant.
- `tests/bot-onboarding-management-comms` — suite fails to load: `server-only` import reached via a client-component chain.
- `tests/brand-claims/api.test.ts` — "partial unique index prevents two verified claims" fails.
Baseline: 3 files failed / 7 passed, 1 test failed / 140 passed. Don't chase these when validating unrelated changes.
