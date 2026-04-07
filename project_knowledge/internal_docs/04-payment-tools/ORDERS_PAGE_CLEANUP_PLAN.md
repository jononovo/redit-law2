# Orders Page Cleanup — Technical Plan

## Goal
Remove the duplicate standalone `/orders` page. The `/transactions` page already has an Orders tab rendering the identical `OrdersPanel` component. Consolidate to one entry point and add URL-based tab selection so external links can deep-link to the Orders tab.

## Current State

| Page | Route | What it renders |
|------|-------|-----------------|
| Transactions | `/transactions` | `RailPageTabs` with 3 tabs: **Transactions**, **Orders** (OrdersPanel + guardrails button), **Approvals** |
| Orders | `/orders` | Standalone `OrdersPanel` (no guardrails button, no tabs) |

Both call the same API (`/api/v1/orders`) and render the same component. The `/transactions` version is strictly better — it includes the guardrails wizard button and sits alongside transaction/approval context.

### Files Involved

- `app/(dashboard)/orders/page.tsx` — standalone orders page (DELETE)
- `app/(dashboard)/transactions/page.tsx` — tabbed page, needs URL-param tab selection
- `components/dashboard/sidebar.tsx` — line 52: `{ icon: Package, label: "Orders", href: "/orders" }`
- `components/wallet/rail-page-tabs.tsx` — presentational tab wrapper (no URL sync)
- `app/robots.ts` — line 26: includes `/orders` in sitemap/robots config

### What Does NOT Change

- `app/(dashboard)/orders/[order_id]/page.tsx` — order detail page stays (it's not a duplicate)
- `/api/v1/orders` — API route stays
- `components/wallet/orders-panel.tsx` — component stays
- `server/storage/agent-interaction/orders.ts` — storage stays
- `features/agent-interaction/orders/create.ts` — `recordOrder()` stays

---

## Changes

### 1. Add URL-param tab selection to `/transactions` page

**File:** `app/(dashboard)/transactions/page.tsx`

Currently tab state is initialized with `useState("transactions")` and never reads from the URL. Update to:

- Read `?tab=` from `useSearchParams()` on mount
- Initialize `activeTab` from the URL param if present, default to `"transactions"`
- Valid tab IDs: `transactions`, `orders`, `approvals`
- When tab changes, update the URL param with `router.replace` (no navigation, just URL sync)

This way `/transactions?tab=orders` opens directly to the Orders tab.

### 2. Update sidebar nav link

**File:** `components/dashboard/sidebar.tsx` (line 52)

Change:
```
{ icon: Package, label: "Orders", href: "/orders" }
```
To:
```
{ icon: Package, label: "Orders", href: "/transactions?tab=orders" }
```

The sidebar entry stays visible — users still see "Orders" in the nav — but it now deep-links to the Orders tab on the transactions page.

### 3. Delete standalone orders page

**File:** `app/(dashboard)/orders/page.tsx` — DELETE

The order detail page at `app/(dashboard)/orders/[order_id]/page.tsx` is unaffected and stays.

### 4. Update robots.ts

**File:** `app/robots.ts`

Remove `/orders` from the explicit routes list (or replace with `/transactions?tab=orders` if it's an allow-list).

### 5. Check for other links to `/orders`

Grep for `href="/orders"` or `push("/orders")` across the codebase. Update any hits to `/transactions?tab=orders`. Based on research, the sidebar is the only navigation link — but verify at execution time.

### 6. Update replit.md

Document that `/orders` no longer exists as a standalone page. Update the existing note about consolidation.

---

## Execution Order

1. Add `useSearchParams` tab sync to `transactions/page.tsx`
2. Update sidebar link
3. Delete `orders/page.tsx`
4. Update `robots.ts`
5. Grep for stale `/orders` links
6. Update `replit.md`
7. Restart and verify

## Risk

**Low.** No data model changes. No API changes. No storage changes. Just removing a duplicate page and updating one nav link. The order detail page (`/orders/[order_id]`) is completely unaffected.

## Estimated Effort

~15 minutes.
