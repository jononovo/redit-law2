# Agent Testing Framework

Validates that AI agents running on a clean OpenClaw instance can discover, install, and use CreditClaw end-to-end.

## Quick Start

```bash
# API-level tests (no Docker, no LLM keys needed)
npx vitest run tests/agent/scenarios/

# Browser checkout flow (requires TEST_CHECKOUT_PAGE_ID)
npx playwright test --config tests/agent/browser/playwright.config.ts

# Full Docker isolation tests (requires API keys + Docker)
bash tests/agent/docker/scripts/run-isolated-test.sh
```

## Test Layers

### 1. Scenario Tests (`scenarios/`)

Pure API tests — no LLM calls, no Docker.

| Test | What it validates |
|------|-------------------|
| `skill-discovery.test.ts` | skill.md and skill.json accessible, valid structure, versions match |
| `registration.test.ts` | Bot registration, status check, duplicate rejection |
| `full-flow.test.ts` | Register → status → verify claim info end-to-end |
| `verify-docker-results.test.ts` | Parses Docker container output, generates report |

### 2. Browser Tests (`browser/`)

Playwright tests for the checkout UI.

| Test | What it validates |
|------|-------------------|
| `checkout-flow.spec.ts` | Navigate to checkout, fill test card, submit, verify success |

### 3. Docker Isolation Tests (`docker/`)

Spins up isolated OpenClaw instances (Claude, GPT-4, Gemini), installs only CreditClaw, and asks each agent to register.

## Environment Variables

| Variable | Required | Default |
|----------|----------|---------|
| `TEST_BASE_URL` | No | `https://creditclaw.com` |
| `ANTHROPIC_API_KEY` | For Claude container | — |
| `OPENAI_API_KEY` | For OpenAI container | — |
| `GOOGLE_AI_API_KEY` | For Gemini container | — |
| `TEST_CHECKOUT_PAGE_ID` | For browser tests | — |

## Docker Setup

1. Copy API keys into `docker/openclaw-config/*.env`
2. Run: `bash docker/scripts/run-isolated-test.sh`
3. Results appear in `docker/results/`

## Lib (`lib/`)

Shared utilities:

- **`types.ts`** — TypeScript interfaces for test results, skill schemas
- **`skill-parser.ts`** — Fetch and parse skill.md/skill.json
- **`api-client.ts`** — HTTP client for CreditClaw API endpoints
- **`test-reporter.ts`** — Markdown report generator
