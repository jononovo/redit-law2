# Guardrails

## Overview

Guardrails enforce spending limits at two levels:

1. **Master** — owner-wide daily/monthly budget across all rails. Configured in `master_guardrails` table.
2. **Per-rail** — per-wallet (Rails 1/2) or per-card (Rail 5) limits. Configured in `privy_guardrails`, `crossmint_guardrails`, `rail5_guardrails`.

Master guardrails also control approval mode (`approvalMode`, `requireApprovalAbove`). Per-rail tables only contain spending limits.

## Enforcement Flow

Every checkout route follows the same pattern:

1. Call `evaluateMasterGuardrails(ownerUid, amountMicroUsdc)` — checks per-tx limit, daily budget, monthly budget, approval threshold against the owner's total cross-rail spend.
2. Fetch per-rail spend for the specific wallet/card.
3. Call `evaluateGuardrails()` (Rails 1/2, USDC) or `evaluateCardGuardrails()` (Rail 5, cents) for per-rail limits.
4. If either returns `block`, reject. If master returns `require_approval`, create a `unified_approvals` record.

Code: `lib/guardrails/master.ts` → `lib/guardrails/evaluate.ts`

## Master Spend Aggregation

`server/storage/master-guardrails.ts` provides `getMasterDailySpend(ownerUid)` and `getMasterMonthlySpend(ownerUid)`.

Returns `{ rail1, rail2, rail5, total }` — all values in micro-USDC.

### Unit Conversion

- Rails 1/2 store amounts in micro-USDC natively (`amountUsdc` column).
- Rail 5 stores amounts in cents (`amountCents` column). Converted via `× 10,000` (1 cent = 10,000 micro-USDC).

### Status Filters

| Rail | Table | Filter | Rationale |
|------|-------|--------|-----------|
| Rail 1 | `privy_transactions` | `NOT IN ('failed')` | Blacklist — count everything except failures |
| Rail 2 | `crossmint_transactions` | `NOT IN ('failed')` | Same as Rail 1 |
| Rail 5 | `rail5_checkouts` | `IN ('approved', 'completed')` | Whitelist — Rail 5 has more statuses (`pending_approval`, `denied`, `failed`) that shouldn't count |

Per-rail spend functions use the same filters as master for consistency:
- `privyGetDailySpend` / `privyGetMonthlySpend` → `NOT IN ('failed')`
- `crossmintGetDailySpend` / `crossmintGetMonthlySpend` → `NOT IN ('failed')`
- `getRail5DailySpendCents` / `getRail5MonthlySpendCents` → `IN ('approved', 'completed')`

### Rail 5 Checkout Status Lifecycle

```
pending_approval → approved → completed
                 → denied
                           → failed
```

- `approved` = auto-approved or owner-approved, key not yet delivered. Money is committed.
- `completed` = bot confirmed success, wallet debited. Money is spent.
- Both count toward spend. `pending_approval`, `denied`, `failed` do not.

## Key Files

| File | Role |
|------|------|
| `lib/guardrails/defaults.ts` | Default values for all guardrail tables |
| `lib/guardrails/types.ts` | Shared types (`GuardrailRules`, `CardGuardrailRules`, etc.) |
| `lib/guardrails/evaluate.ts` | Pure evaluation functions (no DB access) |
| `lib/guardrails/master.ts` | Master-level orchestration |
| `lib/guardrails/approval.ts` | Approval mode evaluation |
| `server/storage/master-guardrails.ts` | Master spend aggregation queries |
| `server/storage/rail1.ts` | Rail 1 per-wallet spend queries |
| `server/storage/rail2.ts` | Rail 2 per-wallet spend queries |
| `server/storage/rail5-guardrails.ts` | Rail 5 per-card spend queries |
| `app/api/v1/master-guardrails/route.ts` | GET/PUT API for master config + spend breakdown |

## Settings UI

The settings page (`app/(dashboard)/settings/page.tsx`) shows a per-rail spend breakdown with `RailBreakdown` component. Displays Rail 1 (x402 Payments), Rail 2 (Card Wallets), and Rail 5 (Sub-Agent Cards) with daily and monthly totals.
