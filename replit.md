# Multi-Tenant Platform — CreditClaw · shopy.sh · brands.sh

## Overview
One codebase, three tenants. The infrastructure layer for AI-powered commerce:

- **CreditClaw** (`creditclaw.com`) — Financial rails for AI agents. Crypto wallet funding (Stripe Onramp), virtual card issuance, spending controls, approval workflows. Agents can't hold bank accounts — CreditClaw bridges that gap.
- **shopy.sh** — Consumer-facing ASX Score scanner and leaderboard. Measures how "agent-friendly" a merchant's website is (0–100). Free scans drive catalog growth.
- **brands.sh** — Developer-facing skill registry. Hosts SKILL.md files that teach agents how to shop at specific stores.

Tenants share the same database, codebase, and deployment. Routing is hostname-based via middleware. See `project_knowledge/_README.md` for full architecture and internal docs.

## Modules

| # | Module | What it owns |
|---|--------|-------------|
| 1 | Brands & Skills | Scan engine, scoring, skills, brand index, taxonomy, recommend API, open standards |
| 2 | Product Index | Embedding generation (`features/product-index/`), `product_listings` table |
| 3 | Payment Tools | Rail5 cards + guardrails + approvals, outbound payment rails |
| 4 | Agent Interaction | Webhooks, approvals, guardrails, orders |
| 5 | Agent Plugins | Per-platform plugins (OpenClaw, etc.) |
| 6 | Platform Management | Auth, bot lifecycle, pairing, feature flags, admin |
| 7 | Multi-tenant Structure | Tenant routing, onboarding, per-tenant theming |
| 8 | Agent Shops | Checkout, storefronts, seller profiles, inbound payments |
| 9 | Agent Testing | Two test types: (1) Basic checkout — single-page card form test. (2) Full-shop — 7-page e-commerce flow (homepage→search→product→cart→checkout→payment→confirmation) with real-time observer mode, 5-dimension scoring, and DB persistence |

Full detail: `project_knowledge/architecture.md`

## Stack
The platform uses Next.js 16 (App Router), Firebase Auth (client/Admin SDK) with httpOnly session cookies, PostgreSQL via Drizzle ORM, Tailwind CSS v4, PostCSS, shadcn/ui for components, and React Query for state management.

## Project Conventions
- **Framework:** Next.js 16 with App Router only. No Vite, no standalone React.
- **No framer-motion** — lightweight build
- All interactive components marked with `"use client"` directive
- **Font:** Plus Jakarta Sans (CreditClaw tenant)

## Development Principles

**Separation of concerns** — each file, function, and module should have one clear responsibility. If a file is doing two unrelated things, split it. Cross-cutting logic (guardrails, approvals, webhooks) lives in its own `lib/{feature}/` folder and should not contain rail-specific business logic.

**Finish what you start** — when you're in context on a feature, complete it fully. Don't leave partial implementations with "we can finish this later" — that context is expensive to rebuild. Wire up the API, the storage, the UI, the error handling, and the edge cases in the same session. A feature that's 90% done is 0% shippable.

**Descriptive file and variable names** — always lean towards longer, more descriptive names over short generic ones. `dashboard-overview.md` not `overview.md`. `evaluateCardGuardrails()` not `evaluate()`. `brand-versioning-technical-plan.md` not `plan.md`. Generic names are hard to search, hard to distinguish, and hard to maintain.

**Testing** — write automated tests for critical business logic (pure functions, scoring, payment calculations, validation rules). Tests go in `tests/` — see `tests/_README.md` for guidelines and current coverage.

## Modularization Guidelines

New features should follow a feature-first folder structure under `lib/{feature}/` with files grouped by responsibility, not by layer.

**Within a feature folder**, split code by what it does:
- `client.ts` — shared API client, auth, fetch wrapper, format helpers (if the feature talks to an external API)
- Subfolders by domain (e.g. `wallet/`, `orders/`, `scoring/`) when there are multiple related operations
- `fulfillment.ts` — business logic triggered by external events or callbacks
- Keep each file focused on one concern. If a file is doing two unrelated things, split it.

**Cross-cutting vs feature-specific**: Cross-cutting logic (guardrails, approvals, webhooks, notifications) stays in its own `lib/{feature}/` folder and should not accumulate feature-specific business logic. If a cross-cutting module starts pulling in feature-specific code, extract that logic into the feature's own folder and leave a thin import in the cross-cutting module.

**Storage is modularized** under `server/storage/` with domain-grouped files (one per feature area: `rail1.ts`, `rail2.ts`, `rail5.ts`, `brand-index.ts`, `approvals.ts`, `orders.ts`, etc.). `types.ts` defines the `IStorage` interface (single source of truth). `index.ts` composes all fragments into the exported `storage` object. All consumers import from `@/server/storage` unchanged.

**API route paths never change** during modularization — only internal `lib/` imports get rewired. This avoids breaking any external consumers.

---

# 1. Brands & Skills

The platform's growth engine. A single automated pipeline that scans merchant domains, scores their AI-readiness, classifies them into a taxonomy, generates per-merchant shopping skills, and stores everything in a central Brand Index. This is Module 1 in the system architecture — a single unified pipeline.

→ Full system overview: `project_knowledge/internal_docs/01-brands-skills-system/_overview.md`

**Pipeline:** Domain submitted → classifyBrand + auditSite (parallel Perplexity calls) → computeScoreFromRubric → buildVendorSkillDraft → generateVendorSkill (SKILL.md) → upsertBrandIndex → resolveProductCategories (sequential Perplexity call). Three Perplexity calls per scan, each independently fail-safe.

**Entry points:** `POST /api/v1/scan` (public, user-triggered) and `features/brand-engine/scan-queue/process-next.ts` (background queue worker). Both run the identical pipeline.

## Brand Index

`brand_index` table (`server/storage/brand-index.ts`) — sole source of truth for all brand data. One row per domain, ~85 columns. All surfaces read from it:
- Catalog UI: `/skills` (SSR + client filtering), `/skills/[vendor]` (SSR detail), `/c/[sector]` (sector pages)
- Bot API: `GET /api/v1/bot/skills` (agent-facing catalog search)
- Skill serving: `GET /brands/{slug}/skill` (SKILL.md), `GET /brands/{slug}/skill-json` (skill.json)
- Recommend API: `POST /api/v1/recommend` (structured) and `GET /api/v1/recommend?q=...` (natural language)
- Public API: `GET /api/v1/brands/[slug]`
- Internal API: `GET /api/internal/brands/search`, `GET /api/internal/brands/[slug]`

Key columns: `domain` (unique, dedup key), `slug` (URL routing), `sector`, `brand_type`, `tier`, `maturity`, `overallScore` (0–100), `scoreBreakdown` (JSONB), `brandData` (full VendorSkill JSONB), `skillMd` (generated markdown), `search_vector` (tsvector with trigger), rating columns (`axsRating`, `ratingCount`, sub-ratings). 22+ indexes.

Storage methods: `searchBrands` (with `lite` mode for catalog cards), `searchBrandsCount`, `getBrandById`, `getBrandBySlug`, `getBrandByDomain`, `getRetailersForBrand`, `upsertBrandIndex`, `getAllBrandFacets` (10-min cache, auto-invalidated on upsert).

Maturity progression: `draft` → `community` (auto-promoted when score + skillMd + brandData present) → `official` (brand claimed) → `verified` (CreditClaw audited). `resolveMaturity()` in `features/brand-engine/agentic-score/scan-utils.ts` never demotes.

## ASX Score Engine

`features/brand-engine/agentic-score/` — evaluates merchant AI-readiness. 11 signals, 3 pillars, 100 points:
- **Clarity** (35 pts): JSON-LD (15), Product Feed/Sitemap (10), Agent Metadata (10)
- **Discoverability** (30 pts): Search API/MCP (10), Site Search (10), Page Load (5), Product Page Quality (5)
- **Reliability** (35 pts): Access & Auth (10), Order Management (10), Checkout Flow (10), Bot Tolerance (5)

Key files: `rubric.ts` (scoring rubric), `scoring-engine.ts` (deterministic scorer), `agent-scan.ts` (multi-page Claude scanner), `classify-brand.ts` (Perplexity classification), `audit-site.ts` (Perplexity site audit), `fetch.ts` (parallel fetcher + domain normalization).

## Taxonomy & Classification

`features/brand-engine/procurement-skills/taxonomy/` — each concern is its own file with type definition + label map:
- **28 sectors** (21 Google Product Taxonomy roots + 7 custom). 26 assignable; `luxury` is tier-driven, `multi-sector` is set programmatically for department stores/supermarkets/mega merchants.
- **7 tiers**: commodity → ultra_luxury
- **8 brand types**: brand, retailer, marketplace, chain, independent, department_store, supermarket, mega_merchant. Brand type controls category resolution depth.
- **8 capabilities**: guest_checkout, po_number, tax_exempt, bulk_pricing, api_ordering, subscription, wishlist, price_match
- Also: checkout methods, checkout providers, payment methods, ordering permissions, maturity levels

Core types in `features/brand-engine/procurement-skills/types.ts` — re-exports all taxonomy types, defines `VendorSkill`, `SearchDiscovery`, `BuyingConfig`, `DealsConfig`, `TaxonomyConfig`, `MethodConfig`.

Product categories: 5,638 entries in `product_categories` table (5,595 Google + 43 custom, seeded by `scripts/seed-google-taxonomy.ts`). Category resolution maps brands to taxonomy IDs via `brand_categories` junction table.

## Skill Generation & Serving

`features/brand-engine/procurement-skills/generator.ts` — `generateVendorSkill()` converts VendorSkill objects into SKILL.md markdown (frontmatter, overview, search instructions, checkout flow, tips, known issues).

`features/brand-engine/procurement-skills/skill-json.ts` — `buildSkillJson()` produces machine-readable JSON (identity, taxonomy, scoring, access, checkout, shipping, loyalty).

Served at: `GET /brands/{slug}/skill` (text/markdown, 24h cache) and `GET /brands/{slug}/skill-json` (application/json, 24h cache).

## Merchant Discovery (Recommend API)

`app/api/v1/recommend/route.ts` — three-stage pipeline for agent queries:
1. **Category Resolution** — Perplexity Sonar extracts intent → FTS against `category_keywords` → top 5 categories
2. **Merchant Ranking** — recursive CTE over `brand_categories` + `brand_index` → ranked by brand match → match depth → ASX score
3. **Product Search** — pgvector cosine similarity against `product_listings` → top 3 per merchant

Product listings (Module 2 — Product Index): `VECTOR(384)` column, `Xenova/all-MiniLM-L6-v2` embeddings via `features/product-index/embeddings/embed.ts`, IVFFlat index. Ingestion via Shopify JSON, Google Shopping XML, or weekly refresh scripts.

## Scan Queue

`features/brand-engine/scan-queue/`, admin page at `/admin123/scan-queue` — batch scanning with server-side scheduler:
- Processes one domain every 17 minutes, auto-stops after 3 days, pauses during quiet hours
- `scan_queue` table with `FOR UPDATE SKIP LOCKED` atomic claim, stale recovery (30 min timeout)
- Same pipeline as public scan API

## Brand Claims

`brand_claims` table, `features/brand-engine/brand-claims/` — self-service ownership verification:
- Auto-verify if email domain matches brand domain; manual review otherwise
- Upgrades maturity to `official` on verify, reverts to `community` on revoke
- Free email blocklist (Gmail, Yahoo, etc.)
- Admin review queue at `/admin123/brand-claims`

## Brand Feedback

`brand_feedback` table — agents and humans rate brands (search accuracy, stock reliability, checkout completion):
- Weighted 90-day rolling average (source weights: human=2.0, agent=1.0, anonymous=0.5)
- Published at 5+ weighted events → updates `axsRating` on brand_index
- `POST /api/v1/bot/skills/[vendor]/feedback`, rate limited: 1 per brand per bot per hour

## Catalog UI

Hybrid SSR: `app/skills/page.tsx` (server component, initial fetch) + `app/skills/catalog-client.tsx` (client, filtering/pagination). `VendorCard` in `app/skills/vendor-card.tsx` shared across catalog and sector pages. Detail pages at `app/skills/[vendor]/page.tsx` (SSR for SEO) with claim button, skill preview, and copy URL components. Sector landing pages at `app/c/[sector]/page.tsx`. Sitemap includes all brand pages and populated sector pages.

## Skill Variants System

A config-driven build system at `skill-variants/` (project root) that generates variant skill packages from the master files in `public/`. Each variant has its own independent `variant.config.json` defining overrides.

**Structure:**
- `skill-variants/<name>/variant.config.json` — config with frontmatter overrides, URL prefix, title override, optional extra files
- `skill-variants/<name>/dist/` — generated output (gitignored)
- Master source: `public/` (skill.md, skill.json, heartbeat.md, and all supporting .md files)

**Config fields:** `source` (master dir), `urlPrefix` (rewrites all file URLs), `overrides` (frontmatter patches), `skillJsonOverrides` (skill.json patches), `titleOverride` (H1 heading), `extraFiles` (optional additional files from variant folder)

**Build:** `npx tsx skill-variants/build-variants.ts` — scans all variant folders, copies master files, patches frontmatter/URLs/skill.json, auto-generates Skill Files table and install commands, outputs to dist/.

**Current variants:** stripe, creditcard

**CI/CD:** GitHub Actions workflow for auto-publishing to ClawHub lives at `skill-variants/publish-skills.yml` (reference copy). Must be manually copied to `.github/workflows/publish-skills.yml` on the GitHub side — the `.github/` folder is not managed by Replit to avoid sync conflicts. See `skill-variants/DEPLOYMENT.md` for full setup instructions.

---

# 3. Payment Tools

Outbound payment rails — how users fund wallets and how their agents spend money at external merchants. Two fundamentally different systems: crypto wallets (Rails 1 & 2) and self-hosted cards (Rail 5).

→ Docs: `project_knowledge/internal_docs/04-payment-tools/`

## Crypto Wallets (Rails 1 & 2)

Custodial USDC wallets on Base chain. Both rails share the same funding → spending → reconciliation pattern, inter-wallet transfers, and guardrail enforcement. They differ by provider.

### Rail 1 — Crypto Wallet (Live)

Uses Privy server wallets on Base chain, USDC funding via Stripe Crypto Onramp, and x402 payment protocol. **Modularized under `features/payment-rails/rail1/`:**
  - `client.ts` — Privy client singleton, authorization signature helper, app ID/secret getters.
  - `wallet/create.ts` — `createServerWallet()` via Privy walletsService.
  - `wallet/sign.ts` — `signTypedData()` for x402 EIP-712 signing.
  - `wallet/transfer.ts` — `sendUsdcTransfer()` via Privy RPC with ERC-20 calldata.
  - `wallet/balance.ts` — `getOnChainUsdcBalance()` via viem + Base RPC.
  - `onramp.ts` — re-export shim for `createStripeOnrampSession` from `features/payment-rails/crypto-onramp/stripe-onramp/session.ts`. Uses `stripe.rawRequest()` via the shared Stripe SDK client (the crypto onramp endpoint is not yet in the SDK's typed API, so rawRequest is used with manual typing).
  - `x402.ts` — x402 typed data builders (`buildTransferWithAuthorizationTypedData`, `buildXPaymentHeader`, `generateNonce`) and USDC format helpers (`formatUsdc`, `usdToMicroUsdc`, `microUsdcToUsd`).
  - Webhook: `STRIPE_WEBHOOK_SECRET_ONRAMP` env var, event type `crypto.onramp_session.updated`. Balance sync endpoint: `POST /api/v1/stripe-wallet/balance/sync` with 30-sec cooldown and `reconciliation` transaction type for discrepancies. Schema includes `last_synced_at` column on `privy_wallets`.

### Rail 2 — Card Wallet (Not yet functional)

Uses CrossMint smart wallets on Base chain, USDC funding via fiat onramp, and Amazon/commerce purchases via Orders API. Employs merchant allow/blocklists. **Modularized under `features/payment-rails/rail2/`:**
  - `client.ts` — shared CrossMint API client (`crossmintFetch`, `getServerApiKey`, format helpers). Handles both API versions: Wallets API (`2025-06-09`) and Orders API (`2022-06-09`).
  - `wallet/create.ts` — `createSmartWallet()` using `evm-fireblocks-custodial` signer.
  - `wallet/balance.ts` — `getWalletBalance()` with balance parsing for old/new response formats.
  - `wallet/transfer.ts` — `sendUsdcTransfer()` for on-chain USDC transfers.
  - `orders/purchase.ts` — re-export shim for `createPurchaseOrder()`, `getOrderStatus()` from `features/agent-interaction/procurement/crossmint-worldstore/purchase.ts`.
  - `orders/onramp.ts` — `createOnrampOrder()` for fiat-to-USDC via checkoutcom-flow.
  - On-chain balance sync via reused `getOnChainUsdcBalance` from `features/payment-rails/rail1/wallet/balance.ts`. Balance sync endpoint: `POST /api/v1/card-wallet/balance/sync` with 30-sec cooldown and `reconciliation` transaction type for discrepancies. Schema includes `last_synced_at` column on `crossmint_wallets`. Frontend ↻ button on Card Wallet dashboard mirrors Rail 1 pattern.

**WorldStore Procurement** (`features/agent-interaction/procurement/`) — CrossMint's WorldStore API for purchasing products (e.g. Amazon) using USDC. Not yet active. Provider-agnostic structure — CrossMint WorldStore is the first provider.
- **`types.ts`** — `PurchaseRequest`, `PurchaseResult`, `ShippingAddress`, `ProcurementProvider`, `OrderStatusResult`
- **`crossmint-worldstore/client.ts`** — `getServerApiKey()`, `worldstoreSearch()` — shared CrossMint WorldStore API client
- **`crossmint-worldstore/types.ts`** — `CrossMintOrderEvent`, `OrderStatusMapping`, `TrackingInfo`, `ProductVariant`, `ProductSearchResult`
- **`crossmint-worldstore/purchase.ts`** — `createPurchaseOrder()`, `getOrderStatus()` — uses `crossmintFetch` from `features/payment-rails/rail2/client.ts` for Orders API
- **`crossmint-worldstore/shopify-search.ts`** — `searchShopifyProduct()` — Shopify product variant search via WorldStore unstable API
- **`crossmint-worldstore/webhook.ts`** — `verifyCrossMintWebhook()`, `extractOrderId()`, `buildOrderUpdates()`, `extractTrackingInfo()` — order lifecycle webhook processing
- **Re-export shims**: `features/payment-rails/rail2/orders/purchase.ts` re-exports `createPurchaseOrder`/`getOrderStatus` — all 4 consumers unchanged
- **Cross-rail shopping gate**: CrossMint Orders API requires `payerAddress` to be the CrossMint wallet. Shopping from a Privy (Rail 1) wallet would require a pre-transfer step (Privy→CrossMint) before order creation. This is a known limitation — not yet implemented.
- Future providers (direct merchant APIs, browser checkout agents) slot in as siblings under `features/agent-interaction/procurement/`.

### Crypto Onramp (`features/payment-rails/crypto-onramp/`) — Active (Rail 1)

Server-side Stripe Crypto Onramp logic. Client-side UI is now in `features/agent-shops/payments/`. Legacy client components retained with `-legacy` suffix for reference.
- **`types.ts`** — `WalletTarget`, `OnrampSessionResult`, `OnrampWebhookEvent`, `OnrampProvider`
- **`stripe-onramp/session.ts`** — `createStripeOnrampSession()` — creates Stripe Crypto Onramp session for any wallet address (still used by API routes)
- **`stripe-onramp/webhook.ts`** — `parseStripeOnrampEvent()` + `handleStripeOnrampFulfillment()` — still used by webhook route
- **`stripe-onramp/types.ts`** — Stripe-specific payload types

### Inter-Wallet Transfers

CreditClaw supports USDC transfers between wallets across all rails and to external addresses.
- **API Endpoint:** `POST /api/v1/wallet/transfer` (authenticated, owner-only)
- **Transfer Tiers:** Same-rail (Privy→Privy, CrossMint→CrossMint), Cross-rail (Privy↔CrossMint), External (to any 0x address)
- **Guardrail Enforcement:** Transfers are subject to per-wallet guardrails (per-tx limit, daily/monthly budgets) via `evaluateGuardrails`
- **On-chain Execution:** Privy wallets use REST API (`POST /v1/wallets/{id}/rpc` with ERC-20 transfer calldata, gas sponsored); CrossMint wallets use token transfer endpoint (`POST /wallets/{locator}/tokens/base:usdc/transfers`)
- **Atomic DB Updates:** Source debit, destination credit, and transaction ledger entries are wrapped in a single Drizzle `db.transaction()` for consistency
- **Transaction Type:** `"transfer"` with metadata containing `direction` ("inbound"/"outbound"), `transfer_tier`, `counterparty_address`, `counterparty_wallet_id`, `counterparty_rail`, `tx_hash`
- **Frontend:** Transfer button on both Crypto Wallet and Card Wallet pages, dialog with destination picker (own wallets across both rails or external address), amount input in USD
- **Lib Functions:** `sendUsdcTransfer` in `features/payment-rails/rail1/wallet/transfer.ts` (Privy) and `features/payment-rails/rail2/wallet/transfer.ts` (CrossMint)

## Self-Hosted Cards (Rail 5) — Live

Encrypted card files with plugin-based checkout. Uses the owner's personal credit card — no wallet, no USDC, no blockchain. Owner encrypts card client-side (AES-256-GCM), CreditClaw stores only the decryption key. At checkout, the agent (or a plugin) gets the key, decrypts, fills card number + CVV, and wipes all sensitive data. Actively building plugins for **Claude Coworker** and **OpenClaw** to simplify the payment process — no sub-agent required when using a plugin. **Plugin:** `Plugins/OpenClaw/` (`src/index.ts`, `src/decrypt.ts`, `src/fill-card.ts`, `src/api.ts`). **Modularized under `features/payment-rails/rail5/`:**
  - `index.ts` — core helpers (`generateRail5CardId`, `generateRail5TransactionId`, `validateKeyMaterial`, `getDailySpendCents`, `getMonthlySpendCents`, `buildSpawnPayload`, `buildCheckoutSteps`) + test checkout constants (`RAIL5_TEST_CHECKOUT_PAGE_ID`, `RAIL5_TEST_CHECKOUT_URL`).
  - `decrypt-script.ts` — static `DECRYPT_SCRIPT` constant (~10-line AES-256-GCM Node.js script) with marker-based regex (`ENCRYPTED_CARD_START/END`) for extracting data from combined files. Falls back to code-fence matching for old-format files.
  - **Card status progression:** `pending_setup` → `pending_delivery` (key submitted) → `confirmed` (bot confirmed file delivery via `POST /bot/rail5/confirm-delivery`) → `active` (first successful checkout completed). `frozen` can be set by owner on `confirmed` or `active` cards; unfreezing restores to `confirmed` or `active` based on checkout history.
  - **Dual execution modes:** Checkout endpoint returns both `checkout_steps` (array of instructions for direct mode) and `spawn_payload` (spawn wrapper for sub-agent mode). Bot chooses which to use.
  - DB tables: `rail5_cards`, `rail5_transactions`. Owner API: `/api/v1/rail5/{initialize,submit-key,cards,deliver-to-bot,cards/[cardId]/delivery-status}`. Bot API: `/api/v1/bot/rail5/{checkout,key,confirm,confirm-delivery}`. Dashboard: `/sub-agent-cards`. Setup wizard: 9-step (Name→HowItWorks→VisualCardEntry→BillingAddress→Limits→LinkBot→Encrypt&Send→DeliveryResult→TestVerification) with Web Crypto encryption. Card brand is auto-detected from BIN prefix via shared `features/payment-rails/card/card-brand.ts` utility (Visa/MC/Amex/Discover/JCB/Diners); sent to server during submit-key.
  - **File delivery via `sendToBot()`**: Encryption step calls `POST /api/v1/bot-messages/send` which tries webhook first, falls back to staging a pending message. Combined self-contained markdown file format with `DECRYPT_SCRIPT_START/END` and `ENCRYPTED_CARD_START/END` markers. Backup download always happens.
  - **Delivery result step**: Shows live status (webhook delivered / waiting for bot / confirmed). 1-minute polling every 5s via `GET /rail5/cards/[cardId]/delivery-status`. Share buttons (Copy, Telegram, Discord) for relay message. Collapsible "For AI Agents" section with re-download option. **Phase 2: Test purchase verification** — after bot confirms delivery, polls `GET /rail5/cards/[cardId]/test-purchase-status` for 3 minutes. Server returns submitted card details from the test sale; client compares field-by-field against `savedCardDetails` (preserved in browser memory before input clearing). Shows green checkmarks (match) or red X (mismatch) per field. Confirm-delivery endpoint returns real `test_checkout_url` and `test_instructions` directing bot to sandbox checkout with "testing" payment method.

**Companion & Shipping Files** (bot checkout support):
- **Merged Card File with Metadata** (`features/payment-rails/card/onboarding-rail5/encrypt.ts`): During Rail 5 card onboarding, the encrypted card file includes plaintext "Card Details" and "Billing Address" sections above the encrypted blob. Contains non-sensitive metadata (first 4 digits, expiry, cardholder name, brand) and billing address. Bots read these sections to fill checkout form fields without decrypting. Single file — no separate companion file. Non-sensitive metadata is also saved to the `rail5_cards` DB table (`cardFirst4`, `expMonth`, `expYear`, `cardholderName`, `billingAddress`, `billingCity`, `billingState`, `billingZip`, `billingCountry`) for pre-filling future cards.
- **Shipping File** (`features/agent-interaction/shipping/`): A central `.creditclaw/shipping.md` file shared across all cards. Generated from the `shipping_addresses` DB table. Auto-pushed to all owner's bots whenever addresses are created, updated, deleted, or default is changed. Bots can also fetch on demand via `GET /api/v1/bot/shipping-addresses`. Default address is marked for bot use at checkout.
- Webhook event: `shipping.addresses.updated` (registered in `WebhookEventType`).

## Cross-Rail Systems

These systems span all rails (1, 2, and 5).

### Guardrails & Spending Controls

**Per-Rail Guardrails** (`features/agent-interaction/guardrails/`) — spending limits (how much). Per-rail limits per wallet/card. Also owns approval modes.

**Master Guardrails** — Owner-level, cross-rail spending limits stored in a `master_guardrails` table. Checked before per-rail guardrails. Aggregates spend across all active rails.

**Procurement Controls** (`features/agent-interaction/procurement-controls/`) — merchant/domain/category restrictions (where). Fully separated from guardrails.

See `internal_docs/05-agent-interaction/guardrails.md` for enforcement flow, spend aggregation, status filters, approval modes, and procurement control details.

### Unified Approvals

`unified_approvals` is the **sole source of truth** for all approval state across all rails. The old `privy_approvals` and `crossmint_approvals` tables have been dropped. All approval reads, writes, and decisions go through this single table.

- **Service** (`features/agent-interaction/approvals/service.ts`): `createApproval()` generates HMAC-signed approval links, stores in `unified_approvals` table, sends branded email. `resolveApproval()` verifies HMAC, checks expiry, updates status, dispatches rail-specific callbacks.
- **Email** (`features/agent-interaction/approvals/email.ts`): Single `sendApprovalEmail()` with CreditClaw-branded HTML template, rail badge, and magic-link button.
- **Callbacks** (`features/agent-interaction/approvals/callbacks.ts`): Thin loader that imports the four rail-specific fulfillment modules below.
- **Rail 1 Fulfillment** (`features/agent-interaction/approvals/rail1-fulfillment.ts`): `railRef` = privy_transaction ID. On approve: updates tx status, creates order. On deny: marks tx failed.
- **Rail 2 Fulfillment** (`features/agent-interaction/approvals/rail2-fulfillment.ts`): `railRef` = crossmint_transaction ID. On approve: looks up tx, creates purchase order via CrossMint, records order, fires webhook. On deny: marks tx failed, fires webhook.
- **Rail 5 Fulfillment** (`features/agent-interaction/approvals/rail5-fulfillment.ts`): Approval/denial handlers for self-hosted card checkouts (status updates, webhook firing) + self-registers.
- **Lifecycle** (`features/agent-interaction/approvals/lifecycle.ts`): TTL constants per rail (Rail 1 polling: 5min, Rail 1 email: 10min, Rails 2/5: 15min).
- **Landing Page** (`app/api/v1/approvals/confirm/[approvalId]/route.ts`): GET renders branded approval page with approve/deny buttons; POST processes the decision via `resolveApproval()`. Single entry point for email-based approvals across all rails.

**Centralized Dashboard API** (used by ALL rail dashboard pages):
- `GET /api/v1/approvals?rail=<rail>` — returns pending unified approvals for the authenticated owner, filtered by rail. Extracts rail-specific display fields from `metadata` JSONB (Rail 1: `resource_url`; Rail 2: `product_name`, `shipping_address`).
- `POST /api/v1/approvals/decide` — accepts `{ approval_id, decision }` (approval_id is the `ua_...` string), verifies ownership, calls `resolveApproval()` with stored HMAC token.
- All rail dashboard pages (Crypto Wallet, Card Wallet, Self-Hosted Cards) use these centralized endpoints. No rail-specific approval endpoints remain.

**Metadata JSONB**: Rail-specific display data is stored in the `metadata` column of `unified_approvals` when checkout routes call `createApproval()`:
- Rail 1: `{ recipient_address, resource_url }`
- Rail 2: `{ productLocator, product_name, quantity, shipping_address }`
- Rail 5: checkout details

**Storage**: `server/storage/approvals.ts` — `createUnifiedApproval`, `getUnifiedApprovalById`, `getUnifiedApprovalByRailRef`, `decideUnifiedApproval`, `closeUnifiedApprovalByRailRef`, `getUnifiedApprovalsByOwnerUid`.
- **DB Table**: `unified_approvals` with columns: id, approvalId, rail, ownerUid, ownerEmail, botName, amountDisplay, amountRaw, merchantName, itemName, hmacToken, status, expiresAt, decidedAt, railRef, metadata, createdAt.
- **Env Vars**: `UNIFIED_APPROVAL_HMAC_SECRET` (falls back to `HMAC_SECRET` or default).
- **Dropped Tables**: `privy_approvals`, `crossmint_approvals`, `rail5_wallets` (legacy allowance wallet — always $0), and old `rail5_transactions` (wallet ledger) have been removed from schema and dropped from the database. The former `rail5_checkouts` table was renamed to `rail5_transactions` — it is now the sole Rail 5 transaction log (purchase records with merchant, item, amount, status).

### Transaction Ledger

Transaction tables (`rail5_transactions`, `privy_transactions`, `crossmint_transactions`) have a nullable `balance_after` column. For crypto rails (1 & 2), it records the wallet's balance at the time the transaction was created — no calculations, just stores whatever the DB balance is at that moment. For Rail 5, `balance_after` is always `null` (no wallet balance — charges go directly to the owner's card). Owner-facing and bot-facing transaction list APIs include `balance_after` / `balance_after_display` in responses.

### Wallet Freeze & Rail Events

**Wallet Freeze:** Owners can freeze bot wallets, preventing transactions.

**`rails.updated` webhook** fires across ALL rails on bot link/unlink/freeze/unfreeze/wallet create with `action`, `rail`, `card_id`/`wallet_id`, `bot_id` in payload. Wired up in: Rail 1 (create, freeze), Rail 2 (create, freeze), Rail 5 (PATCH cards).

## Shared Wallet & Card UI

**Card UI Module (`features/payment-rails/card/`):** Shared card component library designed for consistent card visuals across the platform.
  - `card-brand.ts` — brand detection from BIN prefix, formatting, max digits, placeholders. Re-exported from `lib/card-brand.ts` for backward compatibility.
  - `brand-logo.tsx` — visual brand logo component (Visa/MC/Amex/Discover/JCB/Diners).
  - `cipher-effects.tsx` — `useCipherScramble` hook for encryption scramble animations.
  - `hooks.ts` — `useTemporaryValid` hook (5-second green validation flash), `CardFieldErrors` interface.
  - `card.css` — shared CSS for card field states (`.card-field`, `.card-field-valid`, `.card-field-error`, `.card-field-focused`).
  - `index.ts` — barrel re-export for shared utilities.
  - `onboarding-rail5/` — Rail 5-specific card onboarding:
    - `interactive-card.tsx` — editable visual card component with cipher scramble, field validation, brand detection.
    - `encrypt.ts` — client-side AES-256-GCM encryption (`encryptCardDetails`, `buildEncryptedCardFile`, `downloadEncryptedFile`). Re-exported from `features/payment-rails/rail5/encrypt.ts` for backward compatibility.

**Card Color Persistence:** Each card (Rail 5) stores its own `card_color` (`purple`, `dark`, `blue`, `primary`). New cards get a random color on creation. Users can change it from the card detail page (color picker circles below card visual). `resolveCardColor(color, cardId)` in `components/wallet/types.ts` provides a fallback — if `card_color` is null (e.g. a card created before this feature), it derives a stable color from a hash of the card ID. Card deletion uses the unified endpoint `DELETE /api/v1/cards/:cardId?rail=rail5`.

**Shared Wallet/Card UI (`components/wallet/`):** All wallet and card page UI is consolidated into `components/wallet/` to eliminate duplication across Rails 1, 2, and 5. Setup wizards are NOT in this folder — they remain in their original locations. Key components: `card-visual.tsx` (Rail 5), `crypto-card-visual.tsx` (Rails 1/2), `credit-card-item.tsx` (unified card+action bar), `credit-card-list-page.tsx` (full page shell — pages pass a config object), `rail-page-tabs.tsx` (shared tab shell), `transaction-list.tsx`, `order-list.tsx`, `approval-list.tsx` (pending-only, used on overview dashboard), `approval-history-panel.tsx` (full history with filters — used on all rail pages and `/transactions`). Shared hooks under `hooks/` (wallet actions, bot linking, transfers, guardrails). Shared dialogs under `dialogs/`. `types.ts` defines `NormalizedCard` with per-rail normalizers.

Rail 5 (`sub-agent-cards/page.tsx`) is ~43 lines — a pure config object passed to `CreditCardListPage`. Adding transaction/approval tabs = add endpoint URLs to the config object.

**Orders & Approvals Page** (`/transactions`) — cross-rail activity dashboard with two tabs. Supports URL-param tab selection via `?tab=approvals` (defaults to orders tab).
- **Orders** — confirmed purchases across all rails via `OrdersPanel` (reads from central `orders` table). Cross-rail filters: rail, bot, status, date range. Clicking an order navigates to `/orders/[order_id]` detail page. Sidebar "Orders" link deep-links to `/transactions?tab=orders`.
- **Approvals** — approval history via `ApprovalHistoryPanel`.

**Transaction vs Order:** A *transaction* is a financial movement (deposit, transfer, debit, reconciliation) — it's about the money. An *order* is a confirmed purchase (product, vendor, shipping, tracking) — it's about what was bought. An order typically has a corresponding transaction (via `transactionId` FK), but not every transaction creates an order (deposits, transfers don't).

Individual rail pages (`/stripe-wallet`, `/card-wallet`, `/sub-agent-cards`) use `RailPageTabs` to show rail-specific transactions, orders, and approvals alongside their wallet/card management. All three rail pages use `ApprovalHistoryPanel` (with `defaultRail` prop) for full approval history — not just pending. The rail filter is hidden on rail-specific pages since it's redundant. Pending approval count is reported back to the parent via `onPendingCount` callback for the tab badge.

---

# 4. Agent Interaction

How external agents communicate with CreditClaw. Webhooks, messaging, and order tracking.

→ Docs: `project_knowledge/internal_docs/05-agent-interaction/`

## Webhooks

`features/agent-interaction/webhooks/`:
- `delivery.ts` — outbound webhook delivery, HMAC-SHA256 signing, retry logic with exponential backoff, and OpenClaw hooks token auth. Exports `fireWebhook()`, `fireRailsUpdated()`, `signPayload()`, `attemptDelivery()`, `retryWebhookDelivery()`, `retryPendingWebhooksForBot()`, `retryAllPendingWebhooks()`.
- `index.ts` — barrel re-exports. Consumers import from `@/features/agent-interaction/webhooks`.
- Types: `WebhookEventType`, `RailsUpdatedAction`.
- Storage layer lives separately at `server/storage/webhooks.ts`.

## Managed Cloudflare Tunnels

Bots without a `callback_url` get a managed Cloudflare tunnel provisioned at registration. Tunnels route through the `nortonbot.com` domain (configured directly in Cloudflare). Module lives in `features/agent-interaction/webhook-tunnel/` with two layers: `cloudflare.ts` (raw API calls) and `provisioning.ts` (orchestration + defaults). Required secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_ZONE_ID`.
→ Full detail: `project_knowledge/internal_docs/05-agent-interaction/webhook-tunnels.md`

## Bot Messaging System

`features/platform-management/agent-management/bot-messaging/`:
- `index.ts` — `sendToBot(botId, eventType, payload, options?)`: single function for all bot communication. Routes based on webhook health: tries webhook if status is `active` or `degraded`, skips webhook and goes straight to pending message if `unreachable` or `none`.
- `expiry.ts` — per-event-type expiry config (`rail5.card.delivered` = 24h, general = 7 days).
- `templates/` — centralized message templates for bot instructions. Each event type has a template file (`.ts` exporting a string constant). All delivery paths (relay UI, webhook payload, staged message) import from here to stay in sync. `getTemplate(eventType, vars?)` substitutes `{{variable}}` placeholders. Currently: `rail5-card-delivered.ts`.
- **Webhook Health Tracking**: `webhookStatus` (text, default `none`) and `webhookFailCount` (integer, default 0) columns on the `bots` table.
  - `active` — webhook configured and working, events delivered via webhook
  - `degraded` — 1 consecutive failure, still tries webhook on next delivery
  - `unreachable` — 2+ consecutive failures, skips webhook entirely, stages pending messages
  - `none` — no webhook configured
  - On success: resets to `active`, fail count to 0. On failure: increments count, transitions `active→degraded→unreachable`.
  - Auto-initialized on bot registration: `active` if `callback_url` is provided, `none` otherwise.
  - Health updates are fire-and-forget (don't block message staging).
  - Recovery: owner updates webhook URL (resets to `active`), or bot re-registers.
- DB table: `bot_pending_messages` (id, botId, eventType, payload JSONB, stagedAt, expiresAt, status).
- Bot API: `GET /api/v1/bot/messages` (fetch pending, lazy purge), `POST /api/v1/bot/messages/ack` (acknowledge/delete).
- Owner API: `POST /api/v1/bot-messages/send` (owner-authenticated, calls `sendToBot()`).
- `GET /bot/status` includes `pending_messages` count, `webhook_status`, `webhook_fail_count`.
- `GET /bots/mine` includes `webhook_status` per bot.
- Messages stay `pending` until explicit ack (not marked on GET). Expired messages are lazily purged.
- Rail 5 `confirm-delivery` also deletes the pending message for the card.
- **Note**: Direct `fireWebhook()` callers (~20 sites across the codebase) do not participate in health tracking — only `sendToBot()` does. Migration of those callers to `sendToBot()` is a future task.

## Central Orders

`features/agent-interaction/orders/`, `server/storage/orders.ts` — Unified cross-rail order tracking for all vendor purchases. Every confirmed purchase across all rails creates a row in the `orders` table. UI lives on the `/transactions` page (Orders tab) — see Module 3 > Shared Wallet & Card UI.
- **Schema**: `orders` table in `shared/schema.ts` with columns for product info (name, image, URL, description, SKU), vendor (name, details JSONB), pricing (price_cents, taxes_cents, shipping_price_cents, currency), shipping (address, type, note), tracking (carrier, number, URL, estimated_delivery), and references (owner_uid, rail, bot_id, wallet_id/card_id, transaction_id, external_order_id).
- **Storage**: `server/storage/orders.ts` — CRUD methods: `createOrder`, `getOrderById`, `getOrderByExternalId`, `getOrdersByOwner` (with filters: rail, botId, walletId, cardId, status, dateFrom, dateTo), `getOrdersByWallet`, `getOrdersByCard`, `updateOrder`.
- **Order creation module**: `features/agent-interaction/orders/create.ts` exports `recordOrder()` — single entry point all rails call after a confirmed purchase. `features/agent-interaction/orders/types.ts` defines `OrderInput` interface.
- **Rail wiring** (order creation fires ONLY after confirmed execution, never on pending requests):
  - Rail 1: `features/agent-interaction/approvals/rail1-fulfillment.ts` (approved) + `app/api/v1/stripe-wallet/bot/sign/route.ts` (auto-approved)
  - Rail 2: `features/agent-interaction/approvals/rail2-fulfillment.ts` (approved) + `app/api/v1/card-wallet/bot/purchase/route.ts` (auto-approved). Webhooks update order via `storage.getOrderByExternalId()` + `storage.updateOrder()`.
  - Rail 5: `features/agent-interaction/approvals/rail5-fulfillment.ts` (approved) + `app/api/v1/bot/rail5/checkout/route.ts` (auto-approved)
- **API**: `GET /api/v1/orders` (list with query filters), `GET /api/v1/orders/[order_id]` (single order detail). Owner-authenticated.

---

# 6. Platform Management

Auth, bot lifecycle, admin tooling.

→ Docs: `project_knowledge/internal_docs/07-platform-management/`

## Auth Pattern for API Routes

All authenticated API routes under `app/api/v1/` must use `getSessionUser(request)` from `@/features/platform-management/auth/session` — this supports both httpOnly session cookies AND Bearer token fallback. Never use bare `getCurrentUser()` for API routes (cookie-only, breaks when session expires). Client-side callers must use `authFetch` from `@/features/platform-management/auth-fetch` instead of plain `fetch` — it attaches the Firebase ID token as a Bearer header automatically. Some older routes (`bots/mine`, `bots/rails`, `bots/default-rail`, `bots/[botId]/settings`) have an inline `getAuthUser()` wrapper that does the same thing — those work but should eventually be consolidated.

## Feature Flags & Access Control

CreditClaw uses a lightweight, database-backed feature flag system for controlling UI visibility and route access.
- **DB Column**: `flags text[] NOT NULL DEFAULT '{}'` on the `owners` table. A user can hold multiple flags simultaneously (e.g., `["admin", "beta"]`).
- **Tier Types**: `features/platform-management/feature-flags/tiers.ts` — defines `Tier = "admin" | "beta" | "paid"` with compile-time enforcement.
- **Client Hook**: `features/platform-management/feature-flags/use-feature-access.ts` — `useHasAccess(tier)` reads from auth context synchronously. No API calls, no loading states.
- **Auth Flow**: Flags are included in the session response (`GET /api/auth/session` and `POST /api/auth/session`). The `User` interface in `features/platform-management/auth/auth-context.tsx` includes `flags: string[]`.
- **Sidebar Integration**: Nav items in `components/dashboard/sidebar.tsx` support an optional `requiredAccess?: Tier` property. Items are filtered out before render — not hidden with CSS.
- **Admin Dashboard**: `/admin123` — server-side protected via `layout.tsx` that calls `getCurrentUser()` and checks for `admin` flag. Returns 404 (not 403) for non-admins. Uses the same sidebar/header layout as the main dashboard.
- **Adding a new flag**: (1) Set it in the user's `flags` array in DB, (2) Tag nav items or routes with `requiredAccess`, (3) Done.

## Agent Management

`features/platform-management/agent-management/` — Bot/agent-facing API infrastructure:
- `auth.ts` — authenticates bot requests via Bearer API key (prefix lookup + bcrypt verify).
- `crypto.ts` — API key generation, hashing, verification, claim tokens, card IDs, webhook secrets.
- `rate-limit.ts` — token-bucket rate limiter with per-endpoint config (19 endpoints).
- `agent-api/middleware.ts` — `withBotApi()` wrapper: auth → rate limit → handler → access log → webhook retry.
- `agent-api/status-builders.ts` — `buildRail{1,2,5}Detail()` functions for `/bot/status` and `/bot/check/*` responses.
- `bot-linking.ts` — centralized `linkBotToEntity(rail, entityId, botId, ownerUid)` / `unlinkBotFromEntity(rail, entityId, ownerUid)` for all rails. Max 3 entities per bot, ownership validation, bot existence check, webhook firing (`rails.updated`). Rail configs are declarative objects. Route files are thin wrappers.
- **Bot Status API:** `GET /api/v1/bot/status` (cross-rail), `GET /api/v1/bot/check/rail{1,2,5}` (per-rail detail). `GET /api/v1/bots/rails` (owner-facing rail connections).

## Onboarding & Setup Wizards

Onboarding wizard (`/onboarding`, 5 steps), Rail 5 setup wizard (`/setup/rail5`, 8+1 steps), and shared wizard typography system (`lib/wizard-typography.ts`). → Full detail: `project_knowledge/internal_docs/07-platform-management/onboarding-wizards.md`

## Feedback / Support Widget

In-app feedback dialog accessible from the profile dropdown in the dashboard header. Authenticated users can submit bug reports, feature requests, billing questions, technical support requests, and general feedback.
- **Frontend:** `components/dashboard/feedback-dialog.tsx` — Dialog component using existing UI primitives (Dialog, Select, Textarea, Button). Manages own form state and submission.
- **Trigger:** Profile dropdown in `components/dashboard/header.tsx` — "Support" menu item with LifeBuoy icon between Settings and Log Out.
- **Backend:** `app/api/v1/feedback/route.ts` — POST endpoint, authenticated via `getSessionUser`, validates with Zod, sends formatted HTML+text email via SendGrid to support inbox.
- **No database storage** — feedback goes straight to email. `replyTo` is set to the user's email for direct replies.
- **Security:** All user-supplied content is HTML-escaped before email insertion. Message length capped at 5000 chars.
- **Config:** `SUPPORT_EMAIL` env var (defaults to `support@creditclaw.com`).

---

# 7. Multi-tenant Structure

→ Docs: `project_knowledge/internal_docs/08-multi-tenant/`

## Tenant Theming

Each tenant has its own config at `public/tenants/{tenantId}/config.json` (source of truth) and `features/platform-management/tenants/tenant-configs.ts` (client bundle). Configs define branding, meta tags, theme tokens, routes, features, and tracking.

- **CreditClaw** — "Fun Consumer" theme: 3D clay/claymation aesthetic, coral lobster mascot, bright pastels (orange/blue/purple), Plus Jakarta Sans, 1rem rounded corners
- **shopy.sh** — Monospace section labels, no rounded corners on cards, no shadows, `gap-px bg-neutral-200` grid dividers, dark sections, green accent in terminal contexts
- **brands.sh** — Skill-registry framing, shared label maps from `features/brand-engine/procurement-skills/taxonomy/`

When building UI, check which tenant(s) the feature applies to and follow the appropriate design language.

---

# 8. Agent Shops

The platform's inbound commerce engine. Buyers (humans and AI agents) pay into the seller's crypto wallet via checkout pages, storefronts, and invoices. These are not outward payments by agents — all payment methods below are inbound, collecting funds into the merchant's crypto wallet.

→ Full reference: `project_knowledge/internal_docs/09-agent-shops/agent-shops-module.md`

**Inbound checkout payment methods** (all deposit into seller's crypto wallet):
- **x402** — Autonomous agent-to-agent USDC payments via EIP-3009 on Base
- **Base Pay** — One-tap USDC payment on Base via `@base-org/account` popup
- **Stripe Onramp** — Card/bank payment converted to USDC via Stripe's Crypto Onramp
- **USDC Direct** — Manual on-chain USDC transfer to the seller's wallet address
- **Testing** — Dev/test mode with mock card form, no real funds

**Core modules:**
- **Checkout Pages** — Public payment URLs (`/pay/[id]`), 3 page types, configurable allowed methods
- **Sales** — Transaction ledger for every inbound payment received
- **Seller Profiles** — Per-owner identity powering storefronts (`/s/[slug]`)
- **Invoices** — Full lifecycle: draft → sent → viewed → paid, with email + PDF delivery
- **Payments UI** — Modular handler architecture in `features/agent-shops/payments/`
- **Bot API** — Full parity under `/api/v1/bot/` for checkout pages, sales, seller profile, shop, invoices

**Dashboard pages:** `/checkout/create`, `/shop`, `/sales`, `/invoices`
**Key code:** `features/agent-shops/`, `server/storage/sales.ts`, `features/payment-rails/x402/`

---

## Key Routes
- `/`: Consumer landing page
- `/claim`: Bot claim page
- `/skills`: Vendor procurement skills catalog (public)
- `/solutions/card-wallet`: Card Wallet landing page (public)
- `/solutions/stripe-wallet`: Crypto Wallet landing page (public)
- `/overview`: Dashboard overview
- `/stripe-wallet`: Rail 1 dashboard
- `/card-wallet`: Rail 2 dashboard
- `/sub-agent-cards`: Self-hosted card management (Rail 5)
- `/transactions`: Transaction history, orders, and unified approvals (three tabs)
- `/settings`: Account settings
- `/onboarding`: Guided setup wizard

## External Dependencies
- **Firebase Auth:** User authentication and authorization.
- **PostgreSQL:** Primary application database.
- **Drizzle ORM:** Database interaction.
- **Stripe:** Payment processing for Crypto Onramp.
- **Privy (@privy-io/node):** Server wallet management (Rail 1).
- **viem:** Ethereum utility library (Rail 1).
- **canonicalize:** JSON canonicalization for signatures (Rail 1).
- **CrossMint:** Smart wallet creation, fiat onramp, and commerce orders API (Rail 2).
- **Svix:** Webhook signature verification for CrossMint (Rail 2).
- **SendGrid:** Transactional email services.
- **shadcn/ui:** UI component library.
- **React Query (@tanstack/react-query):** Server state management.
- **Anthropic (@anthropic-ai/sdk):** LLM-powered brand classification for ASX Score Scanner.
- **Perplexity API:** Site audit and evidence gathering for ASX Score Scanner (via sonar-deep-research model).
- **react-markdown + remark-gfm + @tailwindcss/typography:** Markdown rendering for documentation pages.

## Agent Checkout Testing Suite (`features/agent-testing/`)
Standalone module for testing any agent's ability to complete a checkout form with field-level telemetry, multi-dimensional scoring, and persisted reports.

**Architecture:**
- `constants.ts` — field names, limits, timing constants
- `types.ts` — SubmittedValues, FieldEventInput, TestReport, ApprovalInfo types
- `test-card-generator.ts` — generates realistic test card data (Visa BIN, names, zip codes)
- `storage/agent-testing-storage.ts` — Drizzle-based CRUD for `agent_test_sessions` + `agent_test_field_events` tables
- `scoring/` — four scorers (accuracy 40%, completion 30%, speed 15%, efficiency 15%) + `report-generator.ts`
- `hooks/use-checkout-field-tracker.ts` — client-side hook that captures DOM events (focus/blur/input/select/submit_click) and batches them to the events API
- `components/agent-test-report-card.tsx` — rich report visualization with score ring, per-field breakdown, hesitation gaps
- `components/agent-test-progress-indicator.tsx` — real-time progress bar during test execution

**API routes** (`app/api/v1/agent-testing/tests/`):
- `POST /` — create test (generates card, returns test_id + URL + expected values)
- `GET /[testId]` — poll status (fields_filled, total_fields, status, score, grade)
- `POST /[testId]/events` — ingest field events (batched, with expiry + event limit enforcement)
- `POST /[testId]/submit` — submit values + auto-score (returns score/grade)
- `GET /[testId]/report` — full scored report
- `GET /[testId]/detail` — resolve card_test_token from test_id (used by /test-checkout page)
- `GET /by-card/[cardId]` — lookup tests by card (auth required, owner-scoped)

**Full-Shop Test (`features/agent-testing/full-shop/`):**
- `shared/` — types, constants, 9-product catalog, 4 scenario templates, 5 scorers (instruction-following 35%, data-accuracy 25%, flow-completion 20%, speed 10%, nav-efficiency 10%), stage-gate deriver, event narrative builder, report generator
- `server/` — `address-generator.ts` (static pools), `pick-random-scenario.ts` (random template + address + card)
- `client/` — `shop-test-context.tsx` (dual-mode provider), tracker (batched events), poller (adaptive 500ms→2s), state projector
- **Pages** (`app/test-shop/[testId]/`): layout, homepage, search, product/[slug], cart, checkout, payment, confirmation
- **Landing** (`app/agent-test/`): create test, get agent URL + observer URL + instructions
- **Observer mode**: append `?observe=<ownerToken>` to watch agent in real-time; all inputs read-only, state driven by polled events

**Integration points:**
- `/test-checkout` page loads test via `?t=at_xxxx`, renders checkout form, uses field tracker hook
- `testing-handler.tsx` dual-submits to legacy `/pay/testing` + new `/agent-testing/submit`
- `rail5-fulfillment.ts` marks test as approved when approval flow completes
- `test-verification.tsx` (Rail5 wizard step 8) creates agent test, polls status, shows report card

## Testing (`tests/`)
Vitest-based automated test suite. Run with `npx vitest run`. Config in `vitest.config.ts` with `@/` path alias. See `tests/_README.md` for coverage map, guidelines on when/how to add tests, and known gaps. Manual curl-based integration tests are in `tests/manual-api-suite.md`.
