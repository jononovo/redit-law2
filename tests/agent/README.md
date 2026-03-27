# Agent Testing Framework

Validates that AI agents running on a clean OpenClaw instance can discover, install, and use CreditClaw end-to-end.

## Quick Start

```bash
# Skill discovery tests (no keys needed, hits live site)
npx vitest run tests/agent/scenarios/skill-discovery.test.ts

# Registration + flow tests (requires TEST_BASE_URL)
TEST_BASE_URL=https://creditclaw.com npx vitest run tests/agent/scenarios/

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
| `skill-discovery.test.ts` | `skill.json` + `SKILL.md` accessible, valid structure, files map reachable, versions match |
| `registration.test.ts` | Bot registration, status check, duplicate rejection (rate-limit aware) |
| `full-flow.test.ts` | Register -> status -> verify claim info end-to-end |
| `verify-docker-results.test.ts` | Parses Docker container output, generates markdown report |

**Rate limiting:** The registration endpoint is rate-limited to 3/hr per IP. Tests handle 429s gracefully — they skip with a warning rather than fail.

**Production guard:** Registration and full-flow tests require `TEST_BASE_URL` to be explicitly set. They will not accidentally run against production if the env var is missing.

### 2. Browser Tests (`browser/`)

Playwright tests for the checkout UI.

| Test | What it validates |
|------|-------------------|
| `checkout-flow.spec.ts` | Navigate to checkout, select testing method, fill card form, submit, verify success |

### 3. Docker Isolation Tests (`docker/`)

Spins up isolated OpenClaw instances (Claude, GPT-4o, Gemini 2.5 Pro), installs only the CreditClaw skill, and asks each agent to register.

Each container:
- Starts from a vanilla OpenClaw image
- Installs CreditClaw via `clawhub install creditclaw`
- Receives a chat message asking it to follow the skill instructions
- Outputs JSON results to `docker/results/` (auto-cleaned after test run)

## Environment Variables

| Variable | Required For | Default |
|----------|-------------|---------|
| `TEST_BASE_URL` | Registration + flow tests | (none — must be set explicitly) |
| `ANTHROPIC_API_KEY` | Claude Docker container | -- |
| `OPENAI_API_KEY` | OpenAI Docker container | -- |
| `GOOGLE_AI_API_KEY` | Gemini Docker container | -- |
| `TEST_CHECKOUT_PAGE_ID` | Browser checkout test | -- |

## Docker Setup

1. Copy API keys into `docker/openclaw-config/*.env` files
2. Run: `bash docker/scripts/run-isolated-test.sh`
3. Results are verified automatically and cleaned up after the run

Containers have 512MB memory / 0.5 CPU limits to prevent runaway agent loops.

## Lib (`lib/`)

Shared test utilities:

- **`types.ts`** -- TypeScript interfaces for `AgentTestResult`, `SkillJson`, `RegistrationResponse`, etc.
- **`skill-parser.ts`** -- Fetch and parse `SKILL.md` / `skill.json`, validate structure
- **`api-client.ts`** -- HTTP client for CreditClaw API (`/bots/register`, `/bot/status`)
- **`test-reporter.ts`** -- Collects results, generates markdown summary table

## Known Issues Found By Tests

- `skill.json` version (`2.8.0`) does not match `SKILL.md` frontmatter version (`2.8.1`) — needs sync on deploy
