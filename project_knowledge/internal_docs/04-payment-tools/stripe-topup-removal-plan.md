# Stripe Top-Up Wallet Funding System — Removal Plan

**Created:** 2026-04-06
**Status:** PLANNING (no code changes yet)
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

### A1. DELETE entire files (12 files):

**Dead API routes (7 files):**
| # | File | What it does |
|---|------|-------------|
| 1 | `app/api/v1/wallet/fund/route.ts` | Stripe chargeCustomer funding endpoint |
| 2 | `app/api/v1/bot/payments/create-link/route.ts` | Bot creates Stripe payment link |
| 3 | `app/api/v1/bot/payments/links/route.ts` | Bot lists its own payment links |
| 4 | `app/api/v1/bot/wallet/topup-request/route.ts` | Bot requests owner to top up via email |
| 5 | `app/api/v1/payment-links/route.ts` | Dashboard lists payment links |
| 6 | `app/api/v1/payment-links/[id]/route.ts` | Get single payment link by ID |
| 7 | `app/payment/success/page.tsx` | Payment link success page |

**Dead frontend components (3 files):**
| # | File | Import verification |
|---|------|-------------------|
| 8 | `components/dashboard/fund-modal.tsx` | Only imported by `overview/page.tsx` (will be edited) |
| 9 | `components/dashboard/payment-links.tsx` | Only imported by `overview/page.tsx` (will be edited) |
| 10 | `components/onboarding/steps/fund-wallet.tsx` | Orphan — NOT imported by wizard |

**Dead storage + schema (2 files):**
| # | File | What it does |
|---|------|-------------|
| 11 | `server/storage/payment-links.ts` | All payment-link storage methods |

### A2. EDIT files to fix broken imports (7 files):

| # | File | Change |
|---|------|--------|
| 1 | `app/(dashboard)/overview/page.tsx` | Remove `FundModal` import + `fundOpen` state + "Add Funds" dark card (lines 283-297) + `<FundModal>` render (lines 471-475). Remove `PaymentLinksPanel` import + `<PaymentLinksPanel />` render (line 463). **KEEP:** `wallet/balance` fetch, balance stat, `FundWalletSheet` (Rail 1). |
| 2 | `lib/stripe.ts` | Remove `chargeCustomer()` function. **KEEP:** `stripe` object, `getOrCreateCustomer`, `createSetupIntent`, `getPaymentMethodDetails`, `detachPaymentMethod`. |
| 3 | `lib/notifications.ts` | Remove `notifyTopupCompleted` and `notifyPaymentReceived`. **KEEP:** `notifyBalanceLow`, `notifyPurchase`. |
| 4 | `lib/email.ts` | Remove `sendTopupRequestEmail`. **KEEP:** all other email functions. |
| 5 | `server/storage/core.ts` | Remove `createTopupRequest` method. **KEEP:** all wallet/transaction/reconciliation methods, all paymentMethods methods. |
| 6 | `server/storage/index.ts` | Remove `payment-links` import/export. |
| 7 | `server/storage/types.ts` | Remove payment-link method signatures from IStorage interface. Remove `createTopupRequest` signature. |

### A3. Schema + DB (shared/schema.ts + drizzle push):

**Remove from `shared/schema.ts`:**
- `paymentLinks` table definition
- `topupRequests` table definition
- `topupRequestSchema` (Zod)
- `fundWalletRequestSchema` (Zod)
- `createPaymentLinkSchema` (Zod)

**KEEP in `shared/schema.ts`:**
- `wallets`, `transactions`, `paymentMethods`, `reconciliationLogs` table definitions
- All related insert/select types

**After schema edit:** Run `drizzle-kit push` to drop `payment_links` and `topup_requests` tables.

### A4. Build test:
- `npx next build` to verify no broken imports
- Verify overview page loads, transactions page loads

---

## Phase B: Clean Up Dead Webhook Event Types & Rate Limits

Remove residual references to webhook events and rate-limit entries that only existed for the dead flows.

### B1. DELETE entire file (1 file):
| # | File | Why |
|---|------|-----|
| 1 | `app/api/v1/webhooks/stripe/route.ts` | Only handles `checkout.session.completed` for dead payment-link flow. Confirmed: no other event types. The LIVE Stripe webhook is at `stripe-wallet/webhooks/stripe/route.ts` (Rail 1 onramp). |

### B2. EDIT files (5 files):

| # | File | Change |
|---|------|--------|
| 1 | `lib/webhooks/delivery.ts` | Remove `"wallet.topup.completed"` and `"wallet.payment.received"` from `WebhookEventType` union. These events were only fired by dead routes (fund/route.ts and webhooks/stripe/route.ts). |
| 2 | `lib/agent-management/bot-messaging/expiry.ts` | Remove expiry entries for `"wallet.topup.completed"` and `"wallet.payment.received"`. |
| 3 | `lib/agent-management/rate-limit.ts` | Remove rate-limit entries for: `"/api/v1/bot/wallet/topup-request"`, `"/api/v1/bot/payments/create-link"`, `"/api/v1/bot/payments/links"`. |
| 4 | `components/dashboard/webhook-log.tsx` | Remove label `"wallet.topup.completed": "Top-up Completed"`. |
| 5 | `components/dashboard/notification-popover.tsx` | Remove emoji cases for `"topup_completed"` and `"topup_request"`. |

### B3. Optional (backwards-compatible stub):
- `app/api/v1/bot/wallet/check/route.ts` — has `pending_topups: 0` hardcoded (line 55). Can remove or keep as backwards-compatible stub for existing bot integrations. **Recommend: keep for now.**

### B4. KEEP (do not confuse with dead webhook):
- `app/api/v1/webhooks/route.ts` — LIVE outbound webhook delivery system
- `app/api/v1/webhooks/health/route.ts` — LIVE webhook health check
- `app/api/v1/webhooks/retry-pending/route.ts` — LIVE webhook retry
- `app/api/v1/stripe-wallet/webhooks/stripe/route.ts` — LIVE Rail 1 onramp webhook

---

## Phase C: Dashboard UI Cleanup

Remove dead UI labels in dashboard components that reference removed features. These are cosmetic — the components themselves are live, but they have label/emoji entries for features that no longer exist.

| # | File | Change |
|---|------|--------|
| 1 | `components/dashboard/activity-log.tsx` | Remove label entry for `"/api/v1/bot/wallet/topup-request": "Top-up Request"` (line 23). **KEEP** the transactions label — that endpoint is live. |

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
| 9 | `replit.md` | Update to reflect removed routes/components |

---

## Execution Order

1. **Phase A** — Core dead feature removal (12 deletions, 7 edits, schema + DB push)
2. **Build test** — `npx next build` to verify no broken imports
3. **Phase B** — Webhook event type + rate-limit cleanup (1 deletion, 5 edits)
4. **Build test** — verify build still clean
5. **Phase C** — Dashboard UI label cleanup (1 edit)
6. **Phase D** — Documentation cleanup (9 file edits)
7. **Final verification** — Overview page loads, transactions page loads, app builds clean

---

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Breaking Rail 1 crypto onramp | Completely separate codepath. `stripe` object, `FundWalletSheet`, onramp webhook all preserved. |
| Breaking Rail 5 spending budget | `wallets`/`transactions` tables, all Rail 5 routes, `creditWallet`/`debitWallet` all preserved. |
| Breaking dashboard balance/transactions | `wallet/balance` and `wallet/transactions` routes are KEPT. Balance stat and transactions page preserved. |
| Breaking live Stripe webhook (onramp) | Dead webhook is at `webhooks/stripe/`, live onramp webhook is at `stripe-wallet/webhooks/stripe/`. Different paths, different secrets (`STRIPE_WEBHOOK_SECRET` vs `STRIPE_WEBHOOK_SECRET_ONRAMP`). |
| Breaking outbound webhook system | The delivery system (`webhooks/route.ts`, `health/`, `retry-pending/`) is untouched. Only removing 2 dead event types from the type union. |
| Breaking billing routes | `payment_methods` table, billing routes, all billing storage methods are out of scope. |
| Breaking reconciliation | Not Stripe-specific. Routes, component, table, storage methods all preserved. |
| Breaking invoices | Invoices use checkout URLs, not the `paymentLinks` table. Completely separate. |
| Broken import after file deletion | Every deleted file's importers are mapped — all will be edited or are also being deleted. |

---

## Corrections Log

### Round 1 (initial double-check):
1. `wallet/balance/route.ts` incorrectly marked for deletion → KEPT (live spending budget)
2. `wallet/transactions/route.ts` incorrectly marked for deletion → KEPT (live purchase history)
3. Reconciliation system incorrectly marked for deletion → KEPT (generic ledger health)
4. Missing: `payment-links/route.ts` and `[id]/route.ts` → ADDED
5. Missing: `fund-wallet.tsx` orphan → ADDED
6. Missing: Rate limit entries → ADDED
7. `payment-setup.tsx` incorrectly marked for deletion → KEPT (billing system)
8. `reconciliation_logs` table incorrectly marked for dropping → KEPT
9. Storage methods for reconciliation incorrectly scoped → KEPT

### Round 2 (user questions + deeper sweep):
10. Missing: `bot/payments/links/route.ts` — dead bot API to list payment links → ADDED
11. Found residual string references in webhook-log, notification-popover, delivery.ts, expiry.ts → ADDED to Phase B
12. Confirmed `webhooks/stripe/route.ts` is legacy duplicate — live onramp webhook is at `stripe-wallet/webhooks/stripe/route.ts`
13. Confirmed invoices system is modern/live — "payment link" in invoices UI is just a label for checkout URL
14. Restructured into Phases A/B/C/D per user request

---

## Files Summary

### Phase A — DELETE (12 files):
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
11. `server/storage/payment-links.ts`

### Phase A — EDIT (7 files):
1. `app/(dashboard)/overview/page.tsx`
2. `lib/stripe.ts`
3. `lib/notifications.ts`
4. `lib/email.ts`
5. `server/storage/core.ts`
6. `server/storage/index.ts`
7. `server/storage/types.ts`
8. `shared/schema.ts`

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

### Phase D — EDIT (9 files):
1. `docs/content/api/endpoints/wallets.md`
2. `docs/content/api/endpoints/checkout-pages.md`
3. `docs/content/api/introduction.md`
4. `docs/content/api/webhooks/events.md`
5. `docs/content/site/homepage.md`
6. `project_knowledge/architecture.md`
7. `project_knowledge/testing.md`
8. `project_knowledge/tenants_vision/creditclaw.md`
9. `replit.md`

### KEEP (explicitly preserved):
- `lib/crypto-onramp/` — entire Rail 1 system
- `lib/payments/components/fund-wallet-sheet.tsx` — Rail 1 funding UI
- `app/api/v1/stripe-wallet/` — Rail 1 routes + onramp webhook
- `app/api/v1/wallet/balance/route.ts` — live spending budget display
- `app/api/v1/wallet/transactions/route.ts` — live transaction history
- `app/(dashboard)/transactions/page.tsx` — live transactions page
- `app/api/v1/bot/rail5/` — Rail 5 checkout/confirm
- `app/api/v1/bot/wallet/check/route.ts` — live balance check
- `app/api/v1/bot/wallet/transactions/route.ts` — live bot transaction history
- `app/api/v1/admin/reconciliation/` — live ledger health check
- `app/api/v1/billing/` — payment method management (out of scope)
- `app/api/v1/webhooks/route.ts`, `health/`, `retry-pending/` — live outbound webhook system
- `components/dashboard/ops-health.tsx` — live reconciliation UI
- `components/dashboard/payment-setup.tsx` — tied to billing (out of scope)
- `wallets` + `transactions` + `payment_methods` + `reconciliation_logs` tables
- `creditWallet`, `debitWallet`, and all wallet/transaction storage methods
- `lib/stripe.ts` — `stripe` object + all non-`chargeCustomer` functions
- `lib/notifications.ts` — `notifyBalanceLow`, `notifyPurchase`
- `app/(dashboard)/invoices/` — modern selling feature, not related
- `lib/payments/types.ts`, `methods.ts` — "topup" mode here is Rail 1 funding, not the dead system
