# CreditClaw.com

## Overview
CreditClaw is a prepaid spending controls platform designed for AI agents within the OpenClaw ecosystem. It enables owners to fund bot wallets using their credit cards and enforce strict spending limits (per-transaction, daily, monthly caps, category blocking, approval modes). The platform offers a consumer landing page for immediate sign-up, a waitlist for virtual card issuance, and a dashboard for managing wallets, transactions, and spending controls. Its core purpose is to provide a secure and controlled financial environment for AI agents, focusing on a prepaid model. It also supports bots receiving payments via links and features a "Split-Knowledge Card Model" for enhanced transaction privacy. The project aims to become the leading financial control and payment solution for AI agents.

## Brand Guide
See `docs/brand.md` for the full brand identity reference — covers color palette, typography, UI design system, and form validation patterns. All new UI work should align with the styles and CSS classes documented there.

## Dashboard Overview Page
The `/overview` page includes:
- **Approvals section** (above cards, only shown if approvals exist): Shows up to 5 recent approvals using `ApprovalList` with `showRailBadge`. Has a "See all" link to `/transactions`. Approve/reject actions work in-place.
- **Cards & Wallets section** (below "My Bots") with per-card titles ("Agent Wallet" / "My Card") and info tooltips matching sidebar descriptions. Shows:
- **Privy Wallet (Rail 1)**: Full interactive `CryptoWalletItem` with action bar (Fund, Freeze, Guardrails, Activity → navigates to `/stripe-wallet`)
- **Rail 5 Sub-Agent Card**: Full interactive `CreditCardItem` with action bar. If no card exists, shows placeholder `CardVisual` with semi-transparent overlay and "Add Your Card" button that opens `Rail5SetupWizard` in-place.
- Uses separate hook instances for each rail: `useWalletActions`, `useBotLinking`, `useGuardrails` (Rail 1 only), `useTransfer` (Rail 1 only)
- All required dialogs (GuardrailDialog, LinkBotDialog, UnlinkBotDialog, TransferDialog, FundWalletSheet, FreezeDialog, Rail5SetupWizard) are rendered on the overview page

## User Preferences
- **Design theme:** "Fun Consumer" — 3D clay/claymation aesthetic, coral lobster mascot, bright pastels (orange/blue/purple)
- **Font:** Plus Jakarta Sans
- **Border radius:** 1rem rounded corners
- **Framework:** Next.js 16 with App Router only
- **No framer-motion** (lightweight build)
- **No Vite, no standalone React** — everything runs through Next.js
- All interactive components marked with `"use client"` directive

## Modularization Guidelines

New features should follow a feature-first folder structure. Each rail lives under `lib/rail{N}/` with files grouped by responsibility, not by layer.

**Within a rail**, split code by what it does:
- `client.ts` — shared API client, auth, fetch wrapper, format helpers (if the rail talks to an external API)
- `wallet/` or `orders/` — domain operations grouped into subfolders when there are multiple related functions
- `fulfillment.ts` — business logic that runs when an approval is decided (wallet debits, order creation, webhooks)
- `approval-callback.ts` — thin glue (~5-10 lines) that registers the rail's fulfillment functions with the unified approval system
- Keep each file focused on one concern. If a file is doing two unrelated things, split it.

**Outside of rails** (cross-cutting features like guardrails, approvals, webhooks, notifications):
- These stay in their own `lib/{feature}/` folders and should not contain rail-specific business logic.
- If a cross-cutting module starts accumulating rail-specific code (like `callbacks.ts` did), extract that logic into the rail's own folder and leave a thin import in the cross-cutting module.

**Guardrails** (`lib/guardrails/`):
- `defaults.ts` — single source of truth for all guardrail default values (master + all rails). The schema reads from this file, so changing a value here changes the default for new records. Also exports `PROCUREMENT_DEFAULTS` for procurement controls.
- `types.ts` — `GuardrailRules` (USDC-based for Rails 1/2), `CardGuardrailRules` (cents-based for Rails 4/5), `TransactionRequest`, `CardTransactionRequest`, `CumulativeSpend`, `CardCumulativeSpend`, `GuardrailDecision` interfaces.
- `evaluate.ts` — two pure evaluation functions: `evaluateGuardrails()` for USDC rails (1 & 2) and `evaluateCardGuardrails()` for card rails (4 & 5). Only enforces spending limits and approval thresholds — domain/merchant/category enforcement is handled by procurement controls.
- `master.ts` — master-level guardrail evaluation (fetches config, aggregates cross-rail spend, calls `evaluateGuardrails`).
- `approval.ts` — centralized `evaluateApprovalDecision()` function that reads `approvalMode` and `requireApprovalAbove` from the `master_guardrails` table. This is the single source of truth for all approval decisions across all rails.
- **Standardized Structure**: Per-rail guardrail tables (`privy_guardrails`, `crossmint_guardrails`, `rail4_guardrails`, `rail5_guardrails`) contain only spending limits: `maxPerTx`, `dailyBudget`, `monthlyBudget`, `recurringAllowed`, `autoPauseOnZero`, `notes`, `updatedAt`, `updatedBy`. Approval mode (`approvalMode`, `requireApprovalAbove`) lives exclusively on `master_guardrails`. Domain/merchant/category lists live exclusively in `procurement_controls`.
- **Centralized Approval**: All checkout routes call `evaluateApprovalDecision(ownerUid, amountCents)` from `lib/guardrails/approval.ts`. This function reads from `master_guardrails` and supports:
  - `ask_for_everything` → require owner approval for all transactions
  - `auto_approve_under_threshold` → only require approval if amount >= `requireApprovalAbove`
  - `auto_approve_by_category` → allow (category-based approval not yet fully implemented)
- **recurringAllowed**: Column exists on all rails for structural consistency but is not yet enforced in checkout routes (pending recurring detection logic).
- **notes**: Informational field on all rails, returned in API responses but not used in enforcement.

**Procurement Controls** (`lib/procurement-controls/`):
- `types.ts` — `ProcurementRules`, `ProcurementRequest`, `ProcurementDecision` interfaces.
- `defaults.ts` — `DEFAULT_PROCUREMENT_RULES` with default blocked categories.
- `evaluate.ts` — `evaluateProcurementControls()` checks domain, merchant, and category rules. `mergeProcurementRules()` combines master + rail-level rules (blocklists are unioned, allowlists are intersected).
- DB table: `procurement_controls` with `scope` (master/rail1/rail2/rail4/rail5) and `scope_ref_id` for per-rail granularity. Owner-facing API: `GET/POST /api/v1/procurement-controls` and `GET /api/v1/procurement-controls/[scope]`.
- **Fully separated from guardrails**: Domain/merchant/category lists are exclusively managed by `procurement_controls`. The guardrails tables (`privy_guardrails`, `crossmint_guardrails`, `rail4_guardrails`, `rail5_guardrails`) no longer have `allowlisted_domains`, `blocklisted_domains`, `allowlisted_merchants`, or `blocklisted_merchants` columns. The guardrails GET APIs still return these fields in the response by reading from `procurement_controls`, maintaining backward compatibility. The card-wallet frontend saves merchant lists to `POST /api/v1/procurement-controls` separately from guardrail limit saves.

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

**Storage is modularized** under `server/storage/` with domain-grouped files:
- `types.ts` — the `IStorage` interface (single source of truth for all method signatures)
- `index.ts` — composes all domain fragments into the `storage` object and re-exports `IStorage`
- `core.ts` — bots, wallets, transactions, payment methods, topups, access logs, reconciliation, freeze/unfreeze
  - `rail4-guardrails.ts` — CRUD for `rail4_guardrails` table
  - `rail5-guardrails.ts` — CRUD for `rail5_guardrails` table
  - `procurement-controls.ts` — CRUD for `procurement_controls` table
- `webhooks.ts` — webhook deliveries, retries, failed count
- `notifications.ts` — notification preferences + messages
- `payment-links.ts` — payment links, pairing codes, waitlist
- `rail1.ts` — all privy/x402 wallet, guardrail, and transaction methods
- `rail2.ts` — all crossmint wallet, guardrail, and transaction methods
- `rail4.ts` — rail4 cards, obfuscation events/state, profile allowance, checkout confirmations
- `rail5.ts` — rail5 cards + checkouts
- `bot-messages.ts` — bot pending messages CRUD (create, get, count, ack, purge, delete by ref)
- `owners.ts` — owner profiles (get/upsert)
- `master-guardrails.ts` — master guardrails + cross-rail daily/monthly spend aggregation
- `skills.ts` — skill drafts, evidence, submitter profiles, versioning, exports
- `brand-index.ts` — brand catalog search, facets, upsert, readiness scoring
- `brand-claims.ts` — brand ownership claims (create, verify, reject, revoke)
- `brand-feedback.ts` — AXS rating feedback from agents and humans
- `brand-login-accounts.ts` — per-brand login credentials for bot checkout
- `approvals.ts` — unified approvals
- `orders.ts` — central orders table CRUD (create, get by ID/externalId, get by owner with filters, get by wallet/card, update)
- All consumers import from `@/server/storage` unchanged (the directory's `index.ts` is transparent).
- Methods that use `this.` resolve correctly because all fragments are spread into one object.

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

### Core Features and Design
CreditClaw features a public landing page and a protected dashboard. Key functionalities include bot registration, Stripe integration for wallet funding, and server-side enforced spending controls. A bot-facing API allows bots to check wallet status, make purchases, request top-ups, and view transaction history. Authentication is via Firebase for owners and Bearer API tokens for bots.

The system supports multiple payment methods per owner, webhook notifications for bots (HMAC-SHA256, exponential backoff), and owner notifications (in-app, email). Operational safety includes daily wallet reconciliation and health checks.

### Managed Cloudflare Tunnels
Bots without a `callback_url` get a managed Cloudflare tunnel provisioned at registration. Architecture follows two-layer separation:
- **Webhook Tunnel module:** `lib/webhook-tunnel/` — self-contained module for Cloudflare tunnel provisioning.
  - `cloudflare.ts` — low-level Cloudflare API calls only. `provisionBotTunnel(botId, localPort)`, `deleteBotTunnel(tunnelId, botId)`, `getTunnelToken(tunnelId)`, `resolveLocalPort(localPort?, botType?)`, `resolveWebhookPath(webhookPath?, botType?)`. Uses plain `fetch` against Cloudflare API. No business logic, no DB access.
  - `provisioning.ts` — orchestration layer between Cloudflare API and registration route. `provisionTunnelForBot(botId, botType?, localPort?, webhookPath?)` resolves defaults, calls Cloudflare, generates webhook secret, and returns a structured `TunnelProvisionOutput` containing both `dbFields` (for DB insert) and `responseData` (for API response including `tunnel_setup` object). `cleanupTunnel(tunnelId, botId)` wraps error cleanup. The `tunnel_setup` response structure (steps, headers, retry policy) is defined in one place via `buildTunnelSetupResponse()` — no duplication across registration paths.
  - `index.ts` — barrel re-exports the public API from both files. Consumers import from `@/lib/webhook-tunnel`.
- **Schema:** `bots` table has `botType`, `tunnelId`, `tunnelToken`, `tunnelStatus`, `tunnelLocalPort`, `openclawHooksToken` columns (migrations `drizzle/0004_low_morph.sql`, `drizzle/0005_melted_the_fury.sql`, `drizzle/0006_fast_frog_thor.sql`).
- **Registration fields:** `bot_type` (optional, defaults to `"openclaw"`), `local_port` (optional integer 1–65535), and `webhook_path` (optional string starting with `/`, max 200 chars) in the registration request schema.
- **Port resolution:** If `local_port` is provided → use it. Else if `bot_type` is `"openclaw"` → 18789. Else → 8080. Stored in `tunnelLocalPort`.
- **Path resolution:** If `webhook_path` is provided → use it. Else if `bot_type` is `"openclaw"` → `/hooks/creditclaw`. Else → `/webhook`. Appended to tunnel URL to form the full `callbackUrl` (e.g. `https://bot-abc123.nortonbot.com/hooks/creditclaw`).
- **Flow:** Registration calls `provisionTunnelForBot()` → spreads `dbFields` into DB insert → attaches `responseData` to API response. Bot runs `cloudflared tunnel run --token <token>` and starts local listener on the resolved port.
- **OpenClaw Gateway auth:** For OpenClaw bots, `provisionTunnelForBot()` also generates an `openclawHooksToken` (stored on the bot record). The registration response includes it as `openclaw_hooks_token` with instructions to set it as `CREDITCLAW_HOOKS_TOKEN` env var. The `openclaw_gateway_config` snippet uses `${CREDITCLAW_HOOKS_TOKEN}` (OpenClaw env var substitution). On outbound webhook delivery, `attemptDelivery()` in `lib/webhooks/delivery.ts` sends `Authorization: Bearer <token>` alongside `X-CreditClaw-Signature` when the bot has a hooks token stored. All delivery paths (direct, retry, Rail 5 deliver-to-bot) pass the hooks token through.
- **Webhook status:** Tunnel-provisioned bots start with `webhookStatus: "pending"` (not `"active"`) until the tunnel connects.
- **Cleanup:** If registration fails after tunnel provisioning, `cleanupTunnel(tunnelId, botId)` is called to clean up both DNS and tunnel.
- **Dashboard:** Bot settings dialog shows tunnel URL as read-only with a `TunnelStatusIndicator` when a tunnel is provisioned.
- **Required secrets:** `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_ZONE_ID` (not yet added — provisioning is best-effort, registration still succeeds without them).

Advanced features:
- **Payment Links:** Bots generate Stripe Checkout Sessions for receiving payments.
- **Wallet Freeze:** Owners can freeze bot wallets, preventing transactions.
- **Card Color Persistence:** Each card (Rail 4 and Rail 5) stores its own `card_color` (`purple`, `dark`, `blue`, `primary`). New cards get a random color on creation. Users can change it from the card detail page (Rail 5: color picker circles below card visual). `resolveCardColor(color, cardId)` in `components/wallet/types.ts` provides a fallback — if `card_color` is null (e.g. a card created before this feature), it derives a stable color from a hash of the card ID. A one-time backfill script is available at `scripts/backfill-card-colors.sql` for production. Card deletion uses the unified endpoint `DELETE /api/v1/cards/:cardId?rail=rail4|rail5`.
- **Onboarding Wizard:** A linear 5-step wizard for new bot owner setup. Flow: choose-agent-type → register-bot → sign-in → claim-token → add-card-bridge. The bridge slide only appears if the user claimed a bot (sets `botConnected`). If "Yes, let's add a card" is chosen, the full `Rail5SetupWizardContent` renders inline (not as a modal) with `preselectedBotId` to auto-link the bot and skip the bot selection step. If the user skips at claim-token or add-card-bridge, they go directly to `/overview`. The `Rail5SetupWizardContent` component is a standalone extraction from the dialog-based `Rail5SetupWizard` — both dashboard (dialog mode) and onboarding (inline mode) use the same content component with zero duplication. Props: `onComplete`, `onClose`, `preselectedBotId?`, `inline?`. The onboarding page has no auth gate — authentication happens within the wizard flow.
- **Split-Knowledge Card Model (Rail 4):** Manages bot card configurations and transactions using payment profiles and obfuscation. Includes a multi-step setup wizard and a human approval workflow for transactions via HMAC-signed email links.
- **Rail 5 Setup Wizard:** Full-page route at `/setup/rail5` (outside dashboard layout, no sidebar/header). Uses `Rail5SetupWizardContent` with `inline` mode. On complete/close navigates to `/overview`. Entry points: NewCardModal "My Card - Encrypted" option, overview page "Add Your Card" overlay, sub-agent-cards "Add New Card" button — all navigate to `/setup/rail5` instead of opening a Dialog modal. The onboarding wizard (`/onboarding`) still embeds `Rail5SetupWizardContent` inline directly. The old `Rail5SetupWizard` Dialog wrapper has been removed. **Modularized under `components/onboarding/rail5-wizard/`:**
    - `index.tsx` — re-exports `Rail5SetupWizardContent` for backward compatibility
    - `rail5-wizard-content.tsx` — orchestrator: calls hook, renders shell + step switch
    - `use-rail5-wizard.ts` — custom hook with all state variables and handler functions
    - `types.ts` — shared interfaces (`BotOption`, `SavedCardDetails`, `Step7Props`, `Step8Props`, etc.), constants (`TOTAL_STEPS = 8`, `FUN_CARD_NAMES`)
    - `step-indicator.tsx` — step progress dots component
    - `wizard-shell.tsx` — layout wrapper (close button with inline/non-inline positioning, exit confirmation overlay, step indicator; hides indicator when `step >= TOTAL_STEPS`)
    - `steps/` — 9 step files: `name-card.tsx` (step 0), `how-it-works.tsx` (step 1), `spending-limits.tsx` (step 2), `card-entry.tsx` (step 3), `billing-address.tsx` (step 4), `link-bot.tsx` (step 5), `encrypt-deliver.tsx` (step 6), `delivery-result.tsx` (step 7), `test-verification.tsx` (step 8 — optional, beyond visible step dots). The step indicator shows 8 dots (steps 0–7). Step 8 (test verification) has a prompt gate: checks test status on mount — if bot already started/completed, shows verification UI directly; otherwise shows "Do you want to test?" prompt with Skip/Yes. Skip is always available during verification.
- **Wizard Typography System:** All onboarding/wizard flows share a unified typography scale defined in `lib/wizard-typography.ts`. The `wt` object exports responsive class strings for `title`, `subtitle`, `body`, `bodySmall`, `primaryButton`, `secondaryButton`, and `fine`. `wt.primaryButton` and `wt.secondaryButton` include full button sizing (height `h-12 md:h-14`, rounding `rounded-xl`, and font size) — apply them to all navigation `Button` components. For plain text-link buttons (back/skip as `<button>` without borders), use `wt.body` instead. The main onboarding steps (`register-bot`, `sign-in`, `claim-token`, `add-card-bridge`) and all Rail5 wizard steps use `wt` for button sizing. Small utility buttons (Copy/Telegram/Discord, Retry, Re-download) and exit confirmation buttons are intentionally excluded. **Any new wizard flow should import `wt` from `@/lib/wizard-typography` for consistent sizing.** To change button or font sizes across all wizards, edit the single `lib/wizard-typography.ts` file.

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
- **Rail 4 (Self-Hosted Cards):** Implements the Split-Knowledge card model with obfuscation. **Modularized under `lib/rail4/`:**
  - `obfuscation.ts` — decoy data, fake profile generation, `generateRail4Setup()`, `buildDecoyFileContent()`, types (`FakeProfile`, `Rail4Setup`).
  - `allowance.ts` — spending window helpers: `getWindowStart()`, `getNextWindowStart()` for day/week/month allowance periods.
- **Rail 5 (Sub-Agent Cards):** Encrypted card files with plugin-based checkout. Owner encrypts card client-side (AES-256-GCM), CreditClaw stores only the decryption key. At checkout, the bot calls the `creditclaw_fill_card` plugin (or falls back to an ephemeral sub-agent) which gets the key, decrypts, fills card number + CVV, and wipes all sensitive data. **Plugin:** `public/Plugins/OpenClaw/` (`src/index.ts`, `src/decrypt.ts`, `src/fill-card.ts`, `src/api.ts`). **Modularized under `lib/rail5/`:**
  - `index.ts` — core helpers (`generateRail5CardId`, `generateRail5CheckoutId`, `validateKeyMaterial`, `getDailySpendCents`, `getMonthlySpendCents`, `buildSpawnPayload`, `buildCheckoutSteps`) + test checkout constants (`RAIL5_TEST_CHECKOUT_PAGE_ID`, `RAIL5_TEST_CHECKOUT_URL`).
  - `decrypt-script.ts` — static `DECRYPT_SCRIPT` constant (~10-line AES-256-GCM Node.js script) with marker-based regex (`ENCRYPTED_CARD_START/END`) for extracting data from combined files. Falls back to code-fence matching for old-format files.
  - **Card status progression:** `pending_setup` → `pending_delivery` (key submitted) → `confirmed` (bot confirmed file delivery via `POST /bot/rail5/confirm-delivery`) → `active` (first successful checkout completed). `frozen` can be set by owner on `confirmed` or `active` cards; unfreezing restores to `confirmed` or `active` based on checkout history.
  - **Dual execution modes:** Checkout endpoint returns both `checkout_steps` (array of instructions for direct mode) and `spawn_payload` (spawn wrapper for sub-agent mode). Bot chooses which to use.
  - DB tables: `rail5_cards`, `rail5_checkouts`. Owner API: `/api/v1/rail5/{initialize,submit-key,cards,deliver-to-bot,cards/[cardId]/delivery-status}`. Bot API: `/api/v1/bot/rail5/{checkout,key,confirm,confirm-delivery}`. Dashboard: `/sub-agent-cards`. Setup wizard: 9-step (Name→HowItWorks→VisualCardEntry→BillingAddress→Limits→LinkBot→Encrypt&Send→DeliveryResult→TestVerification) with Web Crypto encryption. Card brand is auto-detected from BIN prefix via shared `lib/card/card-brand.ts` utility (Visa/MC/Amex/Discover/JCB/Diners); sent to server during submit-key.
  - **File delivery via `sendToBot()`**: Encryption step calls `POST /api/v1/bot-messages/send` which tries webhook first, falls back to staging a pending message. Combined self-contained markdown file format with `DECRYPT_SCRIPT_START/END` and `ENCRYPTED_CARD_START/END` markers. Backup download always happens.
  - **Delivery result step**: Shows live status (webhook delivered / waiting for bot / confirmed). 1-minute polling every 5s via `GET /rail5/cards/[cardId]/delivery-status`. Share buttons (Copy, Telegram, Discord) for relay message. Collapsible "For AI Agents" section with re-download option. **Phase 2: Test purchase verification** — after bot confirms delivery, polls `GET /rail5/cards/[cardId]/test-purchase-status` for 3 minutes. Server returns submitted card details from the test sale; client compares field-by-field against `savedCardDetails` (preserved in browser memory before input clearing). Shows green checkmarks (match) or red X (mismatch) per field. Confirm-delivery endpoint returns real `test_checkout_url` and `test_instructions` directing bot to sandbox checkout with "testing" payment method.
  - Unified `rails.updated` webhook fires across ALL rails on bot link/unlink/freeze/unfreeze/wallet create with `action`, `rail`, `card_id`/`wallet_id`, `bot_id` in payload. Wired up in: Rail 1 (create, freeze), Rail 2 (create, freeze), Rail 4 (link-bot, freeze), Rail 5 (PATCH cards).
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

### Procurement Skills Module
A `/skills/` module provides a curated library of vendor shopping skills. **Modularized under `lib/procurement-skills/`:**

**Taxonomy** (`lib/procurement-skills/taxonomy/`):
Each concern has its own file with type definition + label map. Barrel-exported via `index.ts`.
- `sectors.ts` — `VendorSector` type + `SECTOR_LABELS` (20 sectors: retail, office, fashion, health, home, electronics, industrial, etc.)
- `tiers.ts` — `BrandTier` type + `BRAND_TIER_LABELS` (7 tiers: ultra_luxury, luxury, premium, mid_range, value, budget, commodity). Deprecated `VendorTier` and `TIER_LABELS` aliases are re-exported for backward compatibility.
- `brand-types.ts` — `BrandType` type + `BRAND_TYPE_LABELS` (5 types: brand, retailer, marketplace, chain, independent)
- `checkout-methods.ts` — `CheckoutMethod` type + `CHECKOUT_METHOD_LABELS` + `CHECKOUT_METHOD_COLORS`
- `capabilities.ts` — `VendorCapability` type + `CAPABILITY_LABELS`
- `payment-methods.ts` — `PaymentMethod` type + `PAYMENT_METHOD_LABELS` (11 methods: card, ach, crypto, apple_pay, etc.)
- `checkout-providers.ts` — `CheckoutProvider` type + `CHECKOUT_PROVIDER_LABELS`
- `ordering.ts` — `OrderingPermission` type + `ORDERING_PERMISSION_LABELS`
- `maturity.ts` — `SkillMaturity` type

**Core types** (`lib/procurement-skills/types.ts`):
Re-exports all taxonomy types/labels from `taxonomy/`. Defines domain interfaces: `VendorSkill` (uses `sector: VendorSector` — the legacy `category: VendorCategory` field was removed), `SearchDiscovery`, `BuyingConfig`, `DealsConfig`, `TaxonomyConfig`, `MethodConfig`. Also exports `computeAgentFriendliness()`.

**Vendors** (`lib/procurement-skills/vendors/`):
Each vendor is its own file exporting a single `VendorSkill` object. Barrel-exported via `index.ts`.
- 14 vendor files: `amazon.ts`, `shopify.ts`, `amazon-business.ts`, `walmart.ts`, `walmart-business.ts`, `staples.ts`, `home-depot.ts`, `lowes.ts`, `office-depot.ts`, `uline.ts`, `grainger.ts`, `newegg.ts`, `bh-photo.ts`, `mcmaster-carr.ts`

**Registry** — DELETED in Phase 5. The in-memory `VENDOR_REGISTRY` has been removed. All surfaces (catalog UI, vendor detail, export, claim modal) now read from the `brand_index` database table via the internal API or bot API.

**Generator** (`lib/procurement-skills/generator.ts`):
Converts `VendorSkill` objects into `SKILL.md` markdown with frontmatter, taxonomy, discovery, buying, and deals sections.

**Package exports** (`lib/procurement-skills/package/`):
- `skill-json.ts` — JSON package format including taxonomy/searchDiscovery/buying/deals blocks
- `payments-md.ts` — Payment instructions markdown
- `description-md.ts` — Description markdown

**Builder** (`lib/procurement-skills/builder/`):
LLM-powered skill generation. `types.ts` includes `LLMCheckoutAnalysis` with taxonomy inference fields.

**Internal Brands API** (`app/api/internal/brands/`):
Human-facing catalog data source. Separate from the bot API — returns raw BrandIndex rows with JSONB, no agent-specific transformations.
- `GET /api/internal/brands/search` — paginated search with all filters (sector, tier, maturity, checkout, capability, etc.) + facets
- `GET /api/internal/brands/[slug]` — single brand detail lookup

**Brand Index** (`brand_index` table, `server/storage/brand-index.ts`):
Sole source of truth for all brand data across all surfaces (bots, humans, exports). Single denormalized PostgreSQL table with:
- `brand_type` text — business model classification (brand, retailer, marketplace, chain, independent)
- Flat indexed columns for every filterable field (sector, tier, maturity, ordering, etc.)
- `carries_brands` text[] array (GIN-indexed) — distinguishes retailers from HQ brands (populated = retailer)
- `brand_data` jsonb — full VendorSkill object for retrieval
- `skill_md` text — pre-generated skill markdown
- `search_vector` tsvector with trigger (name+description at A, tags/sub_sectors/carries_brands at B, sector at C)
- ASX Score columns: `overall_score` (integer, nullable — 0-100 AI-powered score), `score_breakdown` (jsonb — per-signal scores), `recommendations` (jsonb — improvement tips), `scan_tier` (text — free/paid), `last_scanned_at` (timestamp), `last_scanned_by` (text)
- Rating columns: `rating_search_accuracy` (numeric), `rating_stock_reliability` (numeric), `rating_checkout_completion` (numeric), `axs_rating` (numeric — the "Agentic Experience Score" crowdsourced average), `rating_count` (integer). Null until 5+ weighted feedback events. Drizzle returns `numeric` as strings — always use `Number()` when displaying.
- B2B columns: `tax_exempt_supported`, `po_number_supported`, `business_account`
- Maturity progression: draft → community → official (brand claimed) → verified (CreditClaw audited)
- Storage methods: `searchBrands`, `searchBrandsCount`, `getBrandById`, `getBrandBySlug`, `getRetailersForBrand`, `upsertBrandIndex`, `getAllBrandFacets`
- `searchBrands` supports `lite?: boolean` filter — when true, selects only catalog card fields (excludes `skillMd` and heavy metadata columns, but includes `axsRating`, `ratingCount`, `overallScore`). Used by internal search API and sitemap. Export type `BrandCardRow` for type-safe lite consumers.
- `searchBrands` supports rating-based filters: `minAxsRating`, `minRatingSearch`, `minRatingStock`, `minRatingCheckout`. Also supports `sortBy: "rating"` and `sortBy: "score"` (ASX Score).
- `getAllBrandFacets` uses 10-minute in-memory cache (module-level). `invalidateFacetCache()` exported from `server/storage/brand-index.ts` and called automatically on `upsertBrandIndex`.
- 22+ indexes (5 btree, 7 GIN on arrays, 1 GIN on tsvector, 7 partial)

**Brand Feedback** (`brand_feedback` table, `server/storage/brand-feedback.ts`):
Agents and humans rate brands after purchase attempts. Three sub-ratings (search_accuracy, stock_reliability, checkout_completion) at 1-5 scale with outcome tracking.
- `source` field: `agent` (authenticated bot), `anonymous_agent` (no auth), `human` (Firebase session)
- Storage methods: `createBrandFeedback`, `getBrandFeedback`, `getBrandFeedbackCount`, `getRecentFeedbackByBot`
- API endpoint: `POST /api/v1/bot/skills/[vendor]/feedback` — accepts both bot Bearer auth and Firebase session auth. Normalizes snake_case/camelCase keys. Rate limited: 1 per brand per bot per hour.
- Aggregation: `lib/feedback/aggregate.ts` — weighted 90-day rolling average. Source weights: human=2.0, authenticated agent=1.0, anonymous=0.5. Recency weights: ≤7d=1.0, ≤30d=0.8, ≤60d=0.6, >60d=0.4. Ratings only published at 5+ weighted events.
- Internal trigger: `POST /api/internal/feedback/aggregate?slug=optional`
- Generator (`lib/procurement-skills/generator.ts`) includes feedback instructions at the end of every SKILL.md — agents POST ratings after purchase attempts.
- Human feedback UI: `components/dashboard/purchase-feedback-prompt.tsx` — star rating component for post-purchase feedback.

**Discovery API** (`app/api/v1/bot/skills/route.ts`):
Now queries `brand_index` table via storage layer instead of in-memory registry. Query params: `category` (deprecated alias for `sector`), `search` (full-text), `sector`, `tier`, `maturity`, `checkout`, `capability`, `ordering_permission`, `payment_method`, `has_deals`, `search_api`, `mcp`, `carries_brand`, `ships_to`, `tax_exempt`, `po_number`, `min_rating`, `min_search_rating`, `min_stock_rating`, `min_checkout_rating`, `sort` (score|name|created_at|rating). Response includes full taxonomy/buying/deals metadata plus `asx_score`, `agent_readiness` (backward compat alias for overallScore), `carries_brands`, `domain`, `ratings` (object with overall/search_accuracy/stock_reliability/checkout_completion/count, or null) per vendor, and `sectors`/`tiers` facets.

**Post-publish hook**: When a skill draft is published (`app/api/v1/skills/drafts/[id]/publish/route.ts`), it auto-syncs the brand_index row via `upsertBrandIndex`.

**Brand Claims** (`brand_claims` table, `server/storage/brand-claims.ts`):
Self-service brand ownership verification. Brand owners claim their brand from the vendor detail page, upgrading maturity to "official" via email domain matching. Key components:
- `brand_claims` table with status lifecycle: pending → verified/rejected/revoked
- Partial unique index `brand_claims_active_claim_idx ON (brand_slug) WHERE status = 'verified'` prevents race conditions
- Domain matching logic in `lib/brand-claims/domain.ts` (exact, subdomain-of-brand, brand-subdomain-of-email)
- Free email blocklist in `lib/brand-claims/blocklist.ts` (Gmail, Yahoo, Outlook, etc.)
- Auto-verify if email domain matches brand domain; manual_review otherwise
- Transactional `verifyClaim` upgrades `brand_index.maturity` to "official", sets `claimed_by`/`claim_id`
- Transactional `revokeClaim` reverts brand to "community" maturity; only affects brand_index if claim_id matches
- API endpoints: `POST /api/v1/brands/[slug]/claim`, `GET /api/v1/brands/claims/mine`, `POST /api/v1/brands/claims/[id]/revoke`, `GET /api/v1/brands/claims/review` (admin), `POST /api/v1/brands/claims/[id]/review` (admin verify/reject)
- UI: Claim button on vendor detail page (`app/skills/[vendor]/page.tsx` — ghost button, shows for logged-out too, links badges to My Skills), unified "My Skills" page (`app/(dashboard)/skill-builder/submit/page.tsx` — submissions + claims in one list, claim search modal), Admin review queue (`app/admin123/brand-claims/page.tsx` — behind admin auth gate)

**UI** — Catalog page uses hybrid SSR: `app/skills/page.tsx` is a **server component** that fetches the initial 50 brands + facets + total count via `storage.searchBrands({ lite: true })` and passes them as props to `app/skills/catalog-client.tsx` (`"use client"`). The client component initializes state from these server-provided props (no loading skeleton on first paint), then takes over for filtering/search/pagination via the internal API. Dynamic `generateMetadata()` in `page.tsx` uses live total count. `VendorCard` extracted to `app/skills/vendor-card.tsx` (shared between catalog and sector pages). Vendor detail page (`app/skills/[vendor]/page.tsx`, **server component** — SSR for SEO) with `generateMetadata()` for title/OG/Twitter/canonical tags, `cache()` for deduplicating DB queries between metadata and page, and three extracted client components:
  - `brand-claim-button.tsx` — auth check + claim API call
  - `skill-preview-panel.tsx` — expand/collapse skill markdown + download
  - `copy-skill-url.tsx` — clipboard copy with feedback
  Custom 404 via `not-found.tsx` preserving branded "Vendor Not Found" UI.

**Sector Landing Pages** (`app/c/[sector]/page.tsx`) — Server component with SSR metadata, canonical URLs at `/c/[sector]`, cross-linking to other populated sectors, and 404 for sectors with zero published brands. Uses shared `VendorCard` component. Only sectors with at least one published brand (verified/official/beta/community) are included in `generateStaticParams` and the sitemap.

Sitemap (`app/sitemap.ts`) is async and includes all brand detail pages and populated sector landing pages.

### Community Submissions Module
Registered users can submit vendor websites for analysis, contributing to the procurement skills library.
- **Submission API:** `POST /api/v1/skills/submissions` (authenticated, triggers 4-pass analysis), `GET /api/v1/skills/submissions/mine` (list user's own submissions with profile stats).
- **Submitter Profiles:** `skill_submitter_profiles` table tracks per-user submission counts (submitted, published, rejected).
- **Trust Badges:** Submissions are tagged as "official" (email domain matches vendor domain) or "community" (all others).
- **Review Integration:** Community submissions feed into the existing review queue at `/skill-builder/review` with source filtering (Admin/Community) and submitter attribution badges.
- **Submission UI:** `/skill-builder/submit` provides a form to submit vendor URLs, view submission history, and track acceptance rates.

### Unified Approval System
`unified_approvals` is the **sole source of truth** for all approval state across all rails. The old `privy_approvals` and `crossmint_approvals` tables have been dropped. All approval reads, writes, and decisions go through this single table.

**Architecture:**
- **Service** (`lib/approvals/service.ts`): `createApproval()` generates HMAC-signed approval links, stores in `unified_approvals` table, sends branded email. `resolveApproval()` verifies HMAC, checks expiry, updates status, dispatches rail-specific callbacks.
- **Email** (`lib/approvals/email.ts`): Single `sendApprovalEmail()` with CreditClaw-branded HTML template, rail badge, and magic-link button.
- **Callbacks** (`lib/approvals/callbacks.ts`): Thin loader that imports the four rail-specific fulfillment modules below.
- **Rail 1 Fulfillment** (`lib/approvals/rail1-fulfillment.ts`): `railRef` = privy_transaction ID. On approve: updates tx status, creates order. On deny: marks tx failed.
- **Rail 2 Fulfillment** (`lib/approvals/rail2-fulfillment.ts`): `railRef` = crossmint_transaction ID. On approve: looks up tx, creates purchase order via CrossMint, records order, fires webhook. On deny: marks tx failed, fires webhook.
- **Rail 4 Fulfillment** (`lib/approvals/rail4-fulfillment.ts`): Approval/denial handlers for self-hosted card checkouts (wallet debit, allowance tracking, obfuscation events) + self-registers.
- **Rail 5 Fulfillment** (`lib/approvals/rail5-fulfillment.ts`): Approval/denial handlers for sub-agent checkouts (status updates, webhook firing) + self-registers.
- **Lifecycle** (`lib/approvals/lifecycle.ts`): TTL constants per rail (Rail 1 polling: 5min, Rail 1 email: 10min, Rails 2/4/5: 15min).
- **Landing Page** (`app/api/v1/approvals/confirm/[approvalId]/route.ts`): GET renders branded approval page with approve/deny buttons; POST processes the decision via `resolveApproval()`. Single entry point for email-based approvals across all rails.

**Centralized Dashboard API** (used by ALL rail dashboard pages):
- `GET /api/v1/approvals?rail=<rail>` — returns pending unified approvals for the authenticated owner, filtered by rail. Extracts rail-specific display fields from `metadata` JSONB (Rail 1: `resource_url`; Rail 2: `product_name`, `shipping_address`).
- `POST /api/v1/approvals/decide` — accepts `{ approval_id, decision }` (approval_id is the `ua_...` string), verifies ownership, calls `resolveApproval()` with stored HMAC token.
- All four rail dashboard pages (Stripe Wallet, Card Wallet, Split-Knowledge Cards, Sub-Agent Cards) use these centralized endpoints. No rail-specific approval endpoints remain.

**Metadata JSONB**: Rail-specific display data is stored in the `metadata` column of `unified_approvals` when checkout routes call `createApproval()`:
- Rail 1: `{ recipient_address, resource_url }`
- Rail 2: `{ productLocator, product_name, quantity, shipping_address }`
- Rail 4: checkout confirmation details
- Rail 5: checkout details

**Storage**: `server/storage/approvals.ts` — `createUnifiedApproval`, `getUnifiedApprovalById`, `getUnifiedApprovalByRailRef`, `decideUnifiedApproval`, `closeUnifiedApprovalByRailRef`, `getUnifiedApprovalsByOwnerUid`.
- **DB Table**: `unified_approvals` with columns: id, approvalId, rail, ownerUid, ownerEmail, botName, amountDisplay, amountRaw, merchantName, itemName, hmacToken, status, expiresAt, decidedAt, railRef, metadata, createdAt.
- **Env Vars**: `UNIFIED_APPROVAL_HMAC_SECRET` (falls back to `HMAC_SECRET` or default).
- **Dropped Tables**: `privy_approvals` and `crossmint_approvals` have been removed from schema and dropped from the database. `checkout_confirmations` (Rail 4) remains separate because it doubles as a spend-tracking ledger for daily/monthly budget aggregations.

### Central Orders (`lib/orders/`, `server/storage/orders.ts`)
Unified cross-rail order tracking for all vendor purchases. Every confirmed purchase across all 4 rails creates a row in the `orders` table.
- **Schema**: `orders` table in `shared/schema.ts` with columns for product info (name, image, URL, description, SKU), vendor (name, details JSONB), pricing (price_cents, taxes_cents, shipping_price_cents, currency), shipping (address, type, note), tracking (carrier, number, URL, estimated_delivery), and references (owner_uid, rail, bot_id, wallet_id/card_id, transaction_id, external_order_id).
- **Storage**: `server/storage/orders.ts` — CRUD methods: `createOrder`, `getOrderById`, `getOrderByExternalId`, `getOrdersByOwner` (with filters: rail, botId, walletId, cardId, status, dateFrom, dateTo), `getOrdersByWallet`, `getOrdersByCard`, `updateOrder`.
- **Order creation module**: `lib/orders/create.ts` exports `recordOrder()` — single entry point all rails call after a confirmed purchase. `lib/orders/types.ts` defines `OrderInput` interface.
- **Rail wiring** (order creation fires ONLY after confirmed execution, never on pending requests):
  - Rail 1: `lib/approvals/rail1-fulfillment.ts` (approved) + `app/api/v1/stripe-wallet/bot/sign/route.ts` (auto-approved)
  - Rail 2: `lib/approvals/rail2-fulfillment.ts` (approved) + `app/api/v1/card-wallet/bot/purchase/route.ts` (auto-approved). Webhooks update order via `storage.getOrderByExternalId()` + `storage.updateOrder()`.
  - Rail 4: `lib/approvals/rail4-fulfillment.ts` (approved) + `app/api/v1/bot/merchant/checkout/route.ts` (auto-approved)
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
Bot linking/unlinking is centralized in `lib/agent-management/bot-linking.ts`. A single `linkBotToEntity(rail, entityId, botId, ownerUid)` / `unlinkBotFromEntity(rail, entityId, ownerUid)` function handles all four rails with uniform rules:
- **Max 3 entities per bot** enforced across all rails (was previously only Rail 4)
- **Ownership validation** — entity and bot must both belong to the authenticated user
- **Bot existence check** — bot must exist before linking
- **Webhook firing** — `rails.updated` with `wallet_linked`/`wallet_unlinked` (Rails 1/2) or `card_linked`/`card_removed` (Rails 4/5) on every link/unlink (was previously inconsistent)
- Rail configs are declarative objects specifying storage methods, entity types, webhook actions, and count queries
- Route files are thin wrappers: auth + call shared function + return result

### Shared Wallet/Card UI (`components/wallet/`)
All wallet and card page UI is consolidated into `components/wallet/` to eliminate duplication across Rails 1, 2, 4, and 5. Setup wizards are NOT in this folder — they remain in their original locations.
- **`types.ts`** — Unified types including `NormalizedCard` (common shape both rails map into), plus `normalizeRail4Card()` and `normalizeRail5Card()` converters.
- **`card-visual.tsx`** — Credit card visual (chip, masked card number, expiry, brand). Used by Rails 4 & 5.
- **`crypto-card-visual.tsx`** — Crypto wallet visual (wallet icon + bot name + address with copy, balance + "USDC on Base" with inline sync/basescan/transfer icons, guardrails panel, status badge + three-dot menu). No chip, no card number. Used by Rails 1 & 2.
- **`credit-card-item.tsx`** — **Unified card+action bar component** for all credit card rails. Renders `CardVisual` + identical action bar (Manage, Freeze, Add Agent/Bot badge, More menu) from a `NormalizedCard`.
- **`credit-card-list-page.tsx`** — **Full page shell** used by both Rail 4 and Rail 5. Handles header, add button, setup wizard, explainer, loading/empty states, card grid, freeze/link/unlink dialogs. Pages just pass a config object. Supports optional `transactionsEndpoint`/`approvalsEndpoint` to enable Transactions/Approvals tabs.
- **`rail-page-tabs.tsx`** — **Shared tab shell** used by all rail pages. Accepts `RailTab[]` config with `id`, `label`, `content`, optional `hidden` and `badge` count. Renders shadcn Tabs with dynamic grid columns.
- **`transaction-list.tsx`** — **Shared transaction table** (financial ledger). Displays type, amount, balance after, details, status, date. Used by Rails 1 and 2.
- **`order-list.tsx`** — **Shared order list + detail dialog**. Card-style list with OrderTimeline, tracking info, shipping address, and refresh-status button. Used by Rail 2.
- **`approval-list.tsx`** — **Shared approval queue**. Supports `crypto` variant (amount + resource URL) and `commerce` variant (product name + shipping). Used by Rails 1 and 2.
- **`wallet-selector.tsx`** — **Shared wallet dropdown** for filtering transactions/orders by wallet.
- **`status-badge.tsx`** — Reusable status badge (active/frozen/pending).
- **`wallet-action-bar.tsx`** — Base action bar (accepts action items array, badge, menu); used by crypto pages and `CreditCardItem`.
- **`crypto-wallet-item.tsx`** — **Unified wallet+action bar component** for crypto rails. Wraps `CryptoCardVisual` + `CryptoActionBar`. Card handles inline actions (copy, sync, basescan, transfer) and three-dot menu (add agent, unlink bot). Action bar handles Fund/Pause/Guardrails/Activity.
- **`crypto-action-bar.tsx`** — Crypto wallet action bar (Fund, Pause/Activate, Guardrails, Activity, Bot badge).
- **`hooks/use-wallet-actions.ts`** — Shared freeze, sync balance, copy address, approval decision, sync-and-patch handlers (accepts rail-specific config).
- **`hooks/use-bot-linking.ts`** — Shared link/unlink bot state and handlers. Also used by Rail 2 for bot list in create dialog.
- **`hooks/use-transfer.ts`** — Shared transfer dialog state and handler (Rails 1 & 2).
- **`hooks/use-guardrails.ts`** — Shared guardrail form state, open/save logic. Supports `crypto` variant (direct USD values) and `card` variant (micro-USDC multiplier + procurement controls save).
- **`dialogs/`** — Freeze, link-bot, unlink-bot, transfer, guardrail, create-crypto-wallet dialogs.
- **`index.ts`** — Barrel export for all components, hooks, types, and dialogs.

Rail 4 (`self-hosted/page.tsx`) and Rail 5 (`sub-agent-cards/page.tsx`) are ~43 lines each — pure config objects passed to `CreditCardListPage`. Both rails render identical UI structure, identical action bars, identical dialogs. The only differences are the config: API endpoint, data normalizer, explainer content, and setup wizard component. Adding transaction/approval tabs to these rails = add endpoint URLs to the config object.

### Unified Tab Structure
All rail pages use a consistent tab structure via `RailPageTabs`:

| Tab | Shows | Rail 1 | Rail 2 | Rail 4/5 |
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
- `/self-hosted`: Self-hosted card management (Rail 4)
- `/sub-agent-cards`: Sub-agent card management (Rail 5)
- `/transactions`: Transaction history, orders, and unified approvals (three tabs)
- `/skill-builder/submit`: Community vendor skill submission
- `/skill-builder/review/[id]/versions`: Version history with diff view and rollback
- `/skill-builder/export`: Export delta report for ClawHub.ai and skills.sh
- `/settings`: Account settings
- `/onboarding`: Guided setup wizard

### Skill Builder Module
An LLM-powered tool that analyzes vendor websites and generates procurement skill files automatically.
- **Builder Core** (`lib/procurement-skills/builder/`): 4-pass analysis (API probing, LLM checkout flow analysis, business feature detection, protocol support checking) with per-field confidence scoring.
- **Database Tables:** `skill_drafts` (vendor analysis results with confidence scores), `skill_evidence` (provenance records for each field), `skill_versions` (versioned snapshots with 4-file bundles), and `skill_exports` (export tracking per destination).
- **API Routes:** `POST /api/v1/skills/analyze` (trigger analysis), `GET /api/v1/skills/drafts` (list), `GET/PATCH/DELETE /api/v1/skills/drafts/[id]` (CRUD), `POST /api/v1/skills/drafts/[id]/publish` (approve and create versioned record with all 4 files).
- **Version API:** `GET /api/v1/skills/versions?vendor=slug` (list), `GET /api/v1/skills/versions/[id]` (detail), `GET /api/v1/skills/versions/[id]/diff` (semantic diff), `POST /api/v1/skills/versions/[id]/rollback` (rollback), `GET /api/v1/skills/versions/[id]/files` (4-file bundle download).
- **Export API:** `GET /api/v1/skills/export?destination=clawhub|skills_sh` (delta report), `POST /api/v1/skills/export/mark` (mark as exported, supports batch), `GET /api/v1/skills/export/download/[vendorSlug]` (download active version package).
- **Review UI:** `/skill-builder/review` (draft queue with analyze form) and `/skill-builder/review/[id]` (detail editor with confidence badges, evidence snippets, field overrides, publish/reject buttons).
- **Security:** SSRF-safe fetching with DNS resolution validation, private IP blocking (IPv4/IPv6), redirect validation, HTTPS-only.
- **Tests:** 41 API endpoint tests covering full draft lifecycle, 52 versioning unit tests.

### Skill Versioning & Multi-File Packages
Skills are packaged as 4-file bundles: `SKILL.md` (agent instructions), `skill.json` (structured metadata), `payments.md` (CreditClaw payment rules), `description.md` (human-readable listing card).
- **Package Generators** (`lib/procurement-skills/package/`): `skill-json.ts`, `payments-md.ts`, `description-md.ts` plus existing `generator.ts` for SKILL.md.
- **Versioning Core** (`lib/procurement-skills/versioning/`): Semantic field-level diff algorithm with severity classification (breaking/notable/minor), automatic semver bumping, SHA-256 checksums, and rollback support.
- **Export System:** Weekly manual export workflow with delta reports showing new/updated skills for ClawHub.ai and skills.sh external marketing sites. Mark-as-exported tracking per destination.

### Agent Management (`lib/agent-management/`)
Bot/agent-facing API infrastructure consolidated into a feature folder:
- `auth.ts` — authenticates bot requests via Bearer API key (prefix lookup + bcrypt verify).
- `crypto.ts` — API key generation, hashing, verification, claim tokens, card IDs, webhook secrets.
- `rate-limit.ts` — token-bucket rate limiter with per-endpoint config (19 endpoints).
- `agent-api/middleware.ts` — `withBotApi()` wrapper: auth → rate limit → handler → access log → webhook retry.
- `agent-api/status-builders.ts` — `buildRail{1,2,4,5}Detail()` functions for `/bot/status` and `/bot/check/*` responses.

### Bot Status & Check API
- **Unified Status:** `GET /api/v1/bot/status` — cross-rail status, balances, master guardrails, default rail.
- **Per-Rail Detail:** `GET /api/v1/bot/check/rail{1,2,4,5}` — deep operational info per rail (guardrails, allowances, approval mode, domain/merchant rules).
- **Preflight:** `POST /api/v1/bot/check/rail4/test` — dry-run validation for Rail 4 purchases (no side effects).
- **Shared builders:** `lib/agent-management/agent-api/status-builders.ts` — reusable functions for building per-rail detail responses.
- **Owner Rail Management:** `GET /api/v1/bots/rails` — owner-facing aggregated rail connections per bot.

### Feedback / Support Widget
In-app feedback dialog accessible from the profile dropdown in the dashboard header. Authenticated users can submit bug reports, feature requests, billing questions, technical support requests, and general feedback.
- **Frontend:** `components/dashboard/feedback-dialog.tsx` — Dialog component using existing UI primitives (Dialog, Select, Textarea, Button). Manages own form state and submission.
- **Trigger:** Profile dropdown in `components/dashboard/header.tsx` — "Support" menu item with LifeBuoy icon between Settings and Log Out.
- **Backend:** `app/api/v1/feedback/route.ts` — POST endpoint, authenticated via `getSessionUser`, validates with Zod, sends formatted HTML+text email via SendGrid to support inbox.
- **No database storage** — feedback goes straight to email. `replyTo` is set to the user's email for direct replies.
- **Security:** All user-supplied content is HTML-escaped before email insertion. Message length capped at 5000 chars.
- **Config:** `SUPPORT_EMAIL` env var (defaults to `support@creditclaw.com`).

### API Endpoints
CreditClaw provides distinct API endpoints for each rail and for master guardrails, facilitating wallet management, transactions, approvals, and guardrail configuration. Bot-facing APIs allow for purchase requests, status polling, and skill discovery. Owner-facing APIs manage cards, guardrails, and approvals.

## External Dependencies
- **Firebase Auth:** User authentication and authorization.
- **PostgreSQL:** Primary application database.
- **Drizzle ORM:** Database interaction.
- **Stripe:** Payment processing for funding, payment links, and Crypto Onramp.
- **Privy (@privy-io/node):** Server wallet management (Rail 1).
- **viem:** Ethereum utility library (Rail 1).
- **canonicalize:** JSON canonicalization for signatures (Rail 1).
- **CrossMint:** Smart wallet creation, fiat onramp, and commerce orders API (Rail 2).
- **Svix:** Webhook signature verification for CrossMint (Rail 2).
- **SendGrid:** Transactional email services.
- **shadcn/ui:** UI component library.
- **React Query (@tanstack/react-query):** Server state management.
- **Anthropic (@anthropic-ai/sdk):** LLM-powered vendor analysis for Skill Builder.
- **react-markdown + remark-gfm + @tailwindcss/typography:** Markdown rendering for documentation pages.

### Testing (`tests/`, `docs/testing.md`)
Two layers of testing:
- **Automated unit tests** (`tests/`): Vitest-based test suite. Run with `npx vitest run`. Config in `vitest.config.ts` with `@/` path alias.
  - `tests/x402/receive.test.ts` — x402 header parsing (`parseXPaymentHeader`), payment validation (`validateX402Payment`), dedupe keys (29 tests)
  - `tests/rail1/x402-utils.test.ts` — EIP-712 typed data building, nonce generation, x402 payment header encoding, USDC formatting utilities (19 tests)
  - `tests/guardrails/evaluate.test.ts` — guardrail evaluation for both USDC rails (`evaluateGuardrails`) and card rails (`evaluateCardGuardrails`), covering per-tx limits, daily/monthly budgets, approval thresholds (18 tests)
- **Manual integration tests** (`docs/testing.md`): curl-based test suite covering bot registration, wallet ops, purchases, guardrails, checkout pages, x402 endpoints. Sections 1-12 cover core API, Section 13 covers checkout & x402, Section 14 references the automated tests.

### Database Schema Workflow
Schema changes flow through Drizzle ORM and are auto-synced to production on deploy:
1. Edit `shared/schema.ts` — add/modify tables, columns, indexes, constraints
2. Run `npx drizzle-kit push --force` locally to sync dev database
3. Deploy — Replit's deployment platform runs `drizzle-kit push` automatically against production
4. **Never make manual SQL changes** to the database without updating `shared/schema.ts` to match. Manual DDL causes naming drift (PostgreSQL uses `_key` for unique constraints, Drizzle expects `_unique`) which blocks non-interactive deployments.
5. Config: `drizzle.config.ts` points at `DATABASE_URL` with `pg` driver
6. The `spending_permissions` table exists in both databases but is not tracked in the schema (legacy table)

### Documentation System (`docs/content/`, `app/docs/`)
Self-hosted documentation at `/docs` with sidebar navigation, audience toggle (User Guide / Developers), and markdown rendering.
- **Config**: `docs/content/sections.ts` — typed section/page registry with audience tagging.
- **Layout**: `app/docs/layout.tsx` — persistent sidebar with audience toggle. `app/docs/page.tsx` redirects to first page.
- **Renderer**: `app/docs/[...slug]/page.tsx` — reads markdown from `docs/content/{section}/{page}.md`, renders via `react-markdown` with `prose` typography classes. Prev/next navigation at bottom.
- **User docs** (27 pages): Getting Started, Bots, Wallets, Guardrails, Selling, Settings, Transactions, Skills.
- **Developer docs** (13 pages): API Overview (introduction, authentication), API Endpoints (wallets, bots, checkout-pages, invoices, sales, skills), Webhooks (setup, events), Agent Integration (quick-start, x402-protocol, mcp placeholder).
- **URL pattern**: `/docs/{section-slug}/{page-slug}`. Developer docs use `/docs/api/...` prefix.
- **Tailwind**: Typography plugin added via `@plugin "@tailwindcss/typography"`, source added via `@source "../docs"` in `app/globals.css`.
- **LLM access**: Raw markdown endpoint at `GET /api/docs/{section}/{page}` (Content-Type: text/markdown). Each doc page has "Copy for LLM" and "View as Markdown" buttons. `GET /llms.txt` serves a structured index of all docs with markdown links. `GET /llms-full.txt` concatenates all docs into a single file.