# Guardrails & Procurement Controls

Two separate systems that work together during checkout enforcement. **Guardrails** answer "how much can this agent spend?" **Procurement controls** answer "where is this agent allowed to shop?"

---

## Guardrails

Spending limits enforced at two levels:

1. **Master** — owner-wide daily/monthly budget across all rails. Configured in `master_guardrails` table. Also owns approval mode (`approvalMode`, `requireApprovalAbove`).
2. **Per-rail** — per-wallet (Rails 1/2) or per-card (Rail 5) limits. Configured in `privy_guardrails`, `crossmint_guardrails`, `rail5_guardrails`. These tables contain only spending limits: `maxPerTx`, `dailyBudget`, `monthlyBudget`, `recurringAllowed`, `autoPauseOnZero`, `notes`, `updatedAt`, `updatedBy`.

### Enforcement Flow

Every checkout route follows the same pattern:

1. Call `evaluateMasterGuardrails(ownerUid, amountMicroUsdc)` — checks per-tx limit, daily budget, monthly budget, approval threshold against the owner's total cross-rail spend.
2. Fetch per-rail spend for the specific wallet/card.
3. Call `evaluateGuardrails()` (Rails 1/2, USDC) or `evaluateCardGuardrails()` (Rail 5, cents) for per-rail limits.
4. If either returns `block`, reject. If master returns `require_approval`, create a `unified_approvals` record.

Code: `lib/guardrails/master.ts` → `lib/guardrails/evaluate.ts`

### Approval Modes

All checkout routes call `evaluateApprovalDecision(ownerUid, amountCents)` from `lib/guardrails/approval.ts`. Reads from `master_guardrails`:

- `ask_for_everything` → require owner approval for all transactions
- `auto_approve_under_threshold` → only require approval if amount >= `requireApprovalAbove`
- `auto_approve_by_category` → (not yet fully implemented)

### Master Spend Aggregation

`server/storage/master-guardrails.ts` provides `getMasterDailySpend(ownerUid)` and `getMasterMonthlySpend(ownerUid)`.

Returns `{ rail1, rail2, rail5, total }` — all values in micro-USDC.

**Unit conversion**: Rails 1/2 store amounts in micro-USDC natively. Rail 5 stores in cents, converted via `× 10,000` (1 cent = 10,000 micro-USDC).

**Status filters**:

| Rail | Table | Filter | Rationale |
|------|-------|--------|-----------|
| Rail 1 | `privy_transactions` | `NOT IN ('failed')` | Blacklist — count everything except failures |
| Rail 2 | `crossmint_transactions` | `NOT IN ('failed')` | Same as Rail 1 |
| Rail 5 | `rail5_checkouts` | `IN ('approved', 'completed')` | Whitelist — Rail 5 has more statuses that shouldn't count |

Per-rail spend functions use the same filters as master for consistency.

### Rail 5 Checkout Status Lifecycle

```
pending_approval → approved → completed
                 → denied
                           → failed
```

- `approved` = auto-approved or owner-approved, key not yet delivered. Money is committed.
- `completed` = bot confirmed success, wallet debited. Money is spent.
- Both count toward spend. `pending_approval`, `denied`, `failed` do not.

### Not Yet Enforced

- `recurringAllowed` — column exists on all rails for structural consistency but not enforced in checkout routes (pending recurring detection logic).
- `notes` — informational field, returned in API responses but not used in enforcement.

---

## Procurement Controls

Domain, merchant, and category restrictions. Fully separated from guardrails.

### How It Works

`evaluateProcurementControls()` checks whether a transaction's domain, merchant name, or category is allowed or blocked. `mergeProcurementRules()` combines master + rail-level rules — blocklists are unioned, allowlists are intersected.

### Data Model

DB table: `procurement_controls` with `scope` (`master`/`rail1`/`rail2`/`rail5`) and `scope_ref_id` for per-rail granularity.

Owner-facing API: `GET/POST /api/v1/procurement-controls` and `GET /api/v1/procurement-controls/[scope]`.

### Separation from Guardrails

The guardrails tables no longer have `allowlisted_domains`, `blocklisted_domains`, `allowlisted_merchants`, or `blocklisted_merchants` columns. The guardrails GET APIs still return these fields in the response by reading from `procurement_controls`, maintaining backward compatibility. The card-wallet frontend saves merchant lists to `POST /api/v1/procurement-controls` separately from guardrail limit saves.

---

## Key Files

| File | Role |
|------|------|
| `lib/guardrails/defaults.ts` | Default values for all guardrail tables + `PROCUREMENT_DEFAULTS` |
| `lib/guardrails/types.ts` | `GuardrailRules`, `CardGuardrailRules`, `TransactionRequest`, etc. |
| `lib/guardrails/evaluate.ts` | Pure spending limit evaluation (no DB access) |
| `lib/guardrails/master.ts` | Master-level orchestration |
| `lib/guardrails/approval.ts` | Approval mode evaluation |
| `server/storage/master-guardrails.ts` | Master spend aggregation queries |
| `server/storage/rail1.ts` | Rail 1 per-wallet spend queries |
| `server/storage/rail2.ts` | Rail 2 per-wallet spend queries |
| `server/storage/rail5-guardrails.ts` | Rail 5 per-card spend + guardrail config queries |
| `app/api/v1/master-guardrails/route.ts` | GET/PUT API for master config + spend breakdown |
| `lib/procurement-controls/types.ts` | `ProcurementRules`, `ProcurementRequest`, `ProcurementDecision` |
| `lib/procurement-controls/defaults.ts` | `DEFAULT_PROCUREMENT_RULES` with default blocked categories |
| `lib/procurement-controls/evaluate.ts` | Domain/merchant/category evaluation + rule merging |
| `app/api/v1/procurement-controls/` | Owner-facing procurement API |

## Settings UI

The settings page (`app/(dashboard)/settings/page.tsx`) shows a per-rail spend breakdown with `RailBreakdown` component. Displays Rail 1 (x402 Payments), Rail 2 (Card Wallets), and Rail 5 (Sub-Agent Cards) with daily and monthly totals.
