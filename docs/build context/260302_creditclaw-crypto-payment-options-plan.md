# CreditClaw — Crypto Payment Options Integration Plan

**Date:** March 2, 2026
**Status:** Final combined plan (replaces previous CryptAPI and QR code plans)
**Scope:** Add two new payment methods — Base Pay (one-tap) and QR/copy-paste (any wallet) — to both the wallet top-up flow and the checkout page, alongside the existing Stripe Card/Bank option.

---

## Summary

| Payment Method | Top-Up (Fund Wallet) | Checkout (Pay Vendor) | How It Works |
|----------------|---------------------|-----------------------|--------------|
| 💳 **Card / Bank** (Stripe) | ✅ Existing | ✅ Existing | Stripe Crypto Onramp — fiat → USDC |
| 🔵 **Base Pay** (one-tap) | ✅ New | ✅ New | Base Pay SDK `pay()` — USDC direct to wallet |
| 🔗 **Crypto Wallet** (QR) | ✅ New | ❌ Not included | EIP-681 QR code — user scans with any wallet app |

**Why no QR for checkout:** The QR/copy-paste flow sends USDC directly to a wallet address. For top-ups, this is fine — the user's own wallet receives it. For checkout, a vendor wallet receives payments from many buyers simultaneously, making it impossible to attribute which buyer paid without a per-payment proxy address (which would require CryptAPI or similar). Base Pay solves this natively with transaction IDs.

---

## Part 1: Base Pay (One-Tap USDC via Base App)

### What It Is

Base Pay is the payment SDK from Base (formerly Coinbase Wallet). It provides a `pay()` function and a pre-built `<BasePayButton />` React component. When clicked, the user sees a popup from their Base App / Coinbase wallet, confirms with one tap, and USDC goes directly to the specified wallet address.

- **Zero fees** — you receive the full amount
- **< 2 second settlement** on Base
- **Any wallet address** as the `to` parameter — different per payment
- **Built-in attribution** — returns a payment `id` with sender, amount, recipient
- **Replay/impersonation protection** — `getPaymentStatus()` returns sender address for verification
- **Pre-built React button** — `<BasePayButton />` with theming options
- **Privy compatible** — official Base Account + Privy integration exists
- **Collects buyer info** — optional email, phone, shipping via `payerInfo`

### SDK Integration

Install:
```bash
npm install @base-org/account @base-org/account-ui
```

If using Privy (CreditClaw does), add the override:
```bash
npm pkg set overrides.@base-org/account="latest"
```

### Usage — Top-Up Flow

```tsx
import { pay, getPaymentStatus } from '@base-org/account';

async function handleTopUp(walletAddress: string, amountUsd: number) {
  const payment = await pay({
    amount: String(amountUsd),
    to: walletAddress,  // user's own CreditClaw Privy wallet
  });

  const { status, sender, amount } = await getPaymentStatus({ id: payment.id });
  if (status === 'completed') {
    // Credit the wallet in CreditClaw's internal ledger
  }
}
```

### Usage — Checkout Flow

```tsx
import { pay, getPaymentStatus } from '@base-org/account';

async function handleCheckoutPayment(
  vendorWalletAddress: string,
  amountUsd: number,
  checkoutPageId: string
) {
  const payment = await pay({
    amount: String(amountUsd),
    to: vendorWalletAddress,  // vendor's CreditClaw wallet
    payerInfo: {
      requests: [
        { type: 'email' },
        { type: 'name', optional: true },
      ],
    },
  });

  // Verify on backend
  const { status, sender, amount, recipient } = await getPaymentStatus({
    id: payment.id,
  });

  if (status === 'completed') {
    // Record sale, fire webhook, credit vendor wallet
  }
}
```

### Backend Verification (Critical)

Never trust frontend-only payment confirmation. The backend must verify:

```typescript
import { getPaymentStatus } from '@base-org/account';

export async function verifyPayment(txId: string, expectedAmount: string, expectedRecipient: string) {
  // 1. Check if transaction already processed (replay protection)
  const existing = await db.query.basePayPayments.findFirst({
    where: eq(basePayPayments.txId, txId),
  });
  if (existing) throw new Error('Transaction already processed');

  // 2. Verify on-chain
  const { status, sender, amount, recipient } = await getPaymentStatus({ id: txId });
  if (status !== 'completed') throw new Error('Payment not completed');

  // 3. Validate amount and recipient
  if (amount !== expectedAmount) throw new Error('Amount mismatch');
  if (recipient.toLowerCase() !== expectedRecipient.toLowerCase()) throw new Error('Recipient mismatch');

  // 4. Mark as processed
  await db.insert(basePayPayments).values({
    txId, sender, amount, recipient,
    processedAt: new Date(),
  });

  // 5. Sync internal ledger
  const wallet = await storage.privyGetWalletByAddress(recipient);
  if (wallet) {
    const amountMicro = Math.round(parseFloat(amount) * 1_000_000);
    const newBalance = wallet.balanceUsdc + amountMicro;
    await storage.privyUpdateWalletBalance(wallet.id, newBalance);
    await storage.privyCreateTransaction({
      walletId: wallet.id,
      type: 'deposit',
      amountUsdc: amountMicro,
      status: 'confirmed',
      balanceAfter: newBalance,
      metadata: { source: 'base_pay', tx_id: txId, sender },
    });
  }

  return { sender, amount, recipient };
}
```

---

## Part 2: QR Code / Copy-Paste (Any Crypto Wallet)

### What It Is

An EIP-681 QR code that encodes a USDC transfer request on Base. Any EVM wallet can scan it (Coinbase Wallet/Base App, MetaMask, Trust Wallet, Rainbow, Exodus) or the user can copy-paste the wallet address and send manually.

**Only available for top-ups**, not checkout (see attribution problem above).

### Wallet Compatibility

| App | QR Scan | Copy-Paste | Notes |
|-----|---------|------------|-------|
| Base App (Coinbase Wallet) | ✅ | ✅ | Full EIP-681 support |
| MetaMask | ✅ | ✅ | Full EIP-681 support |
| Trust Wallet | ✅ | ✅ | Full EIP-681 support |
| Rainbow | ✅ | ✅ | Full EIP-681 support |
| Exodus | ✅ | ✅ | Full EIP-681 support |
| Coinbase (exchange app) | ❌ | ✅ | No QR scanner in send flow |
| Exchange apps (Binance, Kraken) | ❌ | ✅ | Copy address + select Base |

### EIP-681 URI Format

```
ethereum:0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913@8453/transfer?address=0xDESTINATION&uint256=AMOUNT_IN_WEI
```

| Part | Value |
|------|-------|
| `0x833589...` | USDC contract on Base |
| `@8453` | Base chain ID |
| `/transfer` | ERC-20 transfer function |
| `address=` | Destination wallet |
| `uint256=` | Amount in micro-USDC (5.00 = 5000000) |

### Payment Detection: Balance Polling

Since QR payments bypass any API, CreditClaw watches the chain:

1. Record wallet's USDC balance before showing QR (`balance_before`)
2. Poll `getOnChainUsdcBalance()` every 5 seconds (reuses existing Rail 1 function)
3. When `current_balance >= balance_before + expected_amount` → confirmed
4. Update internal ledger (same as Base Pay: `privyUpdateWalletBalance` + `privyCreateTransaction`)

---

## Part 3: UI Changes

### Top-Up Flow (Stripe Wallet Page)

**Current:** "Fund with Stripe" button opens the Stripe onramp sheet directly.

**New:** "Fund" button opens a payment method selection pre-screen (modal or inline panel), styled like the existing checkout Payment Details panel:

```
┌─────────────────────────────────────────────────┐
│                                                 │
│  Fund Your Wallet                               │
│                                                 │
│  ┌─────────────────────────────────────────┐    │
│  │  Total              $5.00 USD           │    │
│  └─────────────────────────────────────────┘    │
│                                                 │
│  Choose how to fund:                            │
│                                                 │
│  ┌─────────────────────────────────────────┐    │
│  │  💳  Pay $5.00          Card / Bank     │    │
│  │      Secure payment powered by Stripe   │    │
│  └─────────────────────────────────────────┘    │
│                                                 │
│  ┌─────────────────────────────────────────┐    │
│  │  🔵  Pay $5.00          Base (one tap)  │    │
│  │      Pay with your Base App wallet      │    │
│  └─────────────────────────────────────────┘    │
│                                                 │
│  ┌─────────────────────────────────────────┐    │
│  │  🔗  Pay $5.00          Crypto Wallet   │    │
│  │      QR code for MetaMask, Trust, etc.  │    │
│  └─────────────────────────────────────────┘    │
│                                                 │
└─────────────────────────────────────────────────┘
```

- **Card / Bank** → opens existing Stripe Onramp sheet (unchanged)
- **Base** → calls `pay()` from Base Pay SDK, shows popup, confirms
- **Crypto Wallet** → opens `<CryptoPayModal />` with QR code + copy-paste address

### Checkout Page (`/pay/[id]`)

**Current:** Single "Pay $X Card / Bank" button (Stripe).

**New:** Two buttons in the Payment Details panel:

```
┌─────────────────────────────────────────────────┐
│                                                 │
│  Payment Details                                │
│                                                 │
│  ┌─────────────────────────────────────────┐    │
│  │  Total              $12.35 USD          │    │
│  └─────────────────────────────────────────┘    │
│                                                 │
│  ┌─────────────────────────────────────────┐    │
│  │  💳  Pay $12.35        Card / Bank      │    │
│  └─────────────────────────────────────────┘    │
│                                                 │
│  ┌─────────────────────────────────────────┐    │
│  │  🔵  Pay $12.35        Base (one tap)   │    │
│  └─────────────────────────────────────────┘    │
│                                                 │
│  Secure payment powered by CreditClaw           │
│                                                 │
└─────────────────────────────────────────────────┘
```

No QR code option here. Base Pay handles attribution natively (returns sender address + tx ID). Stripe handles it via session.

---

## Part 4: Data Model

### New Table: `base_pay_payments`

| Column | Type | Description |
|--------|------|-------------|
| id | serial PK | |
| tx_id | text UNIQUE | Base Pay transaction ID (from `pay()` response) |
| sender | text | Payer's wallet address (from `getPaymentStatus()`) |
| recipient | text | CreditClaw wallet that received funds |
| amount_usdc | bigint | Amount in micro-USDC |
| type | text | "topup" or "checkout" |
| checkout_page_id | text | FK to checkout_pages (if checkout) |
| sale_id | text | FK to sales (if checkout) |
| payer_email | text | From `payerInfo` (if collected) |
| status | text | pending → completed → failed |
| created_at | timestamp | |
| confirmed_at | timestamp | |

### New Table: `qr_payments` (top-up only)

| Column | Type | Description |
|--------|------|-------------|
| id | serial PK | |
| payment_id | text UNIQUE | Internal UUID |
| owner_uid | text | Firebase UID |
| wallet_address | text | CreditClaw wallet receiving funds |
| amount_usdc | bigint | Expected amount in micro-USDC |
| eip681_uri | text | The full EIP-681 URI for QR generation |
| status | text | waiting → confirmed → expired |
| balance_before | bigint | Wallet balance at creation (for detection) |
| tx_hash | text | On-chain tx hash once detected |
| created_at | timestamp | |
| confirmed_at | timestamp | |
| expires_at | timestamp | 60 minutes from creation |

---

## Part 5: API Routes

### Base Pay Routes

```
POST /api/v1/base-pay/verify
  Input:  { txId, expectedAmount, expectedRecipient, type, checkoutPageId? }
  Action: Call getPaymentStatus(), verify, update ledger, record sale if checkout
  Output: { status, sender, amount }

  Used by both top-up and checkout flows after pay() returns.
```

### QR Payment Routes (top-up only)

```
POST /api/v1/qr-pay/create
  Input:  { walletAddress, amountUsdc }
  Action: Record balance_before, generate EIP-681 URI
  Output: { paymentId, eip681Uri, walletAddress, expiresAt }

GET  /api/v1/qr-pay/status/:paymentId
  Action: Poll on-chain balance, update ledger if payment detected
  Output: { status: "waiting" | "confirmed" | "expired" }
```

### Checkout Public Endpoint (new)

```
POST /api/v1/checkout/[id]/pay/base-pay
  Input:  { txId }
  Action: Verify via getPaymentStatus(), match to checkout page, record sale
  Output: { status, saleId }
```

---

## Part 6: Internal Ledger Sync

All three payment methods must update the internal ledger identically:

1. **`privyUpdateWalletBalance()`** — increment `privy_wallets.balance_usdc`
2. **`privyCreateTransaction()`** — create `privy_transactions` record with `type: 'deposit'`
3. **For checkout:** Create `sales` record + fire `wallet.sale.completed` webhook

| Method | How Ledger Gets Updated |
|--------|------------------------|
| Stripe Onramp | Stripe webhook → `handleStripeOnrampFulfillment()` (existing) |
| Base Pay | Backend verify endpoint → `verifyPayment()` (new) |
| QR Code | Status polling endpoint detects balance change → updates ledger (new) |

Without this sync, dashboard balances and transaction ledgers would be stale.

---

## Part 7: Security

- **Network warning (QR only):** Modal must display "Send USDC on Base network only. Other networks = lost funds." The EIP-681 URI includes `@8453` which compliant wallets parse, but copy-paste users must select Base manually.
- **Replay protection (Base Pay):** Store `tx_id` in `base_pay_payments` with a UNIQUE constraint. Reject duplicates.
- **Impersonation protection (Base Pay checkout):** `getPaymentStatus()` returns the `sender` address. Verify it server-side before crediting.
- **Amount validation (both):** Always verify the payment amount matches the expected amount before crediting.
- **Concurrent QR payments:** Balance polling may combine simultaneous payments. Acceptable for top-ups (one wallet per bot). Not acceptable for checkout (hence QR excluded from checkout).
- **EIP-681 compatibility:** Some older wallets may misparse the QR. The copy-paste option is presented as an equal alternative, not a fallback.
- **Expiration (QR):** 60-minute window. Late payments still land on-chain but won't auto-confirm — handle via reconciliation.

---

## Part 8: Implementation Order

### Phase 1: Base Pay (both surfaces) — ~2 days

1. Install `@base-org/account` + `@base-org/account-ui` with Privy override
2. DB migration: `base_pay_payments` table
3. `POST /api/v1/base-pay/verify` — backend verification + ledger sync
4. `POST /api/v1/checkout/[id]/pay/base-pay` — checkout-specific endpoint
5. Top-up: Add Base Pay button to funding pre-screen, wire `pay()` + verify
6. Checkout: Add `<BasePayButton />` to `/pay/[id]` page, wire to sales pipeline
7. Test on Base Sepolia with Circle faucet USDC

### Phase 2: QR Code (top-up only) — ~1 day

8. DB migration: `qr_payments` table
9. `POST /api/v1/qr-pay/create` + `GET /api/v1/qr-pay/status/:id`
10. `<CryptoPayModal />` — QR code + copy-paste modal with polling
11. Add "Crypto Wallet" option to funding pre-screen
12. Test with small USDC send from MetaMask

### Phase 3: Funding Pre-Screen UI — ~1 day

13. Create `<FundWalletPreScreen />` component (amount input + 3 payment method buttons)
14. Replace current "Fund with Stripe" button on Stripe Wallet page
15. Wire all three methods through the pre-screen
16. Match visual style to existing checkout Payment Details panel

**Total estimated effort: 4-5 days**

---

## What This Doesn't Require

- No Coinbase Business account or API keys
- No CryptAPI (may add later for multi-chain QR checkout support)
- No smart contract deployment
- No intermediary wallet or custodial step
- No partnership approvals
- Zero fees for Base Pay and QR; Stripe fees for card/bank (existing)
