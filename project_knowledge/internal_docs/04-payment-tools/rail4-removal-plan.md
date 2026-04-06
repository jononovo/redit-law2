# Rail 4 Removal — Technical Plan

**Goal:** Completely remove the Rail 4 "Self-Hosted Obfuscation Cards" system from the codebase. No backward compatibility. No feature flags. Clean cut.

**Why:** Rail 4 was the first-generation card payment system using split-knowledge obfuscation (fake merchant shops, decoy payment profiles, an obfuscation engine with warmup/active/idle phases). It has been superseded by Rail 5 (encrypted sub-agent cards). Rail 4 adds significant code complexity for a feature that is no longer needed.

---

## Phase 1: Pure Deletes ✅ COMPLETED

Files and directories that are entirely self-contained Rail 4 code. Nothing outside Rail 4 imports from them. Deleting them cannot break any other feature.

### Directories to delete

| # | Path | Contents | Why safe |
|---|------|----------|----------|
| 1 | `lib/rail4/` | `allowance.ts`, `obfuscation.ts` | Only imported by `app/api/v1/bot/merchant/checkout/route.ts` and `lib/approvals/rail4-fulfillment.ts` — both also deleted in this phase |
| 2 | `lib/obfuscation-engine/` | `state-machine.ts`, `scheduler.ts`, `events.ts` | Only imported by the merchant checkout route, the tick endpoint, the task queue endpoint, and rail4-fulfillment — all deleted in this phase |
| 3 | `lib/obfuscation-merchants/` | `catalog.ts`, `generator.ts` | Only imported by `lib/obfuscation-engine/scheduler.ts` — deleted in this phase |
| 4 | `app/api/v1/rail4/` | 12 route files: `initialize`, `submit-owner-data`, `cards`, `status`, `permissions`, `confirmations`, `confirm/[confirmationId]`, `create-bot`, `link-bot`, `freeze`, `obfuscation/tick`, `obfuscation/status`, `obfuscation/history` | Owner-facing Rail 4 API. No other rail or shared code calls these endpoints |
| 5 | `app/api/v1/bot/check/rail4/` | `route.ts`, `test/` | Bot-facing Rail 4 check endpoints. Not used by any other rail |
| 6 | `app/api/v1/bot/merchant/` | `checkout/route.ts`, `checkout/status/route.ts` | The unified checkout endpoint is 100% Rail 4. Every line references rail4 cards, obfuscation engine, fake profiles, profile allowances. Rail 5 has its own checkout at `app/api/v1/bot/rail5/checkout/`. No shared code |
| 7 | `app/api/v1/bot/tasks/` | `next/route.ts` | Obfuscation task queue. Only serves fake merchant tasks to bots |
| 8 | `app/(dashboard)/self-hosted/` | `page.tsx`, `[cardId]/page.tsx` | Self-hosted cards listing and detail UI pages |

### Files to delete

| # | Path | Why safe |
|---|------|----------|
| 9 | `components/dashboard/rail4-setup-wizard.tsx` | 7-step wizard for creating Rail 4 cards. Only rendered from `/self-hosted` page (deleted above) |
| 10 | `components/dashboard/rail4-card-manager.tsx` | Card permissions/obfuscation manager. Only rendered from `/self-hosted/[cardId]` page (deleted above) |
| 11 | `server/storage/rail4.ts` | Storage methods for `rail4_cards`, `obfuscation_events`, `obfuscation_state`, `profile_allowance_usage`. Only called by Rail 4 routes and components |
| 12 | `server/storage/rail4-guardrails.ts` | Storage methods for `rail4_guardrails` table and spend calculation against `checkout_confirmations`. Only called by Rail 4 checkout route and spending endpoint |
| 13 | `lib/approvals/rail4-fulfillment.ts` | Rail 4 approval fulfill/deny callbacks. Registered via `registerRailCallbacks("rail4", ...)`. Only imported by `lib/approvals/callbacks.ts` (edited in Phase 2) |
| 14 | `tests/e2e-checkout.ts` | End-to-end test for the Rail 4 merchant checkout flow |

### What explicitly STAYS (verified shared with Rail 5)

- `evaluateCardGuardrails()` in `lib/guardrails/evaluate.ts` — also used by `app/api/v1/bot/rail5/checkout/route.ts`
- `CardGuardrailRules`, `CardTransactionRequest`, `CardCumulativeSpend` in `lib/guardrails/types.ts` — shared types
- Guardrails tests for `evaluateCardGuardrails` in `tests/guardrails/evaluate.test.ts` — testing shared logic
- `GUARDRAIL_DEFAULTS.rail5` in `lib/guardrails/defaults.ts` — only the `rail4` block is removed (Phase 2)
- `lib/approvals/callbacks.ts` — stays, just needs the `import "./rail4-fulfillment"` line removed (Phase 2)

### Verification

After Phase 1 deletes, run `npx next build` (or start the dev server) and confirm no import errors. The only expected errors will be in files touched by Phase 2 (e.g., `server/storage/index.ts` still imports `rail4Methods`). These are resolved in Phase 2.

---

## Phase 2: Surgical Edits to Shared Code ✅ COMPLETED

Files that contain both Rail 4 and non-Rail 4 code. Each edit removes only the Rail 4 portions.

### Storage layer

| File | Edit |
|------|------|
| `server/storage/index.ts` | Remove `import { rail4Methods }` and `import { rail4GuardrailMethods }`. Remove `...rail4Methods` and `...rail4GuardrailMethods` from the spread |
| `server/storage/types.ts` | Remove all Rail 4 interface methods (~30 lines): `createRail4Card`, `getRail4Card*`, `updateRail4Card*`, `deleteRail4Card*`, `createObfuscationEvent`, `getObfuscationEvents*`, `getPendingObfuscationEvents`, `completeObfuscationEvent`, `updateObfuscationEventConfirmation`, `getObfuscationState`, `createObfuscationState`, `updateObfuscationState`, `getActiveObfuscationStates`, `getRail4Guardrails`, `upsertRail4Guardrails`, `getRail4DailySpendCents`, `getRail4MonthlySpendCents`. Also remove `rail4` from `getMasterDailySpend`/`getMasterMonthlySpend` return types (change `{ rail1: number; rail2: number; rail4: number; total: number }` → `{ rail1: number; rail2: number; total: number }`) |
| `server/storage/master-guardrails.ts` | Remove `rail4` from the daily/monthly spend aggregation queries (the functions that compute cross-rail totals) |

### Schema

| File | Edit |
|------|------|
| `shared/schema.ts` | Remove table definitions: `rail4Cards`, `obfuscationEvents`, `obfuscationState`, `profileAllowanceUsage`, `checkoutConfirmations`, `rail4Guardrails`. Remove all associated types (`Rail4Card`, `InsertRail4Card`, `ObfuscationEvent`, `InsertObfuscationEvent`, `ObfuscationState`, `InsertObfuscationState`, `ProfileAllowanceUsage`, `InsertProfileAllowanceUsage`, `CheckoutConfirmation`, `InsertCheckoutConfirmation`, `Rail4Guardrail`, `InsertRail4Guardrail`). Remove Zod schemas: `profilePermissionSchema`, `rail4InitializeSchema`, `rail4SubmitOwnerDataSchema`, `upsertRail4GuardrailsSchema`, `unifiedCheckoutSchema`. Remove `"rail4"` from the scope enum (line ~755). Remove `"rail4"` from the rail enum (line ~1055). Keep `"self_hosted_card"` in checkout method enum for now (addressed in Phase 4 with vendor data) |

### Guardrails and approvals

| File | Edit |
|------|------|
| `lib/guardrails/defaults.ts` | Remove the `rail4: { ... }` block (lines 27-33). Keep `rail5` |
| `lib/approvals/callbacks.ts` | Remove `import "./rail4-fulfillment"` |
| `lib/approvals/lifecycle.ts` | Remove `RAIL4_APPROVAL_TTL_MINUTES` constant and `rail4` entry from the TTL map |
| `lib/approvals/email.ts` | Remove `rail4: "Self-Hosted Card"` label |
| `lib/orders/types.ts` | Remove `"rail4"` from the rail union type: `"rail1" \| "rail2" \| "rail5"` |

### Agent management

| File | Edit |
|------|------|
| `lib/agent-management/bot-linking.ts` | Remove the `rail4` linking strategy (lines ~62-75) |
| `lib/agent-management/rate-limit.ts` | Remove 3 entries: `/api/v1/bot/merchant/checkout`, `/api/v1/bot/merchant/checkout/status`, `/api/v1/bot/check/rail4` |
| `lib/agent-management/agent-api/status-builders.ts` | Remove `buildRail4Detail()` function |

### Bot API routes

| File | Edit |
|------|------|
| `app/api/v1/bots/rails/route.ts` | Remove `storage.getRail4CardsByOwnerUid` call, the `rail4ByBot` map construction, and the `rails.self_hosted_cards` response block |
| `app/api/v1/bots/spending/route.ts` | Remove all Rail 4 guardrail/spending logic (GET and PATCH branches for rail4 cards, procurement controls for scope "rail4") |
| `app/api/v1/bots/default-rail/route.ts` | Remove `"self_hosted_cards"` from `VALID_RAILS` array |
| `app/api/v1/bot/status/route.ts` | Remove the `rails.self_hosted_cards` block |

### Dashboard UI

| File | Edit |
|------|------|
| `components/dashboard/sidebar.tsx` | Remove the self-hosted nav entry (line ~52: `{ icon: Shield, label: "My Card", subtitle: "Split-Knowledge", href: "/self-hosted", ... }`) |
| `app/(dashboard)/cards/page.tsx` | Remove the "Self-Hosted Cards" banner/link (the text referencing self-hosted cards and the Link to `/self-hosted`) |
| `app/(dashboard)/settings/page.tsx` | Remove `self_hosted_cards` from the rail config object (line ~283), remove `rail4_usd` from the spending type definitions (lines ~33-34), remove the "Self-Hosted" row from the spending display (line ~65) |
| `app/(dashboard)/overview/page.tsx` | Remove the self-hosted tooltip text (line ~409) |
| `app/admin123/transactions/page.tsx` | Remove `rail4: "Card (SK)"` label |
| `app/robots.ts` | Remove `/self-hosted` from disallow list |

---

## Phase 3: Checkout Confirmation Table Consumers ✅ COMPLETED (verified via grep)

The `checkoutConfirmations` table is being removed (Phase 2 schema). Verify all consumers are already deleted by Phases 1-2:

- `app/api/v1/bot/merchant/checkout/route.ts` — writes confirmations → deleted Phase 1
- `app/api/v1/bot/merchant/checkout/status/route.ts` — reads confirmations → deleted Phase 1
- `app/api/v1/rail4/confirmations/route.ts` — lists pending → deleted Phase 1
- `app/api/v1/rail4/confirm/[confirmationId]/route.ts` — processes approval → deleted Phase 1
- `lib/approvals/rail4-fulfillment.ts` — reads confirmation on approve → deleted Phase 1
- `server/storage/rail4-guardrails.ts` — spends query against confirmations → deleted Phase 1
- `server/storage/rail4.ts` — CRUD methods → deleted Phase 1

No remaining consumers. Safe to drop from schema.

---

## Phase 4: Vendor/Taxonomy Data ✅ COMPLETED

`self_hosted_card` appears as a checkout method in the procurement skills system. This is a taxonomy value, not Rail 4 runtime code, but should be cleaned up for consistency.

| File | Edit |
|------|------|
| `lib/procurement-skills/taxonomy/checkout-methods.ts` | Remove `"self_hosted_card"` from the union type, labels map, and colors map |
| `lib/procurement-skills/package/skill-json.ts` | Remove the `self_hosted_card` → `"self_hosted"` and `"rail4"` mappings |
| `lib/catalog/parse-filters.ts` | Remove `self_hosted_card: "Card Checkout"` filter label |
| `app/skills/vendor-card.tsx` | Remove `self_hosted_card` icon entry |
| `app/skills/[vendor]/skill-detail-content.tsx` | Remove `self_hosted_card` icon entry |
| `shared/schema.ts` | Remove `"self_hosted_card"` from the `checkoutMethod` enum |
| 12 vendor files in `lib/procurement-skills/vendors/` | Remove `"self_hosted_card"` from `checkoutMethods` arrays and remove the `self_hosted_card: { ... }` payment detail blocks. Files: `amazon.ts`, `amazon-business.ts`, `walmart.ts`, `walmart-business.ts`, `shopify.ts`, `home-depot.ts`, `lowes.ts`, `grainger.ts`, `mcmaster-carr.ts`, `uline.ts`, `office-depot.ts`, `staples.ts`, `newegg.ts`, `bh-photo.ts`. Some vendors (like `amazon.ts`, `shopify.ts`) have other checkout methods and keep those. Vendors where `self_hosted_card` is the only method get `"browser_automation"` as a reasonable default |
| `content/agentic-commerce-standard.md` | Remove `self_hosted_card` from the protocol list and checkout method enum |

---

## Phase 5: Documentation Cleanup ✅ COMPLETED

| File | Action |
|------|--------|
| `project_knowledge/internal_docs/04-payment-tools/rail4-self-hosted-cards-system-Obsolete.md` | Delete |
| `project_knowledge/architecture.md` | Remove Rail 4 from module 4 payment tools table |
| `replit.md` | Remove all rail4/self-hosted/obfuscation references |
| `docs/content/sections.ts` | Remove "encrypted-cards" section entry (line ~50) — this covers the self-hosted+encrypted cards combined page |
| `docs/content/wallets/encrypted-cards.md` | Review and remove any self-hosted card content (may need to keep encrypted/Rail 5 content if mixed) |
| `docs/content/site/safety.md` | Remove self-hosted card references |
| `docs/content/wallets/creating-a-wallet.md` | Remove self-hosted card references |
| `docs/content/wallets/wallet-types.md` | Remove self-hosted card references |
| `docs/content/getting-started/dashboard-overview.md` | Remove self-hosted card references |
| `docs/content/api/endpoints/bots.md` | Remove self-hosted card API references |
| `docs/content/api/endpoints/skills.md` | Remove `self_hosted_card` from checkout method documentation |
| Other project_knowledge files with rail4 references | Remove or update references |

---

## Phase 6: Database Table Cleanup

After all code changes are complete and verified:

1. Run `npx drizzle-kit push --force` to drop orphaned tables from the dev database:
   - `rail4_cards`
   - `obfuscation_events`
   - `obfuscation_state`
   - `profile_allowance_usage`
   - `checkout_confirmations`
   - `rail4_guardrails`

2. On next deploy, Replit's deployment runs `drizzle-kit push` against production, which will also drop these tables there.

**Data loss:** All Rail 4 card records, obfuscation events, and checkout confirmations will be permanently deleted from both dev and production databases. This is intentional — Rail 4 is being fully decommissioned.

---

## Execution Order

Phases must be executed in order (1 → 2 → 3 → 4 → 5 → 6) within a single session. The codebase will not compile between Phase 1 and Phase 2 completion because `server/storage/index.ts` will still import deleted files. Phase 3 is a verification step. Phases 4 and 5 are independent of each other and can be done in either order after Phase 3.

---

## Estimated Scope

- ~14 files/directories deleted (Phase 1)
- ~25 files edited (Phases 2-4)
- ~12 doc files updated or deleted (Phase 5)
- 6 database tables dropped (Phase 6)
- Total: ~50 file operations
