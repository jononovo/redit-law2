---
name: crossmint-checkout-runtime
description: "Crossmint Agent Checkout runtime of the managed-agents module — the auto-provisioned managed agent (branded 'Captain Crunch') that buys from any store via Crossmint's Agent Checkout API, paying with the owner's virtual cards. Technical plan + runtime doc."
created: 2026-07-13
last_updated: 2026-07-14
---

# Managed Agents — Crossmint Agent Checkout runtime (Captain Crunch)

> **Every account gets a first-party managed agent, branded "Captain Crunch", that can buy from almost any store: the owner pastes a product URL + plain-language instructions on the `/managed-agents` page, picks one of their virtual cards, and Crossmint's Agent Checkout API drives a remote browser through the merchant's checkout. When the remote agent asks for payment, our server mints a one-time merchant-locked PAN from the selected Rail 3 card and submits it — card numbers never touch the browser.**

This is the **first runtime of the managed-agents module** — read `managed-agents.md` (sibling in this folder) first for the module overview: what a managed agent is, the shared `managed_agents` settings table, and how future runtimes slot in.

---

## Purpose

- Give every signup a working agent on day one (before they connect their own), exercising virtual cards end-to-end with zero agent-side setup.
- First consumer of Crossmint's **Agent Checkout API** (`/api/unstable/agent-checkouts`): create checkout → poll → answer user-actions → receipt.
- Dashboard presence: listed as an agent (with a managed badge) on `/agents` and the overview, **without** replacing the "add your own agent" CTA.

## Why It Exists (Tier 3 — owner approval required to change)

The platform's pitch is "give your agent spending power" — but most signups don't have an agent yet. Captain Crunch closes that gap: it demonstrates the full virtual-card loop (vault → mint → merchant-locked one-time PAN → receipt) using only first-party infrastructure, and doubles as the reference integration for Crossmint Agent Checkouts. The public name lives as **data in the runtime registry** (`MANAGED_AGENT_RUNTIMES['crossmint-checkout'].displayName`), not as a code identifier, because "Captain Crunch" may need a rename before public launch (Quaker trademark) — branding is a display string in the registry, not a constant threaded through the app.

## Relationship to the Master Agent plan

This runtime is the **first incarnation** of the managed-agent thesis from `_payment_build_ideas/260528_rail3-master-agent-plan.md` (converged direction 2026-06-04), using Crossmint's hosted Agent Checkout runtime. It does **not** retire that plan: a self-hosted browser-use master agent may still be built later (owner-confirmed 2026-07-13) and would slot in as a **sibling runtime** of the managed-agents module, reusing the surfaces built here (the `/managed-agents` observance page, the `managed_agents` settings seam, the `managed_agent_checkouts` runs table, the form-factor-agnostic engine API). Deliberate v1 divergences from that doc's converged direction (owner-approved 2026-07-13, in-conversation):
- **Rail 3 only in v1** (not Rail 1 + Rail 3): the Crossmint checkout runtime takes card payment; stablecoin flows stay out of scope.
- **Dashboard page, not a separate tenant**: `/managed-agents` inside the existing dashboard; the engine (`features/managed-agents/crossmint-checkout/`) stays form-factor-agnostic so other surfaces (CLI, tenant) can consume the same API later.
- **Compliance / actor-of-record (GATING for launch, not build)**: the master-agent doc and `260528_rail3_open-points.md` flag AML/KYC/dispute exposure when CreditClaw executes on a user's card. Mitigation argument: the owner initiates every checkout in-session (owner-present, per-purchase consent; we submit credentials minted under their own card's mandates). **Owner must sign off on this before public launch.**

---

## How It Works

```
Owner (on /managed-agents page)                CreditClaw server                        Crossmint
  1. pick card, paste URL + request  ──────▶  POST /api/v1/managed-agents/checkouts
                                              ensure buyer profile ─────────────────▶  POST /buyer-profiles (once per managed agent)
                                              create checkout ────────────────────▶   POST /agent-checkouts {target, buyerProfileId, constraints}
  2. page polls every ~2s ─────────────────▶  GET /api/v1/managed-agents/checkouts/:id
                                              sync status ───────────────────────▶    GET /agent-checkouts/:id
                                              ── if awaiting_user_action is CARD:
                                              card checks → fetchOneTimeCredentials
                                              → POST .../actions/:actionId (values)   (server-side; PAN never reaches browser)
                                              ── if other user action: return schema
  3. non-card questions (OTP, choices) ────▶  POST /api/v1/managed-agents/checkouts/:id/actions/:actionId
  4. terminal status → receipt shown          update rail3_transaction + recordOrder
```

Key properties:

- **User-present model — no background jobs.** The dashboard page does the polling; our `GET` route proxies one Crossmint status fetch per poll and auto-answers card actions inline. If the tab closes, the checkout continues at Crossmint; the row re-syncs on the next page visit. No cron, no queue, no webhooks (Crossmint has none in v1 anyway).
- **User-present auth — no refresh-token exchange.** All owner-side routes take the browser's Firebase idToken via `authFetch` → `extractBearerJwt(request)` (precedent: `app/api/v1/rail3/cards/route.ts:118-124`) and relay it to Crossmint in `jwt` mode. `getFreshIdToken`/`reauth_required` is NOT needed in v1. **Caveat:** `authFetch` attaches the Bearer only when the Firebase client is hydrated (`auth-fetch.ts:18-24`) — a cookie-authenticated request can arrive with no JWT. The sync route returns 401 `bearer_required` in that case and the poller silently retries (hydration resolves in seconds); the card mint only ever runs when a JWT is present.
- **Card handoff = existing Rail 3 mint.** `fetchOneTimeCredentials({ jwt, orderIntentId, merchant })` (`features/payment-rails/rail3/credentials.ts:19`) — the same call the bot checkout route makes. Merchant = product URL host + buyer country. A `rail3_transactions` row is created at mint (`credentials_issued`), flipped to `charged` with the receipt amount at completion, plus `recordOrder(rail: "rail3")` — so history shows up in all existing surfaces for free.
- **Default card + per-checkout override.** Captain Crunch is NOT linked to one card (unlike external bots). The owner sets a preferred card (`managed_agents.default_card_id`, via `PATCH /api/v1/managed-agents/default-card`); the form preselects it (validated against the active-cards list — self-healing if revoked/expired, falls back to first active). Picking a different card for one run never writes the default. Server checks at checkout: card belongs to owner, `status === "active"`, `!isFrozen`, `evaluateMasterGuardrails(ownerUid, 0)` not blocking — same gate set as `app/api/v1/bot/rail3/checkout/route.ts`, minus bot-linkage.
- **Payment is submit-only (verified with Crossmint docs 2026-07-14).** Crossmint's Agent Checkout has NO by-reference/pass-a-card-id mechanism — the create-checkout schema has no payment field, buyer profiles carry no payment block, and card details can ONLY be provided by submitting a one-time number into the payment user-action mid-run. So the "default card" is a *funding preference* (which virtual card the one-time number is minted from), not a reference handed to Crossmint. See `_research/260713-crossmint-agent-checkouts-api.md`.

---

## Build Plan

### A. Runtime registry + provisioning

1. `lib/managed-agents.ts` — the **runtime registry** (no per-runtime code constants leak into the app): `MANAGED_BOT_TYPE = "managed"`, `MANAGED_AGENTS_ROUTE = "/managed-agents"`, the `ManagedRuntime` type, `CROSSMINT_CHECKOUT_RUNTIME = "crossmint-checkout"`, and the `MANAGED_AGENT_RUNTIMES` record mapping each runtime to `{ displayName, description }` (so `MANAGED_AGENT_RUNTIMES['crossmint-checkout'].displayName === "Captain Crunch"` — branding is data, not an identifier). `agentPlatform` stays **null** — `botType === "managed"` is the sole discriminator ("creditclaw" is not in the closed `AGENT_PLATFORMS` enum and would render as a raw string in platform pills). The dashboard route is `/managed-agents` (owner decision 2026-07-14 — the marketing page that previously held that URL moved to `/managed-payment-agents`).
2. **Lazy, race-safe get-or-create** in `GET /api/v1/bots/mine` (the one endpoint both target pages already call — it is hit 4× in parallel on overview, so this MUST be conflict-safe AND cheap):
   - Uniqueness lives on `managed_agents`, **not** `bots`: `uniqueIndex("managed_agents_owner_runtime_uidx").on(managedAgents.ownerUid, managedAgents.runtime)`. **There is no `bots.managed_runtime` column and no bots-level uniqueness index** — the one-per-(owner, runtime) invariant is enforced entirely by the `managed_agents` unique index.
   - `storage.ensureManagedAgent(ownerUid, ownerEmail, runtime)`: **select-first** on `managed_agents` (matching the actual rail3 precedent `app/api/v1/rail3/cards/route.ts:67-81` — no write on the hot path when the row exists). On miss, it **creates BOTH rows in one transaction**: the `bots` row (`bot_type: 'managed'`) and the `managed_agents` settings row that points at it via `bot_id`. The `managed_agents` insert is the one guarded by `managed_agents_owner_runtime_uidx`; **a lost race rolls the whole transaction back — including the bot insert — so no orphan `bots` rows are ever left behind.** Re-select after rollback to return the winner's rows.
   - Bot insert shape = the pre-claimed variant from `app/api/v1/bots/register/route.ts:144-150`: `walletStatus: "active"`, `ownerUid`, `claimedAt: now`, `claimToken: null`, `botType: "managed"`, `agentPlatform: null`, plus `apiKeyHash`/`apiKeyPrefix` from a generated-and-discarded key (bcrypt hash satisfies notNull; nothing external ever holds the key).
   - **Email fallback**: the route's auth user can have `email: null`; fall back to the `owners.email` row (notNull) before inserting.
   - **Failure isolation**: the ensure call is wrapped in try/catch — provisioning failure degrades to a plain bot listing, never a 500.
   - **Separate response key — managed bots are NOT in the `bots` array.** `bots/mine` returns them under `managed_agents: [...]` (an **array**) alongside `bots`/`pending_pairings` (same pattern as `pending_pairings`). Rationale: six existing consumers treat every `bots[]` row as a linkable external agent (link-bot dialogs ×3, add-card picker, rail5 wizard, orders filter) and would otherwise offer card/wallet linking to an agent whose API key doesn't exist. With its own key, only the agents page and overview render it — deliberately. It's an **array**, not a single object, because the module can provision more than one runtime per owner over time (one managed agent per (owner, runtime)).

### B. Schema (all additive — safe `db:push` on local → Replit dev → prod)

3. `managed_agent_checkouts` table: `id` serial PK, `checkoutId` text notNull unique (ours, `achk_` + hex — generator alongside `features/managed-agents/crossmint-checkout/ids.ts`), `crossmintCheckoutId` text unique, `ownerUid` notNull, `botId` notNull, `cardId` notNull, `productUrl` notNull, `request` text notNull, `merchantContext` text, `maxCostCents` integer, `status` text notNull default `"created"` (`created | running | awaiting_user_action | succeeded | failed | cancelled`), `rail3TransactionId` text, `receipt` jsonb, `lastEvent` text, `createdAt`/`updatedAt`. Index on `ownerUid`. (This is the runtime's **runs table** — a future runtime gets its own runs table alongside it; see `managed-agents.md`.)
4. `managed_agents` table — the **settings/identity row** for each managed agent, **one per (owner, runtime)**: `ownerUid` notNull, `runtime` text notNull (`crossmint-checkout` today), `botId` notNull **unique** (points at the provisioned `bots` row), `buyerProfileId` text (nullable) — the Crossmint buyer profile — and `defaultCardId` text (nullable) — the owner's preferred funding card. Unique index `managed_agents_owner_runtime_uidx` on `(ownerUid, runtime)`. **This replaces the two former `owners` columns** (`crossmint_buyer_profile_id`, `default_agent_checkout_card_id`), which are gone — buyer-profile + default-card state is per managed agent, not per owner.
   The buyer profile is created on first checkout from the default shipping address (`storage.getDefaultShippingAddress`) + owner email, and persisted onto `managed_agents.buyer_profile_id`. No default address → 422 `shipping_address_required` (page links to shipping settings).
   **Buyer-profile shape (verified against Crossmint docs 2026-07-13)** — stricter than our rows: `{ label, name: { first, last }, contact: { email }, shipping: { addressLines: [line1, line2?], locality: city, administrativeAreaCode: "<country>-<state>" (ISO-3166-2, e.g. "US-CA"), postalCode, countryCode } }`. Mapping must split our single `name` into first/last (first word / rest) and compose `administrativeAreaCode` from `country` + `state`.

### C. Server — `features/managed-agents/crossmint-checkout/`

All modules `import "server-only"`, mirroring rail3.

5. `client.ts` — `agentCheckoutsFetch(path, { jwt, method, body })`: base `https://www.crossmint.com/api/unstable/agent-checkouts`, headers `X-API-KEY: <client key>`, `Authorization: Bearer <jwt>`, `Origin: RAIL3_CROSSMINT_CLIENT_ORIGIN` (mirrors `crossmintCardsFetch`, `features/payment-rails/rail3/client.ts:47-83`); reuse `unwrapCrossmint`/`CrossmintApiError` from the rail3 client. **No separate env var** — reuses the existing `NEXT_PUBLIC_CROSSMINT_CLIENT_API_KEY` (the Crossmint console key must carry **agent-checkouts + buyer-profiles** scopes in addition to card-permissions).
6. `buyer-profile.ts` — `ensureBuyerProfile(ownerUid, jwt)`: return the managed agent's stored `buyer_profile_id` or create + persist it onto the `managed_agents` row.
7. `service.ts` — the only stateful logic:
   - `startCheckout(owner, jwt, input)`: card gate checks → ensure buyer profile → Crossmint create (`target: { kind: "direct_url", url, request }`, `constraints.maxCost` when set) → insert row.
   - `syncCheckout(row, jwt)`: Crossmint GET → map status → **if pending action's `responseSchema` requests card fields** (detect by field names, e.g. `cardNumber`/`number` + `cvc`): run card gates again, `fetchOneTimeCredentials`, `createRail3Transaction(status: "credentials_issued", botId: <the managed agent's bot>)`, submit action values, never return card fields to the client. **Any other action**: persist status and return `{ pending_user_action: { id, expires_at, response_schema } }` for the page to render. On `succeeded`: `updateRail3Transaction(status: "charged", amountCents from receipt)` + fire-and-forget `recordOrder` (fields per `app/api/v1/bot/rail3/confirm/route.ts:36-49`, plus `productUrl`).

### D. API routes — owner-auth conventions from `app/api/v1/rail3/cards/route.ts`

8. `app/api/v1/managed-agents/checkouts/route.ts` — `POST` (zod: `card_id`, `product_url` (url), `request` (1–2000), `merchant_context?` (≤2000), `max_cost_cents?` (int ≥1)); `GET` — owner's checkout list, newest first, for the history panel. Plus `app/api/v1/managed-agents/default-card/route.ts` — `PATCH` to set `managed_agents.default_card_id`.
9. `app/api/v1/managed-agents/checkouts/[checkoutId]/route.ts` — `GET` = sync/poll (above); `DELETE` = cancel (Crossmint DELETE, tolerate 404 like `revokeOrderIntent`).
10. `app/api/v1/managed-agents/checkouts/[checkoutId]/actions/[actionId]/route.ts` — `POST` `{ values }` → submit non-card user action.
11. Error envelope: snake_case codes — `unauthorized`, `bearer_required`, `invalid_json`, `validation_error`, `card_not_found`/`forbidden`, `card_frozen`, `card_not_active`, `card_expired`, `master_guardrail`, `shipping_address_required`, `checkout_not_found`, `crossmint_error` (mapped from `CrossmintApiError.status`). **`card_expired`**: the documented "active ≠ spendable" gap (rail3-virtual-cards.md) — an expired order intent 400s at mint time with "has expired"; map that Crossmint error to `card_expired` with copy telling the owner to create a new virtual card, and pre-filter the card picker on `rail3_cards.expires_at`.

### E. UI

12. `app/(dashboard)/managed-agents/page.tsx` + `components/managed-agent/` — **this is an observance page**: once a checkout starts, the remote-session playback is the page. Layout mirrors Crossmint's own demo (progress rail left, large "Agent browser session" viewport center, instruction banner above).
    - `checkout-form.tsx` — the pre-run state: product URL input, "Buyer request" textarea (one instruction per line, placeholder mirrors Crossmint demo), card `Select` preloaded with first active card, `ExplainerToggleLink`/`ExplainerBlock`-style collapsible for optional merchant context, optional max-cost field. Start button posts, then the page swaps to the observance view.
    - `checkout-observer.tsx` — the run state: polls `GET` every ~2s while non-terminal. Center viewport renders the remote browser session **if the checkout payload exposes a view surface** (live-view URL / screenshot events — not in Crossmint's public docs yet; the first real checkout logs the full payload to discover the contract, and until then the viewport gracefully renders the event timeline). Progress rail with status/events, cancel button, receipt panel on success.
    - `user-action-modal.tsx` — user-in-the-loop requests render as a modal **over the playback** (shadcn Dialog), built from `pendingUserAction.responseSchema`: enums → option buttons, strings → inputs, booleans → toggles. Anything unrenderable → raw prompt text + a text input. Submits to the actions route. The engine stays form-factor-agnostic: all state lives in the API routes; this modal is just the dashboard renderer of it.
    - `checkout-history.tsx` — list from `GET /api/v1/managed-agents/checkouts`.
    - Styling: dashboard conventions — `rounded-2xl border border-neutral-100 bg-white shadow-sm` cards, `rounded-xl` inner elements, `data-testid` on every interactive element, `useToast` for errors.
13. `components/managed-agent/managed-agent-card.tsx` (`ManagedAgentCard`) — a **dedicated card component** (BotCard is untouched: it has no botType prop and threading one through both pages' local interfaces is needless churn). Styled identically to BotCard (same container/pill/status classes), "MANAGED" badge, links to `/managed-agents`, no settings/webhook affordances. Rendered explicitly by the agents page and overview from each entry in the `managed_agents` response array. The "add your own agent" CTA card stays as-is; agent counts do NOT include managed agents.
14. `components/dashboard/sidebar.tsx` — add to `mainNavItems`: `{ icon: Bot, label: MANAGED_AGENT_RUNTIMES[CROSSMINT_CHECKOUT_RUNTIME].displayName, href: MANAGED_AGENTS_ROUTE, tag: "beta" }`.

### F. Tests (per `tests/_README.md` — business logic only; add a Current Coverage row)

15. `tests/managed-agents/`:
    - card-action detection from sample `responseSchema`s (card vs OTP vs choice);
    - buyer-profile mapping from a shipping address row;
    - status mapping + transition guards (no double-mint on repeated polls of the same action id — assert idempotency via `rail3TransactionId` presence);
    - DB: `ensureManagedAgent` race (two concurrent inserts → one `managed_agents` row + one bot; the loser's transaction rolls back so no orphan bot; `managed_agents_owner_runtime_uidx` holds); `managed_agent_checkouts` storage round-trip.

### G. Docs & deploy checklist

16. This document (update Status when built) + `managed-agents.md` (the module overview) + add a row to the folder table in `payments_overview.md` ("What's in this folder") — that table, not frontmatter scanning, is this folder's actual index convention.
17. Capture the Crossmint Agent Checkouts API evidence (endpoints, buyer-profile shape, auth combo) in a short `_research/` note, mirroring how Card Permissions was documented before build.
18. **No new env var** — the runtime reuses `NEXT_PUBLIC_CROSSMINT_CLIENT_API_KEY`. **Owner action before deploy:** ensure the existing Crossmint console key is scoped for **agent-checkouts + buyer-profiles** (production), in addition to card-permissions. `AGENT_CHECKOUT_DEBUG=1` still logs the redacted create/submit payload for the first-checkout discovery.
19. Schema (all additive) — but **`npm run db:push` hangs on a pre-existing rail5_transactions prompt** (see `.agents/memory/db-push-and-test-baseline.md`): apply locally via direct `psql` SQL and keep `shared/schema.ts` in sync; hand the same SQL to the owner to run on Replit dev + prod **before** the code deploy. The migration (new `managed_agents` + `managed_agent_checkouts` tables, `bot_type='managed'` rows, drop of the two former `owners` columns) is written out in `REPLIT-DEPLOY-managed-agents.md` at repo root.

---

## Key Files (once built)

| Area | Path |
|---|---|
| Runtime registry | `lib/managed-agents.ts` (`MANAGED_BOT_TYPE`, `MANAGED_AGENTS_ROUTE`, `ManagedRuntime`, `CROSSMINT_CHECKOUT_RUNTIME`, `MANAGED_AGENT_RUNTIMES`) |
| Runtime checkout helpers | `lib/managed-agent-checkouts.ts` |
| Crossmint client | `features/managed-agents/crossmint-checkout/client.ts` |
| Service | `features/managed-agents/crossmint-checkout/service.ts` |
| Buyer profile | `features/managed-agents/crossmint-checkout/buyer-profile.ts` |
| Routes | `app/api/v1/managed-agents/checkouts/**`, `app/api/v1/managed-agents/default-card` |
| Page | `app/(dashboard)/managed-agents/page.tsx`, `components/managed-agent/*` |
| Provisioning | `server/storage/managed-agents/index.ts` (`ensureManagedAgent`), `app/api/v1/bots/mine/route.ts` |
| Schema | `shared/schema.ts` (`managedAgents`, `managedAgentCheckouts`, `managed_agents_owner_runtime_uidx`) |
| Reused rail3 | `credentials.ts` (`fetchOneTimeCredentials`), `client.ts` (`unwrapCrossmint`), guardrails `master.ts`, `rail3.ts` storage, `orders/create.ts` |

## Gotchas

- **Approval modes do not apply.** The owner initiating the checkout in-session IS the approval — mirroring the existing rail3 bot-checkout behavior (no `evaluateApprovalDecision` call; amount is unknown at mint time). This is deliberate, despite `payments_overview.md`'s "every rail hits the unified approvals queue" wording.
- **Production only.** Crossmint has no staging for Agent Checkouts — every test spends real money on the owner's real vaulted card. Test with a cheap item + `maxCost`.
- **`unstable` API.** Same version-churn risk as order-intents; keep all paths in `client.ts` only.
- **Card-action detection is heuristic** (responseSchema field names). Log unrecognized schemas; fall back to treating them as user actions rather than guessing.
- **Amount is unknown until receipt** — the rail3 transaction is `credentials_issued` with null amount until terminal success (same semantics as the bot flow). Rail 3 spend is not in master-guardrail totals (pre-existing behavior).
- **Merchant lock derives from the product URL host.** If a store's checkout completes on a different domain, the network-token layer handles it the same as the existing bot flow — but log merchant mismatch failures distinctly (`credential_fetch_failed` vs checkout-declined).
- **Checkout outlives the tab.** Crossmint keeps running; our row only updates when a page poll syncs it. History entries may show stale `running` until the page is next opened — acceptable v1.
- **No orphan bots on a lost provisioning race.** `ensureManagedAgent` inserts the bot and the `managed_agents` row in one transaction; if another request wins the `managed_agents_owner_runtime_uidx` race, the whole transaction (bot insert included) rolls back — so a `bots` row never exists without its `managed_agents` settings row.
- **The orphaned `steps/complete.tsx` precedent.** The old "auto-create USDC wallet" hook is dead code — do NOT copy it; provisioning goes through `bots/mine` get-or-create.

## Out of Scope (v1)

- A *guaranteed* live browser-session feed: the viewport is built into the observance page and renders whatever the payload exposes, but the stream contract is undocumented — discovery happens from the first real checkout's logged payload, and the owner is asking Crossmint directly. Until then the viewport shows the event timeline.
- Non-card payment methods (Shop Pay, bank transfer), sticky sessions / login-gated merchants, passing card up-front (Crossmint ships this later), webhooks, background checkout runner, per-card rail3 guardrail evaluation (table exists, still unconsumed), buyer-profile editing UI (recreate by clearing `managed_agents.buyer_profile_id`).

## Status

**Built + restructured into the managed-agents module 2026-07-14 — not yet deployed to Replit.** Needs the migration in `REPLIT-DEPLOY-managed-agents.md` at repo root (new `managed_agents` + `managed_agent_checkouts` tables, `bot_type='managed'` rows; the former `owners.crossmint_buyer_profile_id` and `owners.default_agent_checkout_card_id` columns are dropped). Payment confirmed submit-only against Crossmint docs. Still pending before public launch: naming ("Captain Crunch") trademark check, and the first real checkout logging the full payload (`AGENT_CHECKOUT_DEBUG=1`) to discover the live-view stream + exact card-action field names.
