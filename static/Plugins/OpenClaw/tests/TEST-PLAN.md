# CreditClaw Plugin — Test Plan

Structured test scenarios for the `creditclaw_fill_card` plugin.
Each section includes setup, inputs, expected behavior, and pass/fail criteria.

**Context:** The plugin depends on the OpenClaw plugin SDK, a live browser, and the CreditClaw API. Most tests below are designed to be run as isolated scripts against individual modules, or as manual walkthrough scenarios against a live checkout.

---

## T1 — Decryption: Known Test Vector

**What it tests:** `extractEncryptedBlob()` and `decryptCard()` produce correct output from a known-good encrypted card file.

**Setup:**
1. Use the CreditClaw test card file (delivered during Rail 5 setup with a test card)
2. Obtain the corresponding key material from `POST /bot/rail5/key` using the test checkout ID

**Steps:**
1. Call `extractEncryptedBlob(testFilePath)` — should return a Buffer
2. Call `decryptCard(buffer, key_hex, iv_hex, tag_hex)` — should return a `CardData` object
3. Verify `result.number` matches the test card number
4. Verify `result.cvv` matches the test CVV
5. Verify `result.exp_month` and `result.exp_year` are valid integers

**Pass criteria:**
- No exceptions thrown
- All card fields match the known test values
- Return type matches `CardData` interface

**Fail indicators:**
- `Error: Unsupported state or unable to authenticate data` → auth tag mismatch (check `tag_hex` and ciphertext slicing)
- `No encrypted card data found` → file doesn't contain `ENCRYPTED_CARD_START/END` markers

---

## T2 — Decryption: Ciphertext Slicing

**What it tests:** The 16-byte appended auth tag is correctly stripped before decryption.

**Setup:**
- Create a test buffer of known length (e.g., 80 bytes)

**Steps:**
1. Verify `encryptedData.slice(0, -16)` produces a buffer of length `original - 16`
2. Confirm the last 16 bytes of the original buffer are NOT passed to `decipher.update()`
3. Confirm `setAuthTag()` uses the server-supplied `tag_hex`, not the appended bytes

**Pass criteria:**
- Ciphertext length = original buffer length minus 16
- Decryption succeeds with server tag
- Decryption would fail if appended tag were used instead (they may differ)

---

## T3 — Decryption: Malformed File

**What it tests:** `extractEncryptedBlob()` fails gracefully on bad input.

**Test cases:**

| Input                                          | Expected                          |
|------------------------------------------------|-----------------------------------|
| File with no markers                           | Throws (no `ENCRYPTED_CARD_START`)|
| File with START but no END                     | Throws                            |
| File with markers but empty content between    | Throws or returns empty Buffer    |
| File with invalid base64 between markers       | Buffer.from returns garbage → decryptCard fails later |
| Non-existent file path                         | Throws ENOENT                     |

**Pass criteria:** All cases throw without leaking file contents in the error message.

---

## T4 — Field Detection: True Positives

**What it tests:** `findFieldRef()` correctly identifies card number and CVV fields from realistic snapshot lines.

**Test inputs** (simulated snapshot lines):

```
[ref=e42] input "Card Number" placeholder="1234 5678 9012 3456"
[ref=e58] input "CVV" placeholder="123"
[ref=e61] input type="text" aria-label="card number"
[ref=e73] textbox "Security Code"
[ref=e80] input "CVC"
[ref=e91] text field "Credit Card Number"
```

**Expected results:**

| Input line              | Label list         | Should match? | Expected ref |
|-------------------------|--------------------|---------------|--------------|
| `input "Card Number"`   | CARD_NUMBER_LABELS | Yes           | `e42`        |
| `input "CVV"`           | CVV_LABELS         | Yes           | `e58`        |
| `aria-label="card number"` | CARD_NUMBER_LABELS | Yes        | `e61`        |
| `textbox "Security Code"` | CVV_LABELS       | Yes           | `e73`        |
| `input "CVC"`           | CVV_LABELS         | Yes           | `e80`        |
| `text field "Credit Card Number"` | CARD_NUMBER_LABELS | Yes | `e91`        |

---

## T5 — Field Detection: False Positives (Must NOT Match)

**What it tests:** Labels that could appear in non-card contexts are rejected.

**Test inputs:**

```
[ref=e10] div "Enter your card number below"
[ref=e20] span class="cvv-help" "The 3-digit security code on the back"
[ref=e30] label "Card Number"
[ref=e40] input "emailVerificationCode"
[ref=e50] input "Account Number" placeholder="Bank routing"
[ref=e60] button "Verify Card Number"
[ref=e70] p "Your CVV is the 3 digits on the back of your card"
```

**Expected results:**

| Input line                    | Should match? | Why                                        |
|-------------------------------|---------------|--------------------------------------------|
| `div "Enter your card number"`| No            | No input semantics (div)                   |
| `span class="cvv-help"`       | No            | No input semantics (span)                  |
| `label "Card Number"`         | No            | No input semantics (label)                 |
| `input "emailVerificationCode"` | No          | "cvc"/"cvv" would be substring but fails boundary check |
| `input "Account Number"`      | No            | Not in label list (removed as too broad)   |
| `button "Verify Card Number"` | No            | No input semantics (button)                |
| `p "Your CVV is the..."`      | No            | No input semantics (p)                     |

---

## T6 — Field Detection: Boundary Matching

**What it tests:** Word-boundary logic prevents partial substring matches.

**Test inputs:**

```
[ref=e10] input "emailVerificationCode"
[ref=e20] input "subcvvfield"
[ref=e30] input "pre-card numberish"
[ref=e40] input aria-label="cvv"
[ref=e50] input name="card-number"
```

**Expected results:**

| Input                          | Label     | Boundary before | Boundary after | Match? |
|--------------------------------|-----------|-----------------|----------------|--------|
| `emailVerificationCode`        | `cvc`     | `i` (not boundary) | `a` (not boundary) | No |
| `subcvvfield`                  | `cvv`     | `b` (not boundary) | `f` (not boundary) | No |
| `pre-card numberish`           | `card number` | `-` (boundary) | `i` (not boundary) | No |
| `aria-label="cvv"`             | `cvv`     | `"` (boundary)  | `"` (boundary) | Yes    |
| `name="card-number"`           | `card-number` | `"` (boundary) | `"` (boundary) | Yes |

---

## T7 — Iframe Auto-Detection

**What it tests:** `detectPaymentIframe()` returns correct selectors for known payment providers.

**Test cases:**

| Snapshot contains                              | Expected return                          |
|------------------------------------------------|------------------------------------------|
| `iframe src="https://js.stripe.com/v3/..."`    | `iframe[src*='js.stripe.com']`           |
| `iframe src="https://pay.adyen.com/..."`       | `iframe[src*='adyen.com']`               |
| `iframe src="https://example.com/checkout"`    | `null` (not a known provider)            |
| No iframe in snapshot                          | `null`                                   |
| `iframe src="https://checkout.shopify.com/..."` | `iframe[src*='checkout.shopify.com']`   |

---

## T8 — Retry Logic: Attempt Sequencing

**What it tests:** `attemptFill()` and `fillCardFields()` follow the correct retry paths.

### Scenario A — Frame hint fails, main page succeeds
1. Call with `frameHint = "iframe[src*='stripe.com']"`
2. Snapshot with frame throws → should retry without frame (attempt 2)
3. Attempt 2 snapshot succeeds, fields found → should return `filled`

### Scenario B — No frame hint, iframe auto-detected
1. Call without `frameHint`
2. Snapshot succeeds but no card fields found
3. Snapshot contains `stripe.com` iframe reference
4. Should auto-detect and retry with `iframe[src*='stripe.com']` (attempt 2)

### Scenario C — Auto-detected frame fails, falls back to main page
1. Same as B, but attempt 2 also finds no fields
2. Should retry without frame (attempt 3)
3. If still no fields → return `fields_not_found`

### Scenario D — Outer retry on transient failure
1. `attemptFill` returns `fill_failed` with reason `card_number_type_failed`
2. `fillCardFields` should call `attemptFill` again (retry)
3. If second attempt succeeds → return `filled`

### Scenario E — No retry on fields_not_found
1. `attemptFill` returns `fill_failed` with reason `fields_not_found`
2. `fillCardFields` should NOT retry — return immediately

---

## T9 — Data Wiping

**What it tests:** The `finally` block in `index.ts` zeroes all sensitive data.

**Steps:**
1. Mock a successful fill flow
2. After `execute()` returns, inspect:
   - `card.number` → should be `"0000..."` (all zeros, same length)
   - `card.cvv` → should be `"000"` (all zeros)
   - `card.name` → should be `"0000..."` (all zeros)
   - `encryptedData` buffer → every byte should be `0x00`
   - `keyMaterial.key_hex` → should be `"0".repeat(64)`
   - `keyMaterial.iv_hex` → should be `"0".repeat(24)`
   - `keyMaterial.tag_hex` → should be `"0".repeat(32)`
3. Repeat for error paths (decryption fails, browser fails) — wipe must still execute

**Pass criteria:** No original card data remains in any variable after the tool returns, regardless of success or failure.

---

## T10 — Error Message Sanitization

**What it tests:** No raw exceptions, stack traces, or card data appear in tool output.

**Test cases:**

| Failure point               | Inject                                    | Message must NOT contain              |
|-----------------------------|-------------------------------------------|---------------------------------------|
| Card file read              | Throw `ENOENT: /home/user/.creditclaw/...`| File path, ENOENT details             |
| Key retrieval (403)         | Server returns `{"message": "internal..."}` | Server's message text               |
| Key retrieval (500)         | Server returns HTML error page            | HTML content                          |
| Decryption                  | Wrong key → crypto error                  | `decipher`, `authentication`, hex values |
| Browser snapshot            | Throw `TimeoutError: page load...`        | Timeout details, URLs                 |
| Browser type                | Throw `ElementNotFound: ref e42...`       | Element details, ref IDs              |

**Pass criteria:** Every returned `message` is a controlled, human-readable string with no leaked internals.

---

## T11 — Key Single-Use Enforcement

**What it tests:** Plugin handles the 409 (key already consumed) case correctly.

**Steps:**
1. Complete a successful checkout with `checkout_id = X`
2. Call `creditclaw_fill_card` again with same `checkout_id = X`
3. Should return `error` with reason `key_retrieval_failed`
4. Message should mention starting a new checkout

**Pass criteria:** No crash, no stale key reuse, clear guidance to agent.

---

## T12 — Live Checkout (End-to-End)

**What it tests:** Full flow against a real checkout page using the CreditClaw test checkout.

**Prerequisites:**
- Bot registered with Rail 5 card in `active` status
- `CREDITCLAW_API_KEY` set
- Test checkout URL: use `RAIL5_TEST_CHECKOUT_URL` from `lib/rail5/index.ts`

**Steps:**
1. Agent navigates to test checkout page
2. Agent calls `POST /bot/rail5/checkout` → gets `checkout_id`
3. Owner approves (or auto-approves if in `auto_approve` mode)
4. Agent calls `creditclaw_fill_card` with `checkout_id` and card file path
5. Verify card number field is filled (visual confirmation or snapshot)
6. Verify CVV field is filled
7. Agent fills expiry, clicks submit
8. Agent calls `POST /bot/rail5/confirm` with result

**Pass criteria:**
- Plugin returns `{ status: "filled", fields_filled: ["card_number", "cvv"] }`
- No card data visible in agent logs or context
- Checkout confirmation succeeds

---

## Running Tests

### Runnable now
- `npx tsx tests/test-field-detection.ts` — covers T4–T7 and T10 (field detection, boundaries, iframe detection, error sanitization)

### Requires live environment
- T1–T3 (decryption) — need a real encrypted card file and key material
- T8 (retry logic) — need a browser session to test snapshot/type failures
- T9 (data wiping) — need to inspect memory after execution
- T11 (key single-use) — need a live CreditClaw API connection
- T12 (end-to-end) — need full OpenClaw runtime with browser
