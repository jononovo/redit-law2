---
name: Build Backlog
description: Running list of things that need building, fixing, or cleaning up. Point-form, prioritized.
date: 2026-04-06
---

# Build Backlog

## Cleanup

- **Clean out `public/` folder** — platform skill files (`SKILL.md`, `skill.json`, `_meta.json`), platform-specific folders (`amazon/`, `shopify/`, `bigcommerce/`, `magento/`, `squarespace/`, `wix/`, `woocommerce/`, `generic/`), legacy agent docs (`agents/`), `Plugins/`, and loose markdown guides (`CHECKOUT-GUIDE.md`, `SHOPPING-GUIDE.md`, `HEARTBEAT.md`, `MANAGEMENT.md`, `MY-STORE.md`, `STRIPE-X402-WALLET.md`, `WEBHOOK.md`) are cluttering the folder. The valuable content (`tenants/`, `assets/`) is getting buried. Move or archive non-essential files.

- **Drizzle folder has lots of files - are they necessary?** — there's a ton of files in there that are really big and I think might just be part of like some one time use but if they're not, and if they're important, then we can keep them. Here's an example: drizzle/0009_replace_readiness_with_asx_score.sql

## Unbuilt Features

- **Skill distribution Phase 2** — pending front matter discussion
- **Category keywords** — ~1,286 / 5,638 populated. Run `npx tsx scripts/generate-category-keywords.ts` to continue (background task, not a code change)
- **More product feed ingestion** — ingest non-Shopify merchants via Firecrawl/XML parsers. Currently 8 merchants / 6,774 products
- **Product refresh scheduler** — `scripts/refresh-products.ts` exists but needs scheduling
- **Commission-based revenue** — capture Stripe authorization during onboarding, charge 0.05% per sale. Source: `charge-fee.md`
- **Double encryption for sub-agent keys** — ephemeral sub-agent secret for decryption key access. Source: `260309-Double-security-Sub-agent-temp-encrypt.md`
- **x402 checkout integration** — payment protocol for agent-initiated purchases. Source: `x402-checkout-plan_1772644619315.docx`
- **AI re-ranking of merchant results** — after SQL returns top 10, optionally pass through fast LLM to re-rank based on richer context. SQL always does initial filtering — this is a quality layer on top.
- **Limit keyword generation to populated categories** — currently generating for all ~5,600 categories. Consider only generating for categories with at least one tagged merchant once coverage is deeper. Low priority — $3 cost and 30-minute runtime are fine for now.

## Scale-Triggered Optimizations

| Optimization | Trigger | What to do |
|---|---|---|
| Sitemap splitting | 1,000+ URLs | Use `generateSitemaps()` to split by content type or sector |

## Research to Migrate

- **`docs/build context/`** — ~40 files of research, build plans, and strategy docs need categorizing and moving into `project_knowledge/` structure
