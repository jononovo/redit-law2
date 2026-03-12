# CreditClaw API Test Suite

Run these tests sequentially. Each test includes the curl command, expected HTTP status, and what to verify in the response. All tests use `http://localhost:5000` as the base URL.

Variables set during tests are referenced with `$VARIABLE_NAME`. Keep track of them as you go.

---

## Prerequisites

- Application running on port 5000 (`npm run dev`)
- PostgreSQL database connected and migrated
- No prior test data conflicts (tests use unique names with timestamps)

---

## Section 1: Bot Registration (Public Endpoint)

### Test 1.1 — Register a bot (bot-first flow)

```bash
BOT_NAME="TestBot-$(date +%s)"
curl -s -X POST http://localhost:5000/api/v1/bots/register \
  -H "Content-Type: application/json" \
  -d "{\"bot_name\": \"$BOT_NAME\", \"owner_email\": \"testowner@example.com\", \"description\": \"Automated test bot\"}"
```

**Expected:** HTTP 200
**Verify:**
- Response contains `bot_id` (format: `bot_XXXXXXXX`)
- Response contains `api_key` (format: `cck_live_...`)
- Response contains `claim_token` (format: `word-XXXX`)
- `status` is `"pending_owner_verification"`
- `owner_verification_url` contains the claim token
- `important` message warns to save the API key

**Save:** `$BOT_ID`, `$API_KEY`, `$CLAIM_TOKEN` from the response.

---

### Test 1.2 — Register a bot with callback URL (webhook-enabled)

```bash
BOT_NAME_WH="TestBot-WH-$(date +%s)"
curl -s -X POST http://localhost:5000/api/v1/bots/register \
  -H "Content-Type: application/json" \
  -H "X-Forwarded-For: 10.0.0.1" \
  -d "{\"bot_name\": \"$BOT_NAME_WH\", \"owner_email\": \"webhook@example.com\", \"description\": \"Webhook test bot\", \"callback_url\": \"https://example.com/webhook\"}"
```

**Expected:** HTTP 200
**Verify:**
- All fields from Test 1.1 are present
- Response additionally contains `webhook_secret` (string, non-null)

---

### Test 1.3 — Duplicate registration rejected

```bash
curl -s -X POST http://localhost:5000/api/v1/bots/register \
  -H "Content-Type: application/json" \
  -H "X-Forwarded-For: 10.0.0.2" \
  -d "{\"bot_name\": \"$BOT_NAME\", \"owner_email\": \"testowner@example.com\"}"
```

**Expected:** HTTP 409
**Verify:**
- `error` is `"duplicate_registration"`
- `message` mentions the bot name

---

### Test 1.4 — Missing required field (no bot_name)

```bash
curl -s -X POST http://localhost:5000/api/v1/bots/register \
  -H "Content-Type: application/json" \
  -H "X-Forwarded-For: 10.0.0.3" \
  -d "{\"owner_email\": \"missing@example.com\"}"
```

**Expected:** HTTP 400
**Verify:**
- `error` is `"validation_error"`
- `details` object contains `bot_name` field error

---

### Test 1.5 — Invalid email format

```bash
curl -s -X POST http://localhost:5000/api/v1/bots/register \
  -H "Content-Type: application/json" \
  -H "X-Forwarded-For: 10.0.0.4" \
  -d "{\"bot_name\": \"TestBot-BadEmail\", \"owner_email\": \"not-an-email\"}"
```

**Expected:** HTTP 400
**Verify:**
- `error` is `"validation_error"`
- `details` object contains `owner_email` field error

---

### Test 1.6 — Rate limiting on registration (3 per IP per hour)

Register 3 bots from the same IP, then attempt a 4th.

```bash
for i in 1 2 3; do
  curl -s -X POST http://localhost:5000/api/v1/bots/register \
    -H "Content-Type: application/json" \
    -H "X-Forwarded-For: 10.99.99.99" \
    -d "{\"bot_name\": \"RateBot-$i-$(date +%s)\", \"owner_email\": \"rate$i@example.com\"}" > /dev/null
done

curl -s -X POST http://localhost:5000/api/v1/bots/register \
  -H "Content-Type: application/json" \
  -H "X-Forwarded-For: 10.99.99.99" \
  -d "{\"bot_name\": \"RateBot-4-$(date +%s)\", \"owner_email\": \"rate4@example.com\"}"
```

**Expected:** HTTP 429 on the 4th request
**Verify:**
- `error` is `"rate_limited"`
- `retry_after_seconds` is `3600`

---

## Section 2: Bot Wallet Check (Bot-Authenticated)

### Test 2.1 — Check wallet before owner claims (pending bot)

```bash
curl -s -X GET http://localhost:5000/api/v1/bot/wallet/check \
  -H "Authorization: Bearer $API_KEY"
```

**Expected:** HTTP 200
**Verify:**
- `wallet_status` is `"pending"`
- `balance_usd` is `0`
- `card_status` is `"inactive"`
- `message` tells bot to share claim token with their human

---

### Test 2.2 — Invalid API key rejected

```bash
curl -s -X GET http://localhost:5000/api/v1/bot/wallet/check \
  -H "Authorization: Bearer cck_live_totally_fake_key_here"
```

**Expected:** HTTP 401
**Verify:**
- `error` is `"unauthorized"`
- `message` is `"Invalid API key"`

---

### Test 2.3 — Missing Authorization header

```bash
curl -s -X GET http://localhost:5000/api/v1/bot/wallet/check
```

**Expected:** HTTP 401
**Verify:**
- `error` is `"unauthorized"`

---

## Section 3: Bot Claim (Owner-Authenticated)

### Test 3.1 — Claim without authentication rejected

```bash
curl -s -X POST http://localhost:5000/api/v1/bots/claim \
  -H "Content-Type: application/json" \
  -d "{\"claim_token\": \"$CLAIM_TOKEN\"}"
```

**Expected:** HTTP 401
**Verify:**
- `error` mentions authentication required

---

### Test 3.2 — Claim with invalid token

This test requires a valid session cookie. If testing without Firebase auth, simulate via direct database update (see Database Simulation section below).

```bash
curl -s -X POST http://localhost:5000/api/v1/bots/claim \
  -H "Content-Type: application/json" \
  -H "Cookie: session=VALID_SESSION_COOKIE" \
  -d "{\"claim_token\": \"nonexistent-TOKEN\"}"
```

**Expected:** HTTP 404
**Verify:**
- `error` mentions invalid or already claimed token

---

### Test 3.3 — Simulate successful claim via database

Since the claim endpoint requires Firebase authentication, you can simulate the claim by running these SQL queries directly to verify the database logic:

```sql
-- Step 1: Verify bot exists and is unclaimed
SELECT bot_id, bot_name, wallet_status, claim_token, owner_uid FROM bots WHERE claim_token = '$CLAIM_TOKEN';
-- Expected: wallet_status = 'pending', owner_uid = NULL

-- Step 2: Simulate claim (what storage.claimBot does)
UPDATE bots SET owner_uid = 'test-uid-claim', wallet_status = 'active', claim_token = NULL, claimed_at = NOW()
WHERE claim_token = '$CLAIM_TOKEN' AND owner_uid IS NULL
RETURNING bot_id, bot_name, wallet_status, owner_uid;
-- Expected: Returns 1 row with wallet_status = 'active'

-- Step 3: Create wallet (claimBot also does this)
INSERT INTO wallets (bot_id, owner_uid, balance_cents, currency) VALUES ('$BOT_ID', 'test-uid-claim', 0, 'usd') RETURNING *;
-- Expected: Wallet created with balance_cents = 0
```

---

### Test 3.4 — Wallet check after claim shows active status

After completing Test 3.3:

```bash
curl -s -X GET http://localhost:5000/api/v1/bot/wallet/check \
  -H "Authorization: Bearer $API_KEY"
```

**Expected:** HTTP 200
**Verify:**
- `wallet_status` is `"empty"` (active but no funds)
- `balance_usd` is `0`
- `spending_limits` object is present with default values:
  - `per_transaction_usd`: 25
  - `monthly_usd`: 500
  - `monthly_spent_usd`: 0
  - `monthly_remaining_usd`: 500

---

## Section 4: Bot Spending Permissions

### Test 4.1 — Get spending permissions (defaults)

```bash
curl -s -X GET http://localhost:5000/api/v1/bot/wallet/spending \
  -H "Authorization: Bearer $API_KEY"
```

**Expected:** HTTP 200
**Verify:**
- `approval_mode` is `"ask_for_everything"`
- `limits.per_transaction_usd` is `25`
- `limits.daily_usd` is `50`
- `limits.monthly_usd` is `500`
- `limits.ask_approval_above_usd` is `10`
- `blocked_categories` includes `"gambling"`, `"adult_content"`, `"cryptocurrency"`, `"cash_advances"`
- `recurring_allowed` is `false`

---

## Section 5: Bot Purchase (Wallet Debit)

### Test 5.1 — Purchase with insufficient funds (empty wallet)

```bash
curl -s -X POST http://localhost:5000/api/v1/bot/wallet/purchase \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"amount_cents\": 500, \"merchant\": \"TestMerchant\", \"description\": \"Test purchase\"}"
```

**Expected:** HTTP 402
**Verify:**
- `error` is `"insufficient_funds"`
- `balance_usd` is `0`
- `required_usd` is `5`

---

### Test 5.2 — Fund the wallet and make a successful purchase

Fund the wallet via SQL first, then attempt purchase:

```sql
-- Add $50.00 to the wallet
UPDATE wallets SET balance_cents = 5000 WHERE bot_id = '$BOT_ID';

-- Also add a topup transaction record
INSERT INTO transactions (wallet_id, type, amount_cents, description)
SELECT id, 'topup', 5000, 'Test funding' FROM wallets WHERE bot_id = '$BOT_ID';
```

Then make the purchase:

```bash
curl -s -X POST http://localhost:5000/api/v1/bot/wallet/purchase \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"amount_cents\": 500, \"merchant\": \"OpenAI\", \"description\": \"API credits\", \"category\": \"api_services\"}"
```

**Expected:** HTTP 200
**Verify:**
- `status` is `"approved"`
- `transaction_id` is present (integer)
- `amount_usd` is `5`
- `merchant` is `"OpenAI"`
- `new_balance_usd` is `45` (was 50, spent 5)

---

### Test 5.3 — Purchase blocked by category

```bash
curl -s -X POST http://localhost:5000/api/v1/bot/wallet/purchase \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"amount_cents\": 100, \"merchant\": \"Casino\", \"category\": \"gambling\"}"
```

**Expected:** HTTP 403
**Verify:**
- `error` is `"category_blocked"`
- `message` mentions "gambling" is blocked

---

### Test 5.4 — Purchase exceeds per-transaction limit

Default per-transaction limit is $25 (2500 cents):

```bash
curl -s -X POST http://localhost:5000/api/v1/bot/wallet/purchase \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"amount_cents\": 3000, \"merchant\": \"BigPurchase\"}"
```

**Expected:** HTTP 403
**Verify:**
- `error` is `"exceeds_per_transaction_limit"`
- `limit_usd` is `25`
- `requested_usd` is `30`

---

### Test 5.5 — Purchase on frozen wallet rejected

Freeze the wallet first:

```sql
UPDATE wallets SET is_frozen = true WHERE bot_id = '$BOT_ID';
```

```bash
curl -s -X POST http://localhost:5000/api/v1/bot/wallet/purchase \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"amount_cents\": 100, \"merchant\": \"FrozenTest\"}"
```

**Expected:** HTTP 403
**Verify:**
- `error` is `"wallet_frozen"`
- `message` says wallet is frozen by owner

**Cleanup:** Unfreeze after test:
```sql
UPDATE wallets SET is_frozen = false WHERE bot_id = '$BOT_ID';
```

---

### Test 5.6 — Purchase with invalid JSON body

```bash
curl -s -X POST http://localhost:5000/api/v1/bot/wallet/purchase \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d "not json"
```

**Expected:** HTTP 400
**Verify:**
- `error` is `"invalid_json"`

---

### Test 5.7 — Purchase missing required fields

```bash
curl -s -X POST http://localhost:5000/api/v1/bot/wallet/purchase \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"amount_cents\": 100}"
```

**Expected:** HTTP 400
**Verify:**
- `error` is `"validation_error"`
- `details` mentions `merchant` is required

---

## Section 6: Bot Top-Up Request

### Test 6.1 — Request a top-up

```bash
curl -s -X POST http://localhost:5000/api/v1/bot/wallet/topup-request \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"amount_usd\": 25.00, \"reason\": \"Need funds for API credits\"}"
```

**Expected:** HTTP 200
**Verify:**
- `topup_request_id` is present (integer)
- `status` is `"sent"`
- `amount_usd` is `25`
- `owner_notified` is `true`

---

### Test 6.2 — Top-up request on unclaimed bot rejected

Register a fresh bot (unclaimed) and try to request a top-up:

```bash
UNCLAIMED_RESPONSE=$(curl -s -X POST http://localhost:5000/api/v1/bots/register \
  -H "Content-Type: application/json" \
  -H "X-Forwarded-For: 10.0.0.50" \
  -d "{\"bot_name\": \"UnclaimedBot-$(date +%s)\", \"owner_email\": \"unclaimed@example.com\"}")
UNCLAIMED_KEY=$(echo $UNCLAIMED_RESPONSE | grep -o '"api_key":"[^"]*"' | cut -d'"' -f4)

curl -s -X POST http://localhost:5000/api/v1/bot/wallet/topup-request \
  -H "Authorization: Bearer $UNCLAIMED_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"amount_usd\": 10.00, \"reason\": \"Test\"}"
```

**Expected:** HTTP 403
**Verify:**
- `error` is `"wallet_not_active"`
- `message` says owner must claim bot first

---

## Section 7: Bot Transaction History

### Test 7.1 — Get transaction history

```bash
curl -s -X GET "http://localhost:5000/api/v1/bot/wallet/transactions?limit=10" \
  -H "Authorization: Bearer $API_KEY"
```

**Expected:** HTTP 200
**Verify:**
- `transactions` is an array
- If Test 5.2 was run, array contains at least one `"purchase"` type transaction
- Each transaction has: `id`, `type`, `amount_cents`, `description`, `created_at`

---

## Section 8: Owner-First Flow (Pairing Codes)

### Test 8.1 — Generate pairing code (requires auth)

```bash
curl -s -X POST http://localhost:5000/api/v1/pairing-codes
```

**Expected:** HTTP 401
**Verify:**
- `error` mentions authentication required

---

### Test 8.2 — Simulate pairing code via database + bot registration

Create a pairing code manually, then register a bot with it:

```sql
-- Create a pairing code for a test owner
INSERT INTO pairing_codes (code, owner_uid, status, expires_at)
VALUES ('654321', 'test-owner-pairing', 'pending', NOW() + INTERVAL '1 hour')
RETURNING *;
```

Then register a bot using it:

```bash
curl -s -X POST http://localhost:5000/api/v1/bots/register \
  -H "Content-Type: application/json" \
  -H "X-Forwarded-For: 10.0.0.60" \
  -d "{\"bot_name\": \"PairedBot-$(date +%s)\", \"owner_email\": \"paired@example.com\", \"pairing_code\": \"654321\"}"
```

**Expected:** HTTP 200
**Verify:**
- `status` is `"active"` (not "pending_owner_verification")
- `claim_token` is `null`
- `paired` is `true`
- `owner_uid` is `"test-owner-pairing"`

**Save:** `$PAIRED_BOT_ID`, `$PAIRED_API_KEY`

---

### Test 8.3 — Verify paired bot database state

```sql
-- Check bot is claimed and active
SELECT bot_id, wallet_status, owner_uid, claim_token FROM bots WHERE bot_id = '$PAIRED_BOT_ID';
-- Expected: wallet_status = 'active', owner_uid = 'test-owner-pairing', claim_token = NULL

-- Check wallet was created
SELECT * FROM wallets WHERE bot_id = '$PAIRED_BOT_ID';
-- Expected: 1 row with balance_cents = 0

-- Check pairing code was marked as claimed
SELECT status, bot_id, claimed_at FROM pairing_codes WHERE code = '654321';
-- Expected: status = 'claimed', bot_id = '$PAIRED_BOT_ID', claimed_at is NOT NULL
```

---

### Test 8.4 — Paired bot can use API immediately

```bash
curl -s -X GET http://localhost:5000/api/v1/bot/wallet/check \
  -H "Authorization: Bearer $PAIRED_API_KEY"
```

**Expected:** HTTP 200
**Verify:**
- `wallet_status` is `"empty"` (active but no funds)
- `spending_limits` object is present

---

### Test 8.5 — Reuse of claimed pairing code rejected

```bash
curl -s -X POST http://localhost:5000/api/v1/bots/register \
  -H "Content-Type: application/json" \
  -H "X-Forwarded-For: 10.0.0.61" \
  -d "{\"bot_name\": \"ReusePairedBot\", \"owner_email\": \"reuse@example.com\", \"pairing_code\": \"654321\"}"
```

**Expected:** HTTP 400
**Verify:**
- `error` is `"invalid_pairing_code"`
- `message` says code is invalid, expired, or already used

---

### Test 8.6 — Expired pairing code rejected

```sql
INSERT INTO pairing_codes (code, owner_uid, status, expires_at)
VALUES ('999888', 'test-owner-expired', 'pending', NOW() - INTERVAL '1 hour')
RETURNING *;
```

```bash
curl -s -X POST http://localhost:5000/api/v1/bots/register \
  -H "Content-Type: application/json" \
  -H "X-Forwarded-For: 10.0.0.62" \
  -d "{\"bot_name\": \"ExpiredPairBot\", \"owner_email\": \"expired@example.com\", \"pairing_code\": \"999888\"}"
```

**Expected:** HTTP 400
**Verify:**
- `error` is `"invalid_pairing_code"`

---

### Test 8.7 — Invalid pairing code format (not 6 digits)

```bash
curl -s -X POST http://localhost:5000/api/v1/bots/register \
  -H "Content-Type: application/json" \
  -H "X-Forwarded-For: 10.0.0.63" \
  -d "{\"bot_name\": \"BadCodeBot\", \"owner_email\": \"badcode@example.com\", \"pairing_code\": \"abc\"}"
```

**Expected:** HTTP 400
**Verify:**
- `error` is `"validation_error"`
- `details.pairing_code` contains error about length or format

---

## Section 9: Owner-Authenticated Endpoints (Auth Required)

These endpoints all require a valid Firebase session cookie. Without one, they should return 401.

### Test 9.1 — Owner endpoints reject unauthenticated requests

Test each of these and confirm HTTP 401:

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/v1/wallet/balance
curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/v1/wallets
curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/v1/bots/mine
curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:5000/api/v1/pairing-codes
curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/v1/billing/payment-method
curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/v1/notifications
curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/v1/notifications/unread-count
curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/v1/notifications/preferences
curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/v1/webhooks
curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/v1/payment-links
curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/v1/activity-log
curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:5000/api/v1/master-guardrails
curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/v1/master-guardrails
curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:5000/api/v1/owners/onboarded
```

**Expected:** All return `401`

---

## Section 10: Public Endpoints

### Test 10.1 — Health check (no auth required)

```bash
curl -s http://localhost:5000/api/v1/health
```

**Expected:** HTTP 200
**Verify:**
- `status` is `"ok"` or `"healthy"`
- `database` connection status is present

---

### Test 10.2 — Waitlist submission

```bash
curl -s -X POST http://localhost:5000/api/v1/waitlist \
  -H "Content-Type: application/json" \
  -H "X-Forwarded-For: 10.0.0.70" \
  -d "{\"email\": \"waitlist-test-$(date +%s)@example.com\", \"source\": \"test\"}"
```

**Expected:** HTTP 200
**Verify:**
- Response confirms email was added to waitlist

---

### Test 10.3 — Waitlist duplicate email

Run Test 10.2 twice with the same email:

```bash
curl -s -X POST http://localhost:5000/api/v1/waitlist \
  -H "Content-Type: application/json" \
  -H "X-Forwarded-For: 10.0.0.71" \
  -d "{\"email\": \"duplicate-waitlist@example.com\", \"source\": \"test\"}"

curl -s -X POST http://localhost:5000/api/v1/waitlist \
  -H "Content-Type: application/json" \
  -H "X-Forwarded-For: 10.0.0.72" \
  -d "{\"email\": \"duplicate-waitlist@example.com\", \"source\": \"test\"}"
```

**Expected:** First returns 200, second returns 200 (idempotent) or 409 (conflict)
**Verify:** No crash or 500 error on duplicate

---

## Section 11: Landing Pages (HTTP 200 Checks)

### Test 11.1 — All public pages return 200

```bash
for path in "/" "/how-it-works" "/allowance" "/safety" "/claim" "/payment/success" "/payment/cancelled"; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:5000$path")
  echo "$STATUS $path"
done
```

**Expected:** All return `200`

---

## Section 12: Owners Table & Master Guardrails (Onboarding)

### Test 12.1 — Owners table exists and accepts upserts

```sql
-- Verify table structure
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'owners' ORDER BY ordinal_position;
-- Expected: id (integer), uid (text), email (text), display_name (text), stripe_customer_id (text), onboarded_at (timestamp), created_at (timestamp), updated_at (timestamp)

-- Insert a test owner
INSERT INTO owners (uid, email, display_name)
VALUES ('test-owner-upsert', 'test-upsert@example.com', 'Test Owner')
ON CONFLICT (uid) DO UPDATE SET email = EXCLUDED.email, updated_at = NOW()
RETURNING *;
-- Expected: 1 row returned with uid = 'test-owner-upsert'

-- Upsert same uid with new display name
INSERT INTO owners (uid, email, display_name)
VALUES ('test-owner-upsert', 'test-upsert@example.com', 'Updated Name')
ON CONFLICT (uid) DO UPDATE SET display_name = EXCLUDED.display_name, updated_at = NOW()
RETURNING *;
-- Expected: display_name = 'Updated Name', same id as first insert
```

---

### Test 12.2 — Master guardrails API rejects unauthenticated requests

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/v1/master-guardrails
curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:5000/api/v1/master-guardrails -H "Content-Type: application/json" -d '{"max_per_tx_usdc": 25}'
```

**Expected:** Both return `401`

---

### Test 12.3 — Onboarded endpoint rejects unauthenticated requests

```bash
curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:5000/api/v1/owners/onboarded
```

**Expected:** `401`

---

### Test 12.4 — Master guardrails validates input

```bash
curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:5000/api/v1/master-guardrails \
  -H "Content-Type: application/json" \
  -H "Cookie: session=VALID_SESSION_COOKIE" \
  -d '{"max_per_tx_usdc": -5}'
```

**Expected:** HTTP 400 (validation error: min value is 1)

---

### Test 12.5 — Simulate onboarding master guardrails save via database

Since the onboarding complete step POSTs to /api/v1/master-guardrails (requires auth), verify the database logic directly:

```sql
-- Simulate what onboarding saves: $25/tx, $50/day, $500/mo (from cents: 2500, 5000, 50000 ÷ 100)
INSERT INTO master_guardrails (owner_uid, max_per_tx_usdc, daily_budget_usdc, monthly_budget_usdc, enabled)
VALUES ('test-onboard-owner', 25, 50, 500, true)
ON CONFLICT (owner_uid) DO UPDATE SET
  max_per_tx_usdc = EXCLUDED.max_per_tx_usdc,
  daily_budget_usdc = EXCLUDED.daily_budget_usdc,
  monthly_budget_usdc = EXCLUDED.monthly_budget_usdc,
  updated_at = NOW()
RETURNING *;
-- Expected: Values match the cents÷100 conversion (25, 50, 500)

-- Stamp onboarded_at
UPDATE owners SET onboarded_at = NOW() WHERE uid = 'test-onboard-owner';
-- (only works if owner row exists)
```

---

## Section 13: Checkout Pages & x402 Payments

### Prerequisites

Create a test checkout page via SQL:

```sql
-- Create a test owner and wallet first
INSERT INTO owners (uid, email, display_name)
VALUES ('test-checkout-owner', 'checkout@example.com', 'Checkout Tester')
ON CONFLICT (uid) DO NOTHING;

INSERT INTO privy_wallets (owner_uid, privy_wallet_id, wallet_address, balance_usdc, chain)
VALUES ('test-checkout-owner', 'privy-test-wallet-id', '0xTESTWALLETADDRESS1234567890abcdef12345678', 0, 'base')
ON CONFLICT DO NOTHING
RETURNING id;
-- Save: $WALLET_ID from the result

-- Create a checkout page with x402 enabled
INSERT INTO checkout_pages (
  checkout_page_id, owner_uid, wallet_id, wallet_address,
  title, description, amount_usdc, amount_locked,
  allowed_methods, status
) VALUES (
  'cp_test_x402', 'test-checkout-owner', $WALLET_ID, '0xTESTWALLETADDRESS1234567890abcdef12345678',
  'Test x402 Product', 'A test product for x402 payments', 5000000, true,
  ARRAY['stripe_onramp', 'base_pay', 'x402'], 'active'
)
ON CONFLICT DO NOTHING;

-- Create a checkout page WITHOUT x402
INSERT INTO checkout_pages (
  checkout_page_id, owner_uid, wallet_id, wallet_address,
  title, description, amount_usdc, amount_locked,
  allowed_methods, status
) VALUES (
  'cp_test_no_x402', 'test-checkout-owner', $WALLET_ID, '0xTESTWALLETADDRESS1234567890abcdef12345678',
  'No x402 Product', 'A test product without x402', 5000000, true,
  ARRAY['stripe_onramp', 'base_pay'], 'active'
)
ON CONFLICT DO NOTHING;
```

---

### Test 13.1 — x402 requirements endpoint returns 402 with payment details

```bash
curl -s -w "\nHTTP_STATUS: %{http_code}" \
  http://localhost:5000/api/v1/checkout/cp_test_x402/x402
```

**Expected:** HTTP 402
**Verify:**
- Response contains `x402.version` equal to `1`
- `x402.accepts` is an array with one entry
- `x402.accepts[0].scheme` is `"exact"`
- `x402.accepts[0].network` is `"base"`
- `x402.accepts[0].maxAmountRequired` is `"5000000"`
- `x402.accepts[0].payTo` matches the wallet address
- `x402.accepts[0].token` is `"0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"`
- `x402.accepts[0].description` is `"Test x402 Product"`
- `x402.accepts[0].extra.checkout_page_id` is `"cp_test_x402"`
- `x402.accepts[0].extra.amount_locked` is `true`

---

### Test 13.2 — x402 requirements endpoint rejects page without x402 method

```bash
curl -s -w "\nHTTP_STATUS: %{http_code}" \
  http://localhost:5000/api/v1/checkout/cp_test_no_x402/x402
```

**Expected:** HTTP 400
**Verify:**
- `error` mentions x402 payments are not enabled

---

### Test 13.3 — x402 requirements endpoint returns 404 for nonexistent page

```bash
curl -s -w "\nHTTP_STATUS: %{http_code}" \
  http://localhost:5000/api/v1/checkout/cp_does_not_exist/x402
```

**Expected:** HTTP 404
**Verify:**
- `error` is `"Checkout page not found"`

---

### Test 13.4 — x402 pay endpoint rejects missing X-PAYMENT header

```bash
curl -s -w "\nHTTP_STATUS: %{http_code}" \
  -X POST http://localhost:5000/api/v1/checkout/cp_test_x402/pay/x402 \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Expected:** HTTP 400
**Verify:**
- `error` is `"Missing X-PAYMENT header"`

---

### Test 13.5 — x402 pay endpoint rejects malformed X-PAYMENT header

```bash
curl -s -w "\nHTTP_STATUS: %{http_code}" \
  -X POST http://localhost:5000/api/v1/checkout/cp_test_x402/pay/x402 \
  -H "Content-Type: application/json" \
  -H "X-PAYMENT: bm90LXZhbGlkLWpzb24=" \
  -d '{}'
```

**Expected:** HTTP 400
**Verify:**
- `error` is `"Invalid X-PAYMENT header"`
- `details` contains information about the parse failure

---

### Test 13.6 — x402 pay endpoint rejects wrong chain

```bash
WRONG_CHAIN=$(echo '{"from":"0x1111111111111111111111111111111111111111","to":"0xTESTWALLETADDRESS1234567890abcdef12345678","value":"5000000","validAfter":0,"validBefore":9999999999,"nonce":"0xababababababababababababababababababababababababababababababababab","signature":"0xcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcd","chainId":1,"token":"0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"}' | base64 -w 0)

curl -s -w "\nHTTP_STATUS: %{http_code}" \
  -X POST http://localhost:5000/api/v1/checkout/cp_test_x402/pay/x402 \
  -H "Content-Type: application/json" \
  -H "X-PAYMENT: $WRONG_CHAIN" \
  -d '{}'
```

**Expected:** HTTP 400
**Verify:**
- `error` contains `"Unsupported chain"`

---

### Test 13.7 — x402 pay endpoint rejects recipient mismatch

```bash
WRONG_RECIPIENT=$(echo '{"from":"0x1111111111111111111111111111111111111111","to":"0x9999999999999999999999999999999999999999","value":"5000000","validAfter":0,"validBefore":9999999999,"nonce":"0xababababababababababababababababababababababababababababababababab","signature":"0xcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcd","chainId":8453,"token":"0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"}' | base64 -w 0)

curl -s -w "\nHTTP_STATUS: %{http_code}" \
  -X POST http://localhost:5000/api/v1/checkout/cp_test_x402/pay/x402 \
  -H "Content-Type: application/json" \
  -H "X-PAYMENT: $WRONG_RECIPIENT" \
  -d '{}'
```

**Expected:** HTTP 400
**Verify:**
- `error` contains `"Recipient mismatch"`

---

### Test 13.8 — x402 pay endpoint rejects expired signature

```bash
EXPIRED_SIG=$(echo '{"from":"0x1111111111111111111111111111111111111111","to":"0xTESTWALLETADDRESS1234567890abcdef12345678","value":"5000000","validAfter":0,"validBefore":1000000000,"nonce":"0xababababababababababababababababababababababababababababababababab","signature":"0xcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcd","chainId":8453,"token":"0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"}' | base64 -w 0)

curl -s -w "\nHTTP_STATUS: %{http_code}" \
  -X POST http://localhost:5000/api/v1/checkout/cp_test_x402/pay/x402 \
  -H "Content-Type: application/json" \
  -H "X-PAYMENT: $EXPIRED_SIG" \
  -d '{}'
```

**Expected:** HTTP 400
**Verify:**
- `error` contains `"expired"`

---

### Test 13.9 — x402 pay endpoint rejects page without x402 method

```bash
VALID_HEADER=$(echo '{"from":"0x1111111111111111111111111111111111111111","to":"0xTESTWALLETADDRESS1234567890abcdef12345678","value":"5000000","validAfter":0,"validBefore":9999999999,"nonce":"0xababababababababababababababababababababababababababababababababab","signature":"0xcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcd","chainId":8453,"token":"0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"}' | base64 -w 0)

curl -s -w "\nHTTP_STATUS: %{http_code}" \
  -X POST http://localhost:5000/api/v1/checkout/cp_test_no_x402/pay/x402 \
  -H "Content-Type: application/json" \
  -H "X-PAYMENT: $VALID_HEADER" \
  -d '{}'
```

**Expected:** HTTP 400
**Verify:**
- `error` mentions x402 payments are not enabled

---

### Test 13.10 — Public checkout page data includes x402 in allowed methods

```bash
curl -s http://localhost:5000/api/v1/checkout/cp_test_x402/public
```

**Expected:** HTTP 200
**Verify:**
- `allowedMethods` array contains `"x402"`
- `title` is `"Test x402 Product"`

---

## Section 14: Automated Unit Tests

Run the automated test suite covering x402 parsing, validation, guardrail evaluation, and utility functions:

```bash
npx vitest run
```

**Expected:** All tests pass
**Test files:**
- `tests/x402/receive.test.ts` — x402 header parsing, payment validation, dedupe keys (29 tests)
- `tests/rail1/x402-utils.test.ts` — EIP-712 typed data, nonce generation, USDC formatting (19 tests)
- `tests/guardrails/evaluate.test.ts` — spending limit enforcement, approval thresholds (18 tests)

---

## Cleanup

After running all tests, clean up test data:

```sql
DELETE FROM transactions WHERE wallet_id IN (SELECT id FROM wallets WHERE owner_uid LIKE 'test-%');
DELETE FROM wallets WHERE owner_uid LIKE 'test-%';
DELETE FROM topup_requests WHERE bot_id IN (SELECT bot_id FROM bots WHERE owner_email LIKE '%@example.com' AND bot_name LIKE 'TestBot-%' OR bot_name LIKE 'PairedBot-%' OR bot_name LIKE 'RateBot-%' OR bot_name LIKE 'UnclaimedBot-%' OR bot_name LIKE 'BadCodeBot' OR bot_name LIKE 'ExpiredPairBot' OR bot_name LIKE 'ReusePairedBot');
DELETE FROM pairing_codes WHERE owner_uid LIKE 'test-%';
DELETE FROM bots WHERE owner_email LIKE '%@example.com' AND (bot_name LIKE 'TestBot-%' OR bot_name LIKE 'PairedBot-%' OR bot_name LIKE 'RateBot-%' OR bot_name LIKE 'UnclaimedBot-%' OR bot_name LIKE 'BadCodeBot' OR bot_name LIKE 'ExpiredPairBot' OR bot_name LIKE 'ReusePairedBot' OR bot_name LIKE 'TestBot-WH-%');
DELETE FROM sales WHERE checkout_page_id IN ('cp_test_x402', 'cp_test_no_x402');
DELETE FROM checkout_pages WHERE checkout_page_id IN ('cp_test_x402', 'cp_test_no_x402');
DELETE FROM privy_wallets WHERE owner_uid = 'test-checkout-owner';
DELETE FROM waitlist_entries WHERE email LIKE 'waitlist-test-%@example.com' OR email = 'duplicate-waitlist@example.com';
DELETE FROM owners WHERE uid LIKE 'test-%';
DELETE FROM master_guardrails WHERE owner_uid LIKE 'test-%';
```

---

## Test Summary Checklist

| # | Test | Expected Status | Category |
|---|------|----------------|----------|
| 1.1 | Bot registration (happy path) | 200 | Registration |
| 1.2 | Bot registration with callback URL | 200 | Registration |
| 1.3 | Duplicate bot name + email | 409 | Registration |
| 1.4 | Missing required field | 400 | Validation |
| 1.5 | Invalid email format | 400 | Validation |
| 1.6 | Rate limiting (4th request) | 429 | Security |
| 2.1 | Wallet check (pending bot) | 200 | Bot API |
| 2.2 | Invalid API key | 401 | Auth |
| 2.3 | Missing auth header | 401 | Auth |
| 3.1 | Claim without session | 401 | Auth |
| 3.2 | Claim with bad token | 404 | Claim |
| 3.3 | Simulate claim via DB | — | Claim |
| 3.4 | Wallet check after claim | 200 | Bot API |
| 4.1 | Spending permissions (defaults) | 200 | Bot API |
| 5.1 | Purchase with $0 balance | 402 | Purchase |
| 5.2 | Successful purchase | 200 | Purchase |
| 5.3 | Blocked category purchase | 403 | Purchase |
| 5.4 | Over per-transaction limit | 403 | Purchase |
| 5.5 | Purchase on frozen wallet | 403 | Purchase |
| 5.6 | Invalid JSON body | 400 | Validation |
| 5.7 | Missing required fields | 400 | Validation |
| 6.1 | Top-up request | 200 | Top-Up |
| 6.2 | Top-up on unclaimed bot | 403 | Top-Up |
| 7.1 | Transaction history | 200 | Bot API |
| 8.1 | Pairing code without auth | 401 | Auth |
| 8.2 | Registration with pairing code | 200 | Pairing |
| 8.3 | Paired bot DB state | — | Pairing |
| 8.4 | Paired bot API access | 200 | Pairing |
| 8.5 | Reuse claimed pairing code | 400 | Pairing |
| 8.6 | Expired pairing code | 400 | Pairing |
| 8.7 | Invalid pairing code format | 400 | Validation |
| 9.1 | Owner endpoints auth check | 401 | Auth |
| 10.1 | Health check | 200 | Public |
| 10.2 | Waitlist submission | 200 | Public |
| 10.3 | Waitlist duplicate | 200/409 | Public |
| 11.1 | All public pages render | 200 | Pages |
| 12.1 | Owners table upsert via DB | — | Owners |
| 12.2 | Master guardrails auth check | 401 | Auth |
| 12.3 | Onboarded endpoint auth check | 401 | Auth |
| 12.4 | Master guardrails input validation | 400 | Validation |
| 12.5 | Onboarding guardrails save via DB | — | Onboarding |
| 13.1 | x402 requirements endpoint | 402 | x402 |
| 13.2 | x402 requirements (not enabled) | 400 | x402 |
| 13.3 | x402 requirements (not found) | 404 | x402 |
| 13.4 | x402 pay missing header | 400 | x402 |
| 13.5 | x402 pay malformed header | 400 | x402 |
| 13.6 | x402 pay wrong chain | 400 | x402 |
| 13.7 | x402 pay recipient mismatch | 400 | x402 |
| 13.8 | x402 pay expired signature | 400 | x402 |
| 13.9 | x402 pay on non-x402 page | 400 | x402 |
| 13.10 | Public checkout shows x402 method | 200 | Checkout |
| 14.1 | Automated unit tests (npx vitest) | Pass | Unit Tests |
