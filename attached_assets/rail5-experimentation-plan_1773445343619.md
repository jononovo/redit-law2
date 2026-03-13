# Rail5 Checkout — Experimentation Plan

Skill-only approach. No backend changes. Output = updated skill files.

---

## Test Target

Use CreditClaw test checkout page first (controlled environment), then a real Shopify store with guest checkout.

**Metrics per test:** snapshots taken, estimated tokens, wall-clock seconds, success/fail, failure reason.

---

## Phase A: Generic Browser Instructions

**Goal:** Establish baseline improvement from just telling the agent HOW to use browser control.

### A1. Baseline (current state)
- [ ] Run a Rail5 checkout with current `buildSpawnPayload()` instructions (no changes)
- [ ] Record: snapshot count, token usage, time, success/fail
- [ ] Target: CreditClaw test checkout page

### A2. Add `--efficient` snapshot rule
- [ ] Add to `encrypted-card.md` checkout section:
```
BROWSER CHECKOUT TIPS:
Always use: snapshot --efficient
Never use the default AI snapshot — it dumps the full page (200k+ tokens).
The --efficient flag gives compact role refs (e12, e13) that are cheaper and sufficient.
```
- [ ] Re-run same checkout. Record metrics. Compare to A1.

### A3. Add form scoping
- [ ] Extend instructions:
```
Scope snapshots to the checkout form:
  snapshot --efficient --selector "form"
If no form visible: snapshot --efficient --depth 4
Do NOT snapshot the entire page.
```
- [ ] Re-run. Record metrics. Compare to A2.

### A4. Add iframe handling
- [ ] Extend instructions:
```
If card number / expiry / CVV fields are not visible in your snapshot,
they are inside an iframe (Stripe, Adyen, Braintree, etc.).
Scope to the iframe:
  snapshot --interactive --frame "iframe"
More specific:
  snapshot --interactive --frame "iframe[src*='stripe']"
  snapshot --interactive --frame "iframe[src*='adyen']"
You MUST scope to the iframe or payment fields are invisible.
```
- [ ] Test on a Stripe-powered WooCommerce store. Record metrics.

### A5. Add batching + budget rules
- [ ] Extend instructions:
```
Fill ALL visible fields from one snapshot before taking another.
Do NOT re-snapshot after each field.
Target: 5 snapshots total for the entire checkout.
Hard max: 8 snapshots. If you need more, fail and report.
If CAPTCHA / 3DS / OTP appears, fail immediately.
```
- [ ] Re-run. Record metrics. This is the "full generic" instruction set.

### A-Result
Compare A1 vs A5. Expected: 5-20x token reduction, higher success rate.

---

## Phase B: Browser-Control Specific Tips

**Goal:** Test whether browser-control-specific guidance (role refs, React dropdowns, waits) adds value beyond Phase A.

### B1. Add role ref instructions
- [ ] Extend instructions:
```
Use role-based refs from snapshots to interact:
  click e12
  type e13 "4111111111111111"
Do NOT construct CSS selectors. They break on React re-renders.
The eNN refs are stable within a snapshot.
```
- [ ] Re-run. Compare to A5.

### B2. Add React dropdown handling
- [ ] Extend instructions:
```
For dropdowns (country, state):
  If native <select>: use the select command.
  If React/custom (combobox, listbox):
    1. Click the dropdown trigger
    2. Type to filter (if supported)
    3. ArrowDown + Enter to select
```
- [ ] Test on a Shopify store (country/state dropdowns are React). Record metrics.

### B3. Add wait rules
- [ ] Extend instructions:
```
After navigating or clicking a button, wait before snapshotting:
  - Wait for network idle
  - Wait for specific text to appear (e.g., "Payment", "Card number")
React pages look ready before they are. Do not rapid-fire clicks.
```
- [ ] Re-run on a React-heavy checkout. Compare to B2.

### B-Result
Compare A5 (generic only) vs B3 (generic + browser-control tips). Determine if the extra instructions are worth the added prompt length.

---

## Phase C: Pre-Check (Agent Self-Detects Platform)

**Goal:** Test whether the agent can detect the checkout platform/stack itself, locally, before filling anything.

### C1. Add pre-check instruction to skill file
- [ ] Add to `encrypted-card.md`:
```
BEFORE filling any fields, identify the checkout:

Step 1 — Check the storefront platform:
  Fetch the page HTML or take one --efficient snapshot.
  Look for these signals:
    "cdn.shopify.com" or "Shopify.theme" → SHOPIFY
    "/wp-content/plugins/woocommerce/" → WOOCOMMERCE
    "static.squarespace.com" → SQUARESPACE
    "js.stripe.com" in a script tag → uses STRIPE for payments
    "adyen" in a script tag → uses ADYEN
    <iframe> containing card fields → IFRAME-BASED payments

Step 2 — Check the tech stack:
    React (look for "react" in scripts, or data-reactroot) → expect custom dropdowns, async rendering
    Standard HTML forms → simpler, fields should be directly interactable

Step 3 — Follow the matching section below, or use GENERIC if no match.
```
- [ ] Test: does the agent actually detect correctly? Record what it reports.

### C2. Test detection accuracy
- [ ] Run C1 pre-check against 5 sites:
  1. CreditClaw test checkout (plain HTML)
  2. A Shopify store
  3. A WooCommerce + Stripe store
  4. A Squarespace store
  5. A BigCommerce store
- [ ] Record: did it detect correctly? How many tokens did the pre-check cost?

### C-Result
If detection works and costs <5k tokens, it's worth it. If flaky or expensive, skip it and rely on the generic instructions from Phase A/B.

---

## Phase D: Provider-Specific Skill Files

**Goal:** Build dedicated checkout instructions for top 3 providers based on Phase A-C results.

### D1. Write `SHOPIFY-CHECKOUT.md`
- [ ] Companion file. Content:
```
# Shopify Checkout Instructions

Shopify checkouts are standardized. Most use one-page checkout (default since 2024).

LAYOUT: Contact → Shipping → Payment, all on one page (or 3 separate steps).
PAYMENT: Shopify Payments — card fields are INLINE, not in iframes.
FIELDS: Email, Country (React dropdown), First/Last name, Address, City,
  State (React dropdown), ZIP, Phone, Card number, Expiry (MM/YY), CVV, Name on card.
DROPDOWNS: Click to open, type first letters, Enter. NOT native <select>.
BILLING: "Same as shipping" checkbox, checked by default. Leave it.
SUBMIT: "Pay now" or "Complete order" button.

STRATEGY:
1. snapshot --efficient --selector "form" (or "main" if no form)
2. Fill all address fields from that snapshot
3. If card fields visible → fill them from same snapshot
4. If card fields NOT visible → page may be multi-step, click Continue, re-snapshot
5. Submit. Wait for confirmation page. Done.

EXPECTED: 3-4 snapshots total.
```

### D2. Write `STRIPE-CHECKOUT.md`
- [ ] Companion file. Content:
```
# Stripe Checkout Instructions

Stripe Elements puts card fields in iframes. You MUST scope to the iframe.

DETECTION: If you can't see card number/expiry/CVV in your snapshot, it's Stripe.
IFRAME: snapshot --interactive --frame "iframe[src*='js.stripe.com']"
FIELDS: Stripe may use:
  - Combined: one field for card number + expiry + CVC
  - Split: separate iframes for number, expiry, CVC
FILLING: After scoping to iframe, use role refs to type into the fields.
RETURN: After filling card fields, switch back to main page to click Submit.

STRATEGY:
1. snapshot --efficient --selector "form" → fill address/shipping
2. snapshot --interactive --frame "iframe[src*='js.stripe.com']" → fill card
3. Back to main page → click submit
4. Wait for confirmation.

EXPECTED: 3-4 snapshots total.
```

### D3. Write `AMAZON-CHECKOUT.md`
- [ ] Companion file. Amazon is complex — login required, multi-step, changes frequently.
- [ ] Content TBD based on testing. Start with basic structure, iterate.

### D4. Register companion files
- [ ] Add to `skill.json` files section:
```json
{
  "files": {
    "SKILL.md": "https://creditclaw.com/skill.md",
    "ENCRYPTED-CARD.md": "https://creditclaw.com/encrypted-card.md",
    "SHOPIFY-CHECKOUT.md": "https://creditclaw.com/shopify-checkout.md",
    "STRIPE-CHECKOUT.md": "https://creditclaw.com/stripe-checkout.md",
    ...
  }
}
```
- [ ] Update `encrypted-card.md` to reference the companion files:
```
After detecting the platform (Step 1 above):
  SHOPIFY → read SHOPIFY-CHECKOUT.md for specific instructions
  STRIPE (any platform) → read STRIPE-CHECKOUT.md for iframe handling
  NEITHER → follow the generic instructions below
```

### D5. End-to-end test
- [ ] Run full Rail5 checkout with updated skill files on:
  1. CreditClaw test checkout
  2. Shopify store (guest checkout)
  3. WooCommerce + Stripe store
- [ ] Record metrics. Compare to Phase A1 baseline.

### D-Result
Expected: 10-50x token reduction vs baseline. Success rate improvement from ~30% to ~70%+.

---

## Rollout

- [ ] Bump `encrypted-card.md` version
- [ ] Bump `skill.json` version
- [ ] Add new files to `skill.json` files section
- [ ] Deploy updated files to `creditclaw.com`
- [ ] Announce: "Updated checkout instructions — faster, cheaper, more reliable"
- [ ] Monitor feedback via `rail5.checkout.completed` / `rail5.checkout.failed` webhooks

---

## What we are NOT doing (yet)

- No backend code changes
- No changes to `buildSpawnPayload()` or checkout route
- No new API endpoints
- No database schema changes
- No vendor account storage
- No email service

Just better instructions in existing skill files + new companion files.
