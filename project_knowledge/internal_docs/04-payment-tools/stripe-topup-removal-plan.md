# Stripe Top-Up Wallet Funding System — Removal Plan

**Created:** 2026-04-06
**Status:** PLANNING (no code changes yet)
**Policy:** Cleanup not massacre — remove only dead code, preserve all live functionality

---

## Background

The codebase has two completely separate "wallet" concepts:

| System | Status | What it does |
|--------|--------|-------------|
| **Rail 1 — Privy/USDC crypto wallet** | ✅ LIVE | Auto-created on signup. Funded via Stripe Crypto Onramp. Real payment infra. |
| **Ledger wallet (wallets/transactions tables)** | ⚠️ PARTIALLY LIVE | Postgres cents-based ledger. The **funding side** (Stripe `chargeCustomer`, payment methods, fund modal) is dead. But Rail 5 checkout still uses the balance/debit as a spending budget. |

**Goal:** Remove the dead Stripe-based funding mechanism for the ledger wallet. Do NOT touch Rail 1 or the Rail 5 spending-budget usage of the wallets table.

---

## What MUST Be Preserved (DO NOT TOUCH)

### Rail 1 — Crypto Onramp (completely separate system)
- `lib/crypto-onramp/stripe-onramp/` — session creation, webhook handling
- `app/api/v1/stripe-wallet/` — all routes (onramp session, webhooks)
- `app/api/v1/checkout/[id]/pay/stripe-onramp/route.ts`
- The `stripe` object export from `lib/stripe.ts` (used by Rail 1)

### Rail 5 — Spending Budget (uses wallets table)
- `app/api/v1/bot/rail5/checkout/route.ts` — line 88, balance check against wallets table
- `app/api/v1/bot/rail5/confirm/route.ts` — line 84, debit from wallets table
- `app/api/v1/bots/register/route.ts` — line 157, creates wallet row on bot claim
- `app/api/v1/bot/wallet/check/route.ts` — balance check endpoint
- `app/api/v1/bot/status/route.ts` — includes wallet info
- `notifyBalanceLow` in `lib/notifications.ts` — called by Rail 5 confirm

### Wallets & Transactions Tables (schema)
- `wallets` table in `shared/schema.ts` — KEEP (8 real rows, used by Rail 5)
- `transactions` table in `shared/schema.ts` — KEEP (1 real row, used by Rail 5)
- All storage methods that Rail 5 depends on for these tables — KEEP

### Billing Routes (separate system — payment method management for the owner)
- `app/api/v1/billing/setup-intent/route.ts` — uses `getOrCreateCustomer`, `createSetupIntent`
- `app/api/v1/billing/payment-method/route.ts` — uses `getPaymentMethodDetails`
- `app/api/v1/billing/payment-method/[id]/route.ts` — uses `detachPaymentMethod`
- These manage the owner's Stripe payment methods (cards on file). May be dead too but out of scope for this removal. Investigate separately.

---

## Phase 1: API Routes to DELETE (entire files)

| Route | Why dead |
|-------|----------|
| `app/api/v1/wallet/fund/route.ts` | The core Stripe chargeCustomer funding endpoint. Uses `chargeCustomer()`, `notifyTopupCompleted`. Zero active callers. |
| `app/api/v1/wallet/balance/route.ts` | Dashboard balance check for the old wallet. Replaced by bot-specific endpoints. |
| `app/api/v1/wallet/transactions/route.ts` | Dashboard transaction history for old wallet. Dead UI. |
| `app/api/v1/bot/payments/create-link/route.ts` | Creates Stripe payment links so bots can request money from third parties. 0 rows in payment_links. Dead. |
| `app/api/v1/bot/wallet/topup-request/route.ts` | Bot requests owner to top up via email. Part of the old funding flow. 0 rows in topup_requests. |
| `app/api/v1/admin/reconciliation/` (entire directory) | Admin reconciliation dashboard for old wallet funding. 3 stale rows. |

**Also check:** `app/api/v1/payment-links/[id]/route.ts` or similar — the payment success page fetches `/api/v1/payment-links/${pl}`.

### Phase 1 also: Pages to DELETE
| Page | Why dead |
|------|----------|
| `app/payment/success/page.tsx` | Payment link success page — tied to dead create-link flow |

---

## Phase 2: Webhook Route — EDIT (not delete)

**File:** `app/api/v1/webhooks/stripe/route.ts`

This webhook handler likely processes multiple event types. Need to:
- **REMOVE:** The `checkout.session.completed` handler that credits the wallets table (the payment-link fulfillment flow) and calls `notifyPaymentReceived`
- **KEEP:** Any handlers needed by other live Stripe integrations (if any — need to verify what else this webhook handles)
- If the webhook route ONLY handles the dead payment-link flow → DELETE the entire file

---

## Phase 3: Frontend Components to DELETE or EDIT

### DELETE entirely:
| Component | Why dead |
|-----------|----------|
| `components/dashboard/fund-modal.tsx` | Modal for funding the old wallet via Stripe. Dead. |
| `components/dashboard/payment-links.tsx` | Payment links panel. Dead. |
| `components/dashboard/payment-setup.tsx` | Payment method setup component (may be shared with billing — verify before deleting) |

### EDIT:
| File | Change |
|------|--------|
| `app/(dashboard)/overview/page.tsx` | Remove `FundModal` import, `fundOpen` state, and `<FundModal>` render. Remove any "Add Funds" buttons that open it. Remove PaymentLinksPanel if present. |
| `app/(dashboard)/settings/page.tsx` | Remove PaymentSetup import/usage if it's only for the dead flow |

---

## Phase 4: lib/ Functions to DELETE or EDIT

### In `lib/stripe.ts`:
- **DELETE:** `chargeCustomer()` function — only caller is the dead `wallet/fund/route.ts`
- **KEEP:** `stripe` object (used by Rail 1, billing routes)
- **KEEP:** `getOrCreateCustomer`, `createSetupIntent`, `getPaymentMethodDetails`, `detachPaymentMethod` (used by billing routes)

### In `lib/notifications.ts`:
- **DELETE:** `notifyTopupCompleted` — only caller is dead `wallet/fund/route.ts`
- **DELETE:** `notifyPaymentReceived` — only caller is dead `webhooks/stripe/route.ts`
- **KEEP:** `notifyBalanceLow` — called by live Rail 5 confirm route
- **KEEP:** `notifyPurchase` — called by live Rail 5 confirm route

### In `lib/email.ts`:
- **DELETE:** `sendTopupRequestEmail` — only caller is dead `bot/wallet/topup-request/route.ts`
- **KEEP:** All other email functions

---

## Phase 5: Storage Layer Cleanup

### In `server/storage/core.ts`:
- **DELETE:** All `paymentMethods`-related methods (getDefaultPaymentMethod, listPaymentMethods, getPaymentMethod, createPaymentMethod, deletePaymentMethod, setDefaultPaymentMethod) — BUT ONLY IF billing routes are also being removed. If billing routes stay (out of scope), these methods stay too.
- **DELETE:** `createTopupRequest` method — only caller is dead topup-request route
- **DELETE:** `createReconciliationLog` method — only caller is dead reconciliation routes
- **KEEP:** All wallet/transaction methods used by Rail 5 (getWallet, createWallet, debitWallet, etc.)

### In `server/storage/payment-links.ts`:
- **DELETE:** Entire file — all payment link storage methods. 0 rows in table, dead flow.
- **UPDATE:** `server/storage/index.ts` — remove payment-links import/export

---

## Phase 6: Schema Cleanup (shared/schema.ts)

### Tables to DROP (via drizzle-kit push):
| Table | Rows | Why dead |
|-------|------|----------|
| `payment_links` | 0 | Dead bot payment link flow |
| `topup_requests` | 0 | Dead topup request flow |
| `reconciliation_logs` | 3 | Dead reconciliation system (stale data) |

### Tables to KEEP:
| Table | Rows | Why live |
|-------|------|---------|
| `wallets` | 8 | Rail 5 spending budget |
| `transactions` | 1 | Rail 5 purchase ledger |

### Tables — DECISION NEEDED:
| Table | Rows | Question |
|-------|------|----------|
| `payment_methods` | 0 | Used by billing routes. If billing routes stay → keep. If billing routes are also dead → drop. **Recommend: keep for now, separate investigation.** |

### Schemas to DELETE from `shared/schema.ts`:
- `topupRequestSchema` (Zod) — only used by dead topup-request route
- `fundWalletRequestSchema` (Zod) — only used by dead fund route
- `createPaymentLinkSchema` (Zod) — only used by dead create-link route
- Table definitions for `payment_links`, `topup_requests`, `reconciliation_logs`

### Schemas to KEEP:
- `wallets` table definition
- `transactions` table definition
- `payment_methods` table definition (pending separate investigation)

---

## Phase 7: Documentation & Config Cleanup

- Update `replit.md` to reflect removed routes/components
- Update any API documentation in `docs/` that references the fund endpoint, payment links, or topup requests
- Check `components/dashboard/sidebar.tsx` for any nav items pointing to dead routes
- Check onboarding flow for "fund-wallet" step references

---

## Data Cleanup (after code removal)

```sql
-- Drop tables (after schema removal + drizzle push)
-- Tables: payment_links, topup_requests, reconciliation_logs
-- These will be handled by drizzle-kit push after removing from schema.ts

-- Verify no orphaned data
SELECT * FROM reconciliation_logs; -- 3 rows, safe to drop
```

---

## Execution Order

1. Phase 1 (delete dead routes + pages)
2. Phase 3 (frontend cleanup)
3. Phase 4 (lib/ function cleanup)
4. Phase 2 (webhook edit — most surgical)
5. Phase 5 (storage layer)
6. Phase 6 (schema + DB drop)
7. Phase 7 (docs)
8. **Test:** Verify Rail 5 checkout still works, Rail 1 onramp still works, app builds clean

---

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Accidentally breaking Rail 1 crypto onramp | Completely separate codepath, no shared functions being removed |
| Breaking Rail 5 spending budget | wallets/transactions tables and all Rail 5 routes are explicitly preserved |
| Breaking billing/payment-method management | payment_methods table and billing routes are out of scope, not touched |
| Stripe webhook missing events | Verify webhook route handles no other live events before removing |

---

## Files Summary

### DELETE (entire files):
- `app/api/v1/wallet/fund/route.ts`
- `app/api/v1/wallet/balance/route.ts`
- `app/api/v1/wallet/transactions/route.ts`
- `app/api/v1/bot/payments/create-link/route.ts`
- `app/api/v1/bot/wallet/topup-request/route.ts`
- `app/api/v1/admin/reconciliation/` (entire directory)
- `app/payment/success/page.tsx`
- `components/dashboard/fund-modal.tsx`
- `components/dashboard/payment-links.tsx`
- `server/storage/payment-links.ts`

### EDIT (surgical removal):
- `app/api/v1/webhooks/stripe/route.ts` — remove payment-link handler
- `app/(dashboard)/overview/page.tsx` — remove FundModal
- `app/(dashboard)/settings/page.tsx` — remove PaymentSetup (if dead-only)
- `lib/stripe.ts` — remove `chargeCustomer()`
- `lib/notifications.ts` — remove `notifyTopupCompleted`, `notifyPaymentReceived`
- `lib/email.ts` — remove `sendTopupRequestEmail`
- `server/storage/core.ts` — remove topup/reconciliation methods
- `server/storage/index.ts` — remove payment-links import
- `shared/schema.ts` — remove dead table defs + Zod schemas

### KEEP (explicitly preserved):
- `lib/crypto-onramp/` — entire Rail 1 system
- `app/api/v1/stripe-wallet/` — Rail 1 routes
- `app/api/v1/bot/rail5/` — Rail 5 checkout/confirm
- `app/api/v1/billing/` — payment method management (separate investigation)
- `wallets` + `transactions` tables
- `payment_methods` table (for now)
- `lib/stripe.ts` — `stripe` object + billing helper functions
