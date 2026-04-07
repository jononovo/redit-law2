# Multi-Tenant Platform — CreditClaw · shopy.sh · brands.sh

## Overview
One codebase, three tenants. The infrastructure layer for AI-powered commerce:

- **CreditClaw** (`creditclaw.com`) — Financial rails for AI agents. Crypto wallet funding (Stripe Onramp), virtual card issuance, spending controls, approval workflows. Agents can't hold bank accounts — CreditClaw bridges that gap.
- **shopy.sh** — Consumer-facing ASX Score scanner and leaderboard. Measures how "agent-friendly" a merchant's website is (0–100). Free scans drive catalog growth.
- **brands.sh** — Developer-facing skill registry. Hosts SKILL.md files that teach agents how to shop at specific stores.

Tenants share the same database, codebase, and deployment. Routing is hostname-based via middleware. See `project_knowledge/_README.md` for full architecture and internal docs.

## Tenant Theming
Each tenant has its own config at `public/tenants/{tenantId}/config.json` (source of truth) and `lib/tenants/tenant-configs.ts` (client bundle). Configs define branding, meta tags, theme tokens, routes, features, and tracking.

- **CreditClaw** — "Fun Consumer" theme: 3D clay/claymation aesthetic, coral lobster mascot, bright pastels (orange/blue/purple), Plus Jakarta Sans, 1rem rounded corners
- **shopy.sh** — Monospace section labels, no rounded corners on cards, no shadows, `gap-px bg-neutral-200` grid dividers, dark sections, green accent in terminal contexts
- **brands.sh** — Skill-registry framing, shared label maps from `lib/procurement-skills/taxonomy/`

When building UI, check which tenant(s) the feature applies to and follow the appropriate design language.

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

**Guardrails** (`lib/guardrails/`) — spending limits (how much). Master-level budget across all rails + per-rail limits per wallet/card. Also owns approval modes.

**Procurement Controls** (`lib/procurement-controls/`) — merchant/domain/category restrictions (where). Fully separated from guardrails.

See `internal_docs/05-agent-interaction/guardrails.md` for enforcement flow, spend aggregation, status filters, approval modes, and procurement control details.

**Webhooks** (`lib/webhooks/`):
- `delivery.ts` — outbound webhook delivery, HMAC-SHA256 signing, retry logic with exponential backoff, and OpenClaw hooks token auth. Exports `fireWebhook()`, `fireRailsUpdated()`, `signPayload()`, `attemptDelivery()`, `retryWebhookDelivery()`, `retryPendingWebhooksForBot()`, `retryAllPendingWebhooks()`.
- `index.ts` — barrel re-exports. Consumers import from `@/lib/webhooks`.
- Types: `WebhookEventType`, `RailsUpdatedAction`.
- Storage layer lives separately at `server/storage/webhooks.ts`.

**Companion & Shipping Files** (bot checkout support):
- **Merged Card File with Metadata** (`lib/card/onboarding-rail5/encrypt.ts`): During Rail 5 card onboarding, the encrypted card file includes plaintext "Card Details" and "Billing Address" sections above the encrypted blob. Contains non-sensitive metadata (first 4 digits, expiry, cardholder name, brand) and billing address. Bots read these sections to fill checkout form fields without decrypting. Single file — no separate companion file. Non-sensitive metadata is also saved to the `rail5_cards` DB table (`cardFirst4`, `expMonth`, `expYear`, `cardholderName`, `billingAddress`, `billingCity`, `billingState`, `billingZip`, `billingCountry`) for pre-filling future cards.
- **Shipping File** (`lib/shipping/`): A central `.creditclaw/shipping.md` file shared across all cards. Generated from the `shipping_addresses` DB table. Auto-pushed to all owner's bots whenever addresses are created, updated, deleted, or default is changed. Bots can also fetch on demand via `GET /api/v1/bot/shipping-addresses`. Default address is marked for bot use at checkout.
- Webhook event: `shipping.addresses.updated` (registered in `WebhookEventType`).

**Bot Messaging System** (`lib/agent-management/bot-messaging/`):
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

**Storage is modularized** under `server/storage/` with domain-grouped files (one per feature area: `rail1.ts`, `rail2.ts`, `rail5.ts`, `brand-index.ts`, `approvals.ts`, `orders.ts`, etc.). `types.ts` defines the `IStorage` interface (single source of truth). `index.ts` composes all fragments into the exported `storage` object. All consumers import from `@/server/storage` unchanged.

**API route paths never change** during modularization — only internal `lib/` imports get rewired. This avoids breaking any external consumers.

## Feature Flags & Access Control
CreditClaw uses a lightweight, database-backed feature flag system for controlling UI visibility and route access.

### Architecture
- **DB Column**: `flags text[] NOT NULL DEFAULT '{}'` on the `owners` table. A user can hold multiple flags simultaneously (e.g., `["admin", "beta"]`).
- **Tier Types**: `lib/feature-flags/tiers.ts` — defines `Tier = "admin" | "beta" | "paid"` with compile-time enforcement.
- **Client Hook**: `lib/feature-flags/use-feature-access.ts` — `useHasAccess(tier)` reads from auth context synchronously. No API calls, no loading states.
- **Auth Flow**: Flags are included in the session response (`GET /api/auth/session` and `POST /api/auth/session`). The `User` interface in `lib/auth/auth-context.tsx` includes `flags: string[]`.
- **Sidebar Integration**: Nav items in `components/dashboard/sidebar.tsx` support an optional `requiredAccess?: Tier` property. Items are filtered out before render — not hidden with CSS.
- **Admin Dashboard**: `/admin123` — server-side protected via `layout.tsx` that calls `getCurrentUser()` and checks for `admin` flag. Returns 404 (not 403) for non-admins. Uses the same sidebar/header layout as the main dashboard.
- **Adding a new flag**: (1) Set it in the user's `flags` array in DB, (2) Tag nav items or routes with `requiredAccess`, (3) Done.

## System Architecture

### Stack
The platform uses Next.js 16 (App Router), Firebase Auth (client/Admin SDK) with httpOnly session cookies, PostgreSQL via Drizzle ORM, Tailwind CSS v4, PostCSS, shadcn/ui for components, and React Query for state management.

### Managed Cloudflare Tunnels
Bots without a `callback_url` get a managed Cloudflare tunnel provisioned at registration. Tunnels route through the `nortonbot.com` domain (configured directly in Cloudflare). Module lives in `lib/webhook-tunnel/` with two layers: `cloudflare.ts` (raw API calls) and `provisioning.ts` (orchestration + defaults). Required secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_ZONE_ID`.
→ Full detail: `project_knowledge/internal_docs/05-agent-interaction/webhook-tunnels.md`

Advanced features:
- **Wallet Freeze:** Owners can freeze bot wallets, preventing transactions.
- **Card Color Persistence:** Each card (Rail 5) stores its own `card_color` (`purple`, `dark`, `blue`, `primary`). New cards get a random color on creation. Users can change it from the card detail page (color picker circles below card visual). `resolveCardColor(color, cardId)` in `components/wallet/types.ts` provides a fallback — if `card_color` is null (e.g. a card created before this feature), it derives a stable color from a hash of the card ID. Card deletion uses the unified endpoint `DELETE /api/v1/cards/:cardId?rail=rail5`.
- **Onboarding & Setup Wizards:** Onboarding wizard (`/onboarding`, 5 steps), Rail 5 setup wizard (`/setup/rail5`, 8+1 steps), and shared wizard typography system (`lib/wizard-typography.ts`). → Full detail: `project_knowledge/internal_docs/07-platform-management/onboarding-wizards.md`

### Multi-Rail Architecture
CreditClaw employs a multi-rail architecture, segmenting payment rails with independent database tables, API routes, and components.
- **Rail 1 (Stripe Wallet):** Uses Privy server wallets on Base chain, USDC funding via Stripe Crypto Onramp, and x402 payment protocol. **Modularized under `lib/rail1/`:**
  - `client.ts` — Privy client singleton, authorization signature helper, app ID/secret getters.
  - `wallet/create.ts` — `createServerWallet()` via Privy walletsService.
  - `wallet/sign.ts` — `signTypedData()` for x402 EIP-712 signing.
  - `wallet/transfer.ts` — `sendUsdcTransfer()` via Privy RPC with ERC-20 calldata.
  - `wallet/balance.ts` — `getOnChainUsdcBalance()` via viem + Base RPC.
  - `onramp.ts` — re-export shim for `createStripeOnrampSession` from `lib/crypto-onramp/stripe-onramp/session.ts`. Uses `stripe.rawRequest()` via the shared Stripe SDK client (the crypto onramp endpoint is not yet in the SDK's typed API, so rawRequest is used with manual typing).
  - `x402.ts` — x402 typed data builders (`buildTransferWithAuthorizationTypedData`, `buildXPaymentHeader`, `generateNonce`) and USDC format helpers (`formatUsdc`, `usdToMicroUsdc`, `microUsdcToUsd`).
  - Webhook: `STRIPE_WEBHOOK_SECRET_ONRAMP` env var, event type `crypto.onramp_session.updated`. Balance sync endpoint: `POST /api/v1/stripe-wallet/balance/sync` with 30-sec cooldown and `reconciliation` transaction type for discrepancies. Schema includes `last_synced_at` column on `privy_wallets`.
- **Rail 2 (Card Wallet):** Uses CrossMint smart wallets on Base chain, USDC funding via fiat onramp, and Amazon/commerce purchases via Orders API. Employs merchant allow/blocklists. **Modularized under `lib/rail2/`:**
  - `client.ts` — shared CrossMint API client (`crossmintFetch`, `getServerApiKey`, format helpers). Handles both API versions: Wallets API (`2025-06-09`) and Orders API (`2022-06-09`).
  - `wallet/create.ts` — `createSmartWallet()` using `evm-fireblocks-custodial` signer.
  - `wallet/balance.ts` — `getWalletBalance()` with balance parsing for old/new response formats.
  - `wallet/transfer.ts` — `sendUsdcTransfer()` for on-chain USDC transfers.
  - `orders/purchase.ts` — re-export shim for `createPurchaseOrder()`, `getOrderStatus()` from `lib/procurement/crossmint-worldstore/purchase.ts`.
  - `orders/onramp.ts` — `createOnrampOrder()` for fiat-to-USDC via checkoutcom-flow.
  - On-chain balance sync via reused `getOnChainUsdcBalance` from `lib/rail1/wallet/balance.ts`. Balance sync endpoint: `POST /api/v1/card-wallet/balance/sync` with 30-sec cooldown and `reconciliation` transaction type for discrepancies. Schema includes `last_synced_at` column on `crossmint_wallets`. Frontend ↻ button on Card Wallet dashboard mirrors Rail 1 pattern.
- **Master Guardrails:** Owner-level, cross-rail spending limits stored in a `master_guardrails` table. These guardrails are checked before per-rail guardrails and aggregate spend across all active rails.
- **Rail 5 (Sub-Agent Cards):** Encrypted card files with plugin-based checkout. Owner encrypts card client-side (AES-256-GCM), CreditClaw stores only the decryption key. At checkout, the bot calls the `creditclaw_fill_card` plugin (or falls back to an ephemeral sub-agent) which gets the key, decrypts, fills card number + CVV, and wipes all sensitive data. **Plugin:** `public/Plugins/OpenClaw/` (`src/index.ts`, `src/decrypt.ts`, `src/fill-card.ts`, `src/api.ts`). **Modularized under `lib/rail5/`:**
  - `index.ts` — core helpers (`generateRail5CardId`, `generateRail5CheckoutId`, `validateKeyMaterial`, `getDailySpendCents`, `getMonthlySpendCents`, `buildSpawnPayload`, `buildCheckoutSteps`) + test checkout constants (`RAIL5_TEST_CHECKOUT_PAGE_ID`, `RAIL5_TEST_CHECKOUT_URL`).
  - `decrypt-script.ts` — static `DECRYPT_SCRIPT` constant (~10-line AES-256-GCM Node.js script) with marker-based regex (`ENCRYPTED_CARD_START/END`) for extracting data from combined files. Falls back to code-fence matching for old-format files.
  - **Card status progression:** `pending_setup` → `pending_delivery` (key submitted) → `confirmed` (bot confirmed file delivery via `POST /bot/rail5/confirm-delivery`) → `active` (first successful checkout completed). `frozen` can be set by owner on `confirmed` or `active` cards; unfreezing restores to `confirmed` or `active` based on checkout history.
  - **Dual execution modes:** Checkout endpoint returns both `checkout_steps` (array of instructions for direct mode) and `spawn_payload` (spawn wrapper for sub-agent mode). Bot chooses which to use.
  - DB tables: `rail5_cards`, `rail5_checkouts`. Owner API: `/api/v1/rail5/{initialize,submit-key,cards,deliver-to-bot,cards/[cardId]/delivery-status}`. Bot API: `/api/v1/bot/rail5/{checkout,key,confirm,confirm-delivery}`. Dashboard: `/sub-agent-cards`. Setup wizard: 9-step (Name→HowItWorks→VisualCardEntry→BillingAddress→Limits→LinkBot→Encrypt&Send→DeliveryResult→TestVerification) with Web Crypto encryption. Card brand is auto-detected from BIN prefix via shared `lib/card/card-brand.ts` utility (Visa/MC/Amex/Discover/JCB/Diners); sent to server during submit-key.
  - **File delivery via `sendToBot()`**: Encryption step calls `POST /api/v1/bot-messages/send` which tries webhook first, falls back to staging a pending message. Combined self-contained markdown file format with `DECRYPT_SCRIPT_START/END` and `ENCRYPTED_CARD_START/END` markers. Backup download always happens.
  - **Delivery result step**: Shows live status (webhook delivered / waiting for bot / confirmed). 1-minute polling every 5s via `GET /rail5/cards/[cardId]/delivery-status`. Share buttons (Copy, Telegram, Discord) for relay message. Collapsible "For AI Agents" section with re-download option. **Phase 2: Test purchase verification** — after bot confirms delivery, polls `GET /rail5/cards/[cardId]/test-purchase-status` for 3 minutes. Server returns submitted card details from the test sale; client compares field-by-field against `savedCardDetails` (preserved in browser memory before input clearing). Shows green checkmarks (match) or red X (mismatch) per field. Confirm-delivery endpoint returns real `test_checkout_url` and `test_instructions` directing bot to sandbox checkout with "testing" payment method.
  - Unified `rails.updated` webhook fires across ALL rails on bot link/unlink/freeze/unfreeze/wallet create with `action`, `rail`, `card_id`/`wallet_id`, `bot_id` in payload. Wired up in: Rail 1 (create, freeze), Rail 2 (create, freeze), Rail 5 (PATCH cards).
- **Card UI Module (`lib/card/`):** Shared card component library designed for consistent card visuals across the platform.
  - `card-brand.ts` — brand detection from BIN prefix, formatting, max digits, placeholders. Re-exported from `lib/card-brand.ts` for backward compatibility.
  - `brand-logo.tsx` — visual brand logo component (Visa/MC/Amex/Discover/JCB/Diners).
  - `cipher-effects.tsx` — `useCipherScramble` hook for encryption scramble animations.
  - `hooks.ts` — `useTemporaryValid` hook (5-second green validation flash), `CardFieldErrors` interface.
  - `card.css` — shared CSS for card field states (`.card-field`, `.card-field-valid`, `.card-field-error`, `.card-field-focused`).
  - `index.ts` — barrel re-export for shared utilities.
  - `onboarding-rail5/` — Rail 5-specific card onboarding:
    - `interactive-card.tsx` — editable visual card component with cipher scramble, field validation, brand detection.
    - `encrypt.ts` — client-side AES-256-GCM encryption (`encryptCardDetails`, `buildEncryptedCardFile`, `downloadEncryptedFile`). Re-exported from `lib/rail5/encrypt.ts` for backward compatibility.

### Inter-Wallet Transfers
CreditClaw supports USDC transfers between wallets across all rails and to external addresses.
- **API Endpoint:** `POST /api/v1/wallet/transfer` (authenticated, owner-only)
- **Transfer Tiers:** Same-rail (Privy→Privy, CrossMint→CrossMint), Cross-rail (Privy↔CrossMint), External (to any 0x address)
- **Guardrail Enforcement:** Transfers are subject to per-wallet guardrails (per-tx limit, daily/monthly budgets) via `evaluateGuardrails`
- **On-chain Execution:** Privy wallets use REST API (`POST /v1/wallets/{id}/rpc` with ERC-20 transfer calldata, gas sponsored); CrossMint wallets use token transfer endpoint (`POST /wallets/{locator}/tokens/base:usdc/transfers`)
- **Atomic DB Updates:** Source debit, destination credit, and transaction ledger entries are wrapped in a single Drizzle `db.transaction()` for consistency
- **Transaction Type:** `"transfer"` with metadata containing `direction` ("inbound"/"outbound"), `transfer_tier`, `counterparty_address`, `counterparty_wallet_id`, `counterparty_rail`, `tx_hash`
- **Frontend:** Transfer button on both Stripe Wallet and Card Wallet pages, dialog with destination picker (own wallets across both rails or external address), amount input in USD
- **Lib Functions:** `sendUsdcTransfer` in `lib/rail1/wallet/transfer.ts` (Privy) and `lib/rail2/wallet/transfer.ts` (CrossMint)

### Transaction Ledger — `balance_after` Column
All transaction tables (`transactions`, `privy_transactions`, `crossmint_transactions`, `rail5_checkouts`) have a nullable `balance_after` column that records the wallet's balance at the time the transaction was created. No calculations — just stores whatever the DB balance is at that moment. For reconciliation, it stores the on-chain balance. For pending x402 payments, it stores the current (unchanged) DB balance. The real balance drop shows when reconciliation runs. All owner-facing and bot-facing transaction list APIs include `balance_after` / `balance_after_display` in responses. Frontend ledger tables show a "Balance" column.

### Skill Variants System
A config-driven build system at `skill-variants/` (project root) that generates variant skill packages from the master files in `public/`. Each variant has its own independent `variant.config.json` defining overrides.

**Structure:**
- `skill-variants/<name>/variant.config.json` — config with frontmatter overrides, URL prefix, title override, optional extra files
- `skill-variants/<name>/dist/` — generated output (gitignored)
- Master source: `public/` (skill.md, skill.json, heartbeat.md, and all supporting .md files)

**Config fields:** `source` (master dir), `urlPrefix` (rewrites all file URLs), `overrides` (frontmatter patches), `skillJsonOverrides` (skill.json patches), `titleOverride` (H1 heading), `extraFiles` (optional additional files from variant folder)

**Build:** `npx tsx skill-variants/build-variants.ts` — scans all variant folders, copies master files, patches frontmatter/URLs/skill.json, auto-generates Skill Files table and install commands, outputs to dist/.

**Current variants:** stripe, creditcard

**CI/CD:** GitHub Actions workflow for auto-publishing to ClawHub lives at `skill-variants/publish-skills.yml` (reference copy). Must be manually copied to `.github/workflows/publish-skills.yml` on the GitHub side — the `.github/` folder is not managed by Replit to avoid sync conflicts. See `skill-variants/DEPLOYMENT.md` for full setup instructions.

### Brands & Skills System

The platform's growth engine. A single automated pipeline that scans merchant domains, scores their AI-readiness, classifies them into a taxonomy, generates per-merchant shopping skills, and stores everything in a central Brand Index. This system spans architecture modules 1–3 (Agentic Shopping Score, Agent Shopping Skills, Brands Index) which work as one pipeline.

→ Full system overview: `project_knowledge/internal_docs/01-brands-skills-system/_overview.md`

**Pipeline:** Domain submitted → classifyBrand + auditSite (parallel Perplexity calls) → computeScoreFromRubric → buildVendorSkillDraft → generateVendorSkill (SKILL.md) → upsertBrandIndex → resolveProductCategories (sequential Perplexity call). Three Perplexity calls per scan, each independently fail-safe.

**Entry points:** `POST /api/v1/scan` (public, user-triggered) and `lib/scan-queue/process-next.ts` (background queue worker). Both run the identical pipeline.

#### Brand Index

`brand_index` table (`server/storage/brand-index.ts`) — sole source of truth for all brand data. One row per domain, ~85 columns. All surfaces read from it:
- Catalog UI: `/skills` (SSR + client filtering), `/skills/[vendor]` (SSR detail), `/c/[sector]` (sector pages)
- Bot API: `GET /api/v1/bot/skills` (agent-facing catalog search)
- Skill serving: `GET /brands/{slug}/skill` (SKILL.md), `GET /brands/{slug}/skill-json` (skill.json)
- Recommend API: `POST /api/v1/recommend` (structured) and `GET /api/v1/recommend?q=...` (natural language)
- Public API: `GET /api/v1/brands/[slug]`
- Internal API: `GET /api/internal/brands/search`, `GET /api/internal/brands/[slug]`

Key columns: `domain` (unique, dedup key), `slug` (URL routing), `sector`, `brand_type`, `tier`, `maturity`, `overallScore` (0–100), `scoreBreakdown` (JSONB), `brandData` (full VendorSkill JSONB), `skillMd` (generated markdown), `search_vector` (tsvector with trigger), rating columns (`axsRating`, `ratingCount`, sub-ratings). 22+ indexes.

Storage methods: `searchBrands` (with `lite` mode for catalog cards), `searchBrandsCount`, `getBrandById`, `getBrandBySlug`, `getBrandByDomain`, `getRetailersForBrand`, `upsertBrandIndex`, `getAllBrandFacets` (10-min cache, auto-invalidated on upsert).

Maturity progression: `draft` → `community` (auto-promoted when score + skillMd + brandData present) → `official` (brand claimed) → `verified` (CreditClaw audited). `resolveMaturity()` in `lib/agentic-score/scan-utils.ts` never demotes.

#### ASX Score Engine

`lib/agentic-score/` — evaluates merchant AI-readiness. 11 signals, 3 pillars, 100 points:
- **Clarity** (35 pts): JSON-LD (15), Product Feed/Sitemap (10), Agent Metadata (10)
- **Discoverability** (30 pts): Search API/MCP (10), Site Search (10), Page Load (5), Product Page Quality (5)
- **Reliability** (35 pts): Access & Auth (10), Order Management (10), Checkout Flow (10), Bot Tolerance (5)

Key files: `rubric.ts` (scoring rubric), `scoring-engine.ts` (deterministic scorer), `agent-scan.ts` (multi-page Claude scanner), `classify-brand.ts` (Perplexity classification), `audit-site.ts` (Perplexity site audit), `fetch.ts` (parallel fetcher + domain normalization).

#### Taxonomy & Classification

`lib/procurement-skills/taxonomy/` — each concern is its own file with type definition + label map:
- **28 sectors** (21 Google Product Taxonomy roots + 7 custom). 26 assignable; `luxury` is tier-driven, `multi-sector` is set programmatically for department stores/supermarkets/mega merchants.
- **7 tiers**: commodity → ultra_luxury
- **8 brand types**: brand, retailer, marketplace, chain, independent, department_store, supermarket, mega_merchant. Brand type controls category resolution depth.
- **8 capabilities**: guest_checkout, po_number, tax_exempt, bulk_pricing, api_ordering, subscription, wishlist, price_match
- Also: checkout methods, checkout providers, payment methods, ordering permissions, maturity levels

Core types in `lib/procurement-skills/types.ts` — re-exports all taxonomy types, defines `VendorSkill`, `SearchDiscovery`, `BuyingConfig`, `DealsConfig`, `TaxonomyConfig`, `MethodConfig`.

Product categories: 5,638 entries in `product_categories` table (5,595 Google + 43 custom, seeded by `scripts/seed-google-taxonomy.ts`). Category resolution maps brands to taxonomy IDs via `brand_categories` junction table.

#### Skill Generation & Serving

`lib/procurement-skills/generator.ts` — `generateVendorSkill()` converts VendorSkill objects into SKILL.md markdown (frontmatter, overview, search instructions, checkout flow, tips, known issues).

`lib/procurement-skills/skill-json.ts` — `buildSkillJson()` produces machine-readable JSON (identity, taxonomy, scoring, access, checkout, shipping, loyalty).

Served at: `GET /brands/{slug}/skill` (text/markdown, 24h cache) and `GET /brands/{slug}/skill-json` (application/json, 24h cache).

#### Merchant Discovery (Recommend API)

`app/api/v1/recommend/route.ts` — three-stage pipeline for agent queries:
1. **Category Resolution** — Perplexity Sonar extracts intent → FTS against `category_keywords` → top 5 categories
2. **Merchant Ranking** — recursive CTE over `brand_categories` + `brand_index` → ranked by brand match → match depth → ASX score
3. **Product Search** — pgvector cosine similarity against `product_listings` → top 3 per merchant

Product listings: `VECTOR(384)` column, `Xenova/all-MiniLM-L6-v2` embeddings, IVFFlat index. Ingestion via Shopify JSON, Firecrawl batch, Google Shopping XML, or weekly refresh scripts.

#### Scan Queue

`lib/scan-queue/`, admin page at `/admin123/scan-queue` — batch scanning with server-side scheduler:
- Processes one domain every 17 minutes, auto-stops after 3 days, pauses during quiet hours
- `scan_queue` table with `FOR UPDATE SKIP LOCKED` atomic claim, stale recovery (30 min timeout)
- Same pipeline as public scan API

#### Brand Claims

`brand_claims` table, `lib/brand-claims/` — self-service ownership verification:
- Auto-verify if email domain matches brand domain; manual review otherwise
- Upgrades maturity to `official` on verify, reverts to `community` on revoke
- Free email blocklist (Gmail, Yahoo, etc.)
- Admin review queue at `/admin123/brand-claims`

#### Brand Feedback

`brand_feedback` table — agents and humans rate brands (search accuracy, stock reliability, checkout completion):
- Weighted 90-day rolling average (source weights: human=2.0, agent=1.0, anonymous=0.5)
- Published at 5+ weighted events → updates `axsRating` on brand_index
- `POST /api/v1/bot/skills/[vendor]/feedback`, rate limited: 1 per brand per bot per hour

#### Catalog UI

Hybrid SSR: `app/skills/page.tsx` (server component, initial fetch) + `app/skills/catalog-client.tsx` (client, filtering/pagination). `VendorCard` in `app/skills/vendor-card.tsx` shared across catalog and sector pages. Detail pages at `app/skills/[vendor]/page.tsx` (SSR for SEO) with claim button, skill preview, and copy URL components. Sector landing pages at `app/c/[sector]/page.tsx`. Sitemap includes all brand pages and populated sector pages.


### Unified Approval System
`unified_approvals` is the **sole source of truth** for all approval state across all rails. The old `privy_approvals` and `crossmint_approvals` tables have been dropped. All approval reads, writes, and decisions go through this single table.

**Architecture:**
- **Service** (`lib/approvals/service.ts`): `createApproval()` generates HMAC-signed approval links, stores in `unified_approvals` table, sends branded email. `resolveApproval()` verifies HMAC, checks expiry, updates status, dispatches rail-specific callbacks.
- **Email** (`lib/approvals/email.ts`): Single `sendApprovalEmail()` with CreditClaw-branded HTML template, rail badge, and magic-link button.
- **Callbacks** (`lib/approvals/callbacks.ts`): Thin loader that imports the four rail-specific fulfillment modules below.
- **Rail 1 Fulfillment** (`lib/approvals/rail1-fulfillment.ts`): `railRef` = privy_transaction ID. On approve: updates tx status, creates order. On deny: marks tx failed.
- **Rail 2 Fulfillment** (`lib/approvals/rail2-fulfillment.ts`): `railRef` = crossmint_transaction ID. On approve: looks up tx, creates purchase order via CrossMint, records order, fires webhook. On deny: marks tx failed, fires webhook.
- **Rail 5 Fulfillment** (`lib/approvals/rail5-fulfillment.ts`): Approval/denial handlers for sub-agent checkouts (status updates, webhook firing) + self-registers.
- **Lifecycle** (`lib/approvals/lifecycle.ts`): TTL constants per rail (Rail 1 polling: 5min, Rail 1 email: 10min, Rails 2/5: 15min).
- **Landing Page** (`app/api/v1/approvals/confirm/[approvalId]/route.ts`): GET renders branded approval page with approve/deny buttons; POST processes the decision via `resolveApproval()`. Single entry point for email-based approvals across all rails.

**Centralized Dashboard API** (used by ALL rail dashboard pages):
- `GET /api/v1/approvals?rail=<rail>` — returns pending unified approvals for the authenticated owner, filtered by rail. Extracts rail-specific display fields from `metadata` JSONB (Rail 1: `resource_url`; Rail 2: `product_name`, `shipping_address`).
- `POST /api/v1/approvals/decide` — accepts `{ approval_id, decision }` (approval_id is the `ua_...` string), verifies ownership, calls `resolveApproval()` with stored HMAC token.
- All rail dashboard pages (Stripe Wallet, Card Wallet, Sub-Agent Cards) use these centralized endpoints. No rail-specific approval endpoints remain.

**Metadata JSONB**: Rail-specific display data is stored in the `metadata` column of `unified_approvals` when checkout routes call `createApproval()`:
- Rail 1: `{ recipient_address, resource_url }`
- Rail 2: `{ productLocator, product_name, quantity, shipping_address }`
- Rail 5: checkout details

**Storage**: `server/storage/approvals.ts` — `createUnifiedApproval`, `getUnifiedApprovalById`, `getUnifiedApprovalByRailRef`, `decideUnifiedApproval`, `closeUnifiedApprovalByRailRef`, `getUnifiedApprovalsByOwnerUid`.
- **DB Table**: `unified_approvals` with columns: id, approvalId, rail, ownerUid, ownerEmail, botName, amountDisplay, amountRaw, merchantName, itemName, hmacToken, status, expiresAt, decidedAt, railRef, metadata, createdAt.
- **Env Vars**: `UNIFIED_APPROVAL_HMAC_SECRET` (falls back to `HMAC_SECRET` or default).
- **Dropped Tables**: `privy_approvals` and `crossmint_approvals` have been removed from schema and dropped from the database.

### Central Orders (`lib/orders/`, `server/storage/orders.ts`)
Unified cross-rail order tracking for all vendor purchases. Every confirmed purchase across all rails creates a row in the `orders` table.
- **Schema**: `orders` table in `shared/schema.ts` with columns for product info (name, image, URL, description, SKU), vendor (name, details JSONB), pricing (price_cents, taxes_cents, shipping_price_cents, currency), shipping (address, type, note), tracking (carrier, number, URL, estimated_delivery), and references (owner_uid, rail, bot_id, wallet_id/card_id, transaction_id, external_order_id).
- **Storage**: `server/storage/orders.ts` — CRUD methods: `createOrder`, `getOrderById`, `getOrderByExternalId`, `getOrdersByOwner` (with filters: rail, botId, walletId, cardId, status, dateFrom, dateTo), `getOrdersByWallet`, `getOrdersByCard`, `updateOrder`.
- **Order creation module**: `lib/orders/create.ts` exports `recordOrder()` — single entry point all rails call after a confirmed purchase. `lib/orders/types.ts` defines `OrderInput` interface.
- **Rail wiring** (order creation fires ONLY after confirmed execution, never on pending requests):
  - Rail 1: `lib/approvals/rail1-fulfillment.ts` (approved) + `app/api/v1/stripe-wallet/bot/sign/route.ts` (auto-approved)
  - Rail 2: `lib/approvals/rail2-fulfillment.ts` (approved) + `app/api/v1/card-wallet/bot/purchase/route.ts` (auto-approved). Webhooks update order via `storage.getOrderByExternalId()` + `storage.updateOrder()`.
  - Rail 5: `lib/approvals/rail5-fulfillment.ts` (approved) + `app/api/v1/bot/rail5/checkout/route.ts` (auto-approved)
- **API**: `GET /api/v1/orders` (list with query filters), `GET /api/v1/orders/[order_id]` (single order detail). Owner-authenticated.
- **Pages**: `/orders` (main orders list with cross-rail filters: rail, bot, status, date range), `/orders/[order_id]` (order detail page with product image, timeline, price breakdown, shipping/tracking).
- **Rail tabs**: All 4 rail pages' Orders tabs now query the central `GET /api/v1/orders?rail=X` endpoint. Clicking an order navigates to `/orders/[order_id]`.
- **Sidebar**: Orders link added to dashboard sidebar.

### Sales & Checkout (`server/storage/sales.ts`, `app/pay/`)
Turns every CreditClaw wallet holder into a seller. Checkout pages are public URLs where anyone can pay (card/bank via Stripe onramp, USDC direct, or x402 wallet). The inverse of Orders — Orders track what you bought, Sales track what someone bought from you.
- **Schema**: `checkout_pages` table (id, checkoutPageId, ownerUid, walletId, walletAddress, title, description, amountUsdc, amountLocked, allowedMethods, status, successUrl, successMessage, metadata, viewCount, paymentCount, totalReceivedUsdc, expiresAt, digitalProductUrl). Page types: `"product"`, `"event"`, `"digital_product"`. Digital product pages store a `digital_product_url` that is delivered to the bot after successful x402 payment (never exposed in the 402 requirements). Seller identity is always sourced from the seller profile (no per-page overrides). `sales` table (saleId, checkoutPageId, ownerUid, amountUsdc, paymentMethod, status, buyerType, buyerIdentifier, buyerIp, buyerUserAgent, buyerEmail, txHash, stripeOnrampSessionId, privyTransactionId, checkoutTitle, checkoutDescription, confirmedAt, invoiceId).
- **Storage**: `server/storage/sales.ts` — CRUD for both tables: `createCheckoutPage`, `getCheckoutPageById`, `getCheckoutPagesByOwnerUid`, `updateCheckoutPage`, `archiveCheckoutPage`, `createSale`, `getSaleById`, `getSalesByOwnerUid`, `getSalesByCheckoutPageId`, `updateSaleStatus`, `incrementCheckoutPageStats`, `incrementCheckoutPageViewCount`.
- **Owner API**: `POST/GET /api/v1/checkout-pages` (create/list), `GET/PATCH/DELETE /api/v1/checkout-pages/[id]` (detail/update/archive), `GET /api/v1/sales` (list with filters), `GET /api/v1/sales/[sale_id]` (detail).
- **Bot API**: `POST /api/v1/bot/checkout-pages/create` (create), `GET /api/v1/bot/checkout-pages` (list), `GET/PATCH /api/v1/bot/checkout-pages/[id]` (detail/update), `GET /api/v1/bot/sales` (list with filters). All use `withBotApi` middleware. Bot create/update schemas support `shop_visible` and `shop_order` for storefront management.
- **Public endpoints**: `GET /api/v1/checkout/[id]/public` (fetch config + seller info via 2-tier fallback: seller profile → bot name/email, increments view count), `POST /api/v1/checkout/[id]/pay/stripe-onramp` (create Stripe session, supports `invoice_ref` for server-authoritative invoice amount), `GET /api/v1/checkout/[id]/x402` (returns 402 Payment Required with x402 payment requirements — amount, recipient wallet, token, chain), `POST /api/v1/checkout/[id]/pay/x402` (settles an x402 payment — parses `X-PAYMENT` header, validates signature params, calls `transferWithAuthorization` on-chain via seller's Privy wallet, credits balance, records sale, fires webhook).
- **x402 Receive Module** (`lib/x402/`):
  - `receive.ts` — `parseXPaymentHeader()` (base64→JSON), `validateX402Payment()` (checks chain, token, recipient, expiry, amount), `settleX402Payment()` (encodes `transferWithAuthorization` calldata, submits via Privy RPC with gas sponsorship), `splitSignature()` (compact sig → v/r/s).
  - `checkout.ts` — `creditWalletFromX402()` (wallet balance increment + transaction record), `recordX402Sale()` (sale creation with `x402Nonce` for idempotent retries, amount mismatch detection, invoice linking, `wallet.sale.completed` webhook).
  - This makes CreditClaw both an x402 **payer** (via `/bot/sign`) and x402 **receiver** (via checkout pages). Enables bot-to-bot commerce where one CreditClaw bot creates a checkout page and another pays it programmatically.
- **Checkout Page**: `/pay/[id]` — split-panel layout (dark left panel with seller info / white right panel with embedded Stripe widget). Supports `?ref=INV-XXXX` query param for invoice payments — fetches invoice data, shows line items and totals on left panel, locks amount server-side.
- **Pages**: `/checkout/create` (create + manage checkout pages), `/sales` (sales ledger with clickable rows), `/sales/[sale_id]` (sale detail page), `/pay/[id]` (public checkout page), `/pay/[id]/success` (post-payment confirmation).
- **Webhook**: `wallet.sale.completed` event fired to seller's bot after confirmed sale via `fireWebhook()`. Includes `invoice_id` and `invoice_ref` when payment was for an invoice.
- **Invoice linking**: Webhook handler checks for `metadata.invoice_ref`, looks up invoice, verifies checkout page match and payable status, links sale to invoice and marks invoice as paid.
- **Skill file**: `public/MY-STORE.md` — bot-readable instructions for creating checkout pages, viewing sales, and managing invoices.
- **Sidebar**: "Sales" section with "Create Checkout", "Shop", "My Sales", and "Invoices" links.

### Seller Profiles (`server/storage/seller-profiles.ts`)
Per-owner seller identity used across all checkout pages, invoices, and the public storefront.
- **Schema**: `seller_profiles` table (id, ownerUid unique, businessName, logoUrl, contactEmail, websiteUrl, description, slug unique, shopPublished, shopBannerUrl, createdAt, updatedAt).
- **Storage**: `server/storage/seller-profiles.ts` — `getSellerProfileByOwnerUid`, `getSellerProfileBySlug`, `upsertSellerProfile`.
- **Owner API**: `GET/PUT /api/v1/seller-profile` — get or upsert seller profile (including slug, shop_published, shop_banner_url, business_name, logo_url, contact_email, website_url, description). Slug uniqueness enforced at API level.
- **Bot API**: `GET/PATCH /api/v1/bot/seller-profile` — bots can read and update their seller profile (business_name, slug, description, logo_url, shop_banner_url, shop_published). Enables bots to self-service shop setup without owner dashboard.
- **Public checkout fallback chain**: seller profile → bot name/owner email (no per-page overrides).
- **Page**: Seller identity fields are consolidated into the **Shop** page (`/shop`) under "Your Details". The old `/settings/seller` route redirects to `/shop`.

### Shop (`app/s/[slug]`, `app/(dashboard)/shop`)
Public storefront for sellers, built on top of existing checkout pages.
- **Schema extensions**: `checkout_pages` gains `pageType` (product/event), `shopVisible`, `shopOrder`, `imageUrl`, `collectBuyerName`. `sales` gains `buyerName`.
- **Storage**: `getShopPagesByOwnerUid` (active + shopVisible pages sorted by shopOrder), `getBuyerCountForCheckoutPage` (confirmed sales count), `getBuyerNamesForCheckoutPage` (buyer names from confirmed sales).
- **Public API**: `GET /api/v1/shop/[slug]` — returns seller profile + visible checkout pages with buyer counts for events. 404 if shop not published.
- **Public API**: `GET /api/v1/checkout/[id]/buyers` — returns buyer count + names for event pages only.
- **Public page**: `/s/[slug]` — storefront with seller info, product grid (image, title, description, price, buyer count for events), links to `/pay/[id]`.
- **Checkout page updates**: `/pay/[id]` shows buyer name input when `collectBuyerName` is true, shows "X people bought this" for event pages. Buyer name passed to Stripe metadata and stored on sale record.
- **Admin page**: `/shop` — configure shop slug, publish toggle, banner URL, toggle which checkout pages appear in shop.
- **Create checkout form**: `/checkout/create` now includes page type (product/event), image URL, and collect buyer name toggle.
- **Bot API**: `GET /api/v1/bot/shop` — returns shop config + all checkout pages. `POST /api/v1/bot/checkout-pages/create` accepts `page_type`, `image_url`, `collect_buyer_name`, `shop_visible`, `shop_order`. `PATCH /api/v1/bot/checkout-pages/[id]` supports all update fields. `GET/PATCH /api/v1/bot/seller-profile` enables full self-service shop setup.
- **Sidebar**: "Shop" link added to Sales section.

### Invoicing (`server/storage/invoices.ts`)
Full invoicing system — create, send, track, and collect payment on invoices tied to checkout pages.
- **Schema**: `invoices` table (invoiceId, ownerUid, checkoutPageId, referenceNumber unique, recipientName, recipientEmail, lineItems JSONB, subtotalUsdc, taxUsdc, totalUsdc, dueDate, notes, status [draft/sent/viewed/paid/cancelled], pdfUrl, paymentUrl, paidAt, paidSaleId, sentAt, viewedAt, cancelledAt, createdAt, updatedAt).
- **Storage**: `server/storage/invoices.ts` — full CRUD: `createInvoice`, `getInvoiceById`, `getInvoiceByReferenceNumber`, `getInvoicesByOwnerUid` (with filters), `getInvoicesByCheckoutPageId`, `updateInvoice`, `markInvoiceSent`, `markInvoiceViewed`, `markInvoicePaid`, `cancelInvoice`, `getNextReferenceNumber`.
- **Owner API**: `POST/GET /api/v1/invoices` (create/list), `GET/PATCH /api/v1/invoices/[id]` (detail/update draft), `POST /api/v1/invoices/[id]/send` (mark sent + email + PDF), `POST /api/v1/invoices/[id]/cancel`.
- **Public API**: `GET /api/v1/invoices/by-ref/[ref]` — returns display-safe fields only (no internal IDs or owner data).
- **Bot API**: `POST /api/v1/bot/invoices/create` (10/hr), `GET /api/v1/bot/invoices` (12/hr), `POST /api/v1/bot/invoices/[id]/send` (5/hr).
- **Email & PDF**: `lib/invoice-email.ts` (HTML email with SendGrid + PDF attachment), `lib/invoice-pdf.ts` (server-side PDF generation via `pdf-lib`).
- **Pages**: `/invoices` (list with filters), `/invoices/create` (create form with line items repeater), `/invoices/[invoice_id]` (detail with status timeline, actions).

### Crypto Onramp (`lib/crypto-onramp/`) — Server-Side Only
Server-side Stripe Crypto Onramp logic. Client-side UI is now in `lib/payments/`. Legacy client components retained with `-legacy` suffix for reference.
- **`types.ts`** — `WalletTarget`, `OnrampSessionResult`, `OnrampWebhookEvent`, `OnrampProvider`
- **`stripe-onramp/session.ts`** — `createStripeOnrampSession()` — creates Stripe Crypto Onramp session for any wallet address (still used by API routes)
- **`stripe-onramp/webhook.ts`** — `parseStripeOnrampEvent()` + `handleStripeOnrampFulfillment()` — still used by webhook route
- **`stripe-onramp/types.ts`** — Stripe-specific payload types

### Payments UI (`lib/payments/`)
Modular client-side payment method selection and execution for both wallet top-ups and checkout pages. Each payment method is a fully self-contained handler component. Pages provide a `PaymentContext` and render either `FundWalletSheet` (top-up) or `CheckoutPaymentPanel` (checkout) — they never touch SDK details.
- **`types.ts`** — `PaymentContext` (mode, rail, amount, walletAddress, etc.), `PaymentResult`, `PaymentMethodDef`, `PaymentHandlerProps`
- **`methods.ts`** — `PAYMENT_METHODS` registry + `getAvailableMethods(rail, mode, allowedMethods?)` — filters by rail/mode/allowedMethods
- **`handlers/stripe-onramp-handler.tsx`** — Self-contained Stripe handler: creates session via API (different endpoint per mode), loads Stripe SDK, mounts widget via `waitForRef()` rAF loop, handles `fulfillment_complete`, fallback to `redirect_url`
- **`handlers/base-pay-handler.tsx`** — Self-contained Base Pay handler: calls `pay()` from `@base-org/account` (popup), verifies via backend (different endpoint per mode), reports success/error
- **`handlers/testing-handler.tsx`** — Self-contained Testing handler (checkout only): renders a plain card form (number, expiry, CVV, name, billing address) with no validation. Submits to `POST /api/v1/checkout/[id]/pay/testing`. Creates a sale with `paymentMethod: "testing"`, `status: "test"`, card details in `metadata` JSONB. No wallet updates. Increments checkout page stats normally. Available to all users but not enabled by default — must be toggled on per checkout page.
- **`handlers/qr-wallet-handler.tsx`** — Self-contained QR/copy-paste handler (topup only): creates QR payment via API, renders QR code (EIP-681 URI) + copy-paste address + network warning. Auto-polls every 5s for 90s, then shows manual "Check Payment" button with 5s cooldown. Credits whatever amount arrives on-chain.
- **`components/payment-method-selector.tsx`** — Renders vertical list of payment method buttons with amount, label, subtitle
- **`components/fund-wallet-sheet.tsx`** — Sheet wrapper for top-ups: amount input → method selection → handler rendering. Used by stripe-wallet page (Rail 1). Ready for card-wallet page (Rail 2) with rail-specific method filtering.
- **`components/checkout-payment-panel.tsx`** — Right panel for checkout pages: amount display/input → method selection → handler rendering. Replaces inline Stripe logic from `/pay/[id]`. Supports `allowedMethods` filtering from checkout page config. Single-method pages auto-select (no selector shown). State machine: select → paying → error (with retry).
- **Design principle**: Each handler is independent — no shared base class, no shared hooks. One handler can't break another. Adding a new method = new handler file + entry in `methods.ts`.
- **Checkout page refactor**: `app/pay/[id]/page.tsx` is now a thin shell (~280 lines, down from ~550) — handles data fetching, layout, and context building. All payment logic delegated to `CheckoutPaymentPanel`.

### Base Pay Backend (`lib/base-pay/`)
Server-side Base Pay verification and ledger logic (Phase 1).
- **`types.ts`** — `BasePayVerifyInput`, `BasePayVerifyResult`, `BasePayCheckoutInput`
- **`verify.ts`** — RPC verification via `getPaymentStatus()`, recipient/amount check. For top-ups, amount mismatch is logged as a warning but not rejected (credits whatever actually arrived). Recipient must still match.
- **`ledger.ts`** — `creditWalletFromBasePay()` — race-safe wallet crediting (insert pending record first, credit second)
- **`sale.ts`** — `recordBasePaySale()` — sale recording for checkout (mirrors Stripe flow exactly)
- **Storage**: `server/storage/base-pay.ts` — `createBasePayPayment`, `getBasePayPaymentByTxId`, `updateBasePayPaymentStatus`
- **API routes**: `POST /api/v1/base-pay/verify` (authenticated top-up), `POST /api/v1/checkout/[id]/pay/base-pay` (public checkout)

### QR Pay Backend (`lib/qr-pay/`)
Server-side QR/copy-paste crypto top-up logic (Phase 3). Credits whatever USDC amount arrives on-chain — no amount enforcement.
- **`types.ts`** — `QrPayCreateInput`, `QrPayCreateResult`, `QrPayStatusResult`
- **`eip681.ts`** — `buildEip681Uri()` — builds EIP-681 URI for USDC transfer on Base (chain 8453, contract `0x833589...`)
- **`ledger.ts`** — `creditWalletFromQrPay()` — fully transactional (single `db.transaction()` wrapping confirm + wallet update + transaction insert). Atomic `WHERE status = 'waiting'` prevents double-crediting.
- **Schema**: `qr_payments` table (paymentId unique, ownerUid, walletAddress, amountUsdc, eip681Uri, balanceBefore, creditedUsdc, status [waiting/confirmed/expired], createdAt, confirmedAt, expiresAt [60-min TTL])
- **Storage**: `server/storage/qr-pay.ts` — `createQrPayment`, `getQrPaymentById`, `confirmQrPayment`, `expireQrPayment`, `expireWaitingQrPaymentsForWallet`
- **API routes**: `POST /api/v1/qr-pay/create` (authenticated, snapshots balanceBefore, generates EIP-681 URI, expires any existing waiting payments for the same wallet), `GET /api/v1/qr-pay/status/[paymentId]` (authenticated, polls on-chain balance, credits delta if > 0)
- **Concurrent session safety**: Creating a new QR payment expires all existing "waiting" payments for that wallet (prevents balance-delta over-crediting)

### Procurement (`lib/procurement/`)
Standalone module for spending USDC on products/services. Provider-agnostic structure — CrossMint WorldStore is the first provider.
- **`types.ts`** — `PurchaseRequest`, `PurchaseResult`, `ShippingAddress`, `ProcurementProvider`, `OrderStatusResult`
- **`crossmint-worldstore/client.ts`** — `getServerApiKey()`, `worldstoreSearch()` — shared CrossMint WorldStore API client
- **`crossmint-worldstore/types.ts`** — `CrossMintOrderEvent`, `OrderStatusMapping`, `TrackingInfo`, `ProductVariant`, `ProductSearchResult`
- **`crossmint-worldstore/purchase.ts`** — `createPurchaseOrder()`, `getOrderStatus()` — uses `crossmintFetch` from `lib/rail2/client.ts` for Orders API
- **`crossmint-worldstore/shopify-search.ts`** — `searchShopifyProduct()` — Shopify product variant search via WorldStore unstable API
- **`crossmint-worldstore/webhook.ts`** — `verifyCrossMintWebhook()`, `extractOrderId()`, `buildOrderUpdates()`, `extractTrackingInfo()` — order lifecycle webhook processing
- **Re-export shims**: `lib/rail2/orders/purchase.ts` re-exports `createPurchaseOrder`/`getOrderStatus` — all 4 consumers unchanged
- **Cross-rail shopping gate**: CrossMint Orders API requires `payerAddress` to be the CrossMint wallet. Shopping from a Privy (Rail 1) wallet would require a pre-transfer step (Privy→CrossMint) before order creation. This is a known limitation — not yet implemented.
- Future providers (direct merchant APIs, browser checkout agents) slot in as siblings under `lib/procurement/`.

### Agent Management (`lib/agent-management/`)
Bot/agent-facing API infrastructure consolidated into a feature folder:
- `auth.ts` — authenticates bot requests via Bearer API key (prefix lookup + bcrypt verify).
- `crypto.ts` — API key generation, hashing, verification, claim tokens, card IDs, webhook secrets.
- `rate-limit.ts` — token-bucket rate limiter with per-endpoint config (19 endpoints).
- `agent-api/middleware.ts` — `withBotApi()` wrapper: auth → rate limit → handler → access log → webhook retry.
- `agent-api/status-builders.ts` — `buildRail{1,2,5}Detail()` functions for `/bot/status` and `/bot/check/*` responses.
- `bot-linking.ts` — centralized `linkBotToEntity(rail, entityId, botId, ownerUid)` / `unlinkBotFromEntity(rail, entityId, ownerUid)` for all rails. Max 3 entities per bot, ownership validation, bot existence check, webhook firing (`rails.updated`). Rail configs are declarative objects. Route files are thin wrappers.
- **Bot Status API:** `GET /api/v1/bot/status` (cross-rail), `GET /api/v1/bot/check/rail{1,2,5}` (per-rail detail). `GET /api/v1/bots/rails` (owner-facing rail connections).

### Shared Wallet/Card UI (`components/wallet/`)
All wallet and card page UI is consolidated into `components/wallet/` to eliminate duplication across Rails 1, 2, and 5. Setup wizards are NOT in this folder — they remain in their original locations. Key components: `card-visual.tsx` (Rail 5), `crypto-card-visual.tsx` (Rails 1/2), `credit-card-item.tsx` (unified card+action bar), `credit-card-list-page.tsx` (full page shell — pages pass a config object), `rail-page-tabs.tsx` (shared tab shell), `transaction-list.tsx`, `order-list.tsx`, `approval-list.tsx`. Shared hooks under `hooks/` (wallet actions, bot linking, transfers, guardrails). Shared dialogs under `dialogs/`. `types.ts` defines `NormalizedCard` with per-rail normalizers.

Rail 5 (`sub-agent-cards/page.tsx`) is ~43 lines — a pure config object passed to `CreditCardListPage`. Adding transaction/approval tabs = add endpoint URLs to the config object.

### Unified Tab Structure
All rail pages use a consistent tab structure via `RailPageTabs`:

| Tab | Shows | Rail 1 | Rail 2 | Rail 5 |
|---|---|---|---|---|
| Wallets/Cards | Entity list with action bars | Yes | Yes | Yes |
| Transactions | Financial ledger (deposits, debits, transfers) | Yes | Yes | When endpoint added |
| Orders | Procurement records (vendor, product, shipping) | No | Yes | When endpoint added |
| Approvals | Pending approval queue with approve/reject | Yes | Yes | When endpoint added |

Rail 1 (`stripe-wallet/page.tsx`, ~313 lines) and Rail 2 (`card-wallet/page.tsx`, ~515 lines) use shared hooks and all shared tab content components. Rail 2 separates purchases into Orders tab and transfers/deposits into Transactions tab. Remaining page-specific code is genuinely rail-specific: Stripe Onramp Sheet (Rail 1), CrossMint checkout + fund dialog (Rail 2).

### Key Routes
- `/`: Consumer landing page
- `/claim`: Bot claim page
- `/skills`: Vendor procurement skills catalog (public)
- `/solutions/card-wallet`: Card Wallet landing page (public)
- `/solutions/stripe-wallet`: Stripe Wallet landing page (public)
- `/overview`: Dashboard overview
- `/stripe-wallet`: Rail 1 dashboard
- `/card-wallet`: Rail 2 dashboard
- `/sub-agent-cards`: Sub-agent card management (Rail 5)
- `/transactions`: Transaction history, orders, and unified approvals (three tabs)
- `/settings`: Account settings
- `/onboarding`: Guided setup wizard


### Feedback / Support Widget
In-app feedback dialog accessible from the profile dropdown in the dashboard header. Authenticated users can submit bug reports, feature requests, billing questions, technical support requests, and general feedback.
- **Frontend:** `components/dashboard/feedback-dialog.tsx` — Dialog component using existing UI primitives (Dialog, Select, Textarea, Button). Manages own form state and submission.
- **Trigger:** Profile dropdown in `components/dashboard/header.tsx` — "Support" menu item with LifeBuoy icon between Settings and Log Out.
- **Backend:** `app/api/v1/feedback/route.ts` — POST endpoint, authenticated via `getSessionUser`, validates with Zod, sends formatted HTML+text email via SendGrid to support inbox.
- **No database storage** — feedback goes straight to email. `replyTo` is set to the user's email for direct replies.
- **Security:** All user-supplied content is HTML-escaped before email insertion. Message length capped at 5000 chars.
- **Config:** `SUPPORT_EMAIL` env var (defaults to `support@creditclaw.com`).

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

### Testing (`tests/`)
Vitest-based automated test suite. Run with `npx vitest run`. Config in `vitest.config.ts` with `@/` path alias. See `tests/_README.md` for coverage map, guidelines on when/how to add tests, and known gaps. Manual curl-based integration tests are in `project_knowledge/testing.md`.

### Multitenant Architecture
The app supports multiple tenants (CreditClaw, shopy.sh, brands.sh) via hostname-based routing:
- **Tenant configs**: `public/tenants/{tenantId}/config.json` — branding, meta, theme, routes, navigation, tracking (source of truth). Also mirrored in `lib/tenants/tenant-configs.ts` as static imports for client-side use.
- **Types**: `lib/tenants/types.ts` — `TenantConfig` interface
- **Config loader (server)**: `lib/tenants/config.ts` — `getTenantConfig()` with caching (uses filesystem, server-only)
- **Config loader (client)**: `lib/tenants/tenant-configs.ts` — `getStaticTenantConfig()` + `TENANT_THEMES` (bundled statically, no fs dependency)
- **Middleware**: `middleware.ts` — resolves hostname → tenantId, sets `x-tenant-id` header + `tenant-id` cookie
- **Root layout** (`app/layout.tsx`): Uses `cookies()` to read `tenant-id` cookie set by middleware. Resolves tenant config server-side for correct SSR (no flash of wrong tenant). Also includes inline `<script>` for CSS theme variables on client-side navigations. Wraps children in `TenantProvider`.
- **Client context**: `lib/tenants/tenant-context.tsx` — `TenantProvider` + `useTenant()` hook for client components
- **Tenant-aware pages**: Pages needing server-side tenant routing (home, guide, standard, how-it-works) use `cookies()` + `force-dynamic`. The root layout also uses `cookies()` making child pages dynamic by default, but `revalidate` on individual pages enables ISR caching.
- **Tenant components**: `components/tenants/{id}/` — per-tenant landing pages, how-it-works pages, etc.
- **Nav**: Uses `useTenant()` for logo, name, tagline, routes
- **Footer**: Config-driven via `tenant.navigation.footer` in config.json — each tenant defines its own columns and social links
- **How It Works**: `app/how-it-works/page.tsx` is a tenant router (same pattern as landing page)
- **owners.signup_tenant**: Tracks which tenant a user signed up from (migration 0011)
- **Active tenants**: creditclaw (payments), shopy (ASX scoring/readiness), brands (skill catalog/registry)
- **brands.sh skill detail page** (`app/skills/[vendor]/page.tsx`): ISR-enabled (revalidate=3600). Null-safe — gracefully renders when `brandData` is missing by falling back to `brand.*` fields. Sections like search/checkout/shipping/deals/tips only render when vendor data exists.
- **brands.sh landing** (`components/tenants/brands/landing.tsx`): Skill-registry framing. Columns: Skill | Capabilities | Checkout | Maturity. Imports shared label maps from `lib/procurement-skills/taxonomy/`. No ScoreBadge (scores live on shopy.sh).
- To test locally as a different tenant: add `?tenant=shopy` or `?tenant=brands` to any URL
- **IMPORTANT**: When adding new tenant configs, update BOTH `public/tenants/{id}/config.json` AND `lib/tenants/tenant-configs.ts`

### Database Schema Workflow
Schema changes flow through Drizzle ORM and are auto-synced to production on deploy:
1. Edit `shared/schema.ts` — add/modify tables, columns, indexes, constraints
2. Run `npx drizzle-kit push --force` locally to sync dev database
3. Deploy — Replit's deployment platform runs `drizzle-kit push` automatically against production
4. **Never make manual SQL changes** to the database without updating `shared/schema.ts` to match. Manual DDL causes naming drift (PostgreSQL uses `_key` for unique constraints, Drizzle expects `_unique`) which blocks non-interactive deployments.
5. Config: `drizzle.config.ts` points at `DATABASE_URL` with `pg` driver
6. The `spending_permissions` table exists in both databases but is not tracked in the schema (legacy table)

### Documentation System (`app/docs/content/`, `app/docs/`)
Self-hosted documentation at `/docs` with unified single-sidebar navigation (no audience toggle). All three tenants share one sidebar. Multi-tenant aware — each tenant has a `docsEntrySlug` for its landing page.
- **Config**: `app/docs/content/sections.ts` — flat typed section/page registry. Sections have optional `tag` field (e.g. "shopy") displayed as a badge. No audience/tenant filtering. `findPage(slugParts)` resolves URL to section+page. `getAllPagesFlat()` returns all pages (no args).
- **Layout**: `app/docs/layout.tsx` — client component with persistent sidebar. Swaps branding (logo) per tenant cookie. No audience toggle.
- **Renderer**: `app/docs/[...slug]/page.tsx` — reads markdown from `app/docs/content/{section}/{page}.md`, renders via `react-markdown` with `prose` typography classes. Prev/next navigation across all sections.
- **13 sections** (57 pages): Getting Started, Bots & Onboarding, Wallets & Funding, Spending Controls, Selling, Transactions & Orders, Procurement Skills, Skill Registry (tag: brands), Agent Integration, Settings, ASX Scoring (tag: shopy), Skill Publishing (tag: shopy), CLI Tools (tag: shopy).
- **URL pattern**: `/docs/{section-slug}/{page-slug}` — single namespace, no `/docs/api/` or `/docs/shopy/` prefixes.
- **Tenant entry points**: `docsEntrySlug` in `TenantConfig` — creditclaw → `getting-started/what-is-creditclaw`, shopy → `asx-scoring/what-is-shopy`, brands → `skill-registry/what-is-the-registry`.
- **LLM access**: Raw markdown endpoint at `GET /api/docs/{section}/{page}` (Content-Type: text/markdown). Each doc page has "Copy for LLM" and "View as Markdown" buttons. `GET /llms.txt` serves a structured index of all docs with markdown links. `GET /llms-full.txt` concatenates all docs into a single file.

### Shopy.sh Pages
- **`/standard`**: The Agentic Commerce Standard spec page. Server component with custom markdown renderer (no prose library), sticky TOC sidebar, non-dev callout card linking to `/guide`. Source: `content/agentic-commerce-standard.md`.
- **`/guide`**: Non-technical merchant explainer. 6 sections with Nav/Footer, CSS-only flow diagram, improvement checklist in shopy's `gap-px` grid style, dark CTA section.
