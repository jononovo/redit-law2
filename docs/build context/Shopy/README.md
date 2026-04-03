# Shopy — Document Overview

This folder contains all planning and specification documents for shopy.sh — the open standard and platform that makes online stores discoverable and shoppable by AI agents.

---

## Documents

### Brand & Identity

| Document | Purpose |
|---|---|
| `shopy-sh-brand-identity.md` | Defines shopy.sh as a brand — target audience, brand voice, website structure, how it relates to creditclaw.com, the flywheel between the two properties. Covers the `/standard`, `/guide`, `/catalog`, and `/leaderboard` pages. |

### Infrastructure

| Document | Purpose |
|---|---|
| `1-multitenant-system-nextjs-implementation-plan.md` | Technical plan for serving both creditclaw.com and shopy.sh from a single Next.js deployment. Covers middleware-based tenant resolution, static tenant configs, theme injection, route-level separation, and Firebase Auth scoping. Prerequisite for any shopy.sh-specific pages. |

### Taxonomy & Categories (UCP)

| Document | Purpose |
|---|---|
| `2-merchant-taxonomy-schema-note.md` | Decision document: we're using Google Product Taxonomy (GPT), 3 levels deep, for merchant categorization. Covers the three-layer model (Sector → L2 Category → L3 Sub-Category), database schema (`ucp_categories` + `brand_categories` tables), agent progressive disclosure flow (sector → categories → merchants), edge hosting strategy, and the merchant feed ingestion opportunity. |
| `3. product-index-taxonomy-plan.md` | Detailed taxonomy adoption plan. Covers the standards landscape (GPT vs UNSPSC vs GS1 vs Shopify vs NAICS), why GPT was chosen, the full Google taxonomy structure (21 roots, 5,595 categories, 7 levels deep), current CreditClaw categorization (21 sectors + freeform sub-sectors), the UCP three-layer model, schema changes, and implementation phases (import → vendor mapping → category navigation → product index). |

### Metadata & Skill Format

| Document | Purpose |
|---|---|
| `skill-json-schema.md` | Full specification for `skill.json` — the machine-readable metadata file that accompanies every SKILL.md. Defines the complete schema with seven sections: identity, taxonomy (UCP categories with GPT IDs), scoring (ASX + AXS), access, checkout, shipping, returns, loyalty, skill quality, and distribution. Includes how the agent detects categories during scans, the discovery query flow, SQL backing, and validation rules. |

### CLI & Distribution

| Document | Purpose |
|---|---|
| `shopy-cli-technical-plan.md` | Technical plan for the `npx shopy add amazon` CLI tool. Three phases: (1) registry API — public endpoints for search, download, and version manifests built on `brand_index`, (2) npm package — CLI architecture, commands (`add`, `search`, `list`), config management, (3) `update` command, `init`/`remove`, and GitHub Actions CI for automated publishing. |

---

## Reading Order

For someone new to shopy.sh:

1. **`shopy-sh-brand-identity.md`** — understand what shopy.sh is and who it's for
2. **`2-merchant-taxonomy-schema-note.md`** — understand UCP and how merchants are categorized
3. **`skill-json-schema.md`** — understand the structured metadata format
4. **`1-multitenant-system-nextjs-implementation-plan.md`** — understand how it's served technically
5. **`shopy-cli-technical-plan.md`** — understand the CLI and distribution layer

`3. product-index-taxonomy-plan.md` is the deep-dive companion to document 2 — read it if you need the full standards research and database schema details.

---

## Related Documents (outside this folder)

| Location | Document | Relevance |
|---|---|---|
| `../agentic-commerce-standard.md` | The open standard itself — SKILL.md frontmatter fields, body structure, ASX Score, AXS Rating definitions. Needs updating to reflect v1.1 rubric and `skill.json`. |
| `../creditclaw-agentic-commerce-strategy.md` | Go-to-market strategy covering how creditclaw.com and shopy.sh work together commercially. |
| `../premium-scan/` | Premium scan planning docs — the paid upgrade from the free ASX scan. |
