# Rail 5: Sub-Agent Cards — Technical Overview

**February 26, 2026 • Internal • v2**

---

## What Rail 5 Is

Rail 5 lets a bot purchase from any merchant using an encrypted card file that CreditClaw can't read and a decryption key that's only ever handed to a disposable sub-agent. CreditClaw holds zero card data. The bot's main agent never sees card details or the decryption key.

**Owner holds:** An encrypted `.md` file containing full card details (e.g., `Card-Harry-26-Visa.md`). Also available as a backup download.
**Bot holds:** The encrypted `.md` file — delivered directly via webhook or placed manually by the owner.
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

**Shared platform infrastructure** (not duplicated): `withBotApi` middleware, bot auth (`lib/bot-auth.ts`), wallet + spending controls, master guardrails, webhooks, notifications, rate limiting.

---

## File Structure

```
lib/
  rail5.ts                                 # Spawn payload builder, validation helpers
  webhooks.ts                              # Webhook helpers (signPayload, attemptDelivery exported for transient relay)

app/
  api/v1/rail5/
    initialize/route.ts                    # Owner: create card record (POST)
    submit-key/route.ts                    # Owner: store encryption key (POST)
    cards/route.ts                         # Owner: list rail5 cards (GET)
    cards/[cardId]/route.ts                # Owner: get/update card (GET, PATCH)
    deliver-to-bot/route.ts                # Owner: transient relay of encrypted file to bot (POST)
  api/v1/bot/rail5/
    key/route.ts                           # Bot: sub-agent gets decryption key (POST)
    checkout/route.ts                      # Bot: get spawn payload (POST)
    confirm/route.ts                       # Bot: sub-agent reports result (POST)
  app/sub-agent-cards/
    page.tsx                               # Dashboard listing page
    [cardId]/page.tsx                      # Card detail page

components/dashboard/
  rail5-setup-wizard.tsx                   # 7-step onboarding wizard with direct delivery

shared/schema.ts                           # Add: rail5_cards table + types
server/storage.ts                          # Add: rail5 storage methods
lib/rate-limit.ts                          # Add: rate limit entries

public/
  skill.md                                 # Append: Rail 5 section
  decrypt.js                               # Deterministic decrypt script for bot workspace
```

---

## Database: `rail5_cards` Table

New table. Does not touch `rail4_cards`.

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
| `spending_limit_cents` | integer | Per-checkout spending cap |
| `daily_limit_cents` | integer | Daily aggregate cap |
| `monthly_limit_cents` | integer | Monthly aggregate cap |
| `human_approval_above_cents` | integer | Require owner approval above this |
| `status` | text | `pending_setup` → `active` → `frozen` |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

**What's NOT stored:** Card number, CVV, expiry, name, address, encrypted card file, or any data that could identify the card.

---

## Onboarding Flow (Setup Wizard)

7-step wizard at `components/dashboard/rail5-setup-wizard.tsx`.

### Step 1: Card Name + Brand
User enters a name ("Harry's Visa"), selects brand, enters last 4 digits. Display-only.

### Step 2: How It Works
"CreditClaw will never see your card details. Everything is encrypted in your browser before it leaves this page."

### Step 3: Full Card Entry
User enters: number, CVV, expiry, cardholder name, billing address. **None of this leaves the browser.**

### Step 4: Spending Limits
Per-checkout limit, daily/monthly caps, human approval threshold.

### Step 5: Bot Connection
Link the card to a bot (select existing or skip). If a bot with a callback URL is linked before encryption, direct delivery will be attempted in the next step.

### Step 6: Client-Side Encryption + Download + Direct Delivery

The browser encrypts all card data, sends **only the key** to CreditClaw, triggers the encrypted file download, and optionally delivers the encrypted file directly to the linked bot:

```typescript
// In the browser (rail5-setup-wizard.tsx)

// 1. Generate AES-256-GCM key
const key = await crypto.subtle.generateKey(
  { name: "AES-GCM", length: 256 }, true, ["encrypt"]
);
const iv = crypto.getRandomValues(new Uint8Array(12));

// 2. Encrypt card JSON
const cardJson = JSON.stringify({
  number: "4111111111111111", cvv: "123",
  exp_month: 3, exp_year: 2027,
  name: "Harry Smith",
  address: "123 Main St", city: "New York", state: "NY", zip: "10001",
});
const ciphertext = await crypto.subtle.encrypt(
  { name: "AES-GCM", iv }, key, new TextEncoder().encode(cardJson)
);

// 3. Export raw key
const rawKey = await crypto.subtle.exportKey("raw", key);

// 4. Send ONLY key material to CreditClaw (no card data)
await authFetch("/api/v1/rail5/submit-key", {
  method: "POST",
  body: JSON.stringify({
    card_id: cardId,
    key_hex: bufToHex(rawKey),                                // 64 hex chars
    iv_hex: bufToHex(iv),                                     // 24 hex chars
    tag_hex: bufToHex(new Uint8Array(ciphertext.slice(-16))), // 32 hex chars
  }),
});

// 5. Build and download encrypted .md file — never touches server
const b64 = btoa(String.fromCharCode(...new Uint8Array(ciphertext)));
const md = `# CreditClaw Encrypted Card\n\n\`\`\`\n${b64}\n\`\`\`\n`;
downloadFile(md, `Card-${cardName}-${last4}.md`);

// 6. If a bot with callback URL is linked, deliver directly via transient relay
if (selectedBotId) {
  await authFetch("/api/v1/rail5/deliver-to-bot", {
    method: "POST",
    body: JSON.stringify({
      card_id: cardId,
      bot_id: selectedBotId,
      encrypted_file_content: md,
    }),
  });
}
```

**Why Web Crypto API:** Built into every modern browser. No library. AES-256-GCM is authenticated encryption (tamper-proof via auth tag). Plaintext card data never leaves the browser.

**Backup download is always triggered**, even when direct delivery succeeds. The owner always gets a copy.

### Step 7: Success

Adaptive success screen:
- **If bot was linked and delivery succeeded:** Shows "Your encrypted card has been delivered and ready for checkout" with card ID, spending limits, and bot API instructions.
- **If no bot linked / delivery failed:** Shows download confirmation and instructions for manual placement.
- Includes a copyable message with `card_id` and relevant API endpoints (`GET /bot/status`, `POST /bot/rail5/checkout`, `GET /bot/rail5/key`).
- Notes that `GET /bot/status` always has the latest card configuration.

---

## Direct Delivery: Transient Relay

When a bot is linked before encryption, the encrypted card file is relayed directly to the bot via `POST /api/v1/rail5/deliver-to-bot`.

### How It Works

1. Browser sends encrypted file content to `/api/v1/rail5/deliver-to-bot`
2. Server validates auth, card ownership, bot ownership
3. Server builds an HMAC-SHA256 signed webhook payload
4. Server sends the payload directly to the bot's callback URL via HTTP POST
5. Server returns success/failure to the browser
6. **No database write occurs.** The encrypted blob exists only in process memory during the relay.

### Why Transient (No Persistence)

The split-knowledge model requires that CreditClaw **never** stores both the decryption key and the encrypted file in the same system. Since CreditClaw already stores the key, it must not persist the ciphertext — not even temporarily in the webhook deliveries table. The transient relay ensures:

- The encrypted blob touches server memory for ~1 second during the HTTP relay
- After the response is returned, the data is garbage collected
- No database record contains any encrypted card content
- The `webhook_deliveries` table is **not used** for this event type

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
    "encrypted_file_content": "# CreditClaw Encrypted Card\n\n```\n<base64>...\n```\n"
  }
}
```

Headers: `X-CreditClaw-Signature: sha256=<hmac>`, `X-CreditClaw-Event: rail5.card.delivered`

### Failure Handling

If delivery fails (bot offline, timeout, non-2xx response), the endpoint returns a 502 with `delivered: false`. The owner still has the backup download from Step 6.

**No retries.** Unlike normal webhooks, `rail5.card.delivered` is not retried because retrying would require storing the encrypted blob for the retry queue, which violates the split-knowledge model. The owner uses the backup download and places the file manually.

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

### Available Actions

`card_linked`, `card_removed`, `card_frozen`, `card_unfrozen`, `card_created`, `card_deleted`, `wallet_created`, `wallet_linked`, `wallet_unlinked`, `wallet_frozen`, `wallet_unfrozen`, `wallet_funded`, `limits_updated`

All `rails.updated` webhooks use `fireWebhook()` with full persistence and retries in the `webhook_deliveries` table. This is correct — these payloads contain no sensitive data (just action + IDs).

All webhook calls in route handlers use `.catch(() => {})` to never block the API response.

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

CreditClaw validates spending limits and returns a spawn payload. **No card data or key in this response.**

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

If above `human_approval_above_cents`, returns `"status": "pending_approval"` instead. The owner receives a confirmation request (e.g., magic link email). Once the owner approves, the checkout proceeds.

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
// decrypt.js — in bot's OpenClaw workspace
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
| PATCH | `/api/v1/rail5/cards/[cardId]` | Update card settings, link/unlink bot, freeze/unfreeze |
| POST | `/api/v1/rail5/deliver-to-bot` | Transient relay of encrypted file to bot (no DB persistence) |

### Bot-Facing (Bearer Token Auth via `withBotApi`)

| Method | Path | Rate Limit | Purpose |
|---|---|---|---|
| POST | `/api/v1/bot/rail5/checkout` | 30/hr | Validate spend + return spawn payload |
| POST | `/api/v1/bot/rail5/key` | 30/hr | Return decryption key (single-use) |
| POST | `/api/v1/bot/rail5/confirm` | 30/hr | Sub-agent reports checkout result |

---

## Verified Technology (Jan–Feb 2026)

**OpenClaw `sessions_spawn` + `cleanup: "delete"`**
Production since v2026.2.15. `/subagents spawn` command added v2026.2.17 for deterministic skill-file triggering.
→ [docs.openclaw.ai/tools/subagents](https://docs.openclaw.ai/tools/subagents)

**OpenClaw `exec` tool**
Available to sub-agents by default (`group:runtime`). Node.js on all gateway hosts (required since v2026.1.29). Decrypt script uses only `node:crypto`.
→ [docs.openclaw.ai/tools/exec](https://docs.openclaw.ai/tools/exec)

**Web Crypto API (AES-256-GCM)**
W3C standard. All modern browsers. No external library needed.
→ [MDN: SubtleCrypto.encrypt()](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/encrypt)

**Node.js `crypto.createDecipheriv` (AES-256-GCM)**
Stable since Node 10+. Built-in, no dependencies.
→ [Node.js crypto docs](https://nodejs.org/api/crypto.html)

**OpenClaw RFC #9676: Agent-Blind Credential Architecture**
Community proposal for credential broker pattern. Rail 5 is a domain-specific implementation.
→ [github.com/openclaw/openclaw/discussions/9676](https://github.com/openclaw/openclaw/discussions/9676)

---

## Security Properties

| Property | Rail 5 |
|---|---|
| CreditClaw holds card data | **No** |
| CreditClaw holds encrypted card data | **No** — transient relay only, zero persistence |
| Main agent sees card details | **Never** |
| Main agent sees decryption key | **Never** |
| Card data in persistent context | **Never** — only in ephemeral sub-agent |
| Encrypted at rest | **Yes** — AES-256-GCM on owner's machine and bot's workspace |
| Single point of compromise | **None** — file without key is gibberish, key without file decrypts nothing |
| Key delivery | Single-use per checkout, only to authenticated sub-agent |
| Spending controls | Per-checkout, daily, monthly limits + master guardrails |
| Human approval | Configurable threshold — owner confirmation via magic link for purchases above limit |
| Sub-agent timeout | 5 minutes, then killed + deleted |
| Webhook delivery persistence | `rails.updated` and other events: persisted. `rail5.card.delivered`: **transient only** |

---

## Changelog from v1

| Date | Change |
|---|---|
| 2026-02-24 | Wizard reordered: Name → HowItWorks → CardDetails → **Limits** → **LinkBot** → Encrypt → Success (was: LinkBot before Limits) |
| 2026-02-24 | Added `POST /api/v1/rail5/deliver-to-bot` for direct encrypted file delivery to bots |
| 2026-02-24 | Added `GET/PATCH /api/v1/rail5/cards/[cardId]` for card detail and updates |
| 2026-02-24 | Unified `rails.updated` webhook wired across all rails (1, 2, 4, 5) |
| 2026-02-24 | Adaptive success screen with copyable bot instructions and `card_id` |
| 2026-02-24 | Changed "ready to use" → "ready for checkout" throughout wizard |
| 2026-02-26 | **CRITICAL:** Deliver-to-bot changed from `fireWebhook()` (persists payload) to transient relay (zero DB persistence) |
| 2026-02-26 | Exported `signPayload` and `attemptDelivery` from `lib/webhooks.ts` for transient relay use |
| 2026-02-26 | Removed all `webhook_deliveries` writes from deliver-to-bot — encrypted data never touches the database |
