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

Update `rail3SavePaymentMethodSchema` (zod) to accept the new optional fields:

```ts
funding_type:      z.enum(["credit","debit","prepaid","unknown"]).optional(),
is_default:        z.boolean().optional(),
display_image_url: z.string().url().optional(),
billing_address:   z.object({
  line1: z.string(), line2: z.string().optional(),
  city: z.string(), state_or_region: z.string().optional(),
  postal_code: z.string(), country: z.string().length(2),
}).optional(),
billing_phone:     z.string().optional(),
source_token_id:   z.string().optional(),
network_token_id:  z.string().optional(),
```

## Client capture (`app/setup/rail3/page.tsx`)

In the existing `onPaymentMethodSelected` handler, extract the additional fields from the Crossmint SDK callback and POST them to `/api/v1/rail3/payment-methods`. No new endpoints — just a wider payload.

The SDK already returns the full `card` object; we're just persisting more of it.

## Backfill (no migration script needed)

The existing `GET /api/v1/rail3/payment-methods` route fetches from Crossmint, then upserts our DB row. Extend the upsert to also write the new fields. After the first GET per user, every row is hydrated. This avoids a one-shot migration script.

Concretely: in the GET handler, when reconciling Crossmint's `listPaymentMethods` response against our DB, write back `fundingType`, `default`, `displayImageUrl`, `billing.address`, `billing.phone`, `source.id`, `source.networkTokenId`.

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
- `shared/schema.ts` — table + zod
- `app/setup/rail3/page.tsx` — capture more fields from SDK callback
- `app/api/v1/rail3/payment-methods/route.ts` — POST accepts new fields; GET hydrates + returns new fields
- `server/storage/rail3.ts` (or wherever the PM upsert lives) — write new columns
- `components/rail3/payment-methods-strip.tsx` — wrap row in `<Link>`, swap hardcoded "Checking" for `funding_type`, prepend issuer

**Untouched on purpose**
- `components/wallet/card-visual.tsx`, virtual-card detail pages, sidebar, bin-lookup util

## Step order

1. Schema + zod + migration (`db:push`).
2. Storage layer + POST/GET hydration of new fields.
3. New combined GET `/[paymentMethodId]` endpoint.
4. Tile tweaks (link wrap + funding type + issuer).
5. Detail page.
6. Architect review.

## Open questions for confirmation before step 1

- Brand→color map for the hero `CardVisual` — OK to hardcode (visa=blue, mastercard=primary, amex=dark, discover=primary, others=dark)?
- Hide vs disable the trash icon on the tile when virtual cards exist — currently it hits 409, do we want to gray it out preemptively using `virtual_card_count > 0`?
