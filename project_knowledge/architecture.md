---
name: System Architecture
description: Technical overview of all ten modules. Read after vision.md. Maps every lib/ folder and API route to its parent module.
---

# System Architecture

## Modules

| # | Module | What it owns |
|---|--------|-------------|
| 1 | Agentic Shopping Score | Scan engine, scoring rubric, scan queue |
| 2 | Agent Shopping Skills per Brand | SKILL.md generation, skill.json, registry API |
| 3 | Brands Index for Agentic Shopping | `brand_index`, recommend API, product vector search, categories |
| 4 | Payment Tools for Agents | Wallets, outbound payment rails (funding + spending) |
| 5 | Agent Interaction | Webhooks, polling, approvals, guardrails, orders, agent communication patterns |
| 6 | Agent Plugins | Per-platform plugins (OpenClaw, etc.), browser extension |
| 7 | Platform Management | Auth, bot lifecycle, pairing, feature flags, admin |
| 8 | Multi-tenant Structure | Tenant routing, onboarding, landing pages, per-tenant theming |
| 9 | Agent Shops | Checkout pages, shop storefronts, seller profiles, procurement controls, inbound payment methods |
| 10 | Thought Leadership | Standards we define and maintain (ASX rubric, SKILL.md spec, open brands index) |

---

## 1. Agentic Shopping Score

Evaluates a domain's AI-readiness. Outputs a 0–100 score across three pillars: Clarity, Discoverability, Reliability.

**Key folders:** `lib/agentic-score/`, `lib/scan-queue/`
**API routes:** `app/api/v1/scan/`, `app/api/v1/admin/scan-queue/`
**Tables:** `scan_queue`, `brand_index` (score columns)

| Component | Key functions / files | Purpose |
|-----------|----------------------|---------|
| Scan Engine | `classifyBrand()`, `auditSite()` | Two parallel Perplexity calls — classify brand type/sector, audit technical signals |
| Category Resolution | `resolveProductCategories()` | Third Perplexity call — maps brand to Google Product Taxonomy IDs |
| Scoring Engine | `computeScoreFromRubric()`, `rubric.ts` | Weight-based scoring against rubric v2.0.0 |
| Scan Queue | `addToQueue()`, `processNextInQueue()` | Batch intake, deduplication, `FOR UPDATE SKIP LOCKED` worker pattern |
| Maturity Promotion | `resolveMaturity()` | Auto-promotes `draft` → `community`; manual tiers protected |
| Domain Normalization | `normalizeDomain()` in `lib/agentic-score/fetch.ts` | Canonical domain normalizer — single source for all normalization |

**Docs:** `internal_docs/scanning/`

---

## 2. Agent Shopping Skills per Brand

Generates machine-readable and LLM-readable instructions for how an agent should shop at a specific store.

**Key folders:** `lib/procurement-skills/`
**API routes:** `app/api/v1/registry/`, `app/api/v1/vendors/`

| Component | Key functions / files | Purpose |
|-----------|----------------------|---------|
| SKILL.md Generator | `generateVendorSkill()`, `buildVendorSkillDraft()` | Markdown skill file — checkout methods, shopping tips, sample curl |
| skill.json Builder | `buildSkillJson()` | Machine-readable JSON — taxonomy links, access tiers, score breakdowns |
| Registry API | `/api/v1/registry` routes | List, search, fetch skills programmatically |
| Taxonomy Mapping | `taxonomy.ts` | Maps brands to Google Product Taxonomy for skill metadata |

**Docs:** `internal_docs/skills/`

---

## 3. Brands Index for Agentic Shopping

Central catalog. Powers sector pages, registry, and the recommend API that agents call to find merchants.

**Key folders:** `lib/catalog/`, `lib/embeddings/`, `lib/brand-claims/`
**API routes:** `app/api/v1/recommend/`, `app/api/v1/brands/`
**Tables:** `brand_index`, `brand_categories`, `product_listings`, `category_keywords`, `brand_claims`

| Component | Key functions / files | Purpose |
|-----------|----------------------|---------|
| Brand Index | `brand_index` table, `LITE_COLUMNS` projection | One row per domain. Central source for all catalog views |
| Recommend API | `app/api/v1/recommend/route.ts` | Three-stage merchant discovery for agents (see below) |
| Product Search | `lib/embeddings/`, `product_listings` table | pgvector cosine similarity search, lateral join by brand |
| Brand Claims | `lib/brand-claims/`, `brand_claims` table | Ownership claims linking brands to user accounts |
| Category Keywords | `category_keywords` table | Keyword → taxonomy ID mapping for full-text search |

**Recommend API stages:**
1. **Category Resolution** — Perplexity Sonar extracts intent → Postgres FTS against `category_keywords` → top 5 categories
2. **Merchant Ranking** — recursive SQL over `brand_index` + `brand_categories` → ranked by brand match → match depth → ASX score
3. **Product Search** — embedding vector → pgvector cosine similarity against `product_listings` → top 3 per merchant

**Docs:** `internal_docs/catalog/`

---

## 4. Payment Tools for Agents

Outbound financial rails — how users fund wallets and how their agents spend money at external merchants. Inbound payment methods (how shoppers pay at our checkouts) are in Module 9 (Agent Shops).

**Key folders:** `lib/payments/`, `lib/rail1/`, `lib/rail2/`, `lib/rail4/`, `lib/rail5/`, `lib/crypto-onramp/`, `lib/card/`, `lib/obfuscation-engine/`, `lib/obfuscation-merchants/`
**API routes:** `app/api/v1/wallet/`, `app/api/v1/wallets/`, `app/api/v1/stripe-wallet/`, `app/api/v1/card-wallet/`, `app/api/v1/billing/`, `app/api/v1/rail4/`, `app/api/v1/rail5/`, `app/api/v1/cards/`
**Tables:** `owners` (wallet balances)

| Rail | Method | Implementation | Status |
|------|--------|---------------|--------|
| Rail 1 | Stripe Crypto Onramp | `lib/rail1/`, `lib/crypto-onramp/` — Privy server wallets on Base, fiat → USDC | Live |
| Rail 2 | Crossmint Wallet | `lib/rail2/` — Crossmint API for wallet creation, balance, transfers, onramp | Live |
| Rail 4 | Obfuscated Self-Hosted Cards | `lib/rail4/`, `lib/obfuscation-engine/` — retired, still in codebase | Retired |
| Rail 5 | Direct Wallet Debit | `lib/rail5/` — atomic balance deduction at purchase time | Live |

| Component | Key functions / files | Purpose |
|-----------|----------------------|---------|
| Payment Methods Registry | `lib/payments/methods.ts` | Central definition of all supported payment methods |
| Wallet Funding | `app/api/v1/stripe-wallet/onramp/` | Fiat → USDC via Stripe Onramp |
| x402 Signing (outbound) | `app/api/v1/stripe-wallet/bot/sign` | Our agents sign x402 payments to pay external services |

**Docs:** `internal_docs/payment/`

---

## 5. Agent Interaction

How external agents communicate with CreditClaw. Webhooks, polling, spending controls, and the human↔agent approval loop.

**Key folders:** `lib/webhooks/`, `lib/webhook-tunnel/`, `lib/guardrails/`, `lib/approvals/`, `lib/orders/`, `lib/feedback/`
**API routes:** `app/api/v1/webhooks/`, `app/api/v1/approvals/`, `app/api/v1/orders/`, `app/api/v1/invoices/`, `app/api/v1/master-guardrails/`, `app/api/v1/feedback/`
**Tables:** `orders`, `invoices`

| Component | Key functions / files | Purpose |
|-----------|----------------------|---------|
| Webhook Delivery | `lib/webhooks/delivery.ts`, `lib/webhooks/index.ts` | Outbound event notifications to agent platforms |
| Webhook Tunnel | `lib/webhook-tunnel/cloudflare.ts`, `provisioning.ts` | Cloudflare tunnel provisioning for webhook endpoints |
| Guardrails | `lib/guardrails/`, `app/api/v1/master-guardrails/` | Per-transaction limits, category blocking, approval modes |
| Approvals | `lib/approvals/`, `app/api/v1/approvals/` | Human-in-the-loop approval for agent purchases |
| Orders | `lib/orders/`, `app/api/v1/orders/` | Order lifecycle and tracking |
| Feedback | `lib/feedback/aggregate.ts` | Agent feedback aggregation |

**Docs:** `internal_docs/agent-interaction/`

---

## 6. Agent Plugins

Per-platform integrations. Each agent platform (OpenClaw, etc.) gets its own plugin with platform-specific APIs, auth, and packaging.

**Key folders:** `public/Plugins/OpenClaw/`

| Plugin | Key files | Purpose |
|--------|----------|---------|
| OpenClaw | `public/Plugins/OpenClaw/src/` — `api.ts`, `index.ts`, `fill-card.ts`, `decrypt.ts` | Plugin for OpenClaw bots — card fill, API integration |

**Docs:** `internal_docs/agent-plugins/`

---

## 7. Platform Management

Auth, bot lifecycle, admin tooling.

**Key folders:** `lib/auth/`, `lib/agent-management/`, `lib/feature-flags/`, `lib/firebase/`
**API routes:** `app/api/v1/bot/`, `app/api/v1/bots/`, `app/api/v1/pairing-codes/`, `app/api/v1/owners/`, `app/api/v1/admin/`, `app/api/v1/activity-log/`, `app/api/v1/bot-messages/`, `app/api/v1/notifications/`, `app/api/v1/health/`, `app/api/v1/waitlist/`
**Tables:** `owners`, `bots`, `pairing_codes`

| Component | Key functions / files | Purpose |
|-----------|----------------------|---------|
| Auth | `lib/auth/` | Session management, owner authentication |
| Bot Management | `lib/agent-management/` | Bot registration, claim tokens, bot-owner linking |
| Pairing | `app/api/v1/pairing-codes/` | One-time codes for bot → owner pairing |
| Feature Flags | `lib/feature-flags/` | Runtime feature toggles |
| Admin | `app/admin123/`, `app/api/v1/admin/` | Internal admin dashboard and APIs |

**Docs:** `internal_docs/platform/`

---

## 8. Multi-tenant Structure

Single codebase, three tenants, hostname-based routing.

**Key folders:** `lib/tenants/`
**Tables:** `owners` (`signup_tenant` column)

| Component | Key functions / files | Purpose |
|-----------|----------------------|---------|
| Tenant Resolution | `lib/tenants/` — cookie-based, set at edge | Determines active tenant from hostname |
| Client Hook | `useTenant()` — client-side only | Provides tenant context to React components |
| Theming | Per-tenant theme tokens | Colors, typography, landing page content |
| Landing Pages | Per-tenant in `app/` | Each tenant has its own landing/onboarding flow |
| Feature Flags | Tenant-scoped flags | Controls which features are visible per tenant |

**Tenants:**
- **CreditClaw** (`creditclaw.com`) — financial rails for AI agents
- **shopy.sh** — merchant-facing ASX Score scanner and leaderboard
- **brands.sh** — developer-facing skill registry

**Docs:** `internal_docs/tenants/`

---

## 9. Agent Shops

Merchant storefronts, checkout experiences, and inbound payment methods — how the world pays our merchants.

**Key folders:** `lib/procurement/`, `lib/procurement-controls/`, `lib/shipping/`, `lib/x402/`, `lib/base-pay/`, `lib/qr-pay/`
**API routes:** `app/api/v1/checkout/`, `app/api/v1/checkout-pages/`, `app/api/v1/shop/`, `app/api/v1/seller-profile/`, `app/api/v1/procurement-controls/`, `app/api/v1/sales/`, `app/api/v1/merchant-accounts/`, `app/api/v1/shipping-addresses/`, `app/api/v1/base-pay/`, `app/api/v1/qr-pay/`, `app/api/v1/payment-links/`

| Component | Key functions / files | Purpose |
|-----------|----------------------|---------|
| Checkout Pages | `app/api/v1/checkout-pages/` | Configurable checkout flows for merchants |
| Shop Storefronts | `app/api/v1/shop/[slug]/` | Public-facing shop pages per merchant |
| Seller Profiles | `app/api/v1/seller-profile/` | Merchant profile management |
| Procurement Controls | `lib/procurement-controls/evaluate.ts` | Allow/blocklists, merchant evaluation for agent purchases |
| Shipping | `lib/shipping/` | Shipping address management and validation |

**Inbound payment methods** (how shoppers/agents pay at our checkouts):

| Method | Implementation | Purpose |
|--------|---------------|---------|
| x402 (receive) | `lib/x402/receive.ts`, `lib/x402/checkout.ts`, `app/api/v1/checkout/[id]/pay/x402/` | Autonomous agent payments via HTTP 402 |
| Base Pay | `lib/base-pay/verify.ts`, `lib/base-pay/sale.ts`, `app/api/v1/checkout/[id]/pay/base-pay/` | One-tap USDC from Base wallet |
| QR Pay | `lib/qr-pay/eip681.ts`, `app/api/v1/qr-pay/` | USDC transfer via QR code (EIP-681) |
| Payment Links | `app/api/v1/payment-links/`, `app/api/v1/bot/payments/create-link/` | Bot-generated Stripe Checkout URLs |

**Docs:** `internal_docs/agent-shops/`

---

## 10. Thought Leadership

Standards and open protocols we define, maintain, and evangelize. Not feature code — but drives product direction and research.

| Standard | What it is | Where it lives |
|----------|-----------|---------------|
| ASX Score (Agentic Shopping Experience) | 0–100 scoring rubric for merchant AI-readiness | `lib/agentic-score/rubric.ts`, published on shopy.sh |
| SKILL.md Specification | Open format for teaching agents to shop at a store | `content/agentic-commerce-standard.md`, `public/SKILL.md` |
| skill.json Schema | Machine-readable companion to SKILL.md | `lib/procurement-skills/skill-json.ts` |
| Open Brands Skills Index | Public registry of merchant skills | brands.sh, registry API |

This module owns the research and evolution of these standards. When new protocols emerge (ACP, UCP, A2A), evaluation and positioning happens here.

**Docs:** `internal_docs/thought-leadership/`

---

## Key Tables

| Table | Module | Purpose |
|-------|--------|---------|
| `brand_index` | 3. Brands Index | One row per domain. Central catalog. |
| `brand_categories` | 3. Brands Index | Many-to-many: brands → Google Taxonomy IDs |
| `brand_claims` | 3. Brands Index | Ownership claims: brands → user accounts |
| `product_listings` | 3. Brands Index | Product data with pgvector embeddings |
| `category_keywords` | 3. Brands Index | Keyword → taxonomy ID for FTS |
| `scan_queue` | 1. Shopping Score | Pending/processing/completed scan jobs |
| `owners` | 7. Platform | User accounts, wallet balances, `signup_tenant` |
| `bots` | 7. Platform | Registered AI agents |
| `pairing_codes` | 7. Platform | One-time bot → owner pairing codes |
| `orders` | 5. Agent Interaction | Order lifecycle |
| `invoices` | 5. Agent Interaction | Payment records |

## System Status

| Module | Status |
|--------|--------|
| 1. Agentic Shopping Score | Running — scan engine, queue, maturity promotion all live |
| 2. Agent Shopping Skills | Running — SKILL.md + skill.json generated per scan |
| 3. Brands Index | Running — recommend API with all 3 stages live |
| 4. Payment Tools | Partially live — Rail 1, 2, 5 live. Rail 4 retired. Stripe Issuing/Connect not built. |
| 5. Agent Interaction | Running — webhooks, guardrails, approvals, orders live |
| 6. Agent Plugins | Partial — OpenClaw plugin exists |
| 7. Platform Management | Running |
| 8. Multi-tenant Structure | Running — 3 tenants active |
| 9. Agent Shops | Running — checkout pages, shops, seller profiles, x402/Base Pay/QR Pay/Payment Links live |
| 10. Thought Leadership | Active — ASX rubric v2.0.0, SKILL.md spec published |
