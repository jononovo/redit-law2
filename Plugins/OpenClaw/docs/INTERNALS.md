# CreditClaw OpenClaw Plugin — Internals

Technical reference for agents and developers working on the plugin.
Covers the non-obvious parts: crypto, field detection, data lifecycle, retry logic, and error handling.

---

## Architecture at a Glance

```
index.ts          — orchestration, tool registration, finally-block cleanup
  ├── api.ts      — key retrieval (POST /bot/rail5/key)
  ├── decrypt.ts  — blob extraction, AES-256-GCM decryption, wipe helpers
  └── fill-card.ts — snapshot-based field detection, browser.type() automation
```

- Single tool exposed: `creditclaw_fill_card`
- Fills ONLY card number + CVV; agent handles expiry, submit, result detection
- Card data never enters agent context — decrypted, used, and wiped inside the plugin

---

## Decryption Pipeline (`decrypt.ts`)

### Encrypted card file format
- File contains a marker block:
  ```
  ENCRYPTED_CARD_START
  <base64-encoded ciphertext>
  ENCRYPTED_CARD_END
  ```
- `extractEncryptedBlob()` reads the file, regex-extracts the base64 block, returns a `Buffer`

### AES-256-GCM specifics
- Ciphertext layout: `[encrypted_payload (N-16 bytes)][appended_auth_tag (16 bytes)]`
- `encryptedData.slice(0, -16)` strips the appended 16-byte auth tag from the blob
- The **server-supplied `tag_hex`** (from `/bot/rail5/key`) is used via `setAuthTag()`, NOT the appended tag
  - The appended tag exists for compatibility with older decrypt scripts
  - Only the server tag is trusted for GCM authentication
- Key material: `key_hex` (64 hex chars = 32 bytes), `iv_hex` (24 hex chars = 12 bytes), `tag_hex` (32 hex chars = 16 bytes)

### Decrypted JSON shape (`CardData`)
```ts
{ number, cvv, exp_month, exp_year, name, address?, city?, state?, zip?, country? }
```
- Plugin uses only `number` and `cvv` for filling
- Other fields exist so the agent can fill expiry/billing separately (it reads them from its own card file metadata, not from decrypted data)

---

## Sensitive Data Lifecycle (`index.ts`)

### Variables that hold secrets
| Variable       | Type     | Contains                          |
|----------------|----------|-----------------------------------|
| `encryptedData`| `Buffer` | Raw ciphertext from card file     |
| `keyMaterial`  | object   | `key_hex`, `iv_hex`, `tag_hex`    |
| `card`         | object   | Decrypted card number, CVV, etc.  |

### Wipe strategy (all in `finally` block)
- `card` → `wipeCardData()`: overwrites every string field with `"0".repeat(len)`, zeroes numeric fields
- `encryptedData` → `wipeBuffer()`: `buf.fill(0)` zeroes all bytes in-place
- `keyMaterial` → each hex string overwritten with `"0".repeat(N)`, then reference nulled
- After overwrite, all references set to `null`

### Known limitation
- Decrypted plaintext (`plain` string in `decryptCard`) is a JS string — immutable, cannot be zeroed
- It's only held in local function scope and becomes eligible for GC immediately after `JSON.parse`
- No mitigation possible at the JS runtime level

---

## Field Detection (`fill-card.ts`)

### Two-pass matching with `findFieldRef()`
1. Parse snapshot line by line
2. Skip lines with no element ref (`[ref=e123]` or `[123]` pattern)
3. **Require input semantics**: line must contain `input`, `textbox`, `text field`, or `<input` — lines without these are skipped entirely (no fallback to non-input elements)
4. **Word-boundary matching**: label must appear with boundary characters on both sides
   - Boundary set: `` \t"':;,.>]|/=-_#([{ ``
   - Prevents partial matches (e.g., "verification" inside "emailVerificationCode")

### Label sets (intentionally narrow)
- Card number: `card number`, `cardnumber`, `card-number`, `credit card number`, `debit card number`
- CVV: `cvv`, `cvc`, `cvv2`, `cvc2`, `security code`, `card verification`
- Removed (too broad): `pan`, `account number`, `verification`, `security number`, `card code`

### Iframe auto-detection
- `detectPaymentIframe()` scans snapshot for known payment provider domains
- Supported: `stripe.com`, `js.stripe.com`, `braintreegateway.com`, `braintree-api.com`, `adyen.com`, `checkout.shopify.com`, `squareup.com`, `square.com`
- Returns a CSS selector like `iframe[src*='stripe.com']` for re-snapshotting

---

## Retry & Fallback Logic (`fill-card.ts`)

### `attemptFill()` recursion paths

```
Attempt 1 (with frameHint):
  snapshot fails → retry without frameHint (attempt 2)
  fields not found → N/A (frameHint was provided, skip iframe detection)

Attempt 1 (no frameHint):
  snapshot fails → return fill_failed
  fields not found → detectPaymentIframe()
    found → retry with detected frame selector (attempt 2)
    not found → return fill_failed

Attempt 2 (with frameHint, came from auto-detect):
  fields not found → retry without frameHint (attempt 3, fallback to main page)

Attempt 2+ (any):
  snapshot or type fails → return fill_failed (no more retries within attemptFill)
```

### `fillCardFields()` outer retry
- If `attemptFill` returns `fill_failed` with a reason OTHER than `fields_not_found`, it retries once
- `fields_not_found` is not retried — if the fields aren't in the DOM, a second try won't help
- This catches transient browser automation failures (stale refs, timing)

---

## Error Handling & Message Sanitization

### Core rule: raw exceptions never reach the agent
- Every external call (`fetch`, `readFileSync`, `browser.*`) is wrapped in try/catch
- Caught errors produce controlled `FillResult` objects with:
  - `status`: `"error"` (plugin-level) or `"fill_failed"` (browser-level)
  - `reason`: machine-readable code (e.g., `card_file_error`, `snapshot_failed`)
  - `message`: human-readable, never includes exception details or card data

### API error sanitization (`api.ts`)
- Server `detail.message` is NOT forwarded to the agent
- 409 → specific "key already delivered" message (includes checkout_id — safe, it's not secret)
- 403 → generic "not approved or wrong bot"
- Other → generic "failed with status N"

### Status codes and agent behavior
| `status`      | `reason`                | Agent should...                                      |
|---------------|-------------------------|------------------------------------------------------|
| `filled`      | —                       | Proceed: click submit, detect result                 |
| `fill_failed` | `fields_not_found`      | Check page state, may need to navigate to payment    |
| `fill_failed` | `card_number_not_found` | Page layout may be unusual; try frame_hint           |
| `fill_failed` | `cvv_not_found`         | CVV may be on a separate step/iframe                 |
| `fill_failed` | `snapshot_failed`       | Page not ready; wait and retry                       |
| `fill_failed` | `*_type_failed`         | Stale ref; agent should re-navigate or wait          |
| `error`       | `missing_api_key`       | Config issue; cannot proceed                         |
| `error`       | `card_file_error`       | Bad file path or corrupted file                      |
| `error`       | `key_retrieval_failed`  | API issue; check checkout_id validity                |
| `error`       | `decryption_failed`     | Key/file mismatch; start new checkout                |
| `error`       | `browser_error`         | Unexpected; agent should retry or escalate           |

---

## Key Single-Use Constraint

- `/bot/rail5/key` delivers the decryption key exactly ONCE per `checkout_id`
- Second call returns HTTP 409
- If the plugin returns `fill_failed` or `error` after the key was already fetched, the key is consumed
- **Agent must start a NEW checkout** (new `checkout_id` from `POST /bot/rail5/checkout`) to retry
- This is a server-enforced security constraint, not a plugin limitation

---

## Browser API Surface

The plugin uses `api.runtime.browser` which exposes:

| Method     | Signature                                                    | Notes                                       |
|------------|--------------------------------------------------------------|---------------------------------------------|
| `snapshot` | `(opts: { frame?, interactive, compact }) => Promise<string>`| Returns text representation of visible DOM  |
| `type`     | `(ref: string, text: string) => Promise<void>`              | Types text into element identified by ref   |
| `click`    | `(ref: string) => Promise<void>`                            | Clicks element (registered but not used)    |

- `interactive: true` ensures snapshot includes interactive element refs
- `compact: true` reduces snapshot size (fewer decorative elements)
- `frame` scopes snapshot to a specific iframe via CSS selector
- Refs are ephemeral — valid only for the snapshot that produced them

---

## Not Yet Implemented

- **Tier 2 (CDP coordinate-based injection)**: planned fallback for when snapshot-based ref typing fails on heavily obfuscated payment forms
- **Claude Desktop / Cowork plugin variant**: separate plugin with triple-secure context scanning (referenced in SKILL.md as coming soon)
