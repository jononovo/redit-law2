# Tests

Automated test suite using Vitest. Run all tests with `npx vitest run`.

## When to Write Tests

Write tests for **key business logic** — pure functions, scoring engines, validation rules, payment calculations, security-critical code. These are functions where a regression would break the product and be hard to catch manually.

Do **not** write tests for:
- Thin API route wrappers that just call storage
- UI components and layout
- Simple CRUD pass-throughs
- One-off scripts

## How Many Tests

Match test count to feature importance. A critical payment validation function deserves thorough edge-case coverage. A utility helper that formats a date does not need 15 test cases. Aim for **meaningful coverage of the important paths**, not checkbox coverage of everything.

Bad: 20 tests for a string formatter, 0 tests for the approval system.
Good: 3 tests for the formatter, 15 tests for the approval system.

## Current Coverage

| Area | File | Tests | What it covers |
|------|------|-------|----------------|
| x402 receive | `x402/receive.test.ts` | 30 | Header parsing, payment validation, dedupe keys |
| x402 utils | `rail1/x402-utils.test.ts` | 20 | EIP-712 typed data, nonce generation, USDC formatting |
| Guardrails | `guardrails/evaluate.test.ts` | 16 | Per-tx limits, daily/monthly budgets, approval thresholds |
| Brand claims | `brand-claims/domain.test.ts` | 23 | Domain matching, free email blocking |
| Brand claims DB | `brand-claims/api.test.ts` | 4 | Table structure, constraints |
| Maturity | `maturity/resolve-maturity.test.ts` | 12 | Draft → community promotion rules |
| Brand Registry API | `brand-registry-api/api.test.ts` | 17 | Discovery API query params, filtering, response shape |

| Product Index Recommend Pipeline | `product-index-recommend-pipeline/product-index-recommend-pipeline.test.ts` | 19 | Data integrity, category FTS, merchant ranking, vector search, e2e pipeline |
| Rail 5 Card & Transaction Pipeline | `rail5-card-transaction-pipeline/rail5-card-transaction-pipeline.test.ts` | 72 | ID generation, key validation, onboarding schemas, checkout/confirm schemas, card guardrails, checkout steps, spawn payload, encrypted card file, defaults |

**Major gaps** (no automated tests yet):
- Scan engine / scoring rubric
- Approval system (create, resolve, HMAC, expiry, fulfillment callbacks)
- Checkout flows (x402 settle, Base Pay verify, QR Pay credit)
- Bot messaging (sendToBot routing, webhook health transitions)
- Tenant resolution (hostname → tenantId, config loading)
- Order creation and wiring across rails

When touching these areas, adding tests is high value.

## Adding a New Test

1. Create `tests/{feature}/your-feature.test.ts`
2. Import from Vitest: `import { describe, it, expect } from "vitest"`
3. Import the function under test using the `@/` alias: `import { myFn } from "@/lib/feature/myFn"`
4. Group related tests in `describe` blocks
5. Run with `npx vitest run tests/{feature}/your-feature.test.ts`

Config is in `vitest.config.ts` with the `@/` path alias mapped to the project root.

## Manual Integration Tests

`tests/manual-api-suite.md` contains a curl-based manual test suite (1,000+ lines) covering bot registration, wallet ops, purchases, guardrails, checkout, and x402 endpoints. Use it as a reference for API contract expectations, not as a regular test run.
