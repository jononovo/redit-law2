---
name: Reverse-Pattern Checkout Plan
description: Technical plan for restructuring the checkout flow so the main agent handles all UI complexity and a minimal sub-agent only fills 2 sensitive fields (PAN + CVV). Phase 1 targets the OpenClaw sub-agent flow. Later phases cover plugin updates.
date: 2026-04-11
status: plan
---

# Reverse-Pattern Checkout — 2-Field Secure Entry

## Why This Plan Exists

The current checkout skill files describe two approaches, both with significant limitations:

1. **Legacy sub-agent flow** (`agents/OPENCLAW_legacy.md` v2.9.0) — An ephemeral sub-agent handles the *entire* checkout: navigating the page, filling all fields (shipping, billing, card), and submitting. The sub-agent lacks the main agent's context, makes the process slower, more error-prone, and harder to debug.

2. **Plugin flow** (`agents/OPENCLAW.md` v3.0.0) — The main agent fills everything except PAN/CVV, then calls `creditclaw_fill_card`. The plugin takes a page snapshot, scans for card fields by label matching, handles iframe detection, and types the values. Better than the sub-agent approach, but the plugin still duplicates field detection work the main agent could do better.

Neither approach uses the main agent's context advantage fully. The main agent has already been interacting with the site — it knows the page structure, has navigated iframes, and understands the form layout. The sub-agent or plugin shouldn't need to rediscover any of that.

### The Core Insight

Research in `_context_260410/agentic-shopping-technical-summary.md` and `creditclaw-context-shopping-solutions.md` identified the **reverse pattern**: the main agent does 95% of the work (including verifying the sensitive fields work), then hands off only the minimal secure operation to a sub-agent.

The two fields that actually need protection are:
- **PAN** (Card Account Number) — 16-digit credit card number
- **CVV** (Card Verification Value) — 3-4 digit security code

Everything else (name, address, expiry, zip) is non-sensitive and the main agent can fill it directly. The main agent can even *verify* the PAN and CVV fields work by entering and removing test digits — before any real card data is involved.

---

## Implementation Phases

### Phase 1: OpenClaw Sub-Agent — Reverse Pattern (Build Now)

This is the immediate work. No plugins involved. The main agent handles everything and spawns a minimal sub-agent for only the 2 sensitive fields.

### Phase 2: OpenClaw Plugin Update (Future)

Update the existing `creditclaw_fill_card` plugin to accept pre-mapped field refs from the main agent, eliminating redundant field detection.

### Phase 3: Claude Plugin (Future)

Build a new Claude Desktop/Cowork plugin using the simplified contract established by the reverse pattern.

---

## Phase 1: OpenClaw Sub-Agent — Reverse Pattern

This is the only phase being implemented now. The flow has 3 steps.

### Step 1 — Main Agent: Fill Everything & Map Fields

The main agent handles the entire checkout form:

1. Navigate to checkout, detect platform (Shopify, WooCommerce, etc.) using merchant guides
2. Fill all non-sensitive fields: shipping address, billing address, contact info, cardholder name, expiry date, zip code
3. Identify the exact PAN and CVV input fields — element refs (e.g., `@e5`, `@e7`), iframe paths if applicable (e.g., `iframe[src*='stripe.com'] > iframe[src*='card-fields']`)
4. Record the precise path to each field, including any iframe nesting (important for Shopify's double-iframe pattern)

### Step 2 — Main Agent: Optional Dry-Run Verification

Before involving any sensitive data, the main agent can verify the fields work:

1. Enter test digits into the PAN field (e.g., "123456")
2. Take a screenshot — confirm digits appear in the correct field (even if masked)
3. Clear the test digits completely
4. Take a screenshot — confirm the field is empty
5. Repeat for CVV field
6. Now the main agent has **proven** both fields accept input and knows the exact path

**When to skip Step 2:**
- The checkout platform is well-known and the agent has high confidence in field identification (e.g., standard Shopify Stripe iframe)
- The agent has successfully completed a purchase at this same merchant before
- The accessibility tree clearly identifies the fields with unambiguous labels and refs

Step 2 solves the **silent failure problem** — without it, the sub-agent might try to fill a field inside an iframe it can't access, or a dynamically-rendered field, and you'd only discover the failure after the whole flow fails.

### Step 3 — Sub-Agent: Minimal 2-Field Secure Entry

The main agent has now:
- Filled every non-sensitive field
- Identified and optionally verified the PAN and CVV field refs
- Documented the exact iframe path if applicable

Now the main agent:

1. Calls `POST /bot/rail5/checkout` for spending approval
   - Note: this moves *later* in the flow than before — the agent requests approval when it's actually ready to pay, not at the start while it's still navigating
2. Once approved, spawns an ephemeral sub-agent with precise 2-field instructions
3. Sub-agent executes its minimal task (see below)
4. Main agent resumes: takes a verification screenshot (masked card digits visible), clicks submit, handles confirmation and reporting

**Sub-agent task — constructed by the main agent dynamically:**

```
You are a secure card entry agent. Fill exactly 2 fields and exit.

Checkout ID: r5chk_abc123
Card file: .creditclaw/cards/Card-ChaseD-9547.md

Field A (Card Number): @e5 in iframe[src*='stripe.com']
Field B (CVV): @e7 in iframe[src*='stripe.com']

Steps:
1. Call POST /api/v1/bot/rail5/key with { "checkout_id": "r5chk_abc123" }
2. Decrypt card file using returned key_hex, iv_hex, tag_hex
3. Navigate to the iframe if specified
4. Type card number into Field A (@e5)
5. Type CVV into Field B (@e7)
6. Clear all decrypted data from memory immediately
7. Report { status: "success" } back to main agent
8. If any field fill fails, report { status: "failed", reason: "..." }
```

The sub-agent no longer needs to: explore the page, detect the platform, fill shipping/billing, handle complex form logic, or click submit. It receives a proven path and executes it.

**After the sub-agent reports back:**
- Main agent verifies sub-agent was deleted (`sessions_status`)
- Main agent takes a screenshot to verify masked card digits are visible in the form
- Main agent clicks the submit/pay button
- Main agent detects success or failure from the confirmation page
- Main agent calls `POST /bot/rail5/confirm` with the result
- Main agent announces the result to the owner

### What Changes for Phase 1

**Skill files to update (in `/public/`):**

| File | Change | Scope |
|------|--------|-------|
| `agents/OPENCLAW_legacy.md` | **Major rewrite** — sub-agent does 2 fields only, main agent does everything else | Full rewrite |
| `CHECKOUT-GUIDE.md` | **Major rewrite** — restructure around the 3-step flow | Full rewrite |
| `SHOPPING-GUIDE.md` | **Minor** — add note about mapping PAN/CVV field refs during checkout analysis | ~10 lines |
| `skill.json` | Version bump | 1 line |
| `_meta.json` | Version bump + date | 2 lines |

**What does NOT change:**

- **API endpoints** — `POST /bot/rail5/checkout`, `POST /bot/rail5/key`, `POST /bot/rail5/confirm` all stay the same
- **Database schema** — No changes
- **Server-side code** — `buildSpawnPayload()` and `buildCheckoutSteps()` in `features/payment-rails/rail5/index.ts` stay as-is. The main agent constructs its own sub-agent instructions dynamically based on the fields it mapped. The server's `spawn_payload` becomes a fallback reference.
- **Encryption/decryption** — AES-256-GCM, split-knowledge model, single-use keys all unchanged
- **Guardrails and approvals** — Same enforcement, same flow
- **OpenClaw plugin** — `agents/OPENCLAW.md` and `Plugins/OpenClaw/` untouched in Phase 1

---

## Phase 2: OpenClaw Plugin Update (Future)

After Phase 1 proves the reverse pattern works with sub-agents, the existing OpenClaw plugin can be updated to benefit from the same approach.

### The Problem with the Current Plugin

The plugin (`public/Plugins/OpenClaw/src/fill-card.ts`) currently:
- Takes `checkout_id`, `card_file_path`, and optional `frame_hint`
- Takes a browser snapshot of the page (or iframe)
- Scans the snapshot for fields matching labels like "card number", "cvv", "security code" (via `findFieldRef()`)
- Handles iframe detection: if fields aren't found on the main page, looks for known payment iframe patterns — Stripe, Braintree, Adyen, Shopify, Square (via `detectPaymentIframe()`)
- Retries with different frame contexts if initial scan fails
- Types the decrypted values into found fields

This duplicates work the main agent already did. The main agent already knows exactly where the PAN and CVV fields are. If the plugin's label matching fails (non-standard field names, unusual DOM structure), the checkout fails even though the main agent had already identified the correct fields.

### The Change

Add `card_number_ref` and `cvv_ref` parameters to `creditclaw_fill_card`:

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

### Why This Is Better

- **More reliable** — field refs are pre-verified by the main agent (optionally with dry-run)
- **Faster** — no snapshot + label scan cycle needed
- **Simpler** — the field detection logic (`findFieldRef`, `detectPaymentIframe`, retry loops) becomes a fallback, not the primary path
- **Platform-agnostic** — the main agent handles platform-specific detection using the merchant guides; the plugin just types into refs

### Files Changed in Phase 2

| File | Change |
|------|--------|
| `Plugins/OpenClaw/src/fill-card.ts` | Add `card_number_ref`/`cvv_ref` params, skip detection when provided |
| `Plugins/OpenClaw/src/index.ts` | Update parameter schema for `creditclaw_fill_card` |
| `agents/OPENCLAW.md` | Update instructions to pass field refs to plugin, add dry-run guidance |

---

## Phase 3: Claude Plugin (Future)

Currently `agents/CLAUDE-PLUGIN.md` is marked "coming soon." The reverse pattern dramatically simplifies what this plugin needs to do.

### Without the Reverse Pattern

The Claude plugin would need to implement its own field detection, iframe handling, snapshot scanning — essentially replicating everything the OpenClaw plugin does, but for Claude's browser environment. This is a significant amount of code and platform-specific logic.

### With the Reverse Pattern

The Claude plugin receives exact field refs from the main agent. Its entire job is:
1. Accept `checkout_id`, `card_file_path`, `card_number_ref`, `cvv_ref`, and optional `frame_hint`
2. Retrieve decryption key from CreditClaw API
3. Decrypt card data
4. Type PAN into `card_number_ref`
5. Type CVV into `cvv_ref`
6. Wipe memory
7. Return result

No field detection, no iframe scanning, no label matching, no retries with different frame contexts. The plugin becomes a thin "decrypt and type" operation — ~50 lines of code instead of ~200.

### The Universal Plugin Contract

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

## Open Questions

1. **Should the dry-run use specific test patterns?** E.g., always "123456" for PAN and "12" for CVV? Or any arbitrary digits? Consistent patterns could help with debugging.

2. **What if field refs go stale?** Between the main agent's verification and the sub-agent's entry, the page could re-render (SPA navigation, timeout). Should the sub-agent verify refs are still valid before typing? Or trust the main agent's mapping?

3. **Plugin backward compatibility timeline.** How long should the OpenClaw plugin support the old label-matching path before it's removed? Or keep it permanently as a fallback?

4. **Should the checkout approval timing change in the API?** Currently nothing prevents calling `/checkout` early. The skill files now recommend calling it later (after form is filled). Should the API enforce this ordering, or leave it as guidance?
