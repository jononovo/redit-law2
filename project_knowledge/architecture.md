---
name: System Architecture
description: Technical overview of the platform and all eight modules. Maps every features/ folder and API route to its parent module.
---

# System Architecture

The infrastructure layer for AI-powered commerce. Three tenants, one codebase:

- **CreditClaw** (`creditclaw.com`) — Financial rails for AI agents. Virtual Visa/Mastercard issuance, wallet funding, spending limits.
- **shopy.sh** — Consumer-facing scanner and leaderboard. Measures how "agent-friendly" a merchant's website is via the ASX Score (0–100).
- **brands.sh** — Developer-facing skill registry. Hosts SKILL.md files that teach agents how to browse and buy from specific stores.

## Modules

| # | Module | What it owns |
|---|--------|-------------|
| 1 | Brands & Skills | Scan engine, scoring rubric, scan queue, SKILL.md/skill.json generation, registry API, `brand_index`, recommend API, product vector search, categories, taxonomy, brand claims, open standards (ASX rubric, SKILL.md spec) |
| 2 | Product Index | Product listings, vector embeddings, semantic search |
| 3 | Payment Tools for Agents | Wallets, outbound payment rails (funding + spending) |
| 4 | Agent Interaction | Webhooks, polling, approvals, guardrails, orders, agent communication patterns |
| 5 | Agent Plugins | Per-platform plugins (OpenClaw, etc.), browser extension |
| 6 | Platform Management | Auth, bot lifecycle, pairing, feature flags, admin |
| 7 | Multi-tenant Structure | Tenant routing, onboarding, landing pages, per-tenant theming |
| 8 | Agent Shops | Checkout pages, shop storefronts, seller profiles, procurement controls, inbound payment methods |

---

## 1. Brands & Skills

Unified pipeline: scan a domain → score it → generate skills → serve the catalog. Also owns the open standards (ASX rubric, SKILL.md spec) and the Recommend API for merchant discovery.

**Key folders:** `features/brand-engine/agentic-score/`, `features/brand-engine/scan-queue/`, `features/brand-engine/procurement-skills/`, `features/brand-engine/catalog/`, `features/brand-engine/brand-claims/`
**API routes:** `app/api/v1/scan/`, `app/api/v1/admin/scan-queue/`, `app/api/v1/registry/`, `app/api/v1/vendors/`, `app/api/v1/recommend/`, `app/api/v1/brands/`
**Tables:** `scan_queue`, `brand_index`, `brand_categories`, `brand_claims`, `category_keywords`

| Component | Key functions / files | Purpose |
|-----------|----------------------|---------|
| Scan Engine | `classifyBrand()`, `auditSite()` | Two parallel Perplexity calls — classify brand type/sector, audit technical signals |
| Category Resolution | `resolveProductCategories()` | Third Perplexity call — maps brand to Google Product Taxonomy IDs |
| Scoring Engine | `computeScoreFromRubric()`, `rubric.ts` | Weight-based scoring against rubric v2.0.0 |
| Scan Queue | `addToQueue()`, `processNextInQueue()` | Batch intake, deduplication, `FOR UPDATE SKIP LOCKED` worker pattern |
| Maturity Promotion | `resolveMaturity()` | Auto-promotes `draft` → `community`; manual tiers protected |
| Domain Normalization | `normalizeDomain()` in `features/brand-engine/agentic-score/fetch.ts` | Canonical domain normalizer — single source for all normalization |
| SKILL.md Generator | `generateVendorSkill()`, `buildVendorSkillDraft()` | Markdown skill file — checkout methods, shopping tips, sample curl |
| skill.json Builder | `buildSkillJson()` | Machine-readable JSON — taxonomy links, access tiers, score breakdowns |
| Registry API | `/api/v1/registry` routes | List, search, fetch skills programmatically |
| Taxonomy | `taxonomy.ts`, 28 sectors, 7 tiers, 8 capabilities, 5,638 product categories | Classification system for all brands |
| Recommend API | `app/api/v1/recommend/route.ts` | Three-stage merchant discovery for agents (see below) |
| Brand Index | `brand_index` table, `LITE_COLUMNS` projection | One row per domain. Central source for all catalog views |
| Catalog UI | `/skills`, `/skills/[vendor]`, `/c/[sector]` | Public browsing pages for the brand registry |
| Brand Claims | `features/brand-engine/brand-claims/`, `brand_claims` table | Ownership claims linking brands to user accounts |

**Recommend API stages:**
1. **Category Resolution** — Perplexity Sonar extracts intent → Postgres FTS against `category_keywords` → top 5 categories
2. **Merchant Ranking** — recursive SQL over `brand_index` + `brand_categories` → ranked by brand match → match depth → ASX score
3. **Product Search** — embedding vector → pgvector cosine similarity against `product_listings` → top 3 per merchant

**Open standards** (ASX rubric, SKILL.md spec, open brands index) are maintained within this module under `internal_docs/01-brands-skills-system/score-standard/`.

**Docs:** `internal_docs/01-brands-skills-system/` — start with `_overview.md` for the full pipeline narrative.

---

## 2. Product Index

Product listings, vector embeddings, and semantic search. Powers the product search stage of the Recommend API (Module 1).

**Key folders:** `features/product-index/embeddings/`
**Tables:** `product_listings`

| Component | Key functions / files | Purpose |
|-----------|----------------------|---------|
| Embedding Generator | `features/product-index/embeddings/embed.ts` | `all-MiniLM-L6-v2` model via `@xenova/transformers` — generates vector embeddings for product names/descriptions |
| Product Search | `product_listings` table with pgvector | Cosine similarity search, lateral join by brand |

**Docs:** `internal_docs/02-product-index/`

---

## 3. Payment Tools for Agents

Outbound financial rails — how users fund wallets and how their agents spend money at external merchants. Inbound payment methods (how shoppers pay at our checkouts) are in Module 8 (Agent Shops).

**Key folders:** `features/agent-shops/payments/`, `features/payment-rails/rail1/`, `features/payment-rails/rail2/`, `features/payment-rails/rail5/`, `features/payment-rails/crypto-onramp/`, `features/payment-rails/card/`
**API routes:** `app/api/v1/wallet/`, `app/api/v1/wallets/`, `app/api/v1/stripe-wallet/`, `app/api/v1/card-wallet/`, `app/api/v1/billing/`, `app/api/v1/rail5/`, `app/api/v1/cards/`
**Tables:** `owners` (wallet balances)

| Rail | Method | Implementation | Status |
|------|--------|---------------|--------|
| Rail 1 | Stripe Crypto Onramp | `features/payment-rails/rail1/`, `features/payment-rails/crypto-onramp/` — Privy server wallets on Base, fiat → USDC | Live |
| Rail 2 | Crossmint Wallet | `features/payment-rails/rail2/` — Crossmint API for wallet creation, balance, transfers, onramp | Not complete |
| Rail 5 | Encrypted Cards | `features/payment-rails/rail5/` — end-to-end encrypted cards with sub-agent checkout | Live |

| Component | Key functions / files | Purpose |
|-----------|----------------------|---------|
| Payment Methods Registry | `features/agent-shops/payments/methods.ts` | Central definition of all supported payment methods |
| Wallet Funding | `app/api/v1/stripe-wallet/onramp/` | Fiat → USDC via Stripe Onramp |
| x402 Signing (outbound) | `app/api/v1/stripe-wallet/bot/sign` | Our agents sign x402 payments to pay external services |

**Docs:** `internal_docs/04-payment-tools/`

---

## 4. Agent Interaction

How external agents communicate with CreditClaw. Webhooks, polling, spending controls, and the human↔agent approval loop.

**Key folders:** `features/agent-interaction/webhooks/`, `features/agent-interaction/webhook-tunnel/`, `features/agent-interaction/guardrails/`, `features/agent-interaction/approvals/`, `features/agent-interaction/orders/`, `features/brand-engine/feedback/`
**API routes:** `app/api/v1/webhooks/`, `app/api/v1/approvals/`, `app/api/v1/orders/`, `app/api/v1/invoices/`, `app/api/v1/master-guardrails/`, `app/api/v1/feedback/`
**Tables:** `orders`, `invoices`

| Component | Key functions / files | Purpose |
|-----------|----------------------|---------|
| Webhook Delivery | `features/agent-interaction/webhooks/delivery.ts`, `features/agent-interaction/webhooks/index.ts` | Outbound event notifications to agent platforms |
| Webhook Tunnel | `features/agent-interaction/webhook-tunnel/cloudflare.ts`, `provisioning.ts` | Cloudflare tunnel provisioning for webhook endpoints |
| Guardrails | `features/agent-interaction/guardrails/`, `app/api/v1/master-guardrails/` | Per-transaction limits, category blocking, approval modes |
| Approvals | `features/agent-interaction/approvals/`, `app/api/v1/approvals/` | Human-in-the-loop approval for agent purchases |
| Orders | `features/agent-interaction/orders/`, `app/api/v1/orders/` | Order lifecycle and tracking |
| Feedback | `features/brand-engine/feedback/aggregate.ts` | Agent feedback aggregation |

**Docs:** `internal_docs/05-agent-interaction/`

---

## 5. Agent Plugins

Per-platform integrations. Each agent platform (OpenClaw, etc.) gets its own plugin with platform-specific APIs, auth, and packaging.

**Key folders:** `public/Plugins/OpenClaw/`

| Plugin | Key files | Purpose |
|--------|----------|---------|
| OpenClaw | `public/Plugins/OpenClaw/src/` — `api.ts`, `index.ts`, `fill-card.ts`, `decrypt.ts` | Plugin for OpenClaw bots — card fill, API integration |

**Docs:** `internal_docs/06-agent-plugins/`

---

## 6. Platform Management

Auth, bot lifecycle, admin tooling.

**Key folders:** `features/platform-management/auth/`, `features/platform-management/agent-management/`, `features/platform-management/feature-flags/`, `features/platform-management/firebase/`
**API routes:** `app/api/v1/bot/`, `app/api/v1/bots/`, `app/api/v1/pairing-codes/`, `app/api/v1/owners/`, `app/api/v1/admin/`, `app/api/v1/activity-log/`, `app/api/v1/bot-messages/`, `app/api/v1/notifications/`, `app/api/v1/health/`, `app/api/v1/waitlist/`
**Tables:** `owners`, `bots`, `pairing_codes`

| Component | Key functions / files | Purpose |
|-----------|----------------------|---------|
| Auth (Owners) | `features/platform-management/auth/session.ts`, `features/platform-management/auth/auth-context.tsx`, `features/platform-management/firebase/` | Firebase Auth — httpOnly `__session` cookie, verified server-side via `adminAuth.verifySessionCookie()` |
| Auth (Bots) | `features/platform-management/agent-management/auth.ts` | Bearer API token via `authenticateBot()` middleware |
| Bot Management | `features/platform-management/agent-management/` | Bot registration, claim tokens, bot-owner linking |
| Pairing | `app/api/v1/pairing-codes/` | One-time codes for bot → owner pairing |
| Feature Flags | `features/platform-management/feature-flags/` | Runtime feature toggles |
| Feedback & Support | `features/brand-engine/feedback/aggregate.ts`, `app/api/v1/feedback/` | In-app feedback/support widget and aggregation |
| Admin | `app/admin123/`, `app/api/v1/admin/` | Internal admin dashboard and APIs |

**Docs:** `internal_docs/07-platform-management/`

---

## 7. Multi-tenant Structure

Single codebase, three tenants, hostname-based routing.

**Key folders:** `features/platform-management/tenants/`
**Tables:** `owners` (`signup_tenant` column)

| Component | Key functions / files | Purpose |
|-----------|----------------------|---------|
| Tenant Resolution | `features/platform-management/tenants/` — cookie-based, set at edge | Determines active tenant from hostname |
| Client Hook | `useTenant()` — client-side only | Provides tenant context to React components |
| Theming | Per-tenant theme tokens | Colors, typography, landing page content |
| Landing Pages | Per-tenant in `app/` | Each tenant has its own landing/onboarding flow |

**Tenants:**
- **CreditClaw** (`creditclaw.com`) — financial rails for AI agents
- **shopy.sh** — merchant-facing ASX Score scanner and leaderboard
- **brands.sh** — developer-facing skill registry

**Docs:** `internal_docs/08-multi-tenant/`

---

## 8. Agent Shops

Merchant storefronts, checkout experiences, and inbound payment methods — how the world pays our merchants.

**Key folders:** `features/agent-interaction/procurement/`, `features/agent-interaction/procurement-controls/`, `features/agent-interaction/shipping/`, `features/payment-rails/x402/`, `features/agent-shops/base-pay/`, `features/agent-shops/qr-pay/`
**API routes:** `app/api/v1/checkout/`, `app/api/v1/checkout-pages/`, `app/api/v1/shop/`, `app/api/v1/seller-profile/`, `app/api/v1/procurement-controls/`, `app/api/v1/sales/`, `app/api/v1/merchant-accounts/`, `app/api/v1/shipping-addresses/`, `app/api/v1/base-pay/`, `app/api/v1/qr-pay/`

| Component | Key functions / files | Purpose |
|-----------|----------------------|---------|
| Checkout Pages | `app/api/v1/checkout-pages/` | Configurable checkout flows for merchants |
| Shop Storefronts | `app/api/v1/shop/[slug]/` | Public-facing shop pages per merchant |
| Seller Profiles | `app/api/v1/seller-profile/` | Merchant profile management |
| Procurement Controls | `features/agent-interaction/procurement-controls/evaluate.ts` | Allow/blocklists, merchant evaluation for agent purchases |
| Shipping | `features/agent-interaction/shipping/` | Shipping address management and validation |

**Inbound payment methods** (how shoppers/agents pay at our checkouts):

| Method | Implementation | Purpose |
|--------|---------------|---------|
| x402 (receive) | `features/payment-rails/x402/receive.ts`, `features/payment-rails/x402/checkout.ts`, `app/api/v1/checkout/[id]/pay/x402/` | Autonomous agent payments via HTTP 402 |
| Base Pay | `features/agent-shops/base-pay/verify.ts`, `features/agent-shops/base-pay/sale.ts`, `app/api/v1/checkout/[id]/pay/base-pay/` | One-tap USDC from Base wallet |
| QR Pay | `features/agent-shops/qr-pay/eip681.ts`, `app/api/v1/qr-pay/` | USDC transfer via QR code (EIP-681) |
**Docs:** `internal_docs/09-agent-shops/`

---

## Key Tables

| Table | Module | Purpose |
|-------|--------|---------|
| `brand_index` | 1. Brands & Skills | One row per domain. Central catalog. |
| `brand_categories` | 1. Brands & Skills | Many-to-many: brands → Google Taxonomy IDs |
| `brand_claims` | 1. Brands & Skills | Ownership claims: brands → user accounts |
| `category_keywords` | 1. Brands & Skills | Keyword → taxonomy ID for FTS |
| `scan_queue` | 1. Brands & Skills | Pending/processing/completed scan jobs |
| `product_listings` | 2. Product Index | Product data with pgvector embeddings |
| `owners` | 6. Platform | User accounts, wallet balances, `signup_tenant` |
| `bots` | 6. Platform | Registered AI agents |
| `pairing_codes` | 6. Platform | One-time bot → owner pairing codes |
| `orders` | 4. Agent Interaction | Order lifecycle |
| `invoices` | 4. Agent Interaction | Payment records |

## System Status

| Module | Status |
|--------|--------|
| 1. Brands & Skills | Running — scan engine, queue, maturity promotion, SKILL.md/skill.json generation, recommend API all live |
| 2. Product Index | Running — vector embeddings and semantic search live |
| 3. Payment Tools | Partially live — Rail 1, 5 live. Rail 2 not complete. Stripe Issuing/Connect not built. |
| 4. Agent Interaction | Running — webhooks, guardrails, approvals, orders live |
| 5. Agent Plugins | Partial — OpenClaw plugin exists |
| 6. Platform Management | Running |
| 7. Multi-tenant Structure | Running — 3 tenants active |
| 8. Agent Shops | Running — checkout pages, shops, seller profiles, x402/Base Pay/QR Pay live |

---

## Future Plans

The `project_knowledge/future/` folder holds ideas, strategy docs, and rough plans that aren't tied to an active build cycle yet. Check there for backlog items, known bugs, and feature explorations before starting new work.
