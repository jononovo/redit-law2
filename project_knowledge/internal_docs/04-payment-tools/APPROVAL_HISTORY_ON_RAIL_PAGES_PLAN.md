# Approval History on Rail-Specific Pages — Technical Plan

## Goal
Replace the pending-only approval list on rail-specific pages (`/sub-agent-cards`, `/stripe-wallet`, `/card-wallet`) with the full-history approval panel that already exists on `/transactions`. Users should see pending approvals they can act on AND a history of approved, denied, and expired requests — all with timestamps.

## Current State

### What exists
- **`unified_approvals` table** — stores all approval data with `status` (pending/approved/denied/expired), `decidedAt` timestamp, `createdAt`, rail, merchant, amount, bot name, etc. All historical data is recorded.
- **`/api/v1/approvals/history`** — returns full approval history with filters (status, rail, bot, date range). Already works.
- **`/api/v1/approvals?rail=xxx`** — returns only pending, non-expired approvals for a specific rail. Used by rail pages today.
- **`ApprovalHistoryPanel`** (`components/wallet/approval-history-panel.tsx`) — full-featured component with status/rail/bot/date filters, approve/reject actions on pending items, timestamps on decided items. Used on `/transactions`.
- **`ApprovalList`** (`components/wallet/approval-list.tsx`) — simple pending-only list with approve/reject buttons. Used on rail-specific pages.

### The problem
Rail-specific pages use `ApprovalList` which only shows pending approvals. Once approved or rejected, items vanish. No history visible. The full history exists in the database and is accessible via `/transactions` (Approvals tab), but users on rail pages can't see it.

### Where `ApprovalList` is used

1. **`/sub-agent-cards`** — configured via `CreditCardListPage` component
   - `approvalsEndpoint: "/api/v1/approvals?rail=rail5"`
   - `approvalsDecideEndpoint: "/api/v1/approvals/decide"`
   - `CreditCardListPage` renders `ApprovalList` as the Approvals tab content

2. **`/stripe-wallet`** — custom page, fetches from `/api/v1/approvals?rail=rail1`

3. **`/card-wallet`** — custom page, fetches from `/api/v1/approvals?rail=rail2`

### Architecture of `CreditCardListPage`
`CreditCardListPage` (`components/wallet/credit-card-list-page.tsx`) is the shared page shell used by rail-specific pages. It builds 4 tabs (Cards, Transactions, Orders, Approvals) from a config object. The Approvals tab currently:
- Fetches pending approvals from `config.approvalsEndpoint`
- Renders `ApprovalList` with approve/reject actions
- Shows a badge count of pending approvals on the tab

---

## Changes

### 1. Add `defaultRail` prop to `ApprovalHistoryPanel`

**File:** `components/wallet/approval-history-panel.tsx`

Currently the rail filter always initializes to `"all"`. Add an optional `defaultRail` prop:

```typescript
interface ApprovalHistoryPanelProps {
  onConfigureGuardrails?: () => void;
  defaultRail?: string;
}
```

Initialize the rail filter from this prop:
```typescript
const [railFilter, setRailFilter] = useState(defaultRail || "all");
```

When `defaultRail` is set, the component will fetch history pre-filtered to that rail on mount. The user can still change the filter manually.

### 2. Replace `ApprovalList` with `ApprovalHistoryPanel` in `CreditCardListPage`

**File:** `components/wallet/credit-card-list-page.tsx`

In the Approvals tab definition, replace:
```tsx
<ApprovalList approvals={approvals} variant="commerce" onDecide={...} />
```
With:
```tsx
<ApprovalHistoryPanel defaultRail={config.railId} />
```

This means the approval tab on rail pages will now show full history (pending + decided) with timestamps, pre-filtered to the relevant rail, with the ability to act on pending items.

The `ApprovalHistoryPanel` already handles its own data fetching from `/api/v1/approvals/history`, so we can also remove the approval-fetching logic from `CreditCardListPage` (the `fetchApprovals` call and related state).

**Config change:** Each rail page's config object needs a `railId` field (e.g., `"rail5"`, `"rail1"`, `"rail2"`) so it can be passed as `defaultRail`. Check if this already exists in the config type — if not, add it.

### 3. Update `/stripe-wallet` and `/card-wallet` pages

**Files:**
- `app/(dashboard)/stripe-wallet/page.tsx`
- `app/(dashboard)/card-wallet/page.tsx`

These pages have custom implementations (they don't use `CreditCardListPage` for everything). Check how they render their Approvals tab:
- If they use `ApprovalList` directly, replace with `<ApprovalHistoryPanel defaultRail="rail1" />` or `defaultRail="rail2"`.
- If they use `CreditCardListPage`, the change from step 2 handles it.

### 4. Clean up unused code (if applicable)

After the swap, check if `ApprovalList` is still used anywhere. If not:
- Remove `components/wallet/approval-list.tsx`
- Remove the `approvalsEndpoint` fetch logic from `CreditCardListPage` if it's no longer needed
- Keep `approvalsDecideEndpoint` only if it's still referenced

### 5. Pending approval badge count

`CreditCardListPage` currently shows a badge on the Approvals tab with the count of pending approvals. Since `ApprovalHistoryPanel` does its own fetching, the badge count logic in `CreditCardListPage` may need to stay (it's a separate lightweight fetch just for the count) or be moved into `ApprovalHistoryPanel` as a callback.

Verify that the tab badge still works after the swap. If the badge count was derived from the `approvals` state that we're removing, we'll need to either:
- Keep a minimal pending-count fetch in `CreditCardListPage`
- Or add a badge count callback to `ApprovalHistoryPanel`

---

## What Does NOT Change

- `unified_approvals` table — no schema changes
- `/api/v1/approvals/history` — already returns everything we need
- `/api/v1/approvals/decide` — approve/reject flow unchanged
- `/api/v1/approvals` — pending-only endpoint stays (may still be used for badge counts)
- `ApprovalHistoryPanel` on `/transactions` — unaffected (it just gains the optional `defaultRail` prop)

## Execution Order

1. Add `defaultRail` prop to `ApprovalHistoryPanel`
2. Add `railId` to `CreditCardListPage` config type (if needed)
3. Replace `ApprovalList` with `ApprovalHistoryPanel` in `CreditCardListPage`
4. Update `/stripe-wallet` and `/card-wallet` if they use `ApprovalList` directly
5. Verify tab badge count still works
6. Clean up unused `ApprovalList` if no longer referenced
7. Update `replit.md`
8. Restart and verify

## Risk

**Low.** The `ApprovalHistoryPanel` already exists and works on `/transactions`. We're reusing a proven component. The approve/reject functionality is already built into it. No data model or API changes needed.

## Estimated Effort

~20 minutes.
