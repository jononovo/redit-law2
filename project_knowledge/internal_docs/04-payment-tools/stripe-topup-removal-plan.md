# Stripe Top-Up Wallet Funding System — Removal Plan

**Created:** 2026-04-06
**Status:** PLANNING (no code changes yet)
**Policy:** Cleanup not massacre — remove only dead code, preserve all live functionality

---

## Background

The codebase has two completely separate "wallet" concepts:

| System | Status | What it does |
|--------|--------|-------------|
| **Rail 1 — Privy/USDC crypto wallet** | ✅ LIVE | Auto-created on signup. Funded via Stripe Crypto Onramp. Real payment infra. Lives in `lib/crypto-onramp/`, `app/api/v1/stripe-wallet/`. |
| **Ledger wallet (wallets/transactions tables)** | ⚠️ PARTIALLY LIVE | Postgres cents-based ledger. The **funding side** (Stripe `chargeCustomer`, payment methods, fund modal, payment links) is dead. But Rail 5 checkout, x402, qr-pay, and base-pay all actively use the balance/debit/credit as a spending budget. |

**Goal:** Remove the dead Stripe-based funding mechanism for the ledger wallet. Do NOT touch Rail 1 or the spending-budget usage of the wallets/transactions tables.

---

## What MUST Be Preserved (DO NOT TOUCH)

### Rail 1 — Crypto Onramp (completely separate system)
- `lib/crypto-onramp/stripe-onramp/` — session creation, webhook handling
- `app/api/v1/stripe-wallet/` — all routes (onramp session, webhooks, balance, transactions, list)
- `app/api/v1/checkout/[id]/pay/stripe-onramp/route.ts`
- The `stripe` object export from `lib/stripe.ts` (used by Rail 1)
- `lib/payments/components/fund-wallet-sheet.tsx` — this is the LIVE Rail 1 funding UI (NOT the dead FundModal)

### Rail 5 + x402 + qr-pay + base-pay — Spending Budget (uses wallets/transactions tables)
- `app/api/v1/bot/rail5/checkout/route.ts` — balance check against wallets table
- `app/api/v1/bot/rail5/confirm/route.ts` — debit from wallets table
- `app/api/v1/bots/register/route.ts` — creates wallet row on bot claim
- `app/api/v1/bot/wallet/check/route.ts` — balance check endpoint
- `app/api/v1/bot/wallet/transactions/route.ts` — bot API to view own transaction history (LIVE)
- `app/api/v1/bot/status/route.ts` — includes wallet info
- `lib/x402/checkout.ts` — `creditWalletFromX402()` credits wallet
- `lib/qr-pay/ledger.ts` — `creditWalletFromQrPay()` credits wallet
- `lib/base-pay/ledger.ts` — `creditWalletFromBasePay()` credits wallet
- `notifyBalanceLow`, `notifyPurchase` in `lib/notifications.ts` — called by Rail 5 confirm

### Dashboard endpoints that display LIVE wallet data
- **`app/api/v1/wallet/balance/route.ts`** — ⚠️ KEEP! Shows the ledger wallet spending budget on overview page (line 82). This IS the Rail 5 spending budget balance.
- **`app/api/v1/wallet/transactions/route.ts`** — ⚠️ KEEP! Shows purchase history on `app/(dashboard)/transactions/page.tsx`. Transactions are actively created by Rail 5, x402, qr-pay, base-pay.
- **`app/(dashboard)/transactions/page.tsx`** — KEEP! Live transaction history page.

### Wallets & Transactions Tables (schema)
- `wallets` table in `shared/schema.ts` — KEEP (8 real rows, active spending budget)
- `transactions` table in `shared/schema.ts` — KEEP (active purchase/credit ledger)
- All storage methods used by live systems: `creditWallet`, `debitWallet`, `getWalletByBotId`, `getWalletByOwnerUid`, `createWallet`, `getTransactionsByWalletId`, `createTransaction`, etc.

### Billing Routes (separate system — out of scope)
- `app/api/v1/billing/setup-intent/route.ts` — uses `getOrCreateCustomer`, `createSetupIntent`
- `app/api/v1/billing/payment-method/route.ts` — uses `getPaymentMethodDetails`
- `app/api/v1/billing/payment-method/[id]/route.ts` — uses `detachPaymentMethod`
- `payment_methods` table — used by billing routes. **Keep for now, investigate separately.**
- All `paymentMethods`-related storage methods in `core.ts` — tied to billing routes, keep.

### Reconciliation System (NOT Stripe-specific, keep)
- **`app/api/v1/admin/reconciliation/run/route.ts`** — ⚠️ KEEP! This checks wallet ledger integrity (stored balance vs sum of transactions). It's a generic health check that works regardless of how money enters the wallet. Used by live OpsHealth dashboard component.
- **`components/dashboard/ops-health.tsx`** — KEEP! Renders reconciliation on admin dashboard.
- **`reconciliation_logs` table** — KEEP! Used by reconciliation system.
- **`createReconciliationLog` storage method** — KEEP!
- **`getWalletsByOwnerUid`, `getTransactionSumByWalletId` storage methods** — KEEP! Used by reconciliation.

---

## Phase 1: API Routes to DELETE (entire files)

| Route | Why dead | Verified callers |
|-------|----------|-----------------|
| `app/api/v1/wallet/fund/route.ts` | Core Stripe `chargeCustomer` funding. | Called by: `fund-modal.tsx` (dead), `fund-wallet.tsx` onboarding step (dead/unused). No live callers. |
| `app/api/v1/bot/payments/create-link/route.ts` | Creates Stripe payment links for bots to request money. | 0 rows in payment_links. Only reference: rate-limit.ts config entry. |
| `app/api/v1/bot/wallet/topup-request/route.ts` | Bot requests owner to top up via email. | 0 rows in topup_requests. References: rate-limit.ts config, activity-log.tsx label map. |
| `app/api/v1/payment-links/route.ts` | Lists payment links for dashboard. | Called by: `payment-links.tsx` component (dead). |
| `app/api/v1/payment-links/[id]/route.ts` | Gets single payment link by ID. | Called by: `payment/success/page.tsx` (dead). |
| `app/api/v1/webhooks/stripe/route.ts` | Handles `checkout.session.completed` for payment link fulfillment. | **Verified: handles ONLY the dead payment-link flow.** No other event types. Entire file can be deleted. |

### Pages to DELETE:
| Page | Why dead |
|------|----------|
| `app/payment/success/page.tsx` | Payment link success page — tied to dead create-link flow |

---

## Phase 2: Frontend Components to DELETE or EDIT

### DELETE entirely:
| Component | Why dead | Import verification |
|-----------|----------|-------------------|
| `components/dashboard/fund-modal.tsx` | Modal for funding via Stripe `chargeCustomer`. | Only imported by `overview/page.tsx` — will be edited. |
| `components/dashboard/payment-links.tsx` | Payment links panel. 0 rows. | Only imported by `overview/page.tsx` — will be edited. |
| `components/onboarding/steps/fund-wallet.tsx` | Old onboarding step for Stripe funding. | NOT imported by `onboarding-wizard.tsx` (confirmed). Orphan file. |

### DO NOT DELETE:
| Component | Why |
|-----------|-----|
| `components/dashboard/payment-setup.tsx` | Used by `settings/page.tsx`. Tied to billing routes (out of scope). Keep. |
| `components/dashboard/ops-health.tsx` | Reconciliation is generic ledger health, not Stripe-specific. Keep. |
| `components/dashboard/activity-log.tsx` | Shows API access logs. Has label entries for dead endpoints but that's harmless — just a display map. Keep as-is or clean label entries. |

### EDIT:
| File | Change | Details |
|------|--------|---------|
| `app/(dashboard)/overview/page.tsx` | Remove dead imports + UI | Remove `FundModal` import (line 6), `PaymentLinksPanel` import (line 10). Remove `fundOpen` state (line 62). Remove "Add Funds" dark card (lines 283-297) that opens FundModal. Remove `<PaymentLinksPanel />` render (line 463). Remove `<FundModal>` render (lines 471-475). **KEEP:** `wallet/balance` fetch (line 82), balance stat display (lines 270-273), `FundWalletSheet` (line 28, Rail 1). |

---

## Phase 3: lib/ Functions to DELETE or EDIT

### In `lib/stripe.ts`:
- **DELETE:** `chargeCustomer()` function — only caller is dead `wallet/fund/route.ts`
- **KEEP:** `stripe` object (used by Rail 1, billing routes, onramp)
- **KEEP:** `getOrCreateCustomer`, `createSetupIntent`, `getPaymentMethodDetails`, `detachPaymentMethod` (used by billing routes)

### In `lib/notifications.ts`:
- **DELETE:** `notifyTopupCompleted` — only caller is dead `wallet/fund/route.ts`
- **DELETE:** `notifyPaymentReceived` — only caller is dead `webhooks/stripe/route.ts`
- **KEEP:** `notifyBalanceLow` — called by live Rail 5 confirm route
- **KEEP:** `notifyPurchase` — called by live Rail 5 confirm route

### In `lib/email.ts`:
- **DELETE:** `sendTopupRequestEmail` — only caller is dead `bot/wallet/topup-request/route.ts`
- **KEEP:** All other email functions

### In `lib/agent-management/rate-limit.ts`:
- **EDIT:** Remove rate limit entries for dead endpoints:
  - `"/api/v1/bot/wallet/topup-request"` (line 11)
  - `"/api/v1/bot/payments/create-link"` (line 13)
  - `"/api/v1/bot/payments/links"` (line 14) — verify if this route also exists / is dead

---

## Phase 4: Storage Layer Cleanup

### In `server/storage/payment-links.ts`:
- **DELETE:** Entire file — all payment link storage methods. 0 rows in table, dead flow.

### In `server/storage/index.ts`:
- **EDIT:** Remove `payment-links` import/export

### In `server/storage/types.ts`:
- **EDIT:** Remove payment-link method signatures from `IStorage` interface

### In `server/storage/core.ts`:
- **DELETE:** `createTopupRequest` method — only caller is dead topup-request route
- **KEEP:** All `paymentMethods` methods (tied to billing routes, out of scope)
- **KEEP:** `creditWallet` — used by live x402/qr-pay/base-pay/webhook flows
- **KEEP:** `createReconciliationLog`, `getWalletsByOwnerUid`, `getTransactionSumByWalletId` — used by live reconciliation
- **KEEP:** All other wallet/transaction methods

---

## Phase 5: Schema Cleanup (shared/schema.ts)

### Tables to DROP (via drizzle-kit push):
| Table | Rows | Why dead |
|-------|------|----------|
| `payment_links` | 0 | Dead bot payment link flow |
| `topup_requests` | 0 | Dead topup request flow |

### Tables to KEEP:
| Table | Rows | Why live |
|-------|------|---------|
| `wallets` | 8 | Rail 5 + x402/qr-pay/base-pay spending budget |
| `transactions` | 1 | Active purchase/credit ledger |
| `payment_methods` | 0 | Used by billing routes (out of scope) |
| `reconciliation_logs` | 3 | Used by live reconciliation system |

### Zod Schemas to DELETE from `shared/schema.ts`:
- `topupRequestSchema` — only used by dead topup-request route
- `fundWalletRequestSchema` — only used by dead fund route
- `createPaymentLinkSchema` — only used by dead create-link route

### Table definitions to DELETE from `shared/schema.ts`:
- `paymentLinks` table definition
- `topupRequests` table definition

### Schemas & Table definitions to KEEP:
- `wallets`, `transactions`, `paymentMethods`, `reconciliationLogs` table definitions
- All related insert/select types

---

## Phase 6: Documentation & Config Cleanup

- Update `replit.md` to reflect removed routes/components
- Update any API documentation in `docs/` that references the fund endpoint, payment links, or topup requests
- Clean activity-log.tsx label map entries for dead endpoints (optional, harmless)

---

## Execution Order

1. Phase 1 — Delete dead API routes + pages (6 route files + 1 page)
2. Phase 2 — Frontend cleanup (delete 3 components, edit overview page)
3. Phase 3 — lib/ function cleanup (edit stripe.ts, notifications.ts, email.ts, rate-limit.ts)
4. Phase 4 — Storage layer (delete payment-links.ts, edit index.ts, types.ts, core.ts)
5. Phase 5 — Schema + DB (remove 2 table defs + 3 Zod schemas, drizzle push to drop tables)
6. Phase 6 — Docs
7. **Build test:** `npx next build` to verify no broken imports
8. **Runtime test:** Verify overview page loads, transactions page loads, Rail 5 checkout works

---

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Accidentally breaking Rail 1 crypto onramp | Completely separate codepath. No shared functions being removed. `stripe` object, `FundWalletSheet` all preserved. |
| Breaking Rail 5 spending budget | `wallets`/`transactions` tables, all Rail 5 routes, `creditWallet`/`debitWallet` all explicitly preserved. |
| Breaking dashboard balance/transactions display | `wallet/balance` and `wallet/transactions` routes are KEPT. Overview balance stat preserved. Transactions page preserved. |
| Breaking billing/payment-method management | `payment_methods` table, billing routes, all billing storage methods are out of scope, not touched. |
| Breaking reconciliation/ops health | Reconciliation system is NOT Stripe-specific. Routes, component, table, storage methods all preserved. |
| Broken import after file deletion | Each deleted file's importers are mapped above. All will be edited or are also being deleted. |

---

## Corrections Log (from double-check review)

### Errors caught and fixed:
1. **`wallet/balance/route.ts` was incorrectly marked for deletion.** It shows the live ledger wallet spending budget, fetched by overview page line 82. **KEPT.**
2. **`wallet/transactions/route.ts` was incorrectly marked for deletion.** It shows live purchase history, used by `transactions/page.tsx`. Transactions are actively created by Rail 5, x402, qr-pay, base-pay. **KEPT.**
3. **Reconciliation system was incorrectly marked for deletion.** It's NOT Stripe-specific — it checks generic wallet ledger integrity (stored balance vs transaction sum). Used by live OpsHealth component. **KEPT** (routes, component, table, storage methods).
4. **Missing from original plan:** `app/api/v1/payment-links/route.ts` and `[id]/route.ts` — dead routes serving the payment links panel and success page. **ADDED to deletion list.**
5. **Missing from original plan:** `components/onboarding/steps/fund-wallet.tsx` — orphan file, not imported by wizard. **ADDED to deletion list.**
6. **Missing from original plan:** Rate limit entries for dead endpoints in `rate-limit.ts`. **ADDED.**
7. **`payment-setup.tsx` was incorrectly marked for deletion.** It's used by settings page and tied to billing routes (out of scope). **KEPT.**
8. **`reconciliation_logs` table was incorrectly marked for dropping.** Used by live reconciliation system. **KEPT.**
9. **Storage methods `getWalletsByOwnerUid` and `getTransactionSumByWalletId` were implicitly going to be deleted.** They're used by reconciliation. **KEPT.**

---

## Files Summary

### DELETE (entire files) — 9 files:
1. `app/api/v1/wallet/fund/route.ts` — dead Stripe chargeCustomer funding
2. `app/api/v1/bot/payments/create-link/route.ts` — dead Stripe payment links
3. `app/api/v1/bot/wallet/topup-request/route.ts` — dead topup request
4. `app/api/v1/payment-links/route.ts` — dead payment links API
5. `app/api/v1/payment-links/[id]/route.ts` — dead payment link by ID
6. `app/api/v1/webhooks/stripe/route.ts` — only handles dead payment-link flow
7. `app/payment/success/page.tsx` — dead payment link success page
8. `components/dashboard/fund-modal.tsx` — dead Stripe funding modal
9. `components/dashboard/payment-links.tsx` — dead payment links panel
10. `components/onboarding/steps/fund-wallet.tsx` — orphan onboarding step
11. `server/storage/payment-links.ts` — dead payment link storage

### EDIT (surgical removal) — 8 files:
1. `app/(dashboard)/overview/page.tsx` — remove FundModal, PaymentLinksPanel, "Add Funds" card
2. `lib/stripe.ts` — remove `chargeCustomer()`
3. `lib/notifications.ts` — remove `notifyTopupCompleted`, `notifyPaymentReceived`
4. `lib/email.ts` — remove `sendTopupRequestEmail`
5. `lib/agent-management/rate-limit.ts` — remove dead endpoint entries
6. `server/storage/core.ts` — remove `createTopupRequest`
7. `server/storage/index.ts` — remove payment-links import
8. `server/storage/types.ts` — remove payment-link method signatures
9. `shared/schema.ts` — remove `paymentLinks`/`topupRequests` table defs + 3 Zod schemas

### KEEP (explicitly preserved):
- `lib/crypto-onramp/` — entire Rail 1 system
- `lib/payments/components/fund-wallet-sheet.tsx` — Rail 1 funding UI
- `app/api/v1/stripe-wallet/` — Rail 1 routes
- `app/api/v1/wallet/balance/route.ts` — live spending budget display
- `app/api/v1/wallet/transactions/route.ts` — live transaction history
- `app/(dashboard)/transactions/page.tsx` — live transactions page
- `app/api/v1/bot/rail5/` — Rail 5 checkout/confirm
- `app/api/v1/bot/wallet/check/route.ts` — live balance check
- `app/api/v1/bot/wallet/transactions/route.ts` — live bot transaction history
- `app/api/v1/admin/reconciliation/` — live ledger health check
- `app/api/v1/billing/` — payment method management (out of scope)
- `components/dashboard/ops-health.tsx` — live reconciliation UI
- `components/dashboard/payment-setup.tsx` — tied to billing (out of scope)
- `components/dashboard/activity-log.tsx` — live, label entries harmless
- `wallets` + `transactions` + `payment_methods` + `reconciliation_logs` tables
- `creditWallet`, `debitWallet`, and all wallet/transaction storage methods
- `lib/stripe.ts` — `stripe` object + all non-`chargeCustomer` functions
- `lib/notifications.ts` — `notifyBalanceLow`, `notifyPurchase`
