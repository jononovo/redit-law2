# Technical Plan: Include Rail 5 Spend in Master Guardrails

## Problem

Master guardrails are the single source of truth for cross-rail spending limits. The Rail 5 checkout route already calls `evaluateMasterGuardrails()` and `evaluateApprovalDecision()` — the enforcement wiring is in place. But the underlying spend aggregation functions (`getMasterDailySpend`, `getMasterMonthlySpend`) only sum Rail 1 (`privy_transactions`) and Rail 2 (`crossmint_transactions`). Rail 5 (`rail5_checkouts`) spend is invisible to the master budget, so a user can exceed their master daily/monthly limits by spending through Rail 5.

The settings page per-rail breakdown also omits Rail 5, leaving owners without visibility into how their master budget is being consumed across all rails.

## Scope

Four layers need updating — storage, API, frontend type, and frontend UI. No schema changes. No new tables. No new API routes.

---

## Layer 1: Storage — `server/storage/master-guardrails.ts`

### 1a. Add Rail 5 spend to `getMasterDailySpend`

Add a third query alongside the existing Rail 1 and Rail 2 queries:

```typescript
// Query rail5_checkouts for the owner's daily spend across ALL their cards
const [r5] = await db
  .select({ total: sql<number>`COALESCE(SUM(${rail5Checkouts.amountCents}), 0)` })
  .from(rail5Checkouts)
  .where(and(
    eq(rail5Checkouts.ownerUid, ownerUid),
    eq(rail5Checkouts.status, "approved"),
    gte(rail5Checkouts.createdAt, startOfDay),
  ));
```

**Unit conversion**: Rail 5 stores `amountCents` (USD cents). Rails 1 & 2 store `amountUsdc` (micro-USDC, where 1 USD = 1,000,000). Convert cents → micro-USDC: `cents * 10_000`. The existing `centsToMicroUsdc()` helper in `lib/guardrails/master.ts` already does this.

Update the return type and value:
```typescript
// Before
return { rail1, rail2, total: rail1 + rail2 };
// After
const rail5 = Number(r5?.total || 0) * 10_000; // cents → micro-USDC
return { rail1, rail2, rail5, total: rail1 + rail2 + rail5 };
```

### 1b. Same change for `getMasterMonthlySpend`

Mirror the daily query with `startOfMonth` instead of `startOfDay`.

### 1c. Update return type

Both functions currently return `{ rail1: number; rail2: number; total: number }`. Add `rail5`:

```typescript
Promise<{ rail1: number; rail2: number; rail5: number; total: number }>
```

Update the type signature in both:
- The functions themselves in `server/storage/master-guardrails.ts`
- The interface in `server/storage/types.ts` (lines 153–154)

### 1d. Add import

Add `rail5Checkouts` to the import from `@/shared/schema` at the top of the file.

---

## Layer 2: API — `app/api/v1/master-guardrails/route.ts`

The GET handler already calls `getMasterDailySpend` / `getMasterMonthlySpend` and returns the per-rail breakdown. Add `rail5_usd` to the response:

```typescript
spend: {
  daily: {
    rail1_usd: microUsdcToUsd(dailySpend.rail1),
    rail2_usd: microUsdcToUsd(dailySpend.rail2),
    rail5_usd: microUsdcToUsd(dailySpend.rail5),  // new
    total_usd: microUsdcToUsd(dailySpend.total),
  },
  monthly: {
    rail1_usd: microUsdcToUsd(monthlySpend.rail1),
    rail2_usd: microUsdcToUsd(monthlySpend.rail2),
    rail5_usd: microUsdcToUsd(monthlySpend.rail5),  // new
    total_usd: microUsdcToUsd(monthlySpend.total),
  },
},
```

No changes to the POST handler — it only writes config, not spend data.

---

## Layer 3: Frontend type — `app/(dashboard)/settings/page.tsx`

Update the `MasterGuardrailsData` interface (line 33–34):

```typescript
// Before
daily: { rail1_usd: number; rail2_usd: number; total_usd: number };
monthly: { rail1_usd: number; rail2_usd: number; total_usd: number };

// After
daily: { rail1_usd: number; rail2_usd: number; rail5_usd: number; total_usd: number };
monthly: { rail1_usd: number; rail2_usd: number; rail5_usd: number; total_usd: number };
```

---

## Layer 4: Frontend UI — `RailBreakdown` component (same file, line 62)

Add Rail 5 to the rails array. Use a suitable icon (e.g. `Smartphone` — matches the existing pattern for card-based rails, already imported on line 13 of the file):

```typescript
const rails = [
  { name: "Stripe Wallet", icon: Zap, daily: daily.rail1_usd, monthly: monthly.rail1_usd, color: "text-blue-600" },
  { name: "Card Wallet", icon: CreditCard, daily: daily.rail2_usd, monthly: monthly.rail2_usd, color: "text-violet-600" },
  { name: "Sub-Agent Cards", icon: Smartphone, daily: daily.rail5_usd, monthly: monthly.rail5_usd, color: "text-orange-600" },
];
```

Note: `Smartphone` is already imported on line 13. The name "Sub-Agent Cards" and orange color match the Rail 5 branding used elsewhere in the dashboard.

---

## Files touched

| File | Change |
|------|--------|
| `server/storage/master-guardrails.ts` | Add Rail 5 query + conversion in both spend functions; add import |
| `server/storage/types.ts` | Update return type on lines 153–154 |
| `app/api/v1/master-guardrails/route.ts` | Add `rail5_usd` to GET response |
| `app/(dashboard)/settings/page.tsx` | Update `MasterGuardrailsData` type + add Rail 5 to `RailBreakdown` |

## What NOT to change

- **`lib/guardrails/master.ts`** — `evaluateMasterGuardrails()` already reads `dailySpend.total` and `monthlySpend.total`. Once the storage layer includes Rail 5 in the total, enforcement is automatically correct. No changes needed.
- **`lib/guardrails/evaluate.ts`** — Pure function, currency-agnostic. No changes.
- **`lib/guardrails/approval.ts`** — Only reads config, not spend. No changes.
- **`app/api/v1/bot/rail5/checkout/route.ts`** — Already calls `evaluateMasterGuardrails()`. Will automatically benefit from the corrected totals.
- **Schema** — No table or column changes.

## Status

**Implemented.** All four layers updated and verified — server compiles clean, no breaking changes.
