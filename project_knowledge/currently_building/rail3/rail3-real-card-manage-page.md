# Rail 3 — Real Card Manage Page (Skinny Tile + Detail Route)

## Goal

Today the Rail 3 "real cards on file" tile in `PaymentMethodsStrip` shows almost nothing — brand, last4, an enrollment badge, and a virtual-card count — and has no way to drill in. Users can't see issuer, expiry, funding type, or billing info on a card they vaulted.

This plan keeps the skinny tile (real cards are plumbing, not the product) but makes each tile a link into a full **`/real-cards/[paymentMethodId]`** detail page that surfaces everything Crossmint actually shares about that PM, plus the virtual cards backed by it.

Scope: Rail 3 only. Virtual-card UI is untouched.

## What Crossmint actually shares (source of truth)

From the OpenAPI for `GET /unstable/payment-methods` (and the `onPaymentMethodSelected` SDK callback):

| Field | Notes |
|---|---|
| `paymentMethodId` | `pm_...` |
| `type` | always `"card"` |
| `default` | bool — Crossmint-side default flag |
| `display.imageUrl` | Crossmint-rendered card art URL |
| `card.source.type` | `"basis-theory-token"` |
| `card.source.id` | vault token id |
| `card.source.networkTokenId` | optional |
| `card.brand` | `visa \| mastercard \| amex \| discover \| jcb \| unionpay \| diners-club` |
| `card.last4` | string |
| `card.bin` | first 6 — used by our `lookupIssuer` |
| `card.fundingType` | **`credit \| debit \| prepaid \| unknown`** — this is the only valid enum, never "checking" |
| `card.expiration.month/year` | strings |
| `card.billing.name` | string |
| `card.billing.address.{line1,line2,city,stateOrRegion,postalCode,country}` | full address |
| `card.billing.phone` | string |

**Not exposed:** PAN, CVV, issuer name (we still derive locally from BIN), country of issue, currency, 3DS status.

**Live-only (separate calls):**
- `GET /payment-methods/{id}/agentic-enrollment` — `{ status: pending|active|failed, verificationConfig }` (already wired)
- `GET /order-intents` — virtual cards backed by this PM (we already filter client-side)

## Persistence changes (`shared/schema.ts`)

Add to `rail3_payment_methods`:

```ts
fundingType:        text("funding_type"),        // "credit" | "debit" | "prepaid" | "unknown"
isDefault:          boolean("is_default").notNull().default(false),
displayImageUrl:    text("display_image_url"),
billingAddress:     jsonb("billing_address"),    // { line1, line2?, city, stateOrRegion?, postalCode, country }
billingPhone:       text("billing_phone"),
sourceTokenId:      text("source_token_id"),     // card.source.id
networkTokenId:     text("network_token_id"),    // card.source.networkTokenId
```

Drizzle migration via `npm run db:push`. No backfill SQL needed — see "Backfill" below.

Update `rail3SavePaymentMethodSchema` (zod):

- **Widen `card_brand`** from `z.enum(["visa","mastercard"])` to the full Crossmint enum: `visa | mastercard | amex | discover | jcb | unionpay | diners-club`. Current narrow enum will reject any non-Visa/MC card on save.
- Add the new optional fields (only the basic ones the SDK currently emits — billing/funding/etc. come from the server-side Crossmint lookup, not the POST body):

```ts
funding_type:      z.enum(["credit","debit","prepaid","unknown"]).optional(),
display_image_url: z.string().url().optional(),
```

## Server-side hydration (NOT client-supplied)

Crossmint's documented `onPaymentMethodSelected` callback only guarantees `{ paymentMethodId }`. Anything beyond that (funding type, billing address, image URL, source token, default flag) must be pulled **server-side** from `listPaymentMethods({ userLocator })`, not trusted from the client.

The setup wizard's POST body stays minimal (`payment_method_id` only is sufficient — everything else is optional and ignored). The widened POST schema can still accept the basic display fields the SDK currently emits as a fast-path, but the server **always** does its own Crossmint lookup to fill the rest.

POST handler change (`app/api/v1/rail3/payment-methods/route.ts`):
1. Resolve user → `userLocator`.
2. Call `listPaymentMethods({ userLocator })`, find the PM with matching `paymentMethodId`.
3. Map every field from the Crossmint response to DB columns.
4. **Remove the `already_saved: true` early-return** — replace with an `updateRail3PaymentMethod` call so re-saves rehydrate. Same end state for the client.

## Backfill via GET reconciliation

Today `GET /api/v1/rail3/payment-methods` is a pure local read — no Crossmint call. Add a thin reconciliation step:

1. Call `listPaymentMethods({ userLocator })` once per request.
2. For each Crossmint PM, upsert into `rail3PaymentMethods` (insert if new — covers PMs created outside our wizard; update if existing field set differs).
3. Then return the local rows as today.

Cost: one extra Crossmint call per `/virtual-cards` page load. Owners have <10 PMs in practice (per existing rail3 docs), so this is cheap. Self-heals every old row on first visit.

The new per-PM detail endpoint does the same reconciliation scoped to that one PM, so visiting the manage page guarantees fresh data.

## GET response shape change

`GET /api/v1/rail3/payment-methods` adds:

```ts
{
  payment_methods: Array<{
    // existing fields…
    funding_type: "credit" | "debit" | "prepaid" | "unknown" | null,
    is_default: boolean,
    display_image_url: string | null,
    billing_address: { line1, line2?, city, state_or_region?, postal_code, country } | null,
    billing_phone: string | null,
    first6: string | null,
    created_at: string,
    last_used_at: string | null,
  }>
}
```

New endpoint:

```
GET /api/v1/rail3/payment-methods/[paymentMethodId]
```

Returns the same per-PM shape plus:
- `enrollment`: piggyback the same payload as `…/[id]/enrollment`
- `virtual_cards`: `Array<{ card_id, nickname, color, status, monthly_limit_cents, spent_cents, created_at }>` filtered to this PM

Saves the detail page from firing 3+ requests.

## Tile changes (`components/rail3/payment-methods-strip.tsx`)

Minimal. Wrap the existing row in a `<Link href={\`/real-cards/${pm.payment_method_id}\`}>`. Keep current density. Two display tweaks while we're in there (no layout change):

1. Replace hardcoded "Checking" with `funding_type` (capitalized) if present, else hide that segment entirely (no fake fallback per house rule on explicit failure).
2. Show issuer name (already computed) before the brand: `Chase · VISA •••• 4242 · Credit · 29 virtual cards`.

Keep the trash icon working as-is (it already hits `DELETE /api/v1/rail3/payment-methods/[id]` with the 409-on-active-virtual-cards guard).

## Detail page — `app/(dashboard)/real-cards/[paymentMethodId]/page.tsx`

Reuses existing dashboard chrome and `CardDetailShell` pattern from virtual-cards. Client component, `useEffect` + `authFetch` for the single combined endpoint above.

Layout (top to bottom):

1. **Header** — back link to `/virtual-cards`, breadcrumb "Real cards / VISA •••• 4242", small status pill (enrollment status).
2. **Card hero** — `CardVisual` rendered with a brand-derived color (visa=blue, mastercard=primary, amex=dark, etc. — local map, not user-pickable for real cards). Show Crossmint's `display.imageUrl` as a small thumbnail beside the hero if present, captioned "Issuer art".
3. **Card details grid** — issuer, brand, funding type, last4, BIN, expiry, default badge, created date, last used.
4. **Cardholder & billing** — name, full address, phone (only show fields present).
5. **Agentic enrollment** — status + "Re-verify" button if `failed` (passkey ceremony lives in the existing setup flow).
6. **Virtual cards backed by this card** — small list reusing the same row component as `/virtual-cards`, each linking into its existing detail page. Empty state: "No virtual cards yet — create one from Virtual Cards."
7. **Danger zone** — "Remove card" button. Same DELETE endpoint, same 409 surfacing.

No "set default" UI in this pass — Crossmint controls `default` server-side and we have only one real card in 99% of cases. If we want it later, add a `PATCH /api/v1/rail3/payment-methods/[id]` route that proxies to Crossmint.

## Sidebar

No new entry. Detail page is reached by clicking a tile under `/virtual-cards`. Keeps real cards framed as plumbing for virtual cards.

## Files touched

**New**
- `app/(dashboard)/real-cards/[paymentMethodId]/page.tsx`
- `app/api/v1/rail3/payment-methods/[paymentMethodId]/route.ts` (GET combined detail)

**Modified**
- `shared/schema.ts` — table + zod (widen `card_brand`, add `funding_type` / `display_image_url`)
- `components/wallet/types.ts` — `Rail3PaymentMethodInfo` gains all new display fields
- `app/api/v1/rail3/payment-methods/route.ts` — POST does server-side Crossmint lookup + upsert (kills `already_saved` early-return); GET does reconciliation pass before returning local rows
- `app/setup/rail3/page.tsx` — POST stays minimal (server hydrates), no callback dependency for new fields
- `server/storage/payment-rails/rail3-payment-methods.ts` — no shape change needed (`updateRail3PaymentMethod` already accepts `Partial`)
- `components/rail3/payment-methods-strip.tsx` — wrap row in `<Link>`, swap hardcoded "Checking" for `funding_type` (hide if null), prepend issuer
- `components/rail3/add-card-dialog.tsx` — consumes wider `Rail3PaymentMethodInfo`, no logic change

**Untouched on purpose**
- `components/wallet/card-visual.tsx`, virtual-card detail pages, sidebar, bin-lookup util, DELETE route (409 guard already correct), storage layer signatures

## Step order

1. Schema + zod + migration (`db:push`).
2. Storage layer + POST/GET hydration of new fields.
3. New combined GET `/[paymentMethodId]` endpoint.
4. Tile tweaks (link wrap + funding type + issuer).
5. Detail page.
6. Architect review.

## Verification notes (caught during plan review)

- `onPaymentMethodSelected` SDK callback only guarantees `paymentMethodId` per Crossmint docs — never trust it for funding/billing fields. **All enrichment is server-side via `listPaymentMethods`.**
- POST currently early-returns on existing PMs (`already_saved: true`) — replaced with an update path so re-saves rehydrate.
- `card_brand` zod enum currently narrow (`visa | mastercard`) — widened to Crossmint's full 7-brand enum or non-Visa/MC saves will 400.
- `GET /api/v1/rail3/payment-methods` is currently a pure local read — adding Crossmint reconciliation is the only path that backfills existing rows.
- DELETE route, BIN lookup, storage interface, and `CardDetailShell` need no changes.

## Open questions for confirmation before step 1

- Brand→color map for the hero `CardVisual` — OK to hardcode (visa=blue, mastercard=primary, amex=dark, discover=primary, others=dark)?
- Hide vs disable the trash icon on the tile when virtual cards exist — currently it hits 409, do we want to gray it out preemptively using `virtual_card_count > 0`?
