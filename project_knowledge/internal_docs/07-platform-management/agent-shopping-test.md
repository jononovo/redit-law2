# Agent Shopping Test — Full-Shop Flow

## Purpose
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

## API Endpoints
| Method | Path | Purpose |
|---|---|---|
| POST | `/api/v1/agent-testing/tests` | Create test (`test_type: "full_shop"`) |
| POST | `/api/v1/agent-testing/tests/[id]/events` | Ingest batched field events |
| GET | `/api/v1/agent-testing/tests/[id]/events?since=N&observe=token` | Observer polling |
| GET | `/api/v1/agent-testing/tests/[id]/status?observe=token` | Lightweight status + stage snapshot |
| POST | `/api/v1/agent-testing/tests/[id]/submit` | Mark test submitted |
| POST | `/api/v1/agent-testing/tests/[id]/report` | Server re-derives score from raw events |
| GET | `/api/v1/agent-testing/tests/[id]/report` | Fetch scored report |
| GET | `/api/v1/agent-testing/tests/[id]/detail` | Test metadata |

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
