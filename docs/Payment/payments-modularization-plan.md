# Objective

Modularize the payment system so both the **checkout page** (`/pay/[id]`) and the **wallet top-up flow** (stripe-wallet page) use a unified, payment-method-agnostic architecture. Each payment method (Stripe Card/Bank, Base Pay, future QR) is a self-contained handler that receives a standard payment context and manages its own lifecycle. The pages become thin shells that provide context and render the selected handler.

---

# Current State (What We're Refactoring)

### Checkout Page (`app/pay/[id]/page.tsx`)
- **~550 lines**, no modular folder — everything in one file
- Stripe logic is hardcoded inline: `handlePay` creates a Stripe session, loads SDK scripts, mounts the widget via `mountRef`, listens for `fulfillment_complete`
- `onrampOpen` boolean toggles the entire right panel between "payment form" and "Stripe widget view"
- No concept of "payment methods" — it's just Stripe
- The page handles both payment context (amount, invoice, buyer info) AND payment execution (Stripe SDK lifecycle)

### Top-Up Flow (`app/app/stripe-wallet/page.tsx`)
- `useStripeOnramp()` hook manages the Stripe lifecycle
- `StripeOnrampSheet` component renders the widget in a slide-over Sheet
- `CryptoWalletItem.onFund` → directly calls `onramp.open()` (no method selection)
- `fundLabel` is hardcoded to "Fund with Stripe"

### Existing Module Structure
```
lib/crypto-onramp/                    ← Stripe-specific, misnamed as "generic"
├── types.ts                          ← OnrampSessionResult, OnrampWebhookEvent
├── stripe-onramp/
│   ├── types.ts                      ← StripeOnrampSessionPayload
│   ├── session.ts                    ← createStripeOnrampSession (server)
│   └── webhook.ts                    ← handleStripeOnrampFulfillment (server)
└── components/
    ├── use-stripe-onramp.ts          ← React hook (client) — script loading, session, mount
    └── stripe-onramp-sheet.tsx       ← Sheet UI (client)

lib/base-pay/                         ← Phase 1 backend (already built)
├── types.ts
├── verify.ts                         ← getPaymentStatus RPC verification
├── ledger.ts                         ← wallet crediting + transaction creation
└── sale.ts                           ← sale recording (checkout only)
```

---

# Target Architecture

## Core Concept: PaymentContext

Both surfaces (checkout and top-up) resolve the same information before any payment method runs:

```typescript
interface PaymentContext {
  mode: "checkout" | "topup";
  amountUsd: number;
  walletAddress: string;            // destination wallet

  // Checkout-specific (optional)
  checkoutPageId?: string;
  invoiceRef?: string;
  buyerEmail?: string;
  buyerName?: string;

  // Top-up-specific (optional)
  walletId?: number;
  botName?: string;
}
```

Each payment method handler receives this context and manages its own flow.

## Payment Method Handler Contract

Each payment method exposes:
1. **A button definition** — icon, label, subtitle (for the selector)
2. **A handler component** — receives `PaymentContext`, manages its own UI/state, calls `onSuccess`/`onError`

```typescript
interface PaymentMethodDef {
  id: string;                        // "stripe_onramp" | "base_pay" | "qr_wallet"
  label: string;
  subtitle: string;
  icon: React.ReactNode;
  supportedModes: ("checkout" | "topup")[];
}

interface PaymentHandlerProps {
  context: PaymentContext;
  onSuccess: (result: PaymentResult) => void;
  onError: (error: string) => void;
  onCancel: () => void;
}
```

## Target File Structure

```
lib/payments/                               ← NEW: unified payment module
├── types.ts                                ← PaymentContext, PaymentMethodDef, PaymentHandlerProps, PaymentResult
├── methods.ts                              ← registry of available methods + their metadata (label, icon, etc.)
├── handlers/
│   ├── stripe-onramp-handler.tsx           ← EXTRACTED from checkout page + use-stripe-onramp hook
│   ├── base-pay-handler.tsx                ← NEW: calls pay() SDK, posts to backend
│   └── (future: qr-wallet-handler.tsx)
└── components/
    ├── payment-method-selector.tsx         ← renders list of method buttons
    ├── checkout-payment-panel.tsx          ← right panel of checkout page (context + selector + active handler)
    └── fund-wallet-sheet.tsx               ← Sheet for top-up (context + selector + active handler)

lib/crypto-onramp/                          ← UNCHANGED — server-side Stripe logic stays here
├── stripe-onramp/
│   ├── session.ts                          ← still used by API routes
│   └── webhook.ts                          ← still used by webhook handler
└── types.ts

lib/base-pay/                               ← UNCHANGED — server-side Base Pay logic stays here
├── verify.ts, ledger.ts, sale.ts, types.ts
```

Key principle: `lib/crypto-onramp/` and `lib/base-pay/` remain **server-side backend modules**. The new `lib/payments/` module is the **client-side UI orchestration layer** that knows how to present and drive each method.

---

# Tasks

### T001: Create `lib/payments/types.ts` — shared type definitions
- **Blocked By**: []
- **Details**:
  - Define `PaymentContext` interface (mode, amountUsd, walletAddress, plus optional checkout/topup fields)
  - Define `PaymentResult` interface (status, method, transactionId, newBalanceUsd for topup, saleId for checkout)
  - Define `PaymentMethodDef` interface (id, label, subtitle, icon, supportedModes)
  - Define `PaymentHandlerProps` interface (context, onSuccess, onError, onCancel)
  - Files: `lib/payments/types.ts`
  - Acceptance: Types compile, cover both checkout and topup use cases

### T002: Create `lib/payments/methods.ts` — payment method registry
- **Blocked By**: [T001]
- **Details**:
  - Export `PAYMENT_METHODS: Record<string, PaymentMethodDef>` with definitions for:
    - `stripe_onramp`: label "Card / Bank", subtitle "Secure payment powered by Stripe", supportedModes: ["checkout", "topup"]
    - `base_pay`: label "Base Pay", subtitle "One-tap USDC from your Base wallet", supportedModes: ["checkout", "topup"]
  - Export `getMethodsForMode(mode, allowedMethods?)` — filters registry by mode and optional allowedMethods list
  - This is a pure data file with no React imports (icons will be inline in the selector component)
  - Files: `lib/payments/methods.ts`
  - Acceptance: `getMethodsForMode("checkout", ["stripe_onramp", "base_pay"])` returns both, `getMethodsForMode("topup")` returns both

### T003: Create `lib/payments/components/payment-method-selector.tsx`
- **Blocked By**: [T002]
- **Details**:
  - `"use client"` component
  - Props: `methods: PaymentMethodDef[]`, `onSelect: (methodId: string) => void`, `activeMethod?: string`, `loading?: boolean`, `amount?: number`
  - Renders a vertical stack of buttons, one per method
  - Each button shows: icon, "Pay $X" (or "Fund $X" for topup), method label, subtitle
  - Active/loading state: selected method shows spinner, others are disabled
  - Matches existing checkout design: rounded corners, coral accent color, Plus Jakarta Sans
  - `data-testid` on each button: `payment-method-{id}`
  - Files: `lib/payments/components/payment-method-selector.tsx`
  - Acceptance: Renders cleanly, buttons fire onSelect with correct method ID

### T004: Extract Stripe handler — `lib/payments/handlers/stripe-onramp-handler.tsx`
- **Blocked By**: [T001]
- **Details**:
  - `"use client"` component that receives `PaymentHandlerProps`
  - **For checkout mode**: Extract the existing Stripe logic from `app/pay/[id]/page.tsx`:
    - POST to `/api/v1/checkout/{checkoutPageId}/pay/stripe-onramp` with amount, invoice_ref, buyer_name
    - Load Stripe scripts, create session, mount widget to internal `mountRef`
    - Listen for `fulfillment_complete` → call `onSuccess`
    - Iframe detection → fallback to `redirect_url` in new tab
    - Cancel button → destroy session, call `onCancel`
    - Renders its own container div for the Stripe widget + loading overlay + cancel button
  - **For topup mode**: Wrap the existing `useStripeOnramp` hook logic:
    - POST to `/api/v1/stripe-wallet/onramp/session` with wallet_id
    - Same script loading, session creation, widget mounting
    - `fulfillment_complete` → call `onSuccess`
    - Renders in a Sheet (reuses StripeOnrampSheet pattern, or renders inline — TBD based on where it's mounted)
  - The key insight: both modes do nearly the same thing (create session, load SDK, mount widget). The only differences are the API endpoint and the payload shape. This handler unifies them.
  - **Does NOT delete** `lib/crypto-onramp/components/` yet — those files remain as fallback until we're confident the new handler works
  - Files: `lib/payments/handlers/stripe-onramp-handler.tsx`
  - Acceptance: Handler renders Stripe widget correctly for both modes, calls onSuccess/onError/onCancel appropriately

### T005: Create Base Pay handler — `lib/payments/handlers/base-pay-handler.tsx`
- **Blocked By**: [T001]
- **Details**:
  - `"use client"` component that receives `PaymentHandlerProps`
  - Imports `pay()` from `@base-org/account` (this is the ONLY file that imports the client-side SDK)
  - **Flow for both modes**:
    1. Immediately calls `pay({ amount: context.amountUsd, to: context.walletAddress })` when mounted/triggered
    2. On success (returns `{ id, amount, to }`):
       - **Checkout**: POST to `/api/v1/checkout/{checkoutPageId}/pay/base-pay` with `{ tx_id: result.id, buyer_email, buyer_name, invoice_ref }`
       - **Topup**: POST to `/api/v1/base-pay/verify` with `{ tx_id: result.id, expected_amount, expected_recipient }`
    3. On backend confirmation → call `onSuccess`
    4. On error → call `onError` with message
  - Renders: loading state while popup is open, then verifying state while backend confirms
  - Handles iframe blocking: if `pay()` fails due to popup blocker, show helpful message
  - Files: `lib/payments/handlers/base-pay-handler.tsx`
  - Acceptance: Calls pay(), hits correct backend endpoint per mode, handles errors gracefully

### T006: Create `lib/payments/components/checkout-payment-panel.tsx`
- **Blocked By**: [T003, T004, T005]
- **Details**:
  - `"use client"` component — replaces the entire right panel of the checkout page
  - Props: `context: PaymentContext`, `allowedMethods: string[]`, `onSuccess: (result: PaymentResult) => void`
  - **State machine** with states:
    - `select` — shows PaymentMethodSelector (user picks a method)
    - `paying` — shows the active handler component (Stripe widget or Base Pay flow)
    - `error` — shows error message with retry button
  - When `select` → user clicks a method → transitions to `paying` with that method's handler
  - When handler calls `onSuccess` → parent (checkout page) handles redirect
  - When handler calls `onCancel` → transitions back to `select`
  - When handler calls `onError` → transitions to `error`
  - Also renders the amount display (Total: $X.XX USD) and buyer name input above the selector
  - The amount input (for variable-amount pages) stays in the checkout page — it's part of the context, not the payment panel
  - Files: `lib/payments/components/checkout-payment-panel.tsx`
  - Acceptance: Smooth transitions between states, both methods work end-to-end

### T007: Refactor checkout page to use `CheckoutPaymentPanel`
- **Blocked By**: [T006]
- **Details**:
  - Update `app/pay/[id]/page.tsx`:
    - **Remove**: `handlePay` function, `onrampOpen`/`onrampLoading` state, `mountRef`/`sessionRef` refs, all Stripe script loading logic
    - **Keep**: page data fetching (`useEffect` for checkout/invoice), `customAmount` state, `buyerName` state, left panel (product info), layout
    - **Add**: Build `PaymentContext` from resolved checkout data
    - **Add**: Render `<CheckoutPaymentPanel>` in the right panel, passing context + allowedMethods + onSuccess handler
    - `onSuccess` → `router.push(/pay/${id}/success)` (same as current)
  - The page shrinks from ~550 lines to ~300 lines (data fetching + layout + context building)
  - Files: `app/pay/[id]/page.tsx`
  - Acceptance: Checkout page works exactly as before for Stripe, PLUS shows Base Pay option when allowed. No visual regression on Stripe flow.

### T008: Create `lib/payments/components/fund-wallet-sheet.tsx`
- **Blocked By**: [T003, T004, T005]
- **Details**:
  - `"use client"` component — a Sheet that replaces the current direct `onramp.open()` flow
  - Props: `open`, `onOpenChange`, `context: PaymentContext`, `onSuccess: (result: PaymentResult) => void`
  - Internal state machine (same as checkout panel): `select` → `paying` → `success`/`error`
  - When `select`:
    - Shows wallet info (address, bot name)
    - Shows PaymentMethodSelector with topup-compatible methods
  - When `paying`:
    - Renders the selected handler inside the Sheet
    - For Stripe: the handler mounts the Stripe widget inside the Sheet's content area
    - For Base Pay: the handler triggers the popup and shows verification state
  - When handler calls `onSuccess` → shows success state briefly, then closes Sheet and calls parent `onSuccess`
  - When handler calls `onCancel` → transitions back to `select`
  - Files: `lib/payments/components/fund-wallet-sheet.tsx`
  - Acceptance: Sheet opens, methods are selectable, both work correctly inside the Sheet

### T009: Wire `FundWalletSheet` into stripe-wallet page
- **Blocked By**: [T008]
- **Details**:
  - Update `app/app/stripe-wallet/page.tsx`:
    - **Remove**: `const onramp = useStripeOnramp(...)` and `<StripeOnrampSheet onramp={onramp} />`
    - **Add**: `FundWalletSheet` state: `fundSheetOpen`, `fundWalletContext`
    - **Change** `onFund` callback: instead of `onramp.open(...)`, build a `PaymentContext` and open the `FundWalletSheet`
    - **Change** `fundLabel` from "Fund with Stripe" to "Fund"
    - `onSuccess` callback: calls `fetchWallets()` to refresh balances (same as current `onFundingComplete`)
  - Files: `app/app/stripe-wallet/page.tsx`
  - Acceptance: "Fund" opens new sheet with method selection. Card/Bank still works. Base Pay works. Wallet balances refresh after either method.

### T010: Verify and clean up
- **Blocked By**: [T007, T009]
- **Details**:
  - Run TypeScript compilation — zero errors
  - Verify checkout page: Stripe flow works end-to-end (no regression)
  - Verify checkout page: Base Pay button appears when `allowedMethods` includes `base_pay`
  - Verify top-up: Fund button opens new Sheet with method selection
  - Verify top-up: Stripe flow works through the new Sheet
  - Remove `lib/crypto-onramp/components/use-stripe-onramp.ts` and `lib/crypto-onramp/components/stripe-onramp-sheet.tsx` IF no other files import them (the Stripe handler in `lib/payments/handlers/` replaces them)
  - Update `replit.md` with new payment module architecture
  - Files: cleanup of old files, `replit.md`
  - Acceptance: All flows work, no dead code, clean build

---

# Dependency Graph

```
T001 (types) ─────────────┬──→ T004 (Stripe handler) ──┐
                          ├──→ T005 (Base Pay handler) ──┤
T002 (methods) ──→ T003 (selector) ─────────────────────┤
                                                         ├──→ T006 (checkout panel) ──→ T007 (refactor checkout page) ──┐
                                                         ├──→ T008 (fund sheet) ──→ T009 (wire stripe-wallet page) ─────┤
                                                         │                                                              │
                                                         └──→ T010 (verify + cleanup) ←────────────────────────────────┘
```

Parallelizable: T001+T002 can run together. T004+T005 can run in parallel. T006+T008 can run in parallel. T007+T009 can run in parallel.

---

# Risk Assessment

1. **Stripe widget mounting inside a handler component**: The current code mounts to `mountRef.current` after a `setTimeout(100)` to let React render the container div. The handler component needs the same pattern — mount after the component's div is in the DOM. Solved by using `useEffect` with a ref.

2. **Stripe widget inside the FundWalletSheet**: The Sheet component uses Radix, which renders its content lazily (only when open). The handler's `mountRef` div must exist before `session.mount()` is called. The `setTimeout` pattern handles this, but we need to ensure the Sheet's `forceMount` is used on the content.

3. **Backward compatibility**: Existing checkout pages have `allowedMethods: ['x402', 'usdc_direct', 'stripe_onramp']` without `base_pay`. The `CheckoutPaymentPanel` will only show methods that are in the allowedMethods list AND in the registry. So existing pages will show only Card/Bank — no regression.

4. **Two handlers calling the same backend routes**: The Stripe handler calls the same `/api/v1/checkout/[id]/pay/stripe-onramp` route as before. The Base Pay handler calls `/api/v1/checkout/[id]/pay/base-pay`. Backend routes are unchanged.

5. **Single method shortcut**: If a checkout page only has one allowed payment method, the selector should auto-select it (skip the selection step). This preserves the current UX for pages that haven't added Base Pay.
