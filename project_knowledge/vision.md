---
name: Product Vision
description: What this product is, who it serves, and where it's heading. Read this first. Tier 3 protected — do not modify without owner approval.
---

# Product Vision

## What We're Building

The infrastructure layer for AI-powered commerce. Three products, one codebase:

- **CreditClaw** (`creditclaw.com`) — Financial rails for AI agents. Virtual Visa/Mastercard issuance, wallet funding, spending limits. Agents can't hold bank accounts — CreditClaw bridges that gap.
- **shopy.sh** — Consumer-facing scanner and leaderboard. Measures how "agent-friendly" a merchant's website is via the ASX Score (0–100). Free scans drive catalog growth.
- **brands.sh** — Developer-facing skill registry. "npm for shopping agents." Hosts SKILL.md files that teach agents how to browse and buy from specific stores.

## The Thesis

Human owners fund a wallet. The platform issues virtual cards that bots use at any online merchant. But bots need to know *how* to shop at each store — that's the skill registry. And merchants need to know *how ready* they are — that's the ASX scanner.

Scanner feeds the registry. Registry feeds the agents. Agents use the financial rails. One flywheel.

## Growth Engine

Every ASX scan creates or updates a `brand_index` row. The catalog grows automatically with zero manual curation. Brands self-promote from `draft` → `community` maturity once they have sufficient data.

## Deliberate Constraints

- **One Postgres database, no vector DB** — keep infrastructure simple at this stage
- **No data isolation between tenants** — tenants share the same DB, tenant is attribution-only
- **Category keywords are partially populated** — expanded as needed, not all at once
- **Maturity auto-promotion uses a deliberately low bar** — visibility over perfection
