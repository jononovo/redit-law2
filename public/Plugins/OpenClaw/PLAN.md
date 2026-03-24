# CreditClaw OpenClaw Plugin — Technical Plan

## Overview

An OpenClaw plugin that replaces the ephemeral sub-agent checkout flow with a single
tool call. The main agent calls `creditclaw_fill_card`, and the plugin internally
decrypts the card and fills the card number and CVV fields in the browser — the agent
never sees card data.

---

## What Changes

### Before (Sub-Agent Flow — OPENCLAW.md v2.10.0)

```
Steps 1-6:  Main agent browses, fills form, gets approval
Step 7:     Main agent builds sub-agent instructions (template, paths, field locations)
Step 8:     Main agent spawns sub-agent, focuses, yields
Steps 9-13: Sub-agent gets key, decrypts, fills fields, submits, reports via sessions_send
Step 14:    Main agent receives result
Steps 15-16: Main agent handles success/rejection (owner comms, retries)
Step 17:    Main agent kills sub-agent, verifies cleanup
Step 18:    Main agent confirms with CreditClaw, announces
```

18 steps. Sub-agent lifecycle: spawn, focus, yield, monitor, retry via /subagents send,
kill, verify cleanup. Timeout recovery with key_delivered check.

### After (Plugin Flow)

```
Steps 1-4:  Main agent browses, fills form, confirms fields, gets approval
Step 5:     Main agent calls creditclaw_fill_card tool
Step 6:     Main agent handles result (owner comms, confirm, announce)
```

6 steps. No sub-agent lifecycle. No spawn/focus/yield/kill. No timeout recovery.
The plugin handles: key retrieval, decryption, field filling, submission, result detection.

---

## Plugin Architecture

### Folder Structure

```
public/Plugins/OpenClaw/
├── PLAN.md                    ← This file
├── README.md                  ← Installation, usage, configuration
├── package.json               ← npm package metadata
├── openclaw.plugin.json       ← OpenClaw plugin manifest
├── tsconfig.json              ← TypeScript config
└── src/
    ├── index.ts               ← Plugin entry (definePluginEntry, registerTool)
    ├── decrypt.ts             ← AES-256-GCM decryption (built-in, replaces decrypt.js)
    ├── api.ts                 ← CreditClaw API client (key retrieval)
    └── fill-card.ts           ← Browser automation (frame-scoped snapshot + type)
```

### Tool Registration

```typescript
// src/index.ts
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";

export default definePluginEntry({
  id: "creditclaw",
  name: "CreditClaw",
  register(api) {
    api.registerTool({
      name: "creditclaw_fill_card",
      description:
        "Securely fills card number and CVV fields on a checkout page. " +
        "Decrypts the card internally — the agent never sees card data. " +
        "Returns success/rejected with order details.",
      parameters: {
        type: "object",
        properties: {
          checkout_id:    { type: "string", description: "Approved checkout ID from POST /bot/rail5/checkout" },
          card_file_path: { type: "string", description: "Path to encrypted card file (e.g. .creditclaw/cards/Card-ChaseD-9547.md)" },
          frame_hint:     { type: "string", description: "Optional CSS selector for payment iframe (e.g. iframe[src*='stripe.com']). Omit if card fields are on the main page." },
          submit:         { type: "boolean", description: "Whether to click the submit/pay button after filling. Default true." }
        },
        required: ["checkout_id", "card_file_path"]
      },
      execute: async (params) => { /* see fill-card.ts */ }
    });
  }
});
```

### Key Design Decisions

**1. Built-in decryption (no decrypt.js dependency)**

The plugin includes its own AES-256-GCM decryption in `decrypt.ts` using Node.js
`crypto` module. This eliminates the dependency on the delivered `decrypt.js` script
and the need to shell out to `node decrypt.js <args>`.

```typescript
// src/decrypt.ts
import { createDecipheriv } from "crypto";

export function decryptCard(
  encryptedBlob: Buffer,
  keyHex: string,
  ivHex: string,
  tagHex: string
): CardData {
  const key = Buffer.from(keyHex, "hex");
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encryptedBlob), decipher.final()]);
  return JSON.parse(decrypted.toString("utf8"));
}
```

**2. API client reads key directly**

```typescript
// src/api.ts
export async function getDecryptionKey(
  checkoutId: string,
  apiKey: string,
  apiBase: string
): Promise<{ key_hex: string; iv_hex: string; tag_hex: string }> {
  const res = await fetch(`${apiBase}/bot/rail5/key`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ checkout_id: checkoutId })
  });
  if (!res.ok) throw new Error(`Key retrieval failed: ${res.status}`);
  return res.json();
}
```

**3. Two-tier browser injection strategy**

```typescript
// src/fill-card.ts — Primary: frame-scoped snapshot + type
async function fillCardFields(browser, card, frameHint?) {
  // Tier 1: Frame-scoped snapshot (handles 95%+ of payment forms)
  const snapshotOpts = frameHint
    ? { frame: frameHint, interactive: true }
    : { interactive: true };
  const snap = await browser.snapshot(snapshotOpts);

  const cardRef = findFieldRef(snap, ["card number", "cardnumber", "card-number"]);
  const cvvRef  = findFieldRef(snap, ["cvv", "cvc", "security code", "verification"]);

  await browser.type(cardRef, card.number);
  await browser.type(cvvRef, card.cvv);
}
```

If Tier 1 fails (no refs found or type fails), fall back to:

```typescript
// Tier 2: CDP coordinate-based injection (fallback)
async function fillCardFieldsCDP(browser, card, frameHint?) {
  // Use browser.evaluate to find field positions in the iframe
  // Then Input.dispatchKeyEvent character-by-character
  // This bypasses Playwright's frame resolution entirely
}
```

**4. Plugin does NOT call /bot/rail5/confirm**

The plugin fills card fields, submits, and detects the result — but returns control
to the main agent for owner communication and confirmation. This matches the current
design philosophy: the main agent owns the relationship with the owner and CreditClaw.

Return shape:
```typescript
// On success
{ status: "success", order_id: "ORD-12345", message: "Payment submitted successfully." }

// On rejection (payment declined, field error, etc.)
{ status: "rejected", reason: "Card declined", message: "The payment was rejected by the processor." }

// On error (key retrieval failed, decryption failed, browser error)
{ status: "error", reason: "key_retrieval_failed", message: "Could not retrieve decryption key." }
```

**5. Plugin reads CREDITCLAW_API_KEY from environment**

The plugin accesses the API key from the environment (same as the agent does),
not from tool parameters. This prevents the agent from accidentally passing the
key to the wrong tool.

```typescript
const apiKey = process.env.CREDITCLAW_API_KEY;
```

---

## Browser Injection — Detailed Strategy

### Tier 1: Frame-Scoped Snapshot + Type (Primary)

How OpenClaw's browser tool handles cross-origin iframes:

1. `openclaw browser snapshot --frame "iframe[src*='stripe']" --interactive`
   scopes the accessibility tree snapshot INTO the cross-origin iframe
2. Returns element refs like [e5] card number, [e6] CVV
3. `openclaw browser type e5 "4242..."` uses Playwright-on-CDP internally
4. Playwright handles Target.attachToTarget + session routing automatically

Via `api.runtime.browser`, this becomes:
```typescript
const snap = await browser.snapshot({ frame: "iframe[src*='stripe']", interactive: true });
// snap contains refs scoped to the iframe
await browser.type(cardRef, card.number);
```

**Why this works for cross-origin:**
- Playwright uses CDP's `Target.setAutoAttach` with `flatten: true` under the hood
- Each OOPIF (Out-of-Process iframe) gets its own CDP session
- Playwright routes commands to the correct session based on the frame selector
- The `type` command fires proper `input` events that React/Vue frameworks detect

**Covers:** Stripe Elements, Braintree Hosted Fields, Adyen Components, PayPal hosted
fields, Shopify card iframes, Square Web Payments, and most custom payment forms.

### Tier 2: CDP Coordinate-Based Injection (Fallback)

For edge cases where Playwright can't resolve the frame (deeply nested shadow DOM
+ iframe combinations, dynamically generated iframe names):

1. Use `browser.evaluate` on the parent page to get iframe bounding rect
2. Use CDP `Input.dispatchMouseEvent` to click into the card field (by coordinates)
3. Use CDP `Input.dispatchKeyEvent` with `type: 'char'` to type character-by-character
4. Key events operate at the browser engine level — bypass all DOM access restrictions

```typescript
// Get iframe position
const rect = await browser.evaluate(
  `document.querySelector('${frameSelector}').getBoundingClientRect()`
);

// Click into card number field (estimated offset within iframe)
await cdp.send('Input.dispatchMouseEvent', {
  type: 'mousePressed', x: rect.x + offsetX, y: rect.y + offsetY, button: 'left', clickCount: 1
});
await cdp.send('Input.dispatchMouseEvent', {
  type: 'mouseReleased', x: rect.x + offsetX, y: rect.y + offsetY, button: 'left'
});

// Type character-by-character
for (const char of cardNumber) {
  await cdp.send('Input.dispatchKeyEvent', { type: 'char', text: char });
}
```

**When Tier 2 is needed:**
- Shadow DOM wrapping an iframe (rare but exists in some custom payment forms)
- Dynamically injected iframes with no stable selector
- Payment forms that intercept and block Playwright's frame attachment

### Auto-Detection of Payment Form Type

The plugin should detect what kind of form it's dealing with:

```typescript
async function detectPaymentForm(browser): Promise<PaymentFormInfo> {
  const snap = await browser.snapshot({ interactive: true });

  // Check for iframes matching known payment providers
  const providers = [
    { pattern: "stripe.com", name: "Stripe Elements" },
    { pattern: "braintreegateway.com", name: "Braintree Hosted Fields" },
    { pattern: "adyen.com", name: "Adyen Components" },
    { pattern: "paypal.com", name: "PayPal Hosted Fields" },
    { pattern: "checkout.shopify.com", name: "Shopify Payments" },
    { pattern: "squareup.com", name: "Square Web Payments" },
  ];

  // Check if card fields are directly on the page (no iframe)
  const directFields = findFieldRef(snap, ["card number", "cardnumber"]);
  if (directFields) return { type: "direct", refs: snap };

  // Check for iframe-based fields
  for (const p of providers) {
    if (snapContainsIframe(snap, p.pattern)) {
      return { type: "iframe", provider: p.name, frameSelector: `iframe[src*='${p.pattern}']` };
    }
  }

  // Unknown — try frame_hint from agent
  return { type: "unknown" };
}
```

---

## Security Model

### Card Data Isolation

| Layer | What Sees Card Data | What Doesn't |
|-------|-------|------|
| CreditClaw API | Stores encrypted blob + key material | Never sends plaintext |
| Plugin internals | Decrypts in memory, types into browser | Never returns card data to agent |
| Agent context | Sees only tool return: status + order_id | Never sees number, CVV, or key |
| Browser | Receives keystrokes in iframe | Parent page JS cannot read iframe inputs |

### Comparison with Sub-Agent

| Property | Sub-Agent | Plugin |
|----------|-----------|--------|
| Card data visible in reasoning trace? | Technically yes (sub-agent thinks about card data) | No — plugin is opaque code |
| Card data in `/subagents log`? | Potentially | No logs |
| Card data in agent context? | No (main agent) | No |
| Key material in tool parameters? | No (inherited env) | No (reads from env) |
| Retry leak risk? | Low (sessions_send doesn't include card) | None |

The plugin is **strictly better** for isolation — card data exists only inside
the plugin's execute function, never in any agent's reasoning trace.

### Memory Cleanup

```typescript
// After filling fields, zero out card data
card.number = "0".repeat(card.number.length);
card.cvv = "0".repeat(card.cvv.length);
card = null;
```

---

## Updated OPENCLAW.md Flow (After Plugin)

```
Main Agent:
  1. Browse, shop, add to cart (SHOPPING-GUIDE.md)
  2. Fill shipping, billing, contact info, expiry date
  3. Confirm all fields, identify if card inputs are in an iframe
  4. Call POST /bot/rail5/checkout for approval; wait if pending
  5. Call creditclaw_fill_card({
       checkout_id: "r5chk_abc123",
       card_file_path: ".creditclaw/cards/Card-ChaseD-9547.md",
       frame_hint: "iframe[src*='stripe.com']"  // optional
     })
  6. Handle result:
     - success → screenshot, inform owner, wait 2 min, confirm, announce
     - rejected → analyze cause, retry (call tool again) or confirm failed
     - error → check checkout status, re-initiate if safe
```

### What Gets Removed from OPENCLAW.md

- Step 7 (build sub-agent instructions) — entire template block
- Step 8 (spawn, focus, yield) — all sub-agent lifecycle
- Phase B (sub-agent execution) — replaced by plugin
- Step 14 (receive result via sessions_yield) — replaced by tool return
- Step 17 (kill sub-agent, verify cleanup) — no sub-agent to kill
- Progress Checking section — no sub-agent to monitor
- Timeout Handling section — plugin has its own timeout
- Most of Monitoring and Recovery — dramatically simplified

### What Stays

- Steps 1-4 (browse, fill, confirm, approve) — unchanged
- Step 15 logic (inform owner, wait for response) — stays, moves to Step 6
- Step 16 logic (rejection analysis) — stays, simplified in Step 6
- Step 18 logic (confirm + announce) — stays, merged into Step 6

### Estimated New Document Size

Current: 496 lines (18 steps)
After plugin: ~180-220 lines (6 steps)

---

## Updated Companion Files

### CHECKOUT-GUIDE.md

Add OpenClaw plugin note alongside existing sub-agent note:
```markdown
> **OpenClaw agents with CreditClaw plugin:** If the CreditClaw plugin is installed,
> call `creditclaw_fill_card` instead of spawning a sub-agent. The plugin handles
> key retrieval, decryption, and field filling internally.
```

### SKILL.md

Update the skill files table:
```markdown
| `Plugins/OpenClaw/`        | OpenClaw plugin — replaces sub-agent with a single tool call for card field filling |
```

Update the security section:
```markdown
- **Plugin-based card isolation.** When the CreditClaw plugin is installed, card
  data never enters any agent's context. The plugin decrypts and fills fields
  internally — the agent sees only a success/failure result.
```

### OPENCLAW.md

Full rewrite from 18 steps to 6 steps. Keep the sub-agent flow documented as
a legacy fallback in `OPENCLAW_legacy.md` (which already exists).

---

## Plugin Manifest

```json
// openclaw.plugin.json
{
  "id": "creditclaw",
  "name": "CreditClaw",
  "version": "1.0.0",
  "description": "Secure card checkout for AI agents. Fills card number and CVV without exposing card data to the agent.",
  "author": "CreditClaw",
  "homepage": "https://creditclaw.com",
  "repository": "https://github.com/creditclaw/openclaw-plugin",
  "license": "MIT",
  "entry": "src/index.ts",
  "openclaw": {
    "minVersion": "0.7.0",
    "requires": {
      "env": ["CREDITCLAW_API_KEY"],
      "tools": ["browser"]
    }
  },
  "tools": [
    {
      "name": "creditclaw_fill_card",
      "group": "creditclaw"
    }
  ]
}
```

---

## Implementation Order

### Phase 1: Core Plugin (MVP)
1. `openclaw.plugin.json` — manifest
2. `package.json` — npm metadata
3. `tsconfig.json` — TypeScript config
4. `src/decrypt.ts` — AES-256-GCM decryption
5. `src/api.ts` — key retrieval client
6. `src/fill-card.ts` — Tier 1 browser automation (frame-scoped snapshot + type)
7. `src/index.ts` — plugin entry, tool registration, orchestration
8. `README.md` — installation and usage

### Phase 2: Documentation Updates
9. Rewrite `OPENCLAW.md` to use plugin flow (6 steps)
10. Update `CHECKOUT-GUIDE.md` with plugin note
11. Update `SKILL.md` with plugin reference and security note

### Phase 3: Hardening
12. Tier 2 fallback (CDP coordinate-based injection) in `fill-card.ts`
13. Auto-detection of payment form type
14. Retry logic within the plugin (max 2 attempts per field)
15. Memory cleanup / card data zeroing

### Phase 4: Community
16. Prepare for OpenClaw community plugin registry
17. npm publish setup

---

## Open Questions

1. **Should the plugin handle submit + result detection, or just fill fields?**
   Current plan: plugin fills fields, clicks submit, detects result, returns status.
   Alternative: plugin only fills fields, agent clicks submit and detects result.
   Recommendation: plugin handles everything (cleaner, less back-and-forth).

2. **Should the plugin call /bot/rail5/confirm?**
   Current plan: No — plugin returns result, agent handles owner comms + confirm.
   This keeps the agent in control of the relationship with owner and CreditClaw.

3. **Expiry date: should the plugin fill it too?**
   Currently the main agent fills expiry (it's not sensitive). But if the plugin
   is already inside the payment iframe, it could fill expiry as well for reliability.
   The card data includes exp_month and exp_year.

4. **npm package name?**
   Options: `@creditclaw/openclaw-plugin`, `openclaw-plugin-creditclaw`, 
   `creditclaw-openclaw`. Need to align with OpenClaw community naming conventions.

5. **Does `api.runtime.browser` support the `--frame` scoping?**
   Research strongly suggests yes, but this needs validation against the actual
   OpenClaw SDK. If not, we fall back to Tier 2 immediately.
