# Agent Testing Suite (`features/agent-testing/`)

Two test types for evaluating AI agent capabilities, sharing the same DB tables and API routes.

---

## Basic Checkout Test

Single-page card form test. Agent fills 6 fields (cardholder name, card number, expiry month/year, CVV, billing ZIP) and submits.

**Architecture:**
- `constants.ts` — field names, limits, timing constants
- `types.ts` — SubmittedValues, FieldEventInput, TestReport, ApprovalInfo types
- `test-card-generator.ts` — generates realistic test card data (Visa BIN, names, zip codes)
- `storage/agent-testing-storage.ts` — Drizzle-based CRUD for `agent_test_sessions` + `agent_test_field_events` tables
- `scoring/` — four scorers (accuracy 40%, completion 30%, speed 15%, efficiency 15%) + `report-generator.ts`
- `hooks/use-checkout-field-tracker.ts` — client-side hook that captures DOM events (focus/blur/input/select/submit_click) and batches them to the events API
- `components/agent-test-report-card.tsx` — rich report visualization with score ring, per-field breakdown, hesitation gaps
- `components/agent-test-progress-indicator.tsx` — real-time progress bar during test execution

**Integration points:**
- `/test-checkout` page loads test via `?t=at_xxxx`, renders checkout form, uses field tracker hook
- `testing-handler.tsx` dual-submits to legacy `/pay/testing` + new `/agent-testing/submit`
- `rail5-fulfillment.ts` marks test as approved when approval flow completes
- `test-verification.tsx` (Rail5 wizard step 8) creates agent test, polls status, shows report card

---

## Full-Shop Test

A simulated 7-page e-commerce experience that scores how well an AI agent can navigate a realistic shopping flow. The owner creates a test, hands the agent a URL + instructions, and watches in real-time via observer mode.

## Test Flow
```
Homepage → Search → Product Detail → Cart → Checkout → Payment → Confirmation
```
Each page maps to a **stage** tracked by the system:
`page_arrival` → `search` → `product_select` → `variant_config` → `add_to_cart` → `cart_review` → `checkout_options` → `payment`

## Test Lifecycle
1. **Create** — `POST /api/v1/agent-testing/tests` with `{ test_type: "full_shop" }`
2. System picks a random scenario (1 of 4 templates), generates shipping address + card details
3. Returns `test_url` (for agent), `observe_url` (for owner), and `instructions` (plain-text prompt)
4. Agent navigates `test_url`, fills forms, makes selections — every interaction is batched as events
5. Owner opens `observe_url` to watch in real-time (read-only mirror of agent's progress)
6. Agent clicks "Pay Now" → events flushed → `POST /submit` → `POST /report` → scored
7. Confirmation page shows grade + score breakdown

## Scoring (5 Dimensions)
| Dimension | Weight | What it measures |
|---|---|---|
| Instruction Following | 35% | Did the agent pick the right product, color, size, quantity, shipping method? |
| Data Accuracy | 25% | Do form values match expected values (address, card details)? |
| Flow Completion | 20% | How many of 8 stages were completed? Terms checked? |
| Speed | 10% | Total time from landing to payment (benchmarks: <90s=A, <180s=B, <300s=C) |
| Navigation Efficiency | 10% | Backtracks, wrong clicks, corrections |

Grades: A (90+), B (80+), C (70+), D (60+), F (<60)

## Observer Mode
Append `?observe=<ownerToken>` to the test URL. The owner sees:
- A purple banner indicating observer mode
- All form fields in read-only state
- State updates via adaptive polling (500ms when active, slows to 2s after 3 idle polls)
- Automatic page navigation mirroring the agent's progress

On first load, observer fetches `GET /status` for catch-up (stage snapshot + last sequence number), then starts polling `GET /events?since=N`.

## Scenarios
4 static templates, each specifying: search term, product, color, size, quantity, shipping method. Paired at creation time with a random shipping address (from static pools of names/streets/cities) and random test card data (Luhn-valid Visa numbers).

## Product Catalog
9 products across 3 categories:
- **Sneakers** (3): Urban Runner X, Cloud Step Elite, Street Pulse Max
- **Hoodies** (3): Alpine Fleece Pro, Urban Crest Zip, Night Owl Pullover
- **Backpacks** (3): Trail Blazer 40L, Metro Commuter 25L, Summit Pack 55L

## Key Files
```
features/agent-testing/full-shop/
├── shared/           # Pure functions — importable by client + server
│   ├── types.ts, constants.ts, scenario-definitions.ts
│   ├── derive-stage-gates.ts, build-event-narrative.ts
│   └── scoring/      # 5 scorers + report generator
├── server/           # Server-only (uses crypto)
│   ├── address-generator.ts
│   └── pick-random-scenario.ts
└── client/           # React hooks + context
    ├── shop-test-context.tsx      # Dual-mode provider (agent vs observer)
    ├── use-full-shop-test-tracker.ts  # Batched event posting
    ├── use-event-poller.ts        # Adaptive polling for observer
    └── use-state-projector.ts     # Projects events → ShopState

app/test-shop/[testId]/           # Shop pages (layout, home, search, product, cart, checkout, payment, confirmation)
app/agent-test/                   # Landing page — create test + get URLs
```

## API Endpoints (Shared)
All routes live under `app/api/v1/agent-testing/tests/`.

| Method | Path | Purpose |
|---|---|---|
| POST | `/` | Create test (pass `test_type: "full_shop"` or omit for basic checkout) |
| GET | `/[id]` | Poll status (fields_filled, total_fields, status, score, grade) |
| POST | `/[id]/events` | Ingest batched field events (with `stage` + `value_snapshot` for full-shop) |
| GET | `/[id]/events?since=N&observe=token` | Observer polling (full-shop) |
| GET | `/[id]/status?observe=token` | Lightweight status + stage snapshot (full-shop) |
| POST | `/[id]/submit` | Submit values + auto-score (basic) or mark submitted (full-shop) |
| POST | `/[id]/report` | Server re-derives score from raw events (full-shop) |
| GET | `/[id]/report` | Fetch scored report |
| GET | `/[id]/detail` | Test metadata (card_test_token for basic, scenario for full-shop with observer token) |
| GET | `/by-card/[cardId]` | Lookup tests by card (auth required, owner-scoped) |

## DB Schema
Two tables (shared with basic checkout tests):
- `agent_test_sessions` — test config, scenario, progress tracking, score, report (JSONB)
- `agent_test_field_events` — individual interaction events with `stage` and `value_snapshot` columns

Key columns added for full-shop: `test_type`, `scenario` (JSONB), `instruction_text`, `owner_token`, `current_stage`, `stages_completed`, `current_page`, `agent_type`, `browser_tool`.

## Security
- Observer endpoints require valid `ownerToken` (24-char hex, prefixed `otk_`)
- Full report gated behind owner token for full-shop tests; without it, only score/grade returned
- CVV never stored — replaced with `"***"` at event capture time
- Card numbers stored as BIN (first 6) + last 4 in value snapshots
- Server re-derives scores from raw events on `POST /report` (client score is for UX only)
