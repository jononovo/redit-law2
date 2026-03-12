# x402 Protocol

The x402 protocol enables autonomous agent payments using the HTTP `402 Payment Required` status code. When a bot encounters a 402 response from a vendor, it can request a cryptographic payment signature from CreditClaw and present it to the vendor via an `X-PAYMENT` header — all without human intervention (subject to guardrails).

---

## How It Works

1. **Bot requests a resource** from a vendor API
2. **Vendor returns HTTP 402** with payment details (recipient address, amount in USDC)
3. **Bot sends a signing request** to CreditClaw (`POST /api/v1/stripe-wallet/bot/sign`)
4. **CreditClaw evaluates guardrails** — spending limits, category checks, approval thresholds
5. **If approved**, CreditClaw signs an EIP-3009 `TransferWithAuthorization` and returns the signature
6. **Bot retries the vendor request** with the `X-PAYMENT` header containing the signed payment
7. **Vendor verifies the signature** on-chain and serves the resource

```
Bot                    CreditClaw                  Vendor
 │                        │                          │
 │── GET /resource ──────────────────────────────────►│
 │◄─────────────────────────────── 402 Payment Required │
 │                        │                          │
 │── POST /bot/sign ─────►│                          │
 │   (amount, recipient)  │  evaluate guardrails     │
 │◄── x_payment_header ──│                          │
 │                        │                          │
 │── GET /resource ──────────────────────────────────►│
 │   X-PAYMENT: <header>  │                          │
 │◄──────────────────────────────── 200 OK + content │
```

---

## Signing Endpoint

### `POST /api/v1/stripe-wallet/bot/sign`

Requests a USDC payment signature for an x402 transaction.

**Auth**: `Authorization: Bearer cck_live_...`

#### Request Body

| Field               | Type   | Required | Description                                        |
|---------------------|--------|----------|----------------------------------------------------|
| `resource_url`      | string | Yes      | The URL the bot is paying to access                |
| `amount_usdc`       | number | Yes      | Amount in micro-USDC (1 USDC = 1,000,000)         |
| `recipient_address` | string | Yes      | Vendor's wallet address (0x...)                    |
| `valid_before`      | number | No       | Unix timestamp for signature expiry (default: now + 5 min) |

#### Success Response (200)

```json
{
  "x_payment_header": "eyJzaWduYXR1cmUiOiIweC4uLiIsImZyb20iOi...",
  "signature": "0x..."
}
```

#### Awaiting Approval Response (202)

Returned when the transaction exceeds the auto-approve threshold and requires human approval:

```json
{
  "status": "awaiting_approval",
  "approval_id": 42
}
```

#### Error Responses

| Status | Body                                         | Meaning                              |
|--------|----------------------------------------------|--------------------------------------|
| 400    | `{ "error": "Invalid request" }`             | Missing or invalid fields            |
| 401    | `{ "error": "Invalid or missing API key" }`  | Bad or missing `Authorization` header |
| 403    | `{ "error": "Insufficient USDC balance" }`   | Wallet balance too low               |
| 403    | `{ "error": "..." }`                         | Blocked by guardrails or procurement controls |
| 404    | `{ "error": "No Stripe Wallet found..." }`   | Bot has no linked Stripe Wallet      |
| 500    | `{ "error": "internal_error" }`              | Server error                         |

---

## EIP-712 Typed Data

CreditClaw signs an EIP-3009 `TransferWithAuthorization` using EIP-712 structured data on **Base chain** (chain ID 8453) for **USDC** (`0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`).

The typed data structure:

```json
{
  "domain": {
    "name": "USD Coin",
    "version": "2",
    "chainId": 8453,
    "verifyingContract": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
  },
  "types": {
    "TransferWithAuthorization": [
      { "name": "from", "type": "address" },
      { "name": "to", "type": "address" },
      { "name": "value", "type": "uint256" },
      { "name": "validAfter", "type": "uint256" },
      { "name": "validBefore", "type": "uint256" },
      { "name": "nonce", "type": "bytes32" }
    ]
  },
  "primaryType": "TransferWithAuthorization"
}
```

This allows the vendor to call `transferWithAuthorization` on the USDC contract to pull the authorized funds.

---

## X-PAYMENT Header

The `x_payment_header` value returned by the signing endpoint is a **base64-encoded JSON** string containing all the information a vendor needs to process the payment:

```json
{
  "signature": "0x...",
  "from": "0x<bot_wallet_address>",
  "to": "0x<vendor_address>",
  "value": "1000000",
  "validAfter": 0,
  "validBefore": 1700000000,
  "nonce": "0x<random_32_bytes>",
  "chainId": 8453,
  "token": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
}
```

Your bot sends this as a header on the retry request:

```
X-PAYMENT: eyJzaWduYXR1cmUiOiIweC4uLiIsImZyb20iOi...
```

---

## Guardrail Evaluation

Before signing, CreditClaw evaluates the transaction against the wallet's guardrails:

1. **Master guardrails** — platform-level limits applied to the owner account
2. **Approval mode** — if set to `ask_for_everything`, all transactions require human approval
3. **Approval threshold** — if `auto_approve_under_threshold`, transactions above the threshold require approval
4. **Spending limits** — per-transaction max, daily budget, monthly budget
5. **Procurement controls** — domain allowlists/blocklists, merchant restrictions, category controls

If any check fails, the endpoint returns `403` with the reason. If human approval is required, it returns `202` with an `approval_id`.

### Approval Flow

When a transaction returns `202 Awaiting Approval`:

1. The owner receives an email notification with transaction details
2. The owner approves or rejects the transaction from the dashboard
3. Your bot can poll or listen for a webhook event (`purchase.approved` or `purchase.rejected`)
4. Once approved, CreditClaw signs and executes the transaction

---

## Example Flow

### Step 1: Bot encounters a 402

```bash
curl -s https://api.vendor.com/data/report \
  -w "\n%{http_code}"
# Returns 402 with payment requirements
```

### Step 2: Request a signature from CreditClaw

```bash
curl -X POST https://your-app.com/api/v1/stripe-wallet/bot/sign \
  -H "Authorization: Bearer cck_live_abc123..." \
  -H "Content-Type: application/json" \
  -d '{
    "resource_url": "https://api.vendor.com/data/report",
    "amount_usdc": 1000000,
    "recipient_address": "0x1234567890abcdef1234567890abcdef12345678"
  }'
```

**Response:**

```json
{
  "x_payment_header": "eyJzaWduYXR1cmUiOiIweGFiYzEyMy4uLiIs...",
  "signature": "0xabc123..."
}
```

### Step 3: Retry with the X-PAYMENT header

```bash
curl https://api.vendor.com/data/report \
  -H "X-PAYMENT: eyJzaWduYXR1cmUiOiIweGFiYzEyMy4uLiIs..."
# Returns 200 with the paid content
```

### Handling 202 (Approval Required)

If the signing request returns `202`:

```json
{
  "status": "awaiting_approval",
  "approval_id": 42
}
```

Your bot should wait for the owner to approve the transaction. Listen for the `purchase.approved` webhook event or implement a polling strategy.

---

## Digital Product Delivery

When a checkout page is configured as a **Digital Product** (`page_type: "digital_product"`), the x402 settlement response includes the product URL. This enables fully automated bot-to-bot commerce where a bot pays for and receives a digital deliverable in a single flow.

The product URL is **never** exposed in the 402 requirements response — the bot must pay first, then receives the URL in the 200 success response:

```json
{
  "status": "confirmed",
  "sale_id": "sale_abc123",
  "tx_hash": "0xdeadbeef...",
  "amount_usd": 5.00,
  "product": {
    "url": "https://vendor.com/download/signed-token-xyz",
    "type": "digital_product"
  }
}
```

For non-digital-product checkout pages, `product` is `null`.

---

## Idempotent Retry

x402 payments are idempotent. If a bot's connection drops after the payment settles on-chain but before it receives the response, it can safely resubmit the same `X-PAYMENT` header with the same nonce. CreditClaw will recognize the nonce has already been used for a confirmed sale and return the original result — including the product URL — without submitting a duplicate transaction.

This means:
- **No double charges** — the EIP-3009 nonce is enforced on-chain by the USDC contract
- **No lost deliverables** — retrying returns the same product URL from the original sale
- **No special retry logic needed** — the bot just retries the same request

---

## Key Details

| Property          | Value                                              |
|-------------------|----------------------------------------------------|
| Chain             | Base (chain ID 8453)                               |
| Token             | USDC (`0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`) |
| Amount unit       | Micro-USDC (1 USDC = 1,000,000 micro-USDC)        |
| Signature type    | EIP-712 / EIP-3009 TransferWithAuthorization       |
| Default expiry    | 5 minutes from signing                             |
| Header format     | Base64-encoded JSON                                |

---

## Related Pages

- [Authentication](/docs/api/authentication) — how to authenticate your bot
- [Quick Start](/docs/api/agent-integration/quick-start) — end-to-end guide to get your bot transacting
- [Webhook Setup](/docs/api/webhooks/setup) — receive async notifications for approvals
- [Webhook Events](/docs/api/webhooks/events) — `purchase.approved`, `purchase.rejected` event payloads
- [Wallets](/docs/api/endpoints/wallets) — check balance before requesting a signature
