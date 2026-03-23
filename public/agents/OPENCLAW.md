---
name: creditclaw-openclaw-checkout
version: 2.10.0
updated: 2026-03-23
description: "OpenClaw sub-agent checkout flow — main agent fills the form, sub-agent handles card fields only."
companion_of: SKILL.md
api_base: https://creditclaw.com/api/v1
credentials: [CREDITCLAW_API_KEY]
---

# OpenClaw — Sub-Agent Checkout Flow

> **Companion to `SKILL.md`.**
> For registration, card setup, spending permissions, and the full API reference, see the main skill file.

On OpenClaw, the **main agent** handles the entire checkout — browsing, cart, shipping, billing,
expiry date — everything except the card number and CVV. Those two fields are filled by an
**ephemeral sub-agent** that decrypts the card data, fills only those fields, and submits.
The main agent never sees decrypted card details.

**Security:** The sub-agent pattern ensures:
- Your main agent **never sees** decrypted card details
- Card data exists only in the sub-agent's memory for the duration of one transaction
- The sub-agent is deleted after checkout — no data leaks across sessions
- If the sub-agent crashes, the decryption key is already consumed and cannot be reused
- Server-side guardrails still enforce all spending limits regardless of what happens client-side

---

## Purchase Flow

```
Main Agent:
  1. Browse, shop, add to cart (SHOPPING-GUIDE.md)
  2. Fill shipping, billing, contact info, expiry date — everything except card number and CVV
  3. Confirm all filled fields are correct
  4. Identify the card number and CVV fields on the page
  5. Call POST /bot/rail5/checkout for approval
  6. If pending_approval → wait for owner
  7. Build sub-agent instructions (describe the page and the two fields)
  8. Spawn sub-agent, focus, and yield

Sub-Agent:
  9. Get decryption key (POST /bot/rail5/key)
  10. Decrypt card file
  11. Fill the card number and CVV fields
  12. Click submit
  13. Detect success or failure
  14. Call POST /bot/rail5/confirm
  15. Report result via sessions_send

Main Agent:
  16. Receive result
  17. Kill sub-agent and verify cleanup
  18. Announce result to owner
```

---

## Phase A: Main Agent — Prepare Checkout (Steps 1-8)

### Step 1: Browse and Shop

Follow `SHOPPING-GUIDE.md` to find the product, detect the platform, navigate the store,
and add items to cart. Proceed to the checkout page.

### Step 2: Fill the Checkout Form

Fill **every field** on the checkout form except the card number and CVV:

- Name, email, phone
- Shipping address (street, city, state, zip, country)
- Billing address (if separate from shipping)
- Cardholder name
- **Expiry date** (month and year) — fill this yourself using the card details from `GET /bot/status` (last4 and brand are visible, and the expiry date is not sensitive)

On multi-step checkouts, click through each section until you reach the payment step.

### Step 3: Confirm All Fields

Before proceeding, verify that all non-card fields are correctly filled:

```bash
openclaw browser snapshot --efficient --selector "form"
```

Check that shipping, billing, contact info, and expiry are all populated. Fix anything
that's missing or incorrect. **Do not fill the card number or CVV fields.**

### Step 4: Identify the Card Fields

From your snapshot, identify exactly where the card number and CVV fields are.
Note what you see:

- Are they regular `<input>` elements on the page?
- Are they inside an iframe? If so, what's the iframe selector? (e.g., `iframe[src*='stripe']`, `iframe[name^='card-fields-number']`)
- What browser commands have you been using? (e.g., `openclaw browser snapshot --efficient`)

You will pass this information to the sub-agent so it knows exactly where to fill.

### Step 5: Request Checkout Approval

```bash
curl -X POST https://creditclaw.com/api/v1/bot/rail5/checkout \
  -H "Authorization: Bearer $CREDITCLAW_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "merchant_name": "DigitalOcean",
    "merchant_url": "https://cloud.digitalocean.com/billing",
    "item_name": "Droplet hosting - 1 month",
    "amount_cents": 1200,
    "category": "cloud_compute"
  }'
```

| Field | Required | Description |
|-------|----------|-------------|
| `merchant_name` | Yes | Merchant name (1-200 chars) |
| `merchant_url` | Yes | Merchant website URL |
| `item_name` | Yes | What you're buying |
| `amount_cents` | Yes | Amount in cents (integer) |
| `category` | No | Spending category |

**Approved response:**
```json
{
  "approved": true,
  "checkout_id": "r5chk_abc123",
  "checkout_steps": ["..."]
}
```

**Pending response (requires owner approval):**
```json
{
  "approved": false,
  "status": "pending_approval",
  "checkout_id": "r5chk_abc123",
  "message": "Amount exceeds auto-approve threshold. Your owner has been notified.",
  "expires_in_minutes": 15
}
```

### Step 6: Wait for Approval (if needed)

If `pending_approval`, poll for the result:

```bash
curl "https://creditclaw.com/api/v1/bot/rail5/checkout/status?checkout_id=r5chk_abc123" \
  -H "Authorization: Bearer $CREDITCLAW_API_KEY"
```

Poll every 30 seconds. Do not spawn a sub-agent until the status is `approved`.

| Status | Meaning |
|--------|---------|
| `pending_approval` | Owner hasn't responded — poll again in 30s |
| `approved` | Proceed |
| `rejected` | Do not proceed |
| `expired` | 15-min window passed — re-initiate if needed |

### Step 7: Build the Sub-Agent Instructions

Construct a self-contained message for the sub-agent. The message should describe:
1. What page the browser is on and what you've already filled
2. Exactly where the card number and CVV fields are (or how to find them)
3. The checkout_id and card file path
4. What to do after filling (submit, detect result, confirm, report)

Here is a template. Replace the placeholders with your actual values:

```
CHECKOUT AGENT — CARD NUMBER AND CVV ONLY

CONTEXT:
The browser is on the checkout page at {merchant_url}.
I have already filled: shipping, billing, contact info, cardholder name, and expiry date.
The only fields remaining are the card number and CVV.

I was browsing with: openclaw browser snapshot --efficient
The card fields are: {describe what you found — e.g., "regular input fields on the page",
  or "inside an iframe matching iframe[src*='js.stripe.com']",
  or "in separate Shopify iframes named card-fields-number and card-fields-verification"}

If you cannot locate the fields I described, take a snapshot and look for
the card number and CVV fields yourself.

CHECKOUT_ID: {checkout_id}
CARD_FILE: {path to encrypted card file, e.g. .creditclaw/cards/Card-ChaseD-9547.md}

STEPS:

1. Get the decryption key:
   curl -X POST https://creditclaw.com/api/v1/bot/rail5/key \
     -H "Authorization: Bearer $CREDITCLAW_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{ "checkout_id": "{checkout_id}" }'
   Response: { "key_hex": "...", "iv_hex": "...", "tag_hex": "..." }
   This key is single-use. If retrieval fails, abort immediately.

2. Decrypt the card file:
   node decrypt.js <key_hex> <iv_hex> <tag_hex> {card_file_path}
   Output: JSON with number, exp_month, exp_year, cvv, name

3. Fill the card number and CVV fields using the browser.
   Only fill these two fields — everything else is already done.
   Max 2 retries per field. If a field won't fill, abort.

4. Click the submit/pay button.
   openclaw browser wait --load networkidle --timeout-ms 15000

5. Detect the result:
   openclaw browser snapshot --efficient
   "Thank you" / "Order confirmed" / "Order #" → SUCCESS (capture order number)
   "Declined" / "Error" / "try again" → FAILED
   Page unchanged after 15 seconds → FAILED
   CAPTCHA / 3DS / OTP → FAILED (do not attempt)

6. Confirm with CreditClaw:
   curl -X POST https://creditclaw.com/api/v1/bot/rail5/confirm \
     -H "Authorization: Bearer $CREDITCLAW_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{ "checkout_id": "{checkout_id}", "status": "success" }'
   Use "failed" if checkout didn't work.

7. Report back:
   sessions_send({
     status: "success",
     checkout_id: "{checkout_id}",
     order_id: "<captured order number>",
     message: "Card fields filled, payment submitted successfully."
   })

SECURITY:
- Never log, store, or echo decrypted card data
- Card data exists only in memory for this task
- If key retrieval or decryption fails, abort:
  sessions_send({ status: "failed", reason: "Key/decryption error" })
- Report only "fields populated" — never actual card values
```

### Step 8: Spawn, Focus, and Yield

```
sub_agent_id = sessions_spawn({
  task: <your constructed message from Step 7>,
  cleanup: "delete",
  runTimeoutSeconds: 120,
  label: "checkout-{merchant_name}"
})
```

Focus on the sub-agent to monitor its progress:

```
/focus checkout-{merchant_name}
```

Then yield and wait for the sub-agent to complete:

```
sessions_yield
```

**Do not pass your `CREDITCLAW_API_KEY` in the task.** The sub-agent inherits your
credentials through the OpenClaw session automatically.

---

## Phase B: Sub-Agent Execution (Steps 9-15)

The sub-agent follows the instructions you provided in Step 7. For reference, this is what
it does — but the sub-agent gets everything it needs from your message, it does not read
this file.

1. Retrieves the one-time decryption key from CreditClaw
2. Decrypts the card file using the embedded decrypt script
3. Fills the card number and CVV fields on the page
4. Clicks the submit/pay button
5. Detects success or failure from the confirmation page
6. Calls `POST /bot/rail5/confirm` to record the result
7. Reports back to the main agent via `sessions_send`

---

## Phase C: Main Agent — After Sub-Agent Returns (Steps 16-18)

### Step 16: Receive the Result

After `sessions_yield` returns, you have the sub-agent's report:

```json
{
  "status": "success",
  "checkout_id": "r5chk_abc123",
  "order_id": "ORD-12345",
  "message": "Card fields filled, payment submitted successfully."
}
```

Or on failure:

```json
{
  "status": "failed",
  "checkout_id": "r5chk_abc123",
  "reason": "Card declined at checkout.",
  "message": "Payment was declined."
}
```

### Step 17: Kill and Verify Cleanup

Kill the sub-agent and verify it was deleted:

```
/subagents kill <sub_agent_id>
/subagents info <sub_agent_id>
```

Expected: status `deleted` or not found.

Optionally, review the sub-agent's activity log:

```
/subagents log <sub_agent_id> 20
```

### Step 18: Announce Result

Report to your owner with the outcome and operational details:

**On success:**
> "Purchased {item} at {merchant} for ${amount}. Order ID: {order_id}. Sub-agent completed and verified deleted."

**On failure:**
> "Purchase of {item} at {merchant} failed — {reason}. No charge was made. Sub-agent verified deleted."

---

## Monitoring and Recovery

### Progress Checking

If 60 seconds pass with no result from the sub-agent, check its status:

```
/subagents info <sub_agent_id>
/subagents log <sub_agent_id> 10
```

| What the log shows | Action |
|---|---|
| Key retrieved, fields being filled | Working normally — wait |
| Key retrieved but stuck on a field | Send advice: `/subagents send <sub_agent_id> "Try taking a fresh snapshot to re-identify the card number and CVV fields."` |
| No activity after 60 seconds | Sub-agent may be stuck. Wait for timeout. |
| Confirm called, reporting result | Finishing up — wait for sessions_send |

### Timeout Handling

The sub-agent has a 120-second timeout (`runTimeoutSeconds: 120`). If it doesn't complete
in time, OpenClaw terminates and deletes it automatically.

**After timeout, check what happened:**

First, check the authoritative checkout status from CreditClaw:

```bash
curl "https://creditclaw.com/api/v1/bot/rail5/checkout/status?checkout_id=r5chk_abc123" \
  -H "Authorization: Bearer $CREDITCLAW_API_KEY"
```

Then check the sub-agent's log for details:

```
/subagents log <sub_agent_id> 20
```

| Checkout status | `key_delivered` | Meaning | Action |
|---|---|---|---|
| `completed` | `true` | Purchase went through, confirm was called | Announce success to owner |
| `approved` | `true` | Sub-agent got the key but didn't confirm | Advise owner to check merchant account — payment may have gone through |
| `approved` | `false` | Sub-agent never retrieved the key | No card data was accessed — safe to re-initiate from Step 5 |
| `failed` | `true` | Sub-agent confirmed failure | Announce failure, no charge made |

### Re-initiating After Failure

If the checkout fails or times out, you can start a new attempt from Step 5. Each checkout
gets a fresh `checkout_id` and a fresh single-use decryption key. There is no limit on retry
attempts, but each attempt goes through the full guardrail and approval flow.

---

## Complete Example

```
# Main agent browses DigitalOcean, adds Droplet hosting to cart, fills checkout form
# Main agent fills: email, name, address, billing, cardholder name, expiry (03/28)
# Main agent identifies: card number and CVV are in a Stripe iframe

# Step 5: Request approval
POST /api/v1/bot/rail5/checkout
{ "merchant_name": "DigitalOcean", "merchant_url": "https://cloud.digitalocean.com/billing",
  "item_name": "Droplet hosting - 1 month", "amount_cents": 1200, "category": "cloud_compute" }
# → { "approved": true, "checkout_id": "r5chk_abc123" }

# Step 7: Build sub-agent message (includes page context, field locations, checkout_id)

# Step 8: Spawn and focus
sub_agent_id = sessions_spawn({
  task: <constructed message>,
  cleanup: "delete",
  runTimeoutSeconds: 120,
  label: "checkout-digitalocean"
})
/focus checkout-digitalocean
sessions_yield

# Sub-agent runs:
#   → Gets decryption key
#   → Decrypts card file
#   → Fills card number and CVV in the Stripe iframe
#   → Clicks submit
#   → Confirms with CreditClaw
#   → Reports: sessions_send({ status: "success", order_id: "ORD-12345" })

# Step 17: Kill and verify
/subagents kill <sub_agent_id>
/subagents info <sub_agent_id>  # → deleted

# Step 18: Announce
"Purchased Droplet hosting - 1 month at DigitalOcean for $12.00. Order ID: ORD-12345."
```
