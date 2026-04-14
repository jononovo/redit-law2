# Observer Stage Overlay — Technical Plan

## Overview

Add a collapsible left-side panel (observer-only) to the test shop that shows real-time progress through the 8 shopping stages. Each stage is a single row with a status icon reflecting whether the agent reached it and whether it was completed accurately.

---

## Design Decisions

### Visibility
- **Observer-only** — hidden when `isObserver === false` (agent sees no overlay)
- Starts **open by default**, can be collapsed to a thin strip with a toggle button
- When collapsed: shows a small tab/chevron on the left edge to re-expand

### Brand Alignment
- The overlay is a **CreditClaw platform element**, not part of the simulated shop
- Uses CreditClaw brand colors:
  - Primary: `hsl(10, 85%, 55%)` — warm red-orange (active stage highlight, toggle button)
  - Accent: `hsl(260, 90%, 65%)` — purple (panel header, subtle accents)
  - Secondary: `hsl(200, 95%, 60%)` — bright blue (optional, informational)
- The shop itself (header, buttons, cards) retains its generic/indigo styling — it simulates a third-party store

### Layout
- Panel overlays on the left side of the viewport, positioned `fixed` so it stays in view during scroll
- Width: ~220px expanded, ~40px collapsed (just a vertical tab)
- Sits above the shop content with a subtle shadow; shop content does NOT shift/resize
- Z-index above shop content but below any modals

---

## Stage Row Specification

8 rows, one per stage, in order:

| Stage | Label |
|---|---|
| page_arrival | Landing |
| search | Search |
| product_select | Product |
| variant_config | Variant |
| add_to_cart | Add to Cart |
| cart_review | Cart |
| checkout_options | Checkout |
| payment | Payment |

### Row States

Each row shows one of four states:

| State | Visual | Condition |
|---|---|---|
| **Pending** | Gray circle (empty) | Stage not yet reached (no events) |
| **Active** | Pulsing dot (brand primary) | Stage is the current stage the agent is on |
| **Passed** | Green checkmark ✓ | Stage completed AND all field values match expected (stagePassed === true) |
| **Completed, Inaccurate** | Orange/amber checkmark ⚠ | Stage has events (was reached/completed) but stagePassed === false — e.g. wrong product, wrong color, wrong address field |

Stages with no expected fields (page_arrival, add_to_cart, cart_review) are marked passed if they have any events (per existing `deriveStageGatesFromEventLog` logic).

---

## Data Flow

### Source of Truth
The `deriveStageGatesFromEventLog()` function (in `features/agent-testing/full-shop/shared/derive-stage-gates.ts`) already computes everything needed per stage:
- `eventCount` — whether the stage was reached
- `stagePassed` — whether all field values matched expected
- `startedAt` / `completedAt` — timing
- `fieldMatches` — per-field expected vs actual with `match` boolean

### How the Observer Gets This Data

**Option A (recommended): Client-side derivation from polled events**

The observer already receives raw events via `useEventPoller` → `useStateProjector`. We can:
1. Accumulate all raw events in a ref inside the context
2. On each poll batch, re-run `deriveStageGatesFromEventLog(allEvents, scenario)` client-side
3. Expose the derived `DerivedStageGate[]` array via context

This is efficient because:
- `deriveStageGatesFromEventLog` is a pure function in `shared/` (no server imports)
- The observer already has access to the `scenario` config (fetched on init)
- No additional API calls needed
- Updates in real-time as events arrive

**Why not a separate API call:** Adding a `/stage-gates` endpoint would mean polling two endpoints. Since the derivation function is shared code and the observer already has all the raw data, computing it client-side is simpler and faster.

### Current Stage Detection
The "active" stage is determined by finding the highest-numbered stage that has events but the next stage has zero events. This uses the `STAGE_NUMBERS` map from constants.

---

## Implementation Steps

### Step 1: Extend ShopTestContext to accumulate events and derive stage gates

**File:** `features/agent-testing/full-shop/client/shop-test-context.tsx`

Changes:
- Add `allEventsRef = useRef<FullShopFieldEvent[]>([])` to accumulate raw events
- In the `onEvents` callback path (the one that feeds `projectEvents`), also append to `allEventsRef`
- Add `stageGates` state: `useState<DerivedStageGate[]>([])`
- After each batch of events, if `scenario` is available, call `deriveStageGatesFromEventLog(allEventsRef.current, scenario)` and set state
- Add `currentStage` derived value (highest stage with events)
- Expose `stageGates` and `currentStage` on the context value

New context fields:
```typescript
stageGates: DerivedStageGate[];
currentStage: string | null;
```

### Step 2: Create the overlay component

**File:** `features/agent-testing/full-shop/client/observer-stage-overlay.tsx`

Component: `ObserverStageOverlay`

Props: none (reads from `useShopTest()` context)

Behavior:
- Returns `null` if `!isObserver`
- Maintains `isExpanded` state (default: `true`)
- Reads `stageGates`, `currentStage`, `testStatus` from context

Expanded layout:
```
┌──────────────────────┐
│  ☰  Agent Progress   │  ← Header with collapse toggle
├──────────────────────┤
│  ● Landing           │  ← Each row: icon + label
│  ✓ Search            │
│  ⚠ Product           │  ← Orange = completed but wrong product
│  ◉ Variant           │  ← Pulsing = currently active
│  ○ Add to Cart       │  ← Gray = not reached yet
│  ○ Cart              │
│  ○ Checkout          │
│  ○ Payment           │
└──────────────────────┘
```

Collapsed layout:
```
┌──┐
│ ▸│  ← Small tab to re-expand
└──┘
```

Styling:
- `position: fixed; left: 0; top: 50%; transform: translateY(-50%)`
- Background: white with subtle shadow (`shadow-lg`)
- Rounded corners on the right side (`rounded-r-xl`)
- Header bar: CreditClaw accent purple (`hsl(260, 90%, 65%)`)
- Active stage dot: CreditClaw primary (`hsl(10, 85%, 55%)`) with CSS pulse animation
- Passed: `text-green-600` checkmark
- Completed inaccurate: `text-amber-500` warning icon
- Pending: `text-gray-300` empty circle
- Smooth transition on expand/collapse (`transition-all duration-300`)

### Step 3: Mount the overlay in the shop layout

**File:** `app/test-shop/[testId]/layout.tsx`

Changes:
- Import `ObserverStageOverlay`
- Render it inside `ShopShell`, after `ObserverBanner` and before/alongside `<main>`
- It positions itself fixed so no layout changes needed for the shop content

```tsx
<div className="min-h-screen bg-gray-50 flex flex-col">
  <ObserverBanner />
  <ShopHeader />
  <ObserverStageOverlay />
  <main>...</main>
</div>
```

### Step 4: Handle initialization catch-up

When the observer loads mid-test (agent already past several stages), the context init already fetches events via the status endpoint. The stage gates derivation should also run on initialization:

- In the `init()` function in context, after `initializeFromSnapshot`, also fetch all existing events and derive initial stage gates
- The existing `GET /events?since=-1` call returns all events from the start, so on first poll the full history arrives and stage gates are computed

No additional API work needed — the first poll batch will contain all historical events.

---

## Files Changed

| File | Change |
|---|---|
| `features/agent-testing/full-shop/client/shop-test-context.tsx` | Add event accumulation, stage gate derivation, expose `stageGates` + `currentStage` |
| `features/agent-testing/full-shop/client/observer-stage-overlay.tsx` | **New file** — the overlay component |
| `app/test-shop/[testId]/layout.tsx` | Import + render `ObserverStageOverlay` |

## Files NOT Changed
- `derive-stage-gates.ts` — used as-is, no modifications needed
- `constants.ts` — `STAGE_LABELS` already has the display names
- Shop pages (search, product, cart, etc.) — no changes
- Confirmation page — score display stays there, not duplicated in overlay
- API routes — no new endpoints needed

---

## Edge Cases

1. **No scenario loaded yet** — overlay shows all stages as "pending" until scenario is fetched and first events arrive
2. **Test already completed** — on init, all events load at once, stage gates fully computed immediately
3. **Observer joins before agent starts** — all stages pending, overlay updates as events arrive via polling
4. **Stages with no expected fields** (page_arrival, add_to_cart, cart_review) — always shown as "passed" (green) if reached, since there's nothing to get wrong
