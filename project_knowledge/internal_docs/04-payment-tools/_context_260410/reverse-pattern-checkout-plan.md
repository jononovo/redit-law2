---
name: Reverse-Pattern Checkout Plan
description: Technical plan for restructuring the checkout flow so the main agent handles all UI complexity and the sub-agent/plugin only fills 2 sensitive fields (PAN + CVV).
date: 2026-04-11
status: plan
---

# Reverse-Pattern Checkout — 2-Field Secure Entry

## Why This Plan Exists

The current checkout skill files describe two approaches, both with significant limitations:

1. **Plugin flow** (`agents/OPENCLAW.md` v3.0.0) — The main agent fills everything except PAN/CVV, then calls `creditclaw_fill_card`. The plugin takes a page snapshot, scans for card fields by label matching ("card number", "cvv"), handles iframe detection, and types the values. This works but the plugin duplicates work the main agent could do better — the main agent already has full context about the page layout.

2. **Legacy sub-agent flow** (`agents/OPENCLAW_legacy.md` v2.9.0) — An ephemeral sub-agent handles the *entire* checkout: navigating the page, filling all fields (shipping, billing, card), and submitting. The sub-agent lacks the main agent's context, makes the process slower, more error-prone, and harder to debug.

Neither approach uses the main agent's context advantage fully. The main agent has already been interacting with the site — it knows the page structure, has navigated iframes, and understands the form layout. The sub-agent or plugin shouldn't need to rediscover any of that.

### The Core Insight

Research in `_context_260410/agentic-shopping-technical-summary.md` and `creditclaw-context-shopping-solutions.md` identified the **reverse pattern**: the main agent does 95% of the work (including verifying the sensitive fields work), then hands off only the minimal secure operation to a sub-agent or plugin.

The two fields that actually need protection are:
- **PAN** (Card Account Number) — 16-digit credit card number
- **CVV** (Card Verification Value) — 3-4 digit security code

Everything else (name, address, expiry, zip) is non-sensitive and the main agent can fill it directly. The main agent can even *verify* the PAN and CVV fields work by entering and removing test digits — before any real card data is involved.

---

## The New Flow

### Phase 1 — Main Agent: Fill Everything & Map Fields

The main agent handles the entire checkout form:

1. Navigate to checkout, detect platform (Shopify, WooCommerce, etc.)
2. Fill all non-sensitive fields: shipping address, billing address, contact info, cardholder name, expiry date, zip code
3. Identify the exact PAN and CVV input fields — element refs (e.g., `@e5`, `@e7`), iframe paths if applicable (e.g., `iframe[src*='stripe.com'] > iframe[src*='card-fields']`)
4. Record the precise path to each field, including any iframe nesting

### Phase 2 — Main Agent: Optional Dry-Run Verification

Before involving any sensitive data, the main agent can verify the fields work:

1. Enter test digits into the PAN field (e.g., "123456")
2. Take a screenshot — confirm digits appear in the correct field (even if masked)
3. Clear the test digits completely
4. Take a screenshot — confirm the field is empty
5. Repeat for CVV field
6. Now the main agent has **proven** both fields accept input and knows the exact path

**When to skip Phase 2:**
- The checkout platform is well-known and the agent has high confidence in field identification (e.g., standard Shopify Stripe iframe)
- The agent has successfully completed a purchase at this same merchant before
- The accessibility tree clearly identifies the fields with unambiguous labels and refs

Phase 2 solves the **silent failure problem** — without it, the sub-agent might try to fill a field inside an iframe it can't access, or a dynamically-rendered field, and you'd only discover the failure after the whole flow fails.

### Phase 3 — Sub-Agent/Plugin: Secure 2-Field Entry

The main agent has now:
- Filled every non-sensitive field
- Identified and optionally verified the PAN and CVV field refs
- Documented the exact iframe path if applicable

Now the main agent:
1. Calls `POST /bot/rail5/checkout` for spending approval (this moves *later* in the flow than before — the agent requests approval when it's actually ready to pay)
2. Once approved, either:
   - **Plugin path:** Calls `creditclaw_fill_card` with the field refs
   - **Sub-agent path:** Spawns a sub-agent with precise 2-field instructions
3. The sub-agent/plugin: requests decryption key → decrypts card → fills exactly 2 fields → clears memory → reports back
4. Main agent resumes: takes a verification screenshot (masked digits visible), clicks submit, handles confirmation

---

## What Changes in the Skill Files

### `CHECKOUT-GUIDE.md` — Major rewrite

Restructure around the 3-phase flow. Currently describes a generic "decrypt → fill all fields → submit" approach. New version teaches:
- Phase 1: main agent fills everything, maps PAN/CVV field refs
- Phase 2: optional dry-run verification with screenshots
- Phase 3: hand off to sub-agent with precise field instructions
- Main agent resumes to submit and confirm

Key structural change: checkout approval (`POST /bot/rail5/checkout`) moves to Phase 3, after the form is filled — not at the start of the flow.

### `agents/OPENCLAW_legacy.md` — Major rewrite

The sub-agent's job shrinks from "run the whole checkout" to "fill 2 specific fields." The main agent constructs the sub-agent's task dynamically:

```
You are a secure card entry agent. Fill exactly 2 fields and exit.

Checkout ID: r5chk_abc123
Card file: .creditclaw/cards/Card-ChaseD-9547.md

Field A (Card Number): @e5 in iframe[src*='stripe.com']
Field B (CVV): @e7 in iframe[src*='stripe.com']

Steps:
1. Call POST /api/v1/bot/rail5/key with checkout_id
2. Decrypt card file with returned key material
3. Type card number into Field A
4. Type CVV into Field B
5. Clear all decrypted data from memory
6. Report success back to main agent
```

The sub-agent no longer needs to: explore the page, detect the platform, fill shipping/billing, handle complex form logic, or click submit. It receives a proven path and executes it.

### `agents/OPENCLAW.md` — Minor updates

The plugin flow is already closest to the reverse pattern. Add:
- Phase 2 dry-run guidance before calling the plugin
- Double-iframe handling notes
- Guidance on when to skip verification

### `SHOPPING-GUIDE.md` — Minor addition

Add a note about mapping PAN/CVV field refs during the checkout page analysis, since this feeds into Phase 3.

---

## Impact on Plugins — Current and Future

### Current: OpenClaw Plugin (`creditclaw_fill_card`)

**How it works today** (`public/Plugins/OpenClaw/src/fill-card.ts`):
- Takes `checkout_id`, `card_file_path`, and optional `frame_hint`
- Takes a browser snapshot of the page (or iframe)
- Scans the snapshot for fields matching labels like "card number", "cvv", "security code"
- Handles iframe detection: if fields aren't found on the main page, looks for known payment iframe patterns (Stripe, Braintree, Adyen, Shopify, Square)
- Retries with different frame contexts if initial scan fails
- Types the decrypted values into found fields

**The problem:** The plugin duplicates work the main agent already did. It re-scans the page, re-detects iframes, and re-identifies fields — all of which the main agent already knows. If the plugin's label matching fails (non-standard field names, unusual DOM structure), the checkout fails even though the main agent had already identified the correct fields.

**How it could work with the reverse pattern:**
The plugin could accept **pre-mapped field refs** from the main agent, eliminating the need for its own field detection:

```typescript
creditclaw_fill_card({
  checkout_id: "r5chk_abc123",
  card_file_path: ".creditclaw/cards/Card-ChaseD-9547.md",
  card_number_ref: "e5",        // NEW — main agent provides exact ref
  cvv_ref: "e7",                // NEW — main agent provides exact ref
  frame_hint: "iframe[src*='stripe.com']"
})
```

When refs are provided, the plugin skips field detection entirely — it just decrypts and types into the given refs. When refs are not provided (backward compatibility), it falls back to the current label-matching behavior.

This makes the plugin:
- **More reliable** — field refs are pre-verified by the main agent (optionally with dry-run)
- **Faster** — no snapshot + label scan cycle needed
- **Simpler** — the field detection logic (`findFieldRef`, `detectPaymentIframe`, retry loops) becomes a fallback, not the primary path
- **Platform-agnostic** — the main agent handles platform-specific detection using the merchant guides; the plugin just types into refs

### Future: Claude Plugin (`agents/CLAUDE-PLUGIN.md`)

Currently marked "coming soon." The reverse pattern dramatically simplifies what this plugin needs to do:

**Without reverse pattern:** The Claude plugin would need to implement its own field detection, iframe handling, snapshot scanning — essentially replicating everything the OpenClaw plugin does, but for Claude's browser environment.

**With reverse pattern:** The Claude plugin receives exact field refs from the main agent. Its entire job is:
1. Accept `checkout_id`, `card_file_path`, `card_number_ref`, `cvv_ref`, and optional `frame_hint`
2. Retrieve decryption key from CreditClaw API
3. Decrypt card data
4. Type PAN into `card_number_ref`
5. Type CVV into `cvv_ref`
6. Wipe memory
7. Return result

No field detection, no iframe scanning, no label matching, no retries with different frame contexts. The plugin becomes a thin "decrypt and type" operation — maybe 50 lines of code instead of 200.

### Any Future Platform Plugin

The same pattern applies to any future agent platform (Gemini, GPT, open-source frameworks). Every plugin follows the identical contract:

```
Input:  checkout_id + card_file + field_ref_A + field_ref_B + optional frame_hint
Output: { filled | fill_failed | error }
```

The platform-specific complexity (how to take snapshots, how browser automation works, how iframes are accessed) stays in the main agent's skill files. The plugin is just a secure "type 2 values" operation that's nearly identical across platforms.

This means:
- **One field-detection strategy** maintained in the skill files (not duplicated per plugin)
- **Plugins are trivial to write** for new platforms
- **Testing is simpler** — plugin tests only need to verify decrypt + type + wipe
- **Failures are easier to diagnose** — if filling fails, the issue is either the ref (main agent's problem) or the typing (plugin's problem), never ambiguous field detection

---

## What Does NOT Change

- **API endpoints** — `POST /bot/rail5/checkout`, `POST /bot/rail5/key`, `POST /bot/rail5/confirm` all stay the same
- **Database schema** — No changes
- **Server-side code** — `buildSpawnPayload()` and `buildCheckoutSteps()` in `features/payment-rails/rail5/index.ts` stay as-is for now. The main agent constructs its own sub-agent instructions dynamically. These server functions become fallback references. Can be updated in a follow-up to generate leaner, 2-field-focused instructions.
- **Encryption/decryption** — AES-256-GCM, split-knowledge model, single-use keys all unchanged
- **Guardrails and approvals** — Same enforcement, same flow

---

## Implementation Sequence

1. **Update skill files** — Rewrite `CHECKOUT-GUIDE.md` and `agents/OPENCLAW_legacy.md` with the 3-phase flow. Minor updates to `agents/OPENCLAW.md` and `SHOPPING-GUIDE.md`. Bump versions.

2. **Update OpenClaw plugin** (optional, can be follow-up) — Add `card_number_ref` and `cvv_ref` parameters to `creditclaw_fill_card`. When provided, skip field detection and type directly into refs. Keep existing label-matching as fallback for backward compatibility.

3. **Build Claude plugin** — Using the simplified contract (decrypt + type into refs), the Claude plugin becomes a straightforward implementation.

4. **Update `buildSpawnPayload`** (follow-up) — Generate leaner sub-agent instructions that expect field refs to be passed in, rather than instructing the sub-agent to explore the whole page.

---

## Open Questions

1. **Should the dry-run use specific test patterns?** E.g., always "123456" for PAN and "12" for CVV? Or any arbitrary digits? Consistent patterns could help with debugging.

2. **What if field refs go stale?** Between the main agent's Phase 2 verification and the sub-agent's Phase 3 entry, the page could re-render (SPA navigation, timeout). Should the sub-agent verify refs are still valid before typing? Or trust the main agent's mapping?

3. **Plugin backward compatibility timeline.** How long should the OpenClaw plugin support the old label-matching path before it's removed? Or keep it permanently as a fallback?

4. **Should the checkout approval timing change in the API?** Currently nothing prevents calling `/checkout` early. But the skill files could recommend calling it later (after form is filled). Should the API enforce this, or leave it as guidance in the skill files?
