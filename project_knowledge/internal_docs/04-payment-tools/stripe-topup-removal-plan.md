# Stripe Top-Up Wallet Funding System — Removal Plan

**Created:** 2026-04-06
**Status:** PLANNING — deep-dive verified, no code changes yet
**Policy:** Cleanup not massacre — remove only dead code, preserve all live functionality

---

## Background

The codebase has two completely separate "wallet" concepts:

| System | Status | What it does |
|--------|--------|-------------|
| **Rail 1 — Privy/USDC crypto wallet** | ✅ LIVE | Auto-created on signup. Funded via Stripe Crypto Onramp. Lives in `lib/crypto-onramp/`, `app/api/v1/stripe-wallet/`. |
| **Ledger wallet (wallets/transactions tables)** | ⚠️ PARTIALLY LIVE | Postgres cents-based ledger. The **funding side** (Stripe `chargeCustomer`, payment methods, fund modal, payment links) is dead. But Rail 5 checkout, x402, qr-pay, and base-pay all actively use the balance/debit/credit as a spending budget. |

**Goal:** Remove the dead Stripe-based funding mechanism for the ledger wallet. Do NOT touch Rail 1 or the spending-budget usage of the wallets/transactions tables.

### Webhook clarification

There are THREE separate Stripe webhook routes:
1. `app/api/v1/stripe-wallet/webhooks/stripe/route.ts` — **LIVE Rail 1.** Handles `crypto.onramp_session.updated` for Stripe Crypto Onramp. Uses `STRIPE_WEBHOOK_SECRET_ONRAMP`. Do NOT touch.
2. `app/api/v1/webhooks/stripe/route.ts` — **DEAD.** Handles `checkout.session.completed` ONLY for the old bot payment-link fulfillment flow (crediting ledger wallet). Uses `STRIPE_WEBHOOK_SECRET`. This is the one being removed.
3. `app/api/v1/webhooks/route.ts`, `health/`, `retry-pending/` — **LIVE.** The outbound webhook delivery system (sending events TO bots). Completely different system. Do NOT touch.

### Invoices clarification

The invoices system (`app/(dashboard)/invoices/`, `app/api/v1/invoices/`) is a **modern, live feature** built as part of the selling/shop system. It uses checkout pages, sales tables, and Rail 1 USDC wallets. The word "payment link" in the invoices page is just a UI label for the invoice's checkout URL — it does NOT use the dead `paymentLinks` table. **Do NOT touch invoices.**

---

## What MUST Be Preserved (DO NOT TOUCH)

### Rail 1 — Crypto Onramp (completely separate system)
- `lib/crypto-onramp/stripe-onramp/` — session creation, webhook handling
- `app/api/v1/stripe-wallet/` — all routes (onramp session, webhooks, balance, transactions, list)
- `app/api/v1/checkout/[id]/pay/stripe-onramp/route.ts`
- The `stripe` object export from `lib/stripe.ts` (used by Rail 1)
- `lib/payments/components/fund-wallet-sheet.tsx` — LIVE Rail 1 funding UI (NOT the dead FundModal)
- `lib/payments/types.ts`, `methods.ts` — "topup" mode here means Rail 1 funding, not the dead system

### Rail 5 + x402 + qr-pay + base-pay — Spending Budget
- `app/api/v1/bot/rail5/checkout/route.ts` — balance check against wallets table
- `app/api/v1/bot/rail5/confirm/route.ts` — debit from wallets table
- `app/api/v1/bots/register/route.ts` — creates wallet row on bot claim
- `app/api/v1/bot/wallet/check/route.ts` — balance check endpoint
- `app/api/v1/bot/wallet/transactions/route.ts` — bot API to view own transaction history (LIVE)
- `app/api/v1/bot/status/route.ts` — includes wallet info
- `lib/x402/checkout.ts`, `lib/qr-pay/ledger.ts`, `lib/base-pay/ledger.ts` — credit wallet
- `notifyBalanceLow`, `notifyPurchase` in `lib/notifications.ts`

### Dashboard endpoints showing LIVE wallet data
- **`app/api/v1/wallet/balance/route.ts`** — KEEP! Shows spending budget on overview page.
- **`app/api/v1/wallet/transactions/route.ts`** — KEEP! Shows purchase history on transactions page.
- **`app/(dashboard)/transactions/page.tsx`** — KEEP! Live transaction history page.

### Tables to KEEP
- `wallets` (8 rows, active spending budget)
- `transactions` (active purchase/credit ledger)
- `payment_methods` (used by billing routes, out of scope)
- `reconciliation_logs` (used by live reconciliation system)

### Other systems — out of scope
- Billing routes (`app/api/v1/billing/`) + `paymentMethods` storage methods
- Reconciliation system (`admin/reconciliation/`, `ops-health.tsx`, `reconciliation_logs` table)
- `payment-setup.tsx` (tied to billing routes)
- Invoices system (modern, live, uses checkout pages not paymentLinks table)

---

## Phase A: Remove Dead Feature Files + Fix Imports

The core dead feature: Stripe `chargeCustomer` funding, payment links, topup requests.

### A1. DELETE entire files (10 files):

**Dead API routes (7 files):**
| # | File | What it does | Verified callers (all dead) |
|---|------|-------------|---------------------------|
| 1 | `app/api/v1/wallet/fund/route.ts` | Stripe chargeCustomer funding endpoint | `fund-modal.tsx` (dead, deleting), `fund-wallet.tsx` (dead orphan, deleting) |
| 2 | `app/api/v1/bot/payments/create-link/route.ts` | Bot creates Stripe payment link | rate-limit.ts config entry only (editing in Phase B) |
| 3 | `app/api/v1/bot/payments/links/route.ts` | Bot lists its own payment links | rate-limit.ts config entry only (editing in Phase B) |
| 4 | `app/api/v1/bot/wallet/topup-request/route.ts` | Bot requests owner to top up via email | rate-limit.ts config (Phase B), activity-log.tsx label (Phase C) |
| 5 | `app/api/v1/payment-links/route.ts` | Dashboard lists payment links | `payment-links.tsx` component (dead, deleting) |
| 6 | `app/api/v1/payment-links/[id]/route.ts` | Get single payment link by ID | `payment/success/page.tsx` (dead, deleting) |
| 7 | `app/payment/success/page.tsx` | Payment link success page | `create-link/route.ts` success_url (dead, deleting) |

**Dead frontend components (3 files):**
| # | File | Verified importers |
|---|------|-------------------|
| 8 | `components/dashboard/fund-modal.tsx` | Only: `overview/page.tsx` line 6 (editing in A2) |
| 9 | `components/dashboard/payment-links.tsx` | Only: `overview/page.tsx` line 10 (editing in A2) |
| 10 | `components/onboarding/steps/fund-wallet.tsx` | NONE — orphan file. Not imported by `onboarding-wizard.tsx` or anything else. |

### A2. EDIT files to fix broken imports (9 files):

| # | File | What to remove | What to KEEP |
|---|------|---------------|-------------|
| 1 | `app/(dashboard)/overview/page.tsx` | `FundModal` import (line 6). `PaymentLinksPanel` import (line 10). `fundOpen` state (line 62). "Add Funds" dark card (lines 283-297). `<PaymentLinksPanel />` (line 463). `<FundModal>` render (lines 471-475). | `wallet/balance` fetch (line 82). Balance stat display (lines 269-273). `FundWalletSheet` import+render (lines 28, 518 — Rail 1). `Wallet` icon import (still used at line 399). All other components. |
| 2 | `lib/stripe.ts` | `chargeCustomer()` function (lines 37-56). | `stripe` object. `getOrCreateCustomer`, `createSetupIntent`, `getPaymentMethodDetails`, `detachPaymentMethod` (used by billing routes). |
| 3 | `lib/notifications.ts` | `notifyTopupCompleted` function (line 137+). `notifyPaymentReceived` function (line 159+). `"topup_request"`, `"topup_completed"`, `"payment_received"` from `NotificationType` union. | `notifyBalanceLow` (Rail 5 confirm). `notifyPurchase` (Rail 5 confirm). `NotificationType` union with remaining live types. |
| 4 | `lib/email.ts` | `sendTopupRequestEmail` function (line 252+). | All other email functions. |
| 5 | `server/storage/core.ts` | `createTopupRequest` method (line 299). `topupRequests` from import (line 3). `InsertTopupRequest`/`TopupRequest` types from import (line 9). | All wallet/transaction methods (`creditWallet`, `debitWallet`, etc.). All reconciliation methods. All `paymentMethods` methods (billing, out of scope). |
| 6 | `server/storage/payment-links.ts` | Remove the 7 payment-link methods: `createPaymentLink`, `getPaymentLinksByBotId`, `getPaymentLinkByStripeSession`, `getPaymentLinkByPaymentLinkId`, `getPaymentLinksByOwnerUid`, `updatePaymentLinkStatus`, `completePaymentLink`. Remove `paymentLinks` table import and `PaymentLink`/`InsertPaymentLink` type imports. Update the `PaymentLinkMethods` Pick type to only include the kept methods. Rename file or Pick type to reflect new scope. | **CRITICAL — DO NOT DELETE THIS FILE.** It also contains 6 LIVE methods: `createPairingCode` (used by `pairing-codes/route.ts`), `getPairingCodeByCode` (used by `pairing-codes/status/route.ts`), `claimPairingCode` (used by `bots/register/route.ts`), `getRecentPairingCodeCount` (used by `pairing-codes/route.ts`), `addWaitlistEntry` (used by `waitlist/route.ts`), `getWaitlistEntryByEmail` (used by `waitlist/route.ts`, `addWaitlistEntry` itself). Also keep the `pairingCodes` and `waitlistEntries` table imports. |
| 7 | `server/storage/index.ts` | Rename import if file is renamed (e.g. `paymentLinkMethods` → new name). | Keep the import/spread — the file still provides live pairing code and waitlist methods. |
| 8 | `server/storage/types.ts` | `PaymentLink`, `InsertPaymentLink` type imports (line 12). `TopupRequest`, `InsertTopupRequest` type imports (line 7). `createTopupRequest` signature (line 84). All 7 payment-link method signatures (lines 108-114). | All wallet/transaction method signatures. All reconciliation signatures. All `paymentMethods` signatures. Pairing code signatures (lines 116-119). Waitlist signatures (lines 121-122). |
| 9 | `shared/schema.ts` | `paymentLinks` table definition (line 138). `topupRequests` table definition (line 67). `topupRequestSchema` Zod (line 208). `fundWalletRequestSchema` Zod (line 196). `createPaymentLinkSchema` Zod (line 255). `TopupRequest`/`InsertTopupRequest` types (lines 223-224). `PaymentLink`/`InsertPaymentLink` types (lines 233-234). | `wallets`, `transactions`, `paymentMethods`, `reconciliationLogs`, `pairingCodes`, `waitlistEntries` table definitions. All related insert/select types for kept tables. |

### A3. Database (after schema edit):
Run `npx drizzle-kit push --force` to drop `payment_links` and `topup_requests` tables (0 rows each).

### A4. Build test:
- `npx next build` to verify no broken imports
- Verify overview page loads, transactions page loads

---

## Phase B: Clean Up Dead Webhook Route, Event Types & Rate Limits

Remove the legacy Stripe webhook route and residual references to webhook events and rate-limit entries that only existed for the dead flows.

### B1. DELETE entire file (1 file):
| # | File | Why dead | Verified callers |
|---|------|----------|-----------------|
| 1 | `app/api/v1/webhooks/stripe/route.ts` | Only handles `checkout.session.completed` for dead payment-link fulfillment. | No other file calls or imports this route. Uses `STRIPE_WEBHOOK_SECRET` env var (will become unused). The LIVE Stripe webhook is at `stripe-wallet/webhooks/stripe/route.ts` using `STRIPE_WEBHOOK_SECRET_ONRAMP`. |

### B2. EDIT files (5 files):

| # | File | What to remove | Verified: only fired/used by dead code |
|---|------|---------------|---------------------------------------|
| 1 | `lib/webhooks/delivery.ts` | `"wallet.topup.completed"` (line 17) and `"wallet.payment.received"` (line 21) from `WebhookEventType` union. | `wallet.topup.completed` only fired by dead `fund/route.ts` (line 82). `wallet.payment.received` only fired by dead `webhooks/stripe/route.ts` (line 77). Live callers use `wallet.sale.completed`, `purchase.approved`, `purchase.rejected`, `rail5.checkout.*`, `rails.updated`, etc. — all unaffected. The `sendToBot` function casts `string → WebhookEventType`, so narrowing the union is safe. |
| 2 | `lib/agent-management/bot-messaging/expiry.ts` | `"wallet.topup.completed": 168` (line 7) and `"wallet.payment.received": 168` (line 11) from expiry Record. | Only looked up when these event types are sent — which is never after dead code removal. Removing entries just means they'd get default expiry if somehow triggered. |
| 3 | `lib/agent-management/rate-limit.ts` | `"/api/v1/bot/wallet/topup-request"` (line 11), `"/api/v1/bot/payments/create-link"` (line 13), `"/api/v1/bot/payments/links"` (line 14). | These are rate-limit configs for the 3 dead bot API routes being deleted in Phase A. |
| 4 | `components/dashboard/webhook-log.tsx` | `"wallet.topup.completed": "Top-up Completed"` (line 25). | Display label for dead event type. If somehow received, would just show the raw event string instead of pretty label. `wallet.payment.received` has no label here already. |
| 5 | `components/dashboard/notification-popover.tsx` | `case "topup_completed": return "💰"` (line 32-33) and `case "topup_request": return "📩"` (line 36-37) from `typeIcon` switch. | These notification types were only created by `notifyTopupCompleted` (dead) and via topup-request flow (dead). Removing cases means they'd fall through to `default: "🔔"`. |

### B3. Optional (backwards-compatible stub — recommend keep for now):
- `app/api/v1/bot/wallet/check/route.ts` — has `pending_topups: 0` hardcoded (line 55). This is a response field that existing bot integrations might check. Safe to leave as a zero-value stub.

### B4. KEEP (do not confuse with dead webhook):
- `app/api/v1/webhooks/route.ts` — LIVE outbound webhook delivery system
- `app/api/v1/webhooks/health/route.ts` — LIVE webhook health check
- `app/api/v1/webhooks/retry-pending/route.ts` — LIVE webhook retry
- `app/api/v1/stripe-wallet/webhooks/stripe/route.ts` — LIVE Rail 1 onramp webhook

### B5. Env variable note:
- `STRIPE_WEBHOOK_SECRET` (without `_ONRAMP`) will become unused after removing the dead webhook route. The live onramp uses `STRIPE_WEBHOOK_SECRET_ONRAMP`. No need to delete the env var — just noting it's now orphaned.

### B6. Build test:
- `npx next build` to verify build still clean after Phase B edits

---

## Phase C: Dashboard UI Label Cleanup

Remove dead UI labels in dashboard components that reference removed features. These are cosmetic — the components themselves are live, but they have label/emoji entries for features that no longer exist.

| # | File | What to remove | What to KEEP |
|---|------|---------------|-------------|
| 1 | `components/dashboard/activity-log.tsx` | `"/api/v1/bot/wallet/topup-request": "Top-up Request"` label (line 23). | `"/api/v1/bot/wallet/transactions": "Transactions"` — that endpoint is LIVE. All other labels. |

---

## Phase D: Documentation Cleanup

Remove all documentation references to the dead payment-links, topup-request, and Stripe wallet funding features.

### D1. API docs:
| # | File | Change |
|---|------|--------|
| 1 | `docs/content/api/endpoints/wallets.md` | Remove topup-request endpoint docs (lines 145-193) |
| 2 | `docs/content/api/endpoints/checkout-pages.md` | Remove "List Payment Links" and "Create Payment Link" sections (lines 134+) |
| 3 | `docs/content/api/introduction.md` | Remove "Stripe payment links" reference (line 30) |
| 4 | `docs/content/api/webhooks/events.md` | Remove topup-request reference (line 461) |
| 5 | `docs/content/site/homepage.md` | Update "payment links" mention (line 16) |

### D2. Internal docs:
| # | File | Change |
|---|------|--------|
| 6 | `project_knowledge/architecture.md` | Remove Payment Links row from table (line 217) and references (lines 200, 268) |
| 7 | `project_knowledge/testing.md` | Remove topup-request and payment-links test commands |
| 8 | `project_knowledge/tenants_vision/creditclaw.md` | Update payment links reference (line 80) |
| 9 | `project_knowledge/internal_docs/07-platform-management/dashboard-overview.md` | Update layout description — remove PaymentLinksPanel (line 19) and "Add Funds card" (line 13) |
| 10 | `replit.md` | Update to reflect removed routes/components |

---

## Execution Order

1. **Phase A** — Core dead feature removal (10 deletions, 9 edits, DB push)
2. **Build test** — `npx next build`
3. **Phase B** — Dead webhook route + event types + rate limits (1 deletion, 5 edits)
4. **Build test** — `npx next build`
5. **Phase C** — Dashboard UI label cleanup (1 edit)
6. **Phase D** — Documentation cleanup (10 file edits)
7. **Final verification** — Overview page loads, transactions page loads, app builds clean

---

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Breaking Rail 1 crypto onramp | Completely separate codepath. `stripe` object, `FundWalletSheet`, onramp webhook all preserved. `lib/payments/types.ts` "topup" mode is Rail 1, not the dead system. |
| Breaking Rail 5 spending budget | `wallets`/`transactions` tables, all Rail 5 routes, `creditWallet`/`debitWallet` all preserved. |
| Breaking dashboard balance/transactions | `wallet/balance` and `wallet/transactions` routes are KEPT. Balance stat and transactions page preserved. `Wallet` icon import preserved (used at line 399). |
| Breaking live Stripe webhook (onramp) | Dead webhook at `webhooks/stripe/` (uses `STRIPE_WEBHOOK_SECRET`). Live onramp at `stripe-wallet/webhooks/stripe/` (uses `STRIPE_WEBHOOK_SECRET_ONRAMP`). Different paths, different secrets. |
| Breaking outbound webhook system | `webhooks/route.ts`, `health/`, `retry-pending/` untouched. Only removing 2 dead event types from type union. `sendToBot` casts `string → WebhookEventType`, so narrowing is safe. |
| Breaking billing routes | `payment_methods` table, billing routes, all billing storage methods are out of scope, not touched. |
| Breaking reconciliation | Not Stripe-specific. Routes, component, table, storage methods all preserved. Reconciliation SQL references `'payment_received'` transaction type — this is just a data filter, safe to keep. |
| Breaking invoices | Invoices use checkout URLs, not the `paymentLinks` table. Completely separate modern feature. |
| Broken import after file deletion | Every deleted file's importers are mapped — all will be edited (Phase A2) or are also being deleted. |
| Breaking bot API backwards compatibility | `pending_topups: 0` stub in wallet/check kept for existing integrations. |

---

## Deep-Dive Verification Log

### Round 1 — Initial plan + first double-check:
1. `wallet/balance/route.ts` incorrectly marked for deletion → KEPT (live spending budget, fetched by overview page)
2. `wallet/transactions/route.ts` incorrectly marked for deletion → KEPT (live purchase history, used by transactions page)
3. Reconciliation system incorrectly marked for deletion → KEPT (generic ledger health, not Stripe-specific)
4. Missing: `payment-links/route.ts` and `[id]/route.ts` → ADDED to deletion list
5. Missing: `fund-wallet.tsx` orphan → ADDED
6. Missing: Rate limit entries → ADDED
7. `payment-setup.tsx` incorrectly marked for deletion → KEPT (billing system)
8. `reconciliation_logs` table incorrectly marked for dropping → KEPT
9. Storage methods for reconciliation incorrectly scoped → KEPT

### Round 2 — User questions + broader sweep:
10. Missing: `bot/payments/links/route.ts` → ADDED
11. Found residual string references in webhook-log, notification-popover, delivery.ts, expiry.ts → ADDED to Phase B
12. Confirmed `webhooks/stripe/route.ts` is legacy duplicate — live onramp at different path with different secret
13. Confirmed invoices system is modern/live — "payment link" label is for checkout URL
14. Restructured into Phases A/B/C/D per user request

### Round 3 — Full deep-dive of Phase A + Phase B:
15. Traced every caller of every delete target — all confirmed dead. No live code calls any of the 12 files being deleted.
16. Traced every function being removed from edit targets — each has exactly ONE caller, and that caller is a dead route being deleted.
17. Verified `Wallet` icon import stays needed in overview page (line 399 — empty wallet state)
18. Verified `creditWallet` is called by LIVE systems (x402, qr-pay, base-pay) — correctly preserved
19. Verified `FundWalletSheet` vs `FundModal` — completely different components, different paths, different systems
20. Found `'payment_received'` reference in reconciliation SQL (`getTransactionSumByWalletId` line 327) — just a data-level filter, not a code dependency. Safe to keep.
21. Found `'topup'` transaction type actively written by live `base-pay/verify/route.ts` (line 41) — reconciliation SQL correctly counts these. Not affected by removal.
22. Verified `WebhookEventType` union narrowing is safe — `sendToBot` casts from `string`, doesn't use literal types from the union
23. Confirmed `STRIPE_WEBHOOK_SECRET` (without `_ONRAMP`) only used by dead webhook route
24. Found `dashboard-overview.md` internal doc references PaymentLinksPanel + "Add Funds card" → ADDED to Phase D

### Round 4 — Phase A file-by-file re-read of actual source code:
25. **CRITICAL FIX: `server/storage/payment-links.ts` CANNOT be deleted.** The file contains 6 LIVE methods alongside the 7 dead payment-link methods: `createPairingCode` (used by `pairing-codes/route.ts`), `getPairingCodeByCode` (used by `pairing-codes/status/route.ts`), `claimPairingCode` (used by `bots/register/route.ts`), `getRecentPairingCodeCount` (used by `pairing-codes/route.ts`), `addWaitlistEntry` (used by `waitlist/route.ts`), `getWaitlistEntryByEmail` (used by `waitlist/route.ts` and `addWaitlistEntry`). Moved from A1 (DELETE) to A2 (EDIT) — remove only the 7 payment-link methods, keep all 6 pairing/waitlist methods.
26. Phase A file counts corrected: DELETE 11→10, EDIT 8→9.
27. Verified all 10 deletion targets by reading full source — all confirmed dead, no hidden live code in any of them.
28. Verified all 9 edit targets by reading the relevant sections — confirmed every removal is surgical and every "KEEP" item is truly untouched.
29. Confirmed `server/storage/index.ts` line 4 imports from `payment-links.ts` and line 34 spreads `paymentLinkMethods` — since file is now edited (not deleted), the import/spread stays, just points to the trimmed file.
30. Confirmed `server/storage/types.ts` has pairing code signatures (lines 116-119) and waitlist signatures (lines 121-122) that must be preserved.

### Round 5 — Phase A execution simulation (tracing resulting code):
31. **Verified overview/page.tsx removal safety**: `fundOpen`/`setFundOpen` only referenced at lines 62, 285, 472, 473 — all within the dead Add Funds card and FundModal render. No other code uses them. `Wallet` icon confirmed still needed at line 399 (empty wallet state) — must NOT be removed from lucide-react import line 11.
32. **Verified all 3 Zod schemas + 2 table definitions + 4 type exports in schema.ts only imported by dead files** (being deleted) or dead storage (being edited). No live code imports any of them.
33. **Schema.ts adjacency risk identified and documented**: When removing `fundWalletRequestSchema` (lines 196-199) and `topupRequestSchema` (lines 208-211), the LIVE `claimBotRequestSchema` (lines 192-194, used by `bots/claim/route.ts`) and `purchaseRequestSchema` (lines 201-206, currently unused but not dead enough to remove) sit between them. Must remove by exact block, not line range. Similarly, `waitlistEmailSchema` (lines 250-253, used by `waitlist/route.ts`) sits right before `createPaymentLinkSchema` (lines 255-259). Must not clip it.
34. **Verified `chargeCustomer` only imported by dead `fund/route.ts`** (line 3). No other file imports it.
35. **Verified `notifyTopupCompleted` only imported by dead `fund/route.ts`** (line 7), `notifyPaymentReceived` only imported by dead `webhooks/stripe/route.ts` (line 6), `sendTopupRequestEmail` only imported by dead `topup-request/route.ts` (line 5). All importers being deleted.
36. **Verified `payment-links.ts` drizzle-orm import cleanup needed**: After removing payment-link methods, `desc` and `inArray` become unused (only used by the dead methods). Remaining pairing/waitlist methods only use `eq`, `and`, `sql`, `gte`. Must trim import to avoid TypeScript warnings.
37. **Verified `payment-links.ts` Pick type update**: After removing 7 payment-link method names from the Pick, it picks only 6 pairing/waitlist methods. The `paymentLinkMethods` export name becomes misleading but functionally correct — can rename to `pairingAndWaitlistMethods` for clarity.
38. **Verified `addWaitlistEntry` uses `this.getWaitlistEntryByEmail(...)` (line 131)** — `this` works because it refers to the exported const object, and `getWaitlistEntryByEmail` remains on that object after the edit.
39. **Verified `IStorage` interface will still be fully satisfied**: After removing 7 payment-link signatures + `createTopupRequest` from IStorage, and removing those same 8 implementations from the storage files, the spread in `index.ts` still provides all required methods.
40. **Verified both `payment_links` and `topup_requests` tables are empty** (0 rows each via SQL query). `drizzle-kit push --force` will safely drop them.
41. **Verified drizzle migration snapshots**: `drizzle/0000_late_giant_girl.sql` references these tables but is immutable history. Not touched.
42. **Verified `core.ts` import cleanup**: Line 3 has `topupRequests` table import and line 9 has `type TopupRequest, type InsertTopupRequest` — both removed cleanly without affecting surrounding imports (`bots, wallets, transactions, paymentMethods, apiAccessLogs` on same line stay).

---

## Files Summary

### Phase A — DELETE (10 files):
1. `app/api/v1/wallet/fund/route.ts`
2. `app/api/v1/bot/payments/create-link/route.ts`
3. `app/api/v1/bot/payments/links/route.ts`
4. `app/api/v1/bot/wallet/topup-request/route.ts`
5. `app/api/v1/payment-links/route.ts`
6. `app/api/v1/payment-links/[id]/route.ts`
7. `app/payment/success/page.tsx`
8. `components/dashboard/fund-modal.tsx`
9. `components/dashboard/payment-links.tsx`
10. `components/onboarding/steps/fund-wallet.tsx`

### Phase A — EDIT (9 files):
1. `app/(dashboard)/overview/page.tsx`
2. `lib/stripe.ts`
3. `lib/notifications.ts`
4. `lib/email.ts`
5. `server/storage/core.ts`
6. `server/storage/payment-links.ts` (**NOT deleted** — contains live pairing code + waitlist methods)
7. `server/storage/index.ts`
8. `server/storage/types.ts`
9. `shared/schema.ts`

### Phase B — DELETE (1 file):
1. `app/api/v1/webhooks/stripe/route.ts`

### Phase B — EDIT (5 files):
1. `lib/webhooks/delivery.ts`
2. `lib/agent-management/bot-messaging/expiry.ts`
3. `lib/agent-management/rate-limit.ts`
4. `components/dashboard/webhook-log.tsx`
5. `components/dashboard/notification-popover.tsx`

### Phase C — EDIT (1 file):
1. `components/dashboard/activity-log.tsx`

### Phase D — EDIT (10 files):
1. `docs/content/api/endpoints/wallets.md`
2. `docs/content/api/endpoints/checkout-pages.md`
3. `docs/content/api/introduction.md`
4. `docs/content/api/webhooks/events.md`
5. `docs/content/site/homepage.md`
6. `project_knowledge/architecture.md`
7. `project_knowledge/testing.md`
8. `project_knowledge/tenants_vision/creditclaw.md`
9. `project_knowledge/internal_docs/07-platform-management/dashboard-overview.md`
10. `replit.md`

### KEEP (explicitly preserved):
- `lib/crypto-onramp/` — entire Rail 1 system
- `lib/payments/components/fund-wallet-sheet.tsx` — Rail 1 funding UI
- `lib/payments/types.ts`, `methods.ts` — "topup" mode = Rail 1 funding
- `app/api/v1/stripe-wallet/` — Rail 1 routes + onramp webhook
- `app/api/v1/wallet/balance/route.ts` — live spending budget display
- `app/api/v1/wallet/transactions/route.ts` — live transaction history
- `app/(dashboard)/transactions/page.tsx` — live transactions page
- `app/api/v1/bot/rail5/` — Rail 5 checkout/confirm
- `app/api/v1/bot/wallet/check/route.ts` — live balance check (with `pending_topups: 0` stub)
- `app/api/v1/bot/wallet/transactions/route.ts` — live bot transaction history
- `app/api/v1/admin/reconciliation/` — live ledger health check
- `app/api/v1/billing/` — payment method management (out of scope)
- `app/api/v1/webhooks/route.ts`, `health/`, `retry-pending/` — live outbound webhook system
- `components/dashboard/ops-health.tsx` — live reconciliation UI
- `components/dashboard/payment-setup.tsx` — tied to billing (out of scope)
- `app/(dashboard)/invoices/` — modern selling feature, not related
- `wallets` + `transactions` + `payment_methods` + `reconciliation_logs` tables
- `creditWallet`, `debitWallet`, and all wallet/transaction storage methods
- `lib/stripe.ts` — `stripe` object + all non-`chargeCustomer` functions
- `lib/notifications.ts` — `notifyBalanceLow`, `notifyPurchase`
