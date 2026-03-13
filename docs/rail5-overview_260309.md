# Rail 5: Sub-Agent Cards — Technical Overview

**v4 • March 10, 2026 • Internal**

---

## What Rail 5 Is

Rail 5 lets a bot purchase from any merchant using an encrypted card file that CreditClaw can't read and a decryption key that's only ever handed to a disposable sub-agent. CreditClaw holds zero card data. The bot's main agent never sees card details or the decryption key.

**Owner holds:** An encrypted `.md` file containing full card details (e.g., `Card-Harry-26-Visa.md`). Also available as a backup download.
**Bot holds:** The encrypted `.md` file — delivered via webhook, staged pending message, or placed manually by the owner.
**CreditClaw holds:** The AES-256-GCM decryption key (key, IV, auth tag). No card data. No encrypted card data. Not PCI-scoped.
**Main agent holds:** A reference to the encrypted file. Can't decrypt it.
**Sub-agent (ephemeral):** Gets the key from CreditClaw, decrypts, checks out, announces result, gets deleted.

### Split-Knowledge Security Model

CreditClaw and the bot each hold one half of the secret. Neither can access card data alone.

| Entity | Holds | Can decrypt? |
|---|---|---|
| CreditClaw | Decryption key (key/IV/tag) | No — has no ciphertext |
| Bot | Encrypted card file | No — has no key |
| Owner | Backup copy of encrypted file | No — has no key |
| Sub-agent (ephemeral) | Key + file (momentarily) | Yes — then deleted |

The encrypted card file **never** persists on CreditClaw's servers. During direct delivery, the ciphertext passes through server memory transiently and is immediately discarded after relay. No database write occurs.

---

## How Rail 5 Differs from Rail 4

Rail 5 is **autonomous from Rail 4**. Own table, own folder, own page, own endpoints. It shares only platform-level infrastructure.

| | Rail 5 | Rail 4 |
|---|---|---|
| CreditClaw stores card data | **No** — only the decryption key | Yes — 3 missing digits + expiry |
| CreditClaw stores encrypted card | **No** — transient relay only | N/A |
| Card file format | 1 encrypted profile | 6 profiles (5 fake + 1 real) |
| Obfuscation engine | Not used | Core feature |
| Fake profiles | None | 5 per card |
| Main agent sees card details | Never | Yes (assembles at checkout) |
| Sub-agent required | Yes (OpenClaw) | No |
| Dashboard page | `/app/sub-agent-cards` | `/app/self-hosted` |
| DB table | `rail5_cards` | `rail4_cards` |
| API folder | `/api/v1/rail5/*` + `/api/v1/bot/rail5/*` | `/api/v1/rail4/*` + `/api/v1/bot/merchant/*` |

**Shared platform infrastructure** (not duplicated): `withBotApi` middleware, bot auth (`lib/agent-management/auth.ts`), wallet + spending controls, master guardrails, webhooks, notifications, rate limiting.

---

## File Structure

```
lib/
  rail5/
    index.ts                                 # Spawn payload builder, validation helpers, constants
    encrypt.ts                               # Server-side encryption utilities
    decrypt-script.ts                        # Deterministic decrypt script content
  card/onboarding-rail5/
    encrypt.ts                               # Client-side AES-256-GCM encryption + file builder
    interactive-card.tsx                      # Visual card input component
  agent-management/
    bot-messaging/
      index.ts                               # sendToBot() — universal delivery function
      expiry.ts                              # Per-event-type expiry config
      templates/
        index.ts                             # Template exports
        rail5-card-delivered.ts              # Canonical card delivery instructions
        rail5-test-required.ts               # Test checkout instructions (with URL builder)
  webhooks.ts                                # Webhook helpers (signPayload, attemptDelivery)
  payments/
    types.ts                                 # PaymentContext (includes testToken field)
    handlers/testing-handler.tsx             # Test payment form — forwards testToken in URL
    components/checkout-payment-panel.tsx    # Passes testToken through to payment handlers

app/
  api/v1/rail5/
    initialize/route.ts                      # Owner: create card record (POST)
    submit-key/route.ts                      # Owner: store encryption key (POST)
    cards/route.ts                           # Owner: list rail5 cards (GET)
    cards/[cardId]/route.ts                  # Owner: get/update card (GET, PATCH)
    cards/[cardId]/test-purchase-status/route.ts  # Owner: poll test result, 3-state (pending/in_progress/completed)
    deliver-to-bot/route.ts                  # Owner: transient relay of encrypted file to bot (POST, legacy)
  api/v1/bot/rail5/
    key/route.ts                             # Bot: sub-agent gets decryption key (POST)
    checkout/route.ts                        # Bot: get spawn payload (POST)
    checkout/status/route.ts                 # Bot: check checkout status (GET)
    confirm/route.ts                         # Bot: sub-agent reports checkout result (POST)
    confirm-delivery/route.ts                # Bot: confirms card file received, generates test token, sends rail5.test.required (POST)
  api/v1/bot-messages/
    send/route.ts                            # Owner: send message to bot via sendToBot()
  api/v1/bot/messages/
    route.ts                                 # Bot: poll pending messages (GET)
    ack/route.ts                             # Bot: acknowledge messages (POST)
  api/v1/checkout/[id]/
    public/route.ts                          # Public checkout page data — records test_started_at when ?t= token present
    pay/testing/route.ts                     # Test payment submission — records testToken in sale metadata
  app/sub-agent-cards/
    page.tsx                                 # Dashboard listing page
    [cardId]/page.tsx                        # Card detail page
  app/pay/[id]/
    page.tsx                                 # Public checkout page — forwards ?t= token to API and payment handlers

components/dashboard/
  rail5-setup-wizard.tsx                     # 9-step onboarding wizard (steps 0–8)
  new-card-modal.tsx                         # "Add a New Card" modal — "My Card - Encrypted" opens wizard directly
  sidebar.tsx                                # Sidebar — manages wizard open state from modal callback

shared/schema.ts                             # rail5_cards, rail5_checkouts, rail5_guardrails tables
server/storage.ts                            # rail5 storage methods
```

---

## Database

### `rail5_cards` Table

| Column | Type | Purpose |
|---|---|---|
| `id` | serial PK | |
| `card_id` | text, unique | `r5card_` + random hex |
| `owner_uid` | text | FK to Firebase user |
| `bot_id` | text, nullable | Linked bot |
| `card_name` | text | User-provided name |
| `encrypted_key_hex` | text | AES-256-GCM key (32 bytes as hex) |
| `encrypted_iv_hex` | text | Initialization vector (12 bytes as hex) |
| `encrypted_tag_hex` | text | Auth tag (16 bytes as hex) |
| `card_last4` | text | Last 4 digits for display only |
| `card_brand` | text | Visa/MC/Amex — user-selected for display |
| `status` | text | `pending_setup` → `pending_delivery` → `confirmed` → `active` → `frozen` |
| `test_token` | text, nullable | 8-char hex token for test checkout tracking (set by confirm-delivery) |
| `test_started_at` | timestamp, nullable | Set when bot visits test checkout URL with matching token |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

**What's NOT stored:** Card number, CVV, expiry, name, address, encrypted card file, or any data that could identify the card.

### `rail5_guardrails` Table

Spending controls per card. Separate from the card record.

| Column | Type | Purpose |
|---|---|---|
| `id` | serial PK | |
| `card_id` | text | FK to `rail5_cards.card_id` |
| `max_per_tx_cents` | integer | Per-checkout spending cap |
| `daily_budget_cents` | integer | Daily aggregate cap |
| `monthly_budget_cents` | integer | Monthly aggregate cap |
| *(approval_mode and require_approval_above are now in master_guardrails)* | | |
| `recurring_allowed` | boolean | Allow recurring charges |
| `auto_pause_on_zero` | boolean | Freeze card when budget exhausted |
| `notes` | text, nullable | Owner notes |
| `updated_at` | timestamp | |
| `updated_by` | text, nullable | Who last updated |

### `rail5_checkouts` Table

| Column | Type | Purpose |
|---|---|---|
| `id` | serial PK | |
| `checkout_id` | text, unique | `r5chk_` + random hex |
| `card_id` | text | FK to `rail5_cards.card_id` |
| `bot_id` | text | Bot that initiated checkout |
| `status` | text | `approved` → `key_delivered` → `completed` / `failed` |
| `key_delivered` | boolean | Enforces single-use key delivery |
| `merchant_name` | text | |
| `merchant_url` | text | |
| `amount_cents` | integer | |
| `created_at` | timestamp | |

---

## Onboarding Flow (Setup Wizard)

### Entry Points

- **Sidebar "New Card" button** → opens "Add a New Card" modal → clicking **"My Card - Encrypted"** (first option) opens the Rail 5 wizard directly via `onRail5Select` callback. The modal closes, the wizard opens.
- **Sub-Agent Cards page** (`/sub-agent-cards`) → "Add New Card" button → opens the same wizard.
- **Overview page** (`/overview`) → Rail 5 card section → opens the same wizard.

9-step modal wizard at `components/dashboard/rail5-setup-wizard.tsx` (`TOTAL_STEPS = 9`, index 0–8).

### Step 0: Card Name + Brand
User enters a name, selects brand, enters last 4 digits. Calls `POST /api/v1/rail5/initialize` → creates `rail5_cards` row, returns `cardId`. Status: `pending_setup`.

### Step 1: How It Works
Educational step. "CreditClaw will never see your card details. Everything is encrypted in your browser before it leaves this page." No API calls.

### Step 2: Spending Limits
Per-checkout limit, daily/monthly caps, human approval threshold. Calls `PATCH /api/v1/rail5/cards/[cardId]`.

### Step 3: Card Details Entry
Full card number, CVV, expiry via `Rail5InteractiveCard` component (`lib/card/onboarding-rail5/interactive-card.tsx`). Data stays in local state — never sent to server.

### Step 4: Billing Address
Street, city, state, zip. Data stays in local state.

### Step 5: Connect Bot
Fetches `GET /api/v1/bots/mine`. User selects a bot. Calls `PATCH /api/v1/rail5/cards/[cardId]` with `bot_id`.

### Step 6: Encrypt & Deliver

1. **Encrypt** — `encryptCardDetails()` (`lib/card/onboarding-rail5/encrypt.ts`). AES-256-GCM via Web Crypto API. Returns `keyHex`, `ivHex`, `tagHex`, `ciphertextBytes`.

2. **Submit key** — `POST /api/v1/rail5/submit-key` with key material. Status: `pending_setup` → `pending_delivery`.

3. **Build file** — `buildEncryptedCardFile()` creates a Markdown file with base64-encoded ciphertext and an embedded Node.js decrypt script between `DECRYPT_SCRIPT_START/END` markers.

4. **Deliver to bot** — `POST /api/v1/bot-messages/send` → `sendToBot()` (`lib/agent-management/bot-messaging/index.ts`).
   - Event type: `rail5.card.delivered`
   - Payload: `card_id`, `card_name`, `card_last4`, `file_content`, `suggested_path`, `instructions`
   - `instructions` field from centralized template `RAIL5_CARD_DELIVERED` (`lib/agent-management/bot-messaging/templates/rail5-card-delivered.ts`)
   - Routes via webhook health: tries webhook if `active`/`degraded`, stages pending message if `unreachable`/`none`

5. **Manual download** — `downloadEncryptedFile()` always triggers browser download as backup.

6. **Save card details** — Before clearing the card input fields, the wizard saves the original values (card number, expiry, CVV, holder name, billing address) into `savedCardDetails` state. These persist through Steps 7–8 for field-by-field comparison during test verification.

### Step 7: Delivery Result (`Step7DeliveryResult`)

Adaptive display based on delivery outcome:

**Webhook succeeded:** Shows "Delivered to bot via webhook" confirmation.

**Staged as pending message:** Shows "File Staged for Your Bot" with relay message and sharing buttons.
- **Relay message** — uses `RAIL5_CARD_DELIVERED` template. Instructions for bot to poll messages, save file, and confirm delivery.
- **Copy** — copies relay message to clipboard.
- **Telegram** — opens `t.me/share/url?text=` with message pre-filled.
- **Discord** — copies to clipboard + toast notification.
- Polls `GET /api/v1/rail5/cards/[cardId]/delivery-status` every 5 seconds for bot confirmation.

**Card summary panel** — light gray box showing card name/last4, per-checkout limit, daily/monthly limits, and bot delivery status.

**Collapsible section** — "For AI Agents or manual file placement" with OpenClaw bot instructions, API guide link, and re-download button.

**"Continue to Test Verification"** button appears once delivery is confirmed → advances to Step 8.
**"Skip — I'll check later"** link allows closing the wizard before confirmation.

### Step 8: Test Verification (`Step8TestVerification`)

Dedicated step for verifying the card decrypts correctly via a sandbox test purchase. Uses token-based tracking for per-card test correlation.

**Three states:**

| State | How detected | Wizard UI |
|---|---|---|
| **pending** | No `test_started_at`, no completed sale matching token | Shows copy-paste instructions for owner to relay to bot manually (with Copy/Telegram/Discord share buttons) |
| **in_progress** | `test_started_at` is set, no completed sale yet | Shows spinner — "Your bot is completing the test checkout..." |
| **completed** | Sale record exists with matching `testToken` in metadata | Shows field-by-field verification results (match/mismatch per field) |

- Polls `GET /api/v1/rail5/cards/[cardId]/test-purchase-status` every 5 seconds, 5-minute timeout.
- Server returns the card details the bot submitted at the test checkout; the wizard compares them field-by-field against `savedCardDetails` still in browser memory (client-side only — raw card data never sent to server for comparison).
- **Test relay message** uses `TEST_RELAY_MESSAGE` constant — instructions for bot to check for `rail5.test.required` event, navigate to the test URL, decrypt the card, and fill the checkout form.
- **Timeout (5 min)**: Amber warning — "Test purchase not completed yet" with suggestion to check dashboard later.
- **"Done" button** closes the wizard.

**Key constants:** `RAIL5_TEST_CHECKOUT_PAGE_ID` and `RAIL5_TEST_CHECKOUT_URL` in `lib/rail5/index.ts`.

---

## Bot-Side Flow

### 1. Retrieve message
Bot polls `GET /api/v1/bot/messages` (authenticated with API key).
Returns pending messages including any `rail5.card.delivered` events with the encrypted file in `payload.file_content`.

**Route:** `app/api/v1/bot/messages/route.ts`

### 2. Save the file
Bot saves `file_content` to `.creditclaw/cards/` (or the path in `payload.suggested_path`).

### 3. Acknowledge message
Bot calls `POST /api/v1/bot/messages/ack` with `{ message_ids: [id] }`.
This removes the message from the pending queue — purely queue cleanup.

**Route:** `app/api/v1/bot/messages/ack/route.ts`

### 4. Confirm delivery
Bot calls `POST /api/v1/bot/rail5/confirm-delivery` (authenticated with API key, no body needed).

**Route:** `app/api/v1/bot/rail5/confirm-delivery/route.ts`

Logic:
- Looks up the card linked to this bot via `storage.getRail5CardByBotId()`.
- Validates card is in `pending_delivery` status.
- Updates card status to `confirmed` via `storage.updateRail5Card()`.
- Generates an 8-char hex test token: `randomBytes(4).toString("hex")`.
- Stores the token on the card: `storage.updateRail5Card(cardId, { testToken })`.
- Builds the test checkout URL with the token: `${RAIL5_TEST_CHECKOUT_URL}?t=${testToken}`.
- Sends a `rail5.test.required` event via `sendToBot()` with:
  - `card_id`, `card_name`, `test_checkout_url` (with token), `instructions` (from `buildRail5TestInstructions()` template)
  - This ensures the bot is proactively notified about the test, even if it doesn't parse the confirm-delivery response.
- Cleans up any remaining pending messages for this card via `storage.deletePendingMessagesByRef()`.
- Returns:
  ```json
  {
    "status": "confirmed",
    "card_id": "r5card_...",
    "card_name": "...",
    "message": "Card confirmed. Complete a test purchase to verify your card works end-to-end.",
    "test_checkout_url": "https://creditclaw.com/pay/cp_dd5f6ff666dcb31fce0f251a?t=a3f8b2c1",
    "test_instructions": "Navigate to the test checkout URL to complete a sandbox purchase.\n..."
  }
  ```

### 5. Test purchase (verification)
After confirming delivery, the bot receives a `rail5.test.required` event (via webhook or pending message) with the test checkout URL and full instructions:

1. Bot navigates to the test checkout URL (includes `?t=<token>` for tracking).
2. When the checkout page loads with the `?t=` parameter, the server records `test_started_at` on the matching card (marking the test as "in progress" for the owner's wizard).
3. Bot decrypts the card file using `POST /api/v1/bot/rail5/key` and the embedded decrypt script.
4. Bot fills in all card details on the test checkout form and submits.
5. The test payment handler records the submitted details in the sale's metadata along with the `testToken` (forwarded via `?t=` query param). No real charge is processed.
6. The wizard (still open) polls `GET /api/v1/rail5/cards/[cardId]/test-purchase-status`. The endpoint matches the sale by `testToken` (not by time window), preventing cross-card contamination.
7. The wizard compares each field client-side against `savedCardDetails` still in browser memory.

**Route:** `app/api/v1/rail5/cards/[cardId]/test-purchase-status/route.ts`

Logic:
- Session-authenticated (owner only), validates card ownership.
- Loads card record to get `card.testToken` and `card.testStartedAt`.
- If `card.testToken` is set, queries sales for the test checkout page and filters to those where `metadata.testToken === card.testToken`.
- Returns one of three states:
  - Matching sale found → `{ status: "completed", sale_id, submitted_details }`
  - `card.testStartedAt` set but no matching sale → `{ status: "in_progress", started_at }`
  - Otherwise → `{ status: "pending" }`

Response when completed:
```json
{
  "status": "completed",
  "sale_id": "sale_...",
  "completed_at": "2026-03-10T...",
  "submitted_details": {
    "cardNumber": "4111111111111111",
    "cardExpiry": "12/26",
    "cardCvv": "123",
    "cardholderName": "John Doe",
    "billingAddress": "123 Main St",
    "billingCity": "New York",
    "billingState": "NY",
    "billingZip": "10001"
  }
}
```

---

## Card Status Progression

| Status | Meaning | Triggered By |
|---|---|---|
| `pending_setup` | Card created, wizard in progress | `POST /api/v1/rail5/initialize` |
| `pending_delivery` | Key submitted, file sent to bot | `POST /api/v1/rail5/submit-key` |
| `confirmed` | Bot confirmed file receipt | `POST /bot/rail5/confirm-delivery` |
| `active` | Card in active use | First successful checkout |
| `frozen` | Owner manually paused | Owner action from dashboard |

UI label mapping (`components/wallet/card-visual.tsx`):
- `pending_setup` → "Pending Setup"
- `pending_delivery` → "Ready to Test"
- `confirmed` → "Confirmed"
- `active` → "Active"
- `frozen` → "Frozen"

---

## Message Delivery System

### Webhook Events

| Event | Description |
|---|---|
| `rail5.card.delivered` | Encrypted card file delivered to bot |
| `rail5.test.required` | Card confirmed — complete a sandbox test purchase at the provided URL to activate |
| `rail5.checkout.completed` | Checkout confirmed successful |
| `rail5.checkout.failed` | Checkout reported failure |
| `rails.updated` | Payment methods or spending config changed |

### Delivery Routing

All delivery paths use centralized templates from `lib/agent-management/bot-messaging/templates/`:

| Template | File | Used By |
|---|---|---|
| `RAIL5_CARD_DELIVERED` | `rail5-card-delivered.ts` | Wizard relay message, `sendToBot()` card delivery payload |
| `buildRail5TestInstructions(url)` | `rail5-test-required.ts` | `confirm-delivery` endpoint, wizard test relay message |

`sendToBot()` (`lib/agent-management/bot-messaging/index.ts`) handles routing:
- Checks bot's `webhookStatus` (from `bots` table `webhook_status` column)
- `active` or `degraded` → attempts `fireWebhook()`. On success, resets health to `active`.
- `unreachable` or `none` → skips webhook, stages as pending message.
- On webhook failure → increments `webhook_fail_count` atomically, transitions `active→degraded→unreachable`.

Pending messages expire per event type (`lib/agent-management/bot-messaging/expiry.ts`): `rail5.card.delivered` = 24h.

---

## Direct Delivery: Transient Relay

When a bot has a webhook, `sendToBot()` relays the encrypted card file directly. If the webhook fails, the file is staged as a pending message instead. The legacy `POST /api/v1/rail5/deliver-to-bot` endpoint also exists for owner-initiated direct webhook delivery.

### Why Transient (No Persistence for Encrypted Data)

The split-knowledge model requires that CreditClaw **never** stores both the decryption key and the encrypted file in the same system. Since CreditClaw already stores the key, it must not persist the ciphertext. During webhook delivery:

- The encrypted blob touches server memory for ~1 second during the HTTP relay
- After the response is returned, the data is garbage collected
- No database record contains any encrypted card content

**Note:** When webhook delivery fails and the file is staged as a pending message, the encrypted content is stored in `bot_pending_messages.payload` JSONB. This is acceptable because pending messages expire after 24 hours and are auto-purged.

### Webhook Payload (to Bot)

```json
{
  "event": "rail5.card.delivered",
  "timestamp": "2026-02-26T12:00:00.000Z",
  "bot_id": "bot_abc123",
  "data": {
    "card_id": "r5card_def456",
    "card_name": "Harry's Visa",
    "card_last4": "1234",
    "file_content": "--- CREDITCLAW ENCRYPTED CARD FILE ---\n...",
    "suggested_path": ".creditclaw/cards/Card-HarrysVisa-1234.md",
    "instructions": "<from centralized template>"
  }
}
```

Headers: `X-CreditClaw-Signature: sha256=<hmac>`, `X-CreditClaw-Event: rail5.card.delivered`

---

## Unified `rails.updated` Webhook

All rails fire a unified `rails.updated` webhook when a bot's payment methods change, so bots can call `GET /bot/status` to refresh their state.

### Actions by Rail

| Rail | Route | Action(s) Fired |
|---|---|---|
| Rail 1 | `stripe-wallet/create` | `wallet_created` |
| Rail 1 | `stripe-wallet/freeze` | `wallet_frozen` / `wallet_unfrozen` |
| Rail 2 | `card-wallet/create` | `wallet_created` |
| Rail 2 | `card-wallet/freeze` | `wallet_frozen` / `wallet_unfrozen` |
| Rail 4 | `rail4/link-bot` | `card_linked` |
| Rail 4 | `rail4/freeze` | `card_frozen` / `card_unfrozen` |
| Rail 5 | `rail5/cards/[cardId]` PATCH | `card_linked` / `card_removed` / `card_frozen` / `card_unfrozen` |

### Payload

```json
{
  "event": "rails.updated",
  "timestamp": "2026-02-26T12:00:00.000Z",
  "bot_id": "bot_abc123",
  "data": {
    "action": "card_linked",
    "rail": "rail5",
    "card_id": "r5card_def456",
    "bot_id": "bot_abc123",
    "message": "Your payment methods have been updated (card linked). Call GET /bot/status for details."
  }
}
```

Available actions: `card_linked`, `card_removed`, `card_frozen`, `card_unfrozen`, `card_created`, `card_deleted`, `wallet_created`, `wallet_linked`, `wallet_unlinked`, `wallet_frozen`, `wallet_unfrozen`, `wallet_funded`, `limits_updated`

All `rails.updated` webhooks use `fireWebhook()` with full persistence. These payloads contain no sensitive data (just action + IDs).

---

## Checkout Flow

### Step 1: Main Agent Requests Spawn Payload

`POST /api/v1/bot/rail5/checkout`

```json
{
  "merchant_name": "DigitalOcean",
  "merchant_url": "https://cloud.digitalocean.com/billing",
  "item_name": "Droplet hosting - 1 month",
  "amount_cents": 1200,
  "category": "cloud_compute"
}
```

CreditClaw validates spending limits (from `rail5_guardrails`) and returns a spawn payload. **No card data or key in this response.**

```json
{
  "approved": true,
  "spawn_payload": {
    "task": "You are a checkout agent. [instructions to get key, decrypt, checkout]",
    "cleanup": "delete",
    "runTimeoutSeconds": 300,
    "label": "checkout-digitalocean"
  },
  "checkout_id": "r5chk_abc123"
}
```

If above the master guardrails approval threshold, returns `"status": "pending_approval"` instead. The owner receives a confirmation request. Once approved, the checkout proceeds.

### Step 2: Main Agent Spawns Sub-Agent

```
sessions_spawn({ task: <from payload>, cleanup: "delete", runTimeoutSeconds: 300 })
```

Main agent's job is done. It waits for the announce.

### Step 3: Sub-Agent Gets Decryption Key

`POST /api/v1/bot/rail5/key` with `{ "checkout_id": "r5chk_abc123" }`

```json
{
  "key_hex": "a1b2c3d4...64 chars",
  "iv_hex": "e5f6a7b8...24 chars",
  "tag_hex": "c9d0e1f2...32 chars"
}
```

**Single-use:** After delivery, checkout record marked `key_delivered`. Subsequent calls rejected.

### Step 4: Sub-Agent Decrypts (Deterministic Script)

Pre-placed Node.js script, run via `exec`. Not LLM reasoning — deterministic:

```javascript
// decrypt.js — embedded in the encrypted card file between DECRYPT_SCRIPT_START/END markers
const crypto = require("crypto");
const fs = require("fs");
const [,, keyHex, ivHex, tagHex, filePath] = process.argv;

const raw = fs.readFileSync(filePath, "utf8");
const b64 = raw.match(/```([\s\S]+?)```/)[1].trim();
const data = Buffer.from(b64, "base64");

const decipher = crypto.createDecipheriv(
  "aes-256-gcm",
  Buffer.from(keyHex, "hex"),
  Buffer.from(ivHex, "hex")
);
decipher.setAuthTag(Buffer.from(tagHex, "hex"));
const plain = decipher.update(data.slice(0, -16)) + decipher.final("utf8");
process.stdout.write(plain);
```

Run: `node decrypt.js <key> <iv> <tag> Card-Harry-26-Visa.md`

### Step 5: Sub-Agent Confirms + Announces

Sub-agent calls `POST /api/v1/bot/rail5/confirm`:

```json
{ "checkout_id": "r5chk_abc123", "status": "success", "merchant_name": "DigitalOcean" }
```

CreditClaw then: debits wallet (atomic), creates transaction, fires webhook (`rail5.checkout.completed`), sends owner notification, updates spend aggregates.

Sub-agent announces: "Purchase of Droplet hosting at DigitalOcean — SUCCESS"

Session deleted. Key, decrypted card, all context — gone.

---

## Endpoints Summary

### Owner-Facing (Session Cookie Auth)

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/v1/rail5/initialize` | Create card record, return card_id |
| POST | `/api/v1/rail5/submit-key` | Store encryption key material |
| GET | `/api/v1/rail5/cards` | List owner's Rail 5 cards |
| GET | `/api/v1/rail5/cards/[cardId]` | Get card detail + checkout history |
| PATCH | `/api/v1/rail5/cards/[cardId]` | Update card settings, link/unlink bot, freeze/unfreeze, change card_color |
| DELETE | `/api/v1/cards/[cardId]?rail=rail5` | Delete card (unified endpoint, shared with rail4) |
| GET | `/api/v1/rail5/cards/[cardId]/test-purchase-status` | Poll test result — 3 states: pending, in_progress, completed |
| POST | `/api/v1/rail5/deliver-to-bot` | Transient relay of encrypted file to bot (legacy) |
| POST | `/api/v1/bot-messages/send` | Universal message delivery via `sendToBot()` |

### Bot-Facing (Bearer Token Auth via `withBotApi`)

| Method | Path | Rate Limit | Purpose |
|---|---|---|---|
| POST | `/api/v1/bot/rail5/checkout` | 30/hr | Validate spend + return spawn payload |
| POST | `/api/v1/bot/rail5/key` | 30/hr | Return decryption key (single-use) |
| POST | `/api/v1/bot/rail5/confirm` | 30/hr | Sub-agent reports checkout result |
| POST | `/api/v1/bot/rail5/confirm-delivery` | — | Bot confirms card file received + generates test token + sends `rail5.test.required` event |
| GET | `/api/v1/bot/messages` | — | Poll pending messages |
| POST | `/api/v1/bot/messages/ack` | — | Acknowledge (remove) pending messages |

---

## Verified Technology

**OpenClaw `sessions_spawn` + `cleanup: "delete"`**
Production since v2026.2.15. `/subagents spawn` command added v2026.2.17 for deterministic skill-file triggering.

**OpenClaw `exec` tool**
Available to sub-agents by default (`group:runtime`). Node.js on all gateway hosts (required since v2026.1.29). Decrypt script uses only `node:crypto`.

**Web Crypto API (AES-256-GCM)**
W3C standard. All modern browsers. No external library needed.

**Node.js `crypto.createDecipheriv` (AES-256-GCM)**
Stable since Node 10+. Built-in, no dependencies.

---

## Security Properties

| Property | Rail 5 |
|---|---|
| CreditClaw holds card data | **No** |
| CreditClaw holds encrypted card data | **No** — transient relay only, zero persistence (pending messages expire in 24h) |
| Main agent sees card details | **Never** |
| Main agent sees decryption key | **Never** |
| Card data in persistent context | **Never** — only in ephemeral sub-agent |
| Encrypted at rest | **Yes** — AES-256-GCM on owner's machine and bot's workspace |
| Single point of compromise | **None** — file without key is gibberish, key without file decrypts nothing |
| Key delivery | Single-use per checkout, only to authenticated sub-agent |
| Spending controls | Per-checkout, daily, monthly limits via `rail5_guardrails` + procurement controls |
| Human approval | Configurable threshold — owner confirmation for purchases above limit |
| Sub-agent timeout | 5 minutes, then killed + deleted |
| Webhook delivery persistence | `rails.updated` and other events: persisted. `rail5.card.delivered`: transient (webhook) or 24h expiry (pending message) |
| Test verification | Per-card token matching — no cross-card contamination |

---

## Changelog

| Date | Change |
|---|---|
| 2026-02-24 | Wizard reordered: Name → HowItWorks → CardDetails → Limits → LinkBot → Encrypt → Success |
| 2026-02-24 | Added `POST /api/v1/rail5/deliver-to-bot` for direct encrypted file delivery to bots |
| 2026-02-24 | Added `GET/PATCH /api/v1/rail5/cards/[cardId]` for card detail and updates |
| 2026-02-24 | Unified `rails.updated` webhook wired across all rails (1, 2, 4, 5) |
| 2026-02-24 | Adaptive success screen with copyable bot instructions and `card_id` |
| 2026-02-26 | **CRITICAL:** Deliver-to-bot changed from `fireWebhook()` (persists payload) to transient relay (zero DB persistence) |
| 2026-02-26 | Exported `signPayload` and `attemptDelivery` from `lib/webhooks.ts` for transient relay use |
| 2026-02-26 | Removed all `webhook_deliveries` writes from deliver-to-bot |
| 2026-03-06 | Wizard expanded to 8 steps (added billing address + delivery result with relay message sharing) |
| 2026-03-06 | `sendToBot()` replaced direct `fireWebhook()` for card delivery — adds pending message fallback |
| 2026-03-06 | Moved `lib/bot-messaging/` → `lib/agent-management/bot-messaging/` |
| 2026-03-06 | Added centralized message templates (`lib/agent-management/bot-messaging/templates/`) |
| 2026-03-06 | Added `POST /bot/rail5/confirm-delivery` endpoint — bot confirms card file received |
| 2026-03-06 | Confirm-delivery response returns `test_checkout_url` for end-to-end card verification |
| 2026-03-06 | Card status progression: `pending_setup` → `pending_delivery` → `confirmed` → `active` → `frozen` |
| 2026-03-06 | Status label `pending_delivery` → "Ready to Test" (was "Awaiting Bot") |
| 2026-03-06 | Webhook health tracking: `webhookStatus`/`webhookFailCount` on bots table, smart routing in `sendToBot()` |
| 2026-03-06 | Spending controls moved to `rail5_guardrails` table (separate from `rail5_cards`) |
| 2026-03-07 | Wizard expanded to 9 steps (split delivery result and test verification into separate steps) |
| 2026-03-07 | Confirm-delivery response updated with real `test_checkout_url` and `test_instructions` |
| 2026-03-07 | Added `GET /api/v1/rail5/cards/[cardId]/test-purchase-status` — field-by-field card verification |
| 2026-03-07 | Card details saved into `savedCardDetails` state before clearing inputs |
| 2026-03-10 | Added `test_token` and `test_started_at` columns to `rail5_cards` for per-card test tracking |
| 2026-03-10 | Added `rail5.test.required` event — sent via `sendToBot()` after confirm-delivery |
| 2026-03-10 | Created `rail5-test-required.ts` template with `buildRail5TestInstructions(url)` |
| 2026-03-10 | `confirm-delivery` now generates 8-char hex token, stores on card, appends to test URL as `?t=` |
| 2026-03-10 | Test checkout page records `test_started_at` when loaded with matching `?t=` token |
| 2026-03-10 | Test payment handler forwards `testToken` in sale metadata via `?t=` query param |
| 2026-03-10 | `test-purchase-status` matches sales by token only — removed 5-minute window fallback (fixes cross-card contamination bug) |
| 2026-03-10 | Step 8 now shows three states: pending (manual relay instructions), in_progress (spinner), completed (field-by-field results) |
| 2026-03-10 | Removed dark card info/API cheat sheet block from Step 7 (redundant with card summary panel) |
| 2026-03-10 | Renamed "Self-Hosted" to "My Card - Encrypted" in New Card modal, moved to first position |
| 2026-03-10 | "My Card - Encrypted" now opens Rail 5 wizard directly from the modal (no navigation to `/sub-agent-cards`) |
| 2026-03-10 | Added `rail5.test.required` to webhook events docs in `skill.md` and `encrypted-card.md` |
