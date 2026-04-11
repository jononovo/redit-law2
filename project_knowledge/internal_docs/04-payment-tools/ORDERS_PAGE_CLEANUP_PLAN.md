# Orders Page Cleanup — Technical Plan

## Goals
1. Remove the duplicate standalone `/orders` page — the `/transactions` page already has an Orders tab rendering the identical `OrdersPanel` component with strictly more functionality (guardrails wizard button).
2. Fix broken order detail links — `orders-panel.tsx` and `order-list.tsx` navigate to `/app/orders/${id}` but the actual route is `/orders/${id}`. These links currently 404.

## Current State

| Page | Route | What it renders |
|------|-------|-----------------|
| Transactions | `/transactions` | `RailPageTabs` with 3 tabs: **Transactions**, **Orders** (OrdersPanel + guardrails button), **Approvals** |
| Orders | `/orders` | Standalone `OrdersPanel` (no guardrails button, no tabs) |

Both call the same API (`/api/v1/orders`) and render the same `OrdersPanel` component.

### Bug: Broken Order Detail Links
- `components/wallet/orders-panel.tsx` line 214: `router.push('/app/orders/${order.id}')` — wrong path
- `components/wallet/order-list.tsx` line 101: `router.push('/app/orders/${order.id}')` — wrong path
- Actual route: `app/(dashboard)/orders/[order_id]/page.tsx` → URL `/orders/[order_id]`
- No middleware rewrites `/app/` prefixed paths. These clicks 404.

### Files Involved

**Delete:**
- `app/(dashboard)/orders/page.tsx` — standalone orders page

**Modify:**
- `app/(dashboard)/transactions/page.tsx` — add URL-param tab selection
- `components/dashboard/sidebar.tsx` — line 52: update nav link
- `components/wallet/orders-panel.tsx` — line 214: fix order detail link
- `components/wallet/order-list.tsx` — line 101: fix order detail link
- `app/robots.ts` — line 26: remove `/orders` from disallow list

### What Does NOT Change

- `app/(dashboard)/orders/[order_id]/page.tsx` — order detail page stays
- `/api/v1/orders` — API route stays
- `components/wallet/orders-panel.tsx` — component stays (only link fix)
- `server/storage/agent-interaction/orders.ts` — storage stays
- `features/agent-interaction/orders/create.ts` — `recordOrder()` stays

---

## Changes

### 1. Fix broken order detail links

**File:** `components/wallet/orders-panel.tsx` (line 214)

Change:
```
router.push(`/app/orders/${order.id}`)
```
To:
```
router.push(`/orders/${order.id}`)
```

**File:** `components/wallet/order-list.tsx` (line 101)

Change:
```
router.push(`/app/orders/${order.id}`)
```
To:
```
router.push(`/orders/${order.id}`)
```

### 2. Add URL-param tab selection to `/transactions` page

**File:** `app/(dashboard)/transactions/page.tsx`

Currently tab state is initialized with `useState("transactions")` and never reads from the URL. Update to:

- Import `useSearchParams` from `next/navigation`
- Read `?tab=` on mount, validate against known tab IDs (`transactions`, `orders`, `approvals`)
- Initialize `activeTab` from the URL param if valid, default to `"transactions"`
- On tab change, update the URL search param via `router.replace` (shallow, no page reload)

This way `/transactions?tab=orders` opens directly to the Orders tab. The sidebar "Orders" link will use this.

### 3. Update sidebar nav link

**File:** `components/dashboard/sidebar.tsx` (line 52)

Change:
```
{ icon: Package, label: "Orders", href: "/orders" }
```
To:
```
{ icon: Package, label: "Orders", href: "/transactions?tab=orders" }
```

The sidebar entry stays visible — users still see "Orders" in the nav — it just deep-links to the Orders tab.

### 4. Delete standalone orders page

**File:** `app/(dashboard)/orders/page.tsx` — DELETE

The order detail page at `app/(dashboard)/orders/[order_id]/page.tsx` is unaffected — it's in a subdirectory. Deleting the parent `page.tsx` does not affect subdirectory routes in Next.js App Router.

### 5. Update robots.ts

**File:** `app/robots.ts` (line 26)

Remove `/orders` from the disallow list. It's a disallow list for crawlers — the route will no longer exist as a standalone page, so there's nothing to disallow. The `/transactions` route is already disallowed (line 22), which covers the Orders tab.

### 6. Sweep for stale links

Grep for `href="/orders"` or `push("/orders")` or `"/orders"` across the codebase. Update any hits that point to the list page (not the detail page). Based on research, only the sidebar link matches — but verify at execution time.

### 7. Update replit.md

Document that `/orders` no longer exists as a standalone page. Note the order detail page (`/orders/[order_id]`) is unchanged.

---

## Execution Order

1. Fix broken order detail links in `orders-panel.tsx` and `order-list.tsx`
2. Add `useSearchParams` tab sync to `transactions/page.tsx`
3. Update sidebar link in `sidebar.tsx`
4. Delete `app/(dashboard)/orders/page.tsx`
5. Update `robots.ts`
6. Sweep for stale `/orders` links
7. Update `replit.md`
8. Restart and verify

## Risk

**Low.** No data model changes, no API changes, no storage changes. The order detail page (`/orders/[order_id]`) is completely unaffected. The link fix (step 1) is a pure bugfix. The page removal (steps 2–5) consolidates identical UI to one location.

## Estimated Effort

~15 minutes.
