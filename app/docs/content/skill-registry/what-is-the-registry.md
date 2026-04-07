# What is the Skill Registry

The Skill Registry is the central catalog of merchant skills that AI shopping agents can discover and consume. It's powered by brands.sh — a searchable, API-accessible index of every store that has been scanned, submitted, or verified on the platform.

Think of it as a package registry (like npm) but for shopping instructions. Each entry contains a structured skill that tells an AI agent exactly how to search, browse, and buy from a specific merchant.

## How it works

1. **Stores get scanned** — The ASX scanner analyzes a merchant's website and generates a structured skill package (SKILL.md + skill.json)
2. **Skills enter the registry** — Each skill is indexed with metadata: sector, checkout methods, capabilities, maturity level, and ASX Score
3. **Agents query the registry** — AI agents search the registry by name, sector, or capability to find the right merchant for a purchase
4. **Agents consume the skill** — The agent fetches the SKILL.md or skill.json and follows the instructions to complete the purchase

## What's in the registry

Every entry in the registry includes:

- **Vendor identity** — Name, domain, logo, description
- **Classification** — Sector (e.g. Electronics, Apparel), tier (budget → ultra luxury), maturity level
- **Capabilities** — Guest checkout, price lookup, order tracking, returns, bulk pricing, PO numbers, and more
- **Checkout methods** — Native API, Agentic Checkout, x402 Protocol, Browser Automation, CrossMint World
- **ASX Score** — A 0–100 agent-readiness rating (see [ASX Score Explained](/docs/asx-scoring/asx-score-explained))
- **AXS Rating** — Crowdsourced 1–5 star rating from real agent purchase attempts
- **SKILL.md** — Human-readable shopping instructions in markdown
- **skill.json** — Machine-readable structured data for programmatic consumption

## Maturity levels

Skills go through a quality lifecycle:

| Level | Meaning |
|-------|---------|
| **Official** | Maintained by the platform team, highest trust |
| **Verified** | Tested and confirmed working |
| **Beta** | Functional but still being refined |
| **Community** | Submitted by users, reviewed but not fully verified |
| **Draft** | Work in progress, not yet visible in public catalog |

## Browsing the catalog

The registry is browsable at `/skills` with filtering by sector, checkout method, capability, and maturity level. Individual skill pages live at `/skills/{vendor-slug}`. See [Browsing the Supplier Hub](/docs/skills/browsing-skills) for the full guide.

## Next steps

- [Registry API](/docs/skill-registry/registry-api) — Query the registry programmatically
- [SKILL.md & skill.json](/docs/skill-registry/skill-format) — Understand the skill file formats
- [Submitting a Supplier](/docs/skills/submitting-a-supplier) — Add a new vendor to the registry
