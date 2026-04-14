---
name: Agent Testing Suite
description: Two test types (basic checkout + full-shop) for scoring AI agent e-commerce capabilities. Read when working on agent test flows, observer mode, scoring, or the test shop UI.
created: 2026-04-08
last_updated: 2026-04-14
---


# Agent Testing Suite

## Purpose

Score how well AI agents handle e-commerce tasks — from filling a card form (basic) to navigating a full 7-page shopping flow (full-shop). Shared DB tables, shared API routes, two very different test surfaces.

## Why It Exists

CreditClaw needs to benchmark agent quality before onboarding them for real transactions. The basic test validates form-filling accuracy; the full-shop test validates end-to-end shopping competence (search, product selection, checkout, payment). Observer mode lets the owner watch in real-time without interfering.

---

## Basic Checkout Test

Single-page card form. Agent fills 6 fields (cardholder name, card number, expiry month/year, CVV, billing ZIP) and submits.

### How It Works

- `use-checkout-field-tracker.ts` captures DOM events (focus/blur/input/select/submit_click) and batches them to the events API
- Four scorers: accuracy (40%), completion (30%), speed (15%), efficiency (15%)
- `test-card-generator.ts` generates Luhn-valid Visa test data
- Report card shows score ring, per-field breakdown, hesitation gaps

### Integration Points

- `/test-checkout` page loads test via `?t=at_xxxx`
- `testing-handler.tsx` dual-submits to legacy `/pay/testing` + new `/agent-testing/submit`
- `rail5-fulfillment.ts` marks test as approved when approval flow completes
- `test-verification.tsx` (Rail5 wizard step 8) creates test, polls status, shows report

---

## Full-Shop Test

Simulated 7-page e-commerce flow. Owner creates a test, hands the agent a URL + instructions, watches via observer mode.

### `/agent-test` Landing Page

- Auto-generates a `full_shop` test on page load (no button click)
- 3-second progress bar while test is created
- Copy CTA → grays out after copy, "Watch Your Agent Live" becomes primary
- CreditClaw-branded (nav, footer, gradient)

### Test Flow

```
Homepage → Search → Product Detail → Cart → Checkout → Payment → Confirmation
```

Each page maps to a stage:
`page_arrival` → `search` → `product_select` → `variant_config` → `add_to_cart` → `cart_review` → `checkout_options` → `payment`

### Shop UI

- **Header** (all pages): persistent search bar + cart icon + "TestShop" home link. Sticky `z-40`.
- **Homepage**: hero search bar, "Shop by Category" grid with product images
- **Product images**: AI-generated photos at `/assets/images/shop/category-{sneakers,hoodies,backpacks}.png` — used on homepage, search results, product detail (replaced emoji placeholders)
- Shop uses generic/indigo styling — simulates a third-party store, not CreditClaw-branded

### Test Lifecycle

1. `POST /api/v1/agent-testing/tests` with `{ test_type: "full_shop" }`
2. System picks random scenario (1 of 4), generates shipping address + card details
3. Returns `test_url` (agent), `observe_url` (owner), `instructions` (plain-text prompt)
4. Agent navigates, fills forms, makes selections — interactions batched as events
5. Owner opens `observe_url` for real-time read-only mirror
6. Agent clicks "Pay Now" → events flushed → `POST /submit` → `POST /report` → scored
7. Confirmation page shows grade + breakdown

### Scoring (5 Dimensions)

| Dimension | Weight | Measures |
|---|---|---|
| Instruction Following | 35% | Right product, color, size, quantity, shipping method? |
| Data Accuracy | 25% | Form values match expected (address, card)? |
| Flow Completion | 20% | Stages completed, terms checked? |
| Speed | 10% | Time from landing to payment (<90s=A, <180s=B, <300s=C) |
| Navigation Efficiency | 10% | Backtracks, wrong clicks, corrections |

Grades: A (90+), B (80+), C (70+), D (60+), F (<60)

### Scenarios

4 static templates: search term, product, color, size, quantity, shipping method. Paired at creation with random shipping address (static pools) and Luhn-valid Visa test card.

### Product Catalog

9 products across 3 categories:
- **Sneakers** (3): Urban Runner X, Cloud Step Elite, Street Pulse Max
- **Hoodies** (3): Alpine Fleece Pro, Urban Crest Zip, Night Owl Pullover
- **Backpacks** (3): Trail Blazer 40L, Metro Commuter 25L, Summit Pack 55L

---

## Observer Mode

Append `?observe=<ownerToken>` to the test URL.

### What the Owner Sees

- Gradient banner (CreditClaw primary→accent: `hsl(10,85%,55%)` → `hsl(260,90%,65%)`)
- Collapsible stage progress overlay (left side, observer-only, CreditClaw dark theme)
- All form fields read-only
- Automatic page navigation mirroring agent progress
- Adaptive polling: 500ms active, slows to 2s after 3 idle polls

### Init Sequence

Observer fetches `GET /status` for catch-up (stage snapshot + last sequence number), then starts polling `GET /events?since=N`.

### Stage Overlay

Dark-themed (`hsl(220,20%,12%)`) fixed panel on left with CreditClaw gradient header, collapsible to a chevron tab. 8 rows, one per stage:

| State | Icon | Condition |
|---|---|---|
| Pending | Gray empty circle | `eventCount === 0` |
| Active | Pulsing dot (`hsl(10,85%,55%)`) | Highest stage with events where next stage has none |
| Passed | Green checkmark | `stagePassed === true` |
| Inaccurate | Amber warning | Stage reached but `stagePassed === false` |

Stages with no expected fields (page_arrival, add_to_cart, cart_review) — always "passed" if reached.

**Accordion details:** Each stage row has a chevron — clicking it expands that stage (one open at a time). Active stage auto-expands. Expanded view shows:
- **Expected fields** for the stage (e.g. Search → "Search query: hoodie", Variant → color/size/quantity with expected values). Sensitive fields masked (card → last 4, CVV → `***`). Each field shows a ✓/✗ icon if an actual value has arrived.
- **Last triggered event** — single line showing the most recent field event for that stage with its timestamp (e.g. `Color: "Red" — 14:32:05`). Uses `FieldMatchResult.timestamp` from `deriveStageGatesFromEventLog`. For fieldless stages, shows the stage description ("Arrive at homepage").

### Overlay Data Flow

Stage gates derived **client-side** — no extra API calls. We chose this over a `/stage-gates` endpoint because `deriveStageGatesFromEventLog` is a pure `shared/` function and the observer already has all raw events from polling.

1. `useEventPoller` polls `GET /events?since=N` → raw `PolledEvent[]`
2. `handlePolledEvents` wraps `projectEvents`: projects state (unchanged), then accumulates events in `allEventsRef`
3. Each batch → `deriveStageGatesFromEventLog(allEvents, scenario)` → `DerivedStageGate[]`
4. Context exposes `stageGates` + `currentStage` → consumed by `ObserverStageOverlay`

### Gotchas

- **Type narrowing required:** `PolledEvent.stage` is `string | null` but `deriveStageGatesFromEventLog` expects `FullShopFieldEvent` where `stage` is `string`. Events with `null` stage are filtered before accumulation. Both types live in `shared/types.ts` (`PolledEvent` was consolidated from 3 former duplicates).
- **Scenario must be available before polling starts.** Poller is gated on `!isLoading`; `isLoading` only clears after `init()` fetches the scenario. Breaking this gate would cause `deriveStageGatesFromEventLog` to receive `null` scenario.
- **Z-index layering:** Overlay = `z-50`, shop header = `z-40`. Overlay must exceed header or it disappears behind it on scroll. No modals exist in the shop, so `z-50` is safe.
- **Mid-test join:** First poll batch returns full event history → gates computed immediately. No special catch-up logic needed.
- **Agent state persistence:** `shopState` + `cart` are saved to `sessionStorage` (keyed by `testId`) on every change. This lets shop pages survive hard navigations (`window.location.href`, `<a href>`) and browser refreshes. Observers don't persist — they reconstruct from polled events. Multiple concurrent tests use separate keys (`shop-test-{testId}`) so they never collide.

---

## Key Files

| File | Purpose |
|---|---|
| `features/agent-testing/full-shop/shared/types.ts` | `PolledEvent`, `FullShopFieldEvent`, `DerivedStageGate`, `ShopState`, scenario/report types |
| `features/agent-testing/full-shop/shared/constants.ts` | `FULL_SHOP_STAGES`, `STAGE_LABELS`, `STAGE_NUMBERS`, `EVENT_TYPES`, scoring weights |
| `features/agent-testing/full-shop/shared/derive-stage-gates.ts` | Pure function: events + scenario → per-stage pass/fail, field matches, corrections |
| `features/agent-testing/full-shop/shared/scenario-definitions.ts` | 4 scenario templates |
| `features/agent-testing/full-shop/shared/scoring/` | 5 scorers + report generator |
| `features/agent-testing/full-shop/server/address-generator.ts` | Random shipping address from static pools |
| `features/agent-testing/full-shop/server/pick-random-scenario.ts` | Scenario selection + address/card pairing |
| `features/agent-testing/full-shop/client/shop-test-context.tsx` | Dual-mode provider (agent vs observer); event accumulation + stage gate derivation; sessionStorage persistence for agent state |
| `features/agent-testing/full-shop/client/observer-stage-overlay.tsx` | Collapsible left-side stage panel (observer-only) |
| `features/agent-testing/full-shop/client/use-full-shop-test-tracker.ts` | Batched event posting (agent mode) |
| `features/agent-testing/full-shop/client/use-event-poller.ts` | Adaptive polling (observer mode) |
| `features/agent-testing/full-shop/client/use-state-projector.ts` | Projects events → `ShopState` |
| `app/test-shop/[testId]/layout.tsx` | Shop layout: header, search bar, observer banner + overlay |
| `app/test-shop/[testId]/` | 7 shop pages + confirmation |
| `app/agent-test/` | Landing page — auto-generates test, shows instructions + observe link |
| `features/agent-testing/storage/agent-testing-storage.ts` | Drizzle CRUD for both test types |

## API Endpoints

All routes under `app/api/v1/agent-testing/tests/`.

| Method | Path | Purpose |
|---|---|---|
| POST | `/` | Create test (`test_type: "full_shop"` or omit for basic) |
| GET | `/[id]` | Poll status (fields_filled, total_fields, status, score, grade) |
| POST | `/[id]/events` | Ingest batched field events (`stage` + `value_snapshot` for full-shop) |
| GET | `/[id]/events?since=N&observe=token` | Observer polling (full-shop) |
| GET | `/[id]/status?observe=token` | Lightweight status + stage snapshot (full-shop) |
| POST | `/[id]/submit` | Submit values + auto-score (basic) or mark submitted (full-shop) |
| POST | `/[id]/report` | Server re-derives score from raw events (full-shop) |
| GET | `/[id]/report` | Fetch scored report |
| GET | `/[id]/detail` | Test metadata (card_test_token for basic, scenario for full-shop with observer token) |
| GET | `/by-card/[cardId]` | Lookup tests by card (auth required, owner-scoped) |

## DB Schema

Two tables (shared across test types):
- `agent_test_sessions` — config, scenario, progress, score, report (JSONB)
- `agent_test_field_events` — individual events with `stage` and `value_snapshot`

Full-shop columns: `test_type`, `scenario` (JSONB), `instruction_text`, `owner_token`, `current_stage`, `stages_completed`, `current_page`, `agent_type`, `browser_tool`.

## Security

- Observer endpoints require valid `ownerToken` (`otk_` + 24 hex chars)
- Full report gated behind owner token for full-shop; without it, only score/grade returned
- CVV replaced with `"***"` at event capture time — never stored
- Card numbers stored as BIN (first 6) + last 4 in value snapshots
- Server re-derives scores from raw events on `POST /report` (client score is UX-only)

## Status

Implemented. Both test types are live. Observer mode with stage overlay is complete.
