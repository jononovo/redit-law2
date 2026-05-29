# Approval History on Rail-Specific Pages — Technical Plan

## Goal
Replace the pending-only approval list on rail-specific pages (`/sub-agent-cards`, `/stripe-wallet`, `/card-wallet`) with the full-history approval panel that already exists on `/transactions`. Users should see pending approvals they can act on AND a history of approved, denied, and expired requests — all with timestamps.

## Current State

### What exists
- **`unified_approvals` table** — stores all approval data with `status` (pending/approved/denied/expired), `decidedAt` timestamp, `createdAt`, rail, merchant, amount, bot name, etc. All historical data is recorded.
- **`/api/v1/approvals/history`** — returns full approval history with filters (status, rail, bot, date range). Already works.
- **`/api/v1/approvals?rail=xxx`** — returns only pending, non-expired approvals for a specific rail. Used by rail pages today.
- **`ApprovalHistoryPanel`** (`components/wallet/approval-history-panel.tsx`) — full-featured component with status/rail/bot/date filters, approve/reject actions on pending items, timestamps on decided items. Used on `/transactions`. Does its own data fetching internally.
- **`ApprovalList`** (`components/wallet/approval-list.tsx`) — simple pending-only list with approve/reject buttons. Receives data from parent. Used on rail-specific pages.

### The problem
Rail-specific pages use `ApprovalList` which only shows pending approvals. Once approved or rejected, items vanish. No history visible. The full history exists in the database and is accessible via `/transactions` (Approvals tab), but users on rail pages can't see it.

### Where `ApprovalList` is used (3 places)

1. **`/sub-agent-cards`** — uses `CreditCardListPage` component
   - `CreditCardListPage` fetches pending approvals from `config.approvalsEndpoint` (`/api/v1/approvals?rail=rail5`)
   - Stores them in `approvals` state, renders `ApprovalList`, shows `badge: approvals.length` on tab
   - File: `components/wallet/credit-card-list-page.tsx` (lines 255–266)

2. **`/stripe-wallet`** — custom page, uses `ApprovalList` directly
   - Fetches pending approvals from `/api/v1/approvals?rail=rail1`
   - Renders `ApprovalList` with `variant="crypto"`, shows `badge: approvals.length`
   - File: `app/(dashboard)/stripe-wallet/page.tsx` (lines 267–277)

3. **`/card-wallet`** — custom page, uses `ApprovalList` directly
   - Fetches pending approvals from `/api/v1/approvals?rail=rail2`
   - Renders `ApprovalList` with `variant="commerce"`, shows `badge: approvals.length`
   - File: `app/(dashboard)/card-wallet/page.tsx` (lines 370–381)

---

## Changes

### 1. Add `defaultRail` and `onPendingCount` props to `ApprovalHistoryPanel`

**File:** `components/wallet/approval-history-panel.tsx`

Currently the component takes no props. Add two optional props:

```typescript
interface ApprovalHistoryPanelProps {
  defaultRail?: string;
  onPendingCount?: (count: number) => void;
}
```

- `defaultRail` — initializes `railFilter` state (e.g., `"rail5"`). When set, the component fetches pre-filtered to that rail on mount. User can still change the filter manually.
- `onPendingCount` — callback that reports the number of pending (non-expired) approvals in the current result set. This solves the badge count problem — the parent can use it to show the tab badge without a separate fetch.

Inside `fetchApprovals`, after setting state:
```typescript
if (onPendingCount) {
  const pendingCount = list.filter(a => a.status === "pending" && new Date(a.expiresAt) > new Date()).length;
  onPendingCount(pendingCount);
}
```

When `defaultRail` is set, hide the Rail filter dropdown (it's redundant — you're already on that rail's page). The user can still filter by status, bot, and date.

### 2. Update `CreditCardListPage` — swap component, add `railId` to config

**File:** `components/wallet/credit-card-list-page.tsx`

**Config type change:** Add `railId` to `CreditCardListPageConfig`:
```typescript
railId?: string; // e.g., "rail5", "rail1", "rail2"
```

**State change:** Add `pendingApprovalCount` state:
```typescript
const [pendingApprovalCount, setPendingApprovalCount] = useState(0);
```

**Tab content swap (lines 255–266):** Replace:
```tsx
{
  id: "approvals",
  label: "Approvals",
  badge: approvals.length,
  content: (
    <ApprovalList
      approvals={approvals}
      variant={config.approvalsDecideEndpoint ? "commerce" : "crypto"}
      onDecide={(id, decision) => walletActions.handleApprovalDecision(id, decision, { onSuccess: fetchApprovals })}
    />
  ),
}
```
With:
```tsx
{
  id: "approvals",
  label: "Approvals",
  badge: pendingApprovalCount,
  content: <ApprovalHistoryPanel defaultRail={config.railId} onPendingCount={setPendingApprovalCount} />,
}
```

**Cleanup in `CreditCardListPage`:**
- Remove `fetchApprovals` callback and `approvals` state (no longer needed — `ApprovalHistoryPanel` handles its own fetching)
- Remove `fetchApprovals()` from the `useEffect` that runs on mount
- Remove `ApprovalList` import, add `ApprovalHistoryPanel` import
- Keep `approvalsEndpoint` and `approvalsDecideEndpoint` in the config type for now (they're not referenced anymore but removing them would require updating all config objects — can clean up separately)

**Update sub-agent-cards config:** Add `railId: "rail5"` to the config in `app/(dashboard)/sub-agent-cards/page.tsx`.

### 3. Update `/stripe-wallet` page

**File:** `app/(dashboard)/stripe-wallet/page.tsx`

Replace `ApprovalList` usage (lines 267–277) with:
```tsx
{
  id: "approvals",
  label: "Approvals",
  badge: pendingApprovalCount,
  content: <ApprovalHistoryPanel defaultRail="rail1" onPendingCount={setPendingApprovalCount} />,
}
```

Add `pendingApprovalCount` state. Remove `ApprovalList` import, `fetchApprovals` callback, and `approvals` state.

### 4. Update `/card-wallet` page

**File:** `app/(dashboard)/card-wallet/page.tsx`

Same pattern as stripe-wallet. Replace `ApprovalList` (lines 370–381) with `ApprovalHistoryPanel defaultRail="rail2"`. Add `pendingApprovalCount` state. Remove `ApprovalList` import, `fetchApprovals`, and `approvals` state.

### 5. Clean up `ApprovalList`

After steps 2–4, grep for remaining `ApprovalList` usage. If nothing references it:
- Delete `components/wallet/approval-list.tsx`
- Remove from any barrel exports

### 6. Update docs

Update `replit.md` to note that all rail pages now use `ApprovalHistoryPanel` for full approval history.

---

## What Does NOT Change

- `unified_approvals` table — no schema changes
- `/api/v1/approvals/history` — already returns everything we need
- `/api/v1/approvals/decide` — approve/reject flow unchanged
- `/api/v1/approvals` — pending-only endpoint stays (other consumers may use it)
- `ApprovalHistoryPanel` on `/transactions` — unaffected (no `defaultRail` passed, so it still shows "All Rails")
- Order detail page (`/orders/[order_id]`) — unaffected

## Execution Order

1. Add `defaultRail` and `onPendingCount` props to `ApprovalHistoryPanel`
2. Add `railId` to `CreditCardListPage` config type, swap component, clean up fetch logic
3. Add `railId: "rail5"` to sub-agent-cards config
4. Update `/stripe-wallet` page — swap `ApprovalList` → `ApprovalHistoryPanel`
5. Update `/card-wallet` page — same swap
6. Grep for remaining `ApprovalList` usage, delete if unused
7. Update `replit.md`
8. Restart and verify

## Risk

**Low.** `ApprovalHistoryPanel` already works on `/transactions` and handles its own fetching, decide actions, and display. We're reusing a proven component. The `onPendingCount` callback is the only new logic — it's a simple filter count.

One UX consideration: when `defaultRail` is set, we hide the rail filter dropdown since it's redundant on a rail-specific page. If this feels limiting, we can keep it visible — it's a minor detail.

## Estimated Effort

~20 minutes.
