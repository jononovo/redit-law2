---
name: shopy.sh + brands.sh Vision
description: Combined vision for the scanner and registry products. Read when making high-level decisions about merchant scoring, skill distribution, or catalog strategy. Tier 3 protected.
---

# shopy.sh + brands.sh Vision

## The Problem

AI agents need to shop at online stores but every store is different — different layouts, checkout flows, search patterns, payment methods. Without structured instructions, agents stumble through each store blind.

Merchants, meanwhile, have no way to know if their store is ready for AI agents or how to improve.

## Two Products, One Solution

### shopy.sh — "How agent-ready is your store?"

Merchant-facing. Measures AI-readiness via the ASX Score (0–100). Free scans — every scan grows the catalog automatically.

- Gives merchants a concrete score and improvement roadmap
- Drives catalog growth with zero manual curation
- Consumer-facing leaderboard shows which stores are most agent-friendly

### brands.sh — "npm for AI shopping agents"

Developer-facing. Hosts SKILL.md files that teach agents how to browse and buy from specific stores.

- Searchable registry of merchant skills
- Machine-readable skill.json for programmatic discovery
- Registry API for agent platforms to query
- CLI distribution (`npx shopy add <brand>`) — planned

## How They Feed Each Other

1. Merchant runs a scan on **shopy.sh** → gets their ASX Score
2. Scan generates a **SKILL.md** file → automatically published on **brands.sh**
3. Agent developers find skills on **brands.sh** → their agents shop at those stores
4. More agents shopping → more value for merchants → more merchants scan

## Positioning

- **Not platform-specific** — works for any online store (Shopify, WooCommerce, custom, etc.)
- **Not Google/Amazon dependent** — independent scoring and discovery
- **Open format** — SKILL.md follows the Agent Skills open standard
- **Automated at scale** — Perplexity-powered scans, no manual curation needed

## The ASX Score

Three pillars, 100 points total:
- **Clarity (35pts)** — structured data, product feeds, agent metadata
- **Discoverability (30pts)** — search API/MCP, site search, page load, product page quality
- **Reliability (35pts)** — guest checkout, order management, cart predictability, bot tolerance

Rubric v2.0.0 with 11 signals. Score determines how easily an agent can shop at that store.

## Current State

- ASX Scanner running (3 Perplexity API calls per scan)
- ~28 brands scanned and scored
- Maturity auto-promotion deployed (draft → community)
- Registry API live
- Category keyword resolution partial (~1,286 / 5,638)
- Product vector search via pgvector (live in recommend API)

## Future Direction

- Scale to thousands of brands via automated scan queue
- Premium scan tier with browser-agent inspection
- Skill distribution Phase 2
- CLI package (`npx shopy add`)
