# CreditClaw — OpenClaw Plugin

Secure card checkout for AI agents. Fills card number and CVV fields on any checkout page without exposing card data to the agent.

## Install

```bash
openclaw plugins install creditclaw-openclaw
```

Or install from local path:

```bash
openclaw plugins install ./Plugins/OpenClaw
```

## Requirements

- OpenClaw >= 0.7.0
- `CREDITCLAW_API_KEY` environment variable
- Browser tool enabled

## How It Works

The plugin registers a single tool: `creditclaw_fill_card`.

When the agent calls this tool, the plugin internally:

1. Reads the encrypted card file from disk
2. Retrieves the one-time decryption key from CreditClaw API
3. Decrypts the card using AES-256-GCM
4. Takes a browser snapshot to locate the card number and CVV fields
5. Types the card number and CVV into the identified fields
6. Zeros out all card data from memory
7. Returns `{ status: "filled" }` to the agent

The agent never sees any card data. The plugin handles everything internally.

## Usage

The agent calls the tool after filling all other checkout fields (shipping, billing, expiry) and receiving checkout approval:

```
creditclaw_fill_card({
  checkout_id: "r5chk_abc123",
  card_file_path: ".creditclaw/cards/Card-ChaseD-9547.md",
  frame_hint: "iframe[src*='stripe.com']"
})
```

### Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `checkout_id` | Yes | Approved checkout ID from `POST /bot/rail5/checkout` |
| `card_file_path` | Yes | Path to the encrypted card file |
| `frame_hint` | No | CSS selector for payment iframe. Omit if card fields are on the main page. |

### Return Values

**Fields filled successfully:**
```json
{ "status": "filled", "fields_filled": ["card_number", "cvv"], "message": "Card number and CVV filled." }
```

**Could not fill fields:**
```json
{ "status": "fill_failed", "reason": "card_number_not_found", "message": "..." }
```

**Pre-fill error (key, decryption, file):**
```json
{ "status": "error", "reason": "key_retrieval_failed", "message": "..." }
```

## Agent Checkout Flow

With the plugin installed, the agent's checkout flow is:

```
1. Browse, shop, add to cart
2. Fill shipping, billing, contact info, expiry date
3. Confirm all fields, identify if card inputs are in an iframe
4. Call POST /bot/rail5/checkout for approval; wait if pending
5. Call creditclaw_fill_card (plugin fills card number + CVV)
6. Click submit, detect result
7. Handle result: inform owner, confirm with CreditClaw, announce
```

The plugin replaces the sub-agent lifecycle (spawn, focus, yield, monitor, kill) with a single tool call.

## What the Plugin Does NOT Do

- Fill expiry date (agent handles this — it's not sensitive)
- Click the submit/pay button (agent handles submission)
- Detect payment success or failure (agent handles result detection)
- Call `/bot/rail5/confirm` (agent handles confirmation)
- Communicate with the owner (agent handles all owner interaction)

## Security

- Card data never enters the agent's context or reasoning trace
- Decryption happens inside the plugin's execute function only
- Card data is zeroed from memory after field filling
- The plugin reads `CREDITCLAW_API_KEY` from the environment — the agent does not pass it
- Decryption keys are single-use and server-issued

## Payment Form Compatibility

The plugin handles card fields in two ways:

**Tier 1 — Frame-scoped snapshot (primary):**
Uses OpenClaw's browser snapshot with frame scoping. Covers Stripe Elements, Braintree Hosted Fields, Adyen Components, Shopify Payments, Square Web Payments, and most iframe-based payment forms.

**Tier 2 — Auto-detection fallback:**
If `frame_hint` is not provided and fields aren't found on the main page, the plugin scans for known payment provider iframes and attempts to scope into them automatically.

## License

MIT
