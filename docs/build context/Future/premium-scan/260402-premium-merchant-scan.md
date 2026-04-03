# Premium Merchant Scan — Agent Shopping Journey (ASJ)

**Date:** 2026-04-02
**Status:** Planning
**Depends on:** Free ASX Scan (Phase 4, complete)

---

## Overview

The Premium Scan is a paid upgrade that extends CreditClaw's free ASX Score Scanner. Where the free scan answers "can an agent *read* your site?", the premium scan answers "can an agent actually *shop* on your site?"

Real browser-controlled agents perform a complete shopping journey — searching for products, comparing options, selecting variants, managing a cart, entering shipping and payment details, and attempting checkout. Each step is scored independently for clarity, ease, and reliability.

The premium scan builds on the free scan's evidence (never starts from scratch) and produces a re-scored ASX profile plus a significantly richer SKILL.md with step-by-step agent playbook.

---

## Architecture: Webhook-Triggered External Agents

All browser agents are hosted separately from the main CreditClaw application. The main app triggers scans via webhooks and receives results when complete.

```
CreditClaw App (Replit)
  │
  ├── User clicks "Premium Scan" → paywall → payment → trigger
  │
  ├── POST webhook → Agent 1 (Local browser agent)
  ├── POST webhook → Agent 2 (VPS Playwright/browser-use agent)
  │   (both triggered simultaneously)
  │
  │   ... agents run independently, each completing the full journey ...
  │
  ├── ← Webhook callback from Agent 1 with results
  ├── ← Webhook callback from Agent 2 with results
  │
  ├── Results Analyzer: compare agent results, build consensus
  ├── Evidence Merger: premium evidence upgrades free scan baseline
  ├── Re-score: computeScoreFromRubric with enriched evidence
  └── SKILL.md Generator: enhanced with step-by-step playbook
```

Each agent:
- Receives: domain, baseline evidence from free scan, journey checklist
- Returns: step-by-step scores, notes, screenshots, retry counts, timing data
- Operates independently — no coordination between agents during the scan
- Reports back via webhook when complete

---

## The 10-Step Shopping Journey

### A. Product Search
**Action:** Agent searches for a product type using the site's search functionality.
**Scoring:** Search usability, results relevance, filter/sort availability, search response time.

### B. Product Comparison
**Action:** Agent evaluates 2-3 results from the search.
**Scoring:** Product page clarity, ability to compare specs/prices/reviews across options, information consistency.

### C. Variant Selection
**Action:** Agent selects product options (color, size, material, etc.).
**Scoring:** Options clarity, standard form elements, visual feedback on selection, price updates on variant change.

### D. Variant Change
**Action:** Agent changes a previously selected variant.
**Scoring:** Does the page update cleanly? Does price update? Is state preserved? Any confusion or page reloads?

### E. Cart Management
**Action:** Add to cart, change quantity, remove item, re-add.
**Scoring:** Cart accessibility, quantity controls, clear item management, cart total accuracy.

### F. Shipping Details
**Action:** Enter shipping address, view shipping options, select method, find return/refund policy.
**Scoring:** Address form clarity and field labels, shipping option descriptions (method, timeframe, cost), option selection and adjustment, return/refund policy discoverability and readability.

### G. Pricing Clarity
**Action:** Review pricing at checkout vs. what was shown on product page.
**Scoring:** Price consistency (product page → cart → checkout), tax/fee transparency, no surprise add-ons or mandatory extras, clear total breakdown.

### H. Payment Entry
**Action:** View payment options, enter payment details using a test card number.
**Scoring:** Payment method clarity (which methods accepted, clearly labeled), form field labels and layout, error handling on invalid card.

### I. Checkout Finalization
**Action:** Review final state before submitting purchase.
**Scoring:** Required fields clearly indicated, no hidden upsells or last-minute additions, submit/purchase button easy to find, order summary accurate and complete.

### J. Post-Purchase
**Action:** Evaluate the result page after checkout submission (expected: payment failure on test card, which is fine — the submission itself proves form completion).
**Scoring:** Success/failure message clarity, order number or reference provided, confirmation email sent (if applicable), next-steps guidance.

**Note on payment simulation:** Agents use a known-invalid test card number. The payment will fail, but reaching that point proves all required form fields were successfully identified and filled. Even an error page is a successful signal — it means the agent navigated the entire checkout flow. The error page itself is scored for clarity.

---

## Step Scoring: The Inspector Model

Each step is scored like a property inspection. The agent works through a structured checklist, section by section, recording findings as it goes rather than trying to remember everything at the end.

### Per-Step Checklist Format

For each step (A through J), the agent fills out:

```
Step: [A-J identifier]
Status: completed | partial | blocked
Score: 1-5
Retries: [number of attempts before success]
Ease of Discovery: easy | moderate | difficult | not_found
Clarity: clear | somewhat_clear | confusing | unreadable
Time Taken: [seconds]
Screenshot: [captured at key moment]
Notes: [free-text observations, specific to what was found]
Blockers: [if any — what prevented completion]
```

**Score scale:**
- **5** — Effortless. Agent completed on first try, everything clearly labeled and logical.
- **4** — Minor friction. Completed but required a small adjustment or extra step.
- **3** — Moderate effort. Completed but required workarounds, guessing, or multiple attempts.
- **2** — Significant difficulty. Partially completed, major confusion or unclear elements.
- **1** — Blocked. Could not complete the step.

### Phased Execution (Inspector Sections)

The journey is chunked into phases so the agent can write up findings after each section without context overload:

**Phase 1: Discovery** (Steps A-B)
- Search for product, evaluate results
- Write up findings for A and B before moving on

**Phase 2: Product Interaction** (Steps C-D)
- Select variants, change variants
- Write up findings for C and D

**Phase 3: Cart** (Step E)
- Full cart management cycle
- Write up findings for E

**Phase 4: Checkout Setup** (Steps F-G)
- Shipping details and pricing review
- Write up findings for F and G

**Phase 5: Payment & Completion** (Steps H-I-J)
- Payment entry, checkout finalization, post-purchase
- Write up findings for H, I, and J

Each phase produces its own self-contained report. The final analysis combines all five phase reports into the overall premium score.

---

## Multi-Agent Approach

Two agents run simultaneously from day one:

### Agent 1: Local Browser Agent
- Locally hosted headless browser
- CLI-driven interaction
- Strengths: fast, scriptable, good for structured forms
- Reports back via webhook with results

### Agent 2: VPS Playwright + Browser-Use
- VPS-hosted Chromium with Playwright automation
- Full browser rendering, handles SPAs and dynamic content
- Strengths: most realistic browser environment, handles complex JS
- Reports back via webhook with results

### Future: Agent 3: Chrome Extension (Claude Computer Use)
- Claude controlling a real Chrome browser via extension
- Most human-like interaction
- Added later as a validation/fallback agent

### Cross-Agent Analysis

When both agents complete, the analyzer compares their step-by-step results:

- **Agreement:** Both agents scored the step similarly → high confidence
- **Disagreement:** One succeeded, one failed → indicates the step requires specific interaction patterns, which is itself a finding
- **Both failed:** Strong signal that the step is genuinely problematic for AI agents
- **Retry disparities:** If Agent 1 needed 5 retries but Agent 2 did it in 1, that tells you something about form implementation

The final premium score uses the consensus of both agents, weighted toward the more successful one (since we want to measure "can an agent do this" not "can every agent do this").

---

## Premium SKILL.md: The Agent Playbook

The free SKILL.md is a reference card. The premium SKILL.md is a step-by-step operations manual.

Example enhancement:

```markdown
## Search
- URL template: /search?q={query}
- Returns ~20 results per page
- Filters: price range, category, brand (left sidebar)
- Sort: relevance (default), price low-high, price high-low, newest
- Gotcha: Search box is inside a modal on mobile viewport — use desktop UA

## Product Pages
- Variants: <select> elements with standard name="option1" attributes
- Price updates dynamically on variant change (watch for .price__current element)
- Add to cart: <button type="submit" name="add"> inside <form action="/cart/add">
- Product ID in URL: /products/{handle} — handle is the slug, not a numeric ID

## Cart
- Accessible at /cart
- Quantity: number input, min=1, max=99
- Remove: link with data-action="remove"
- Cart total updates via AJAX, no page reload needed

## Checkout Flow
- Guest checkout: Click "Continue as Guest" (second button, below "Sign In")
- Address form: 8 fields, standard layout, Google Places autocomplete on address line 1
- Shipping: 3 options (Standard $5.99 / 5-7 days, Express $12.99 / 2-3 days, Next Day $24.99)
- Payment: Stripe Elements iframe for card entry. Also accepts PayPal and Apple Pay.
- Gotcha: Promo code field is collapsed — look for "Have a discount code?" link below subtotal
- Gotcha: $4.99 "handling fee" added at checkout, not shown on product page
- Submit: "Complete Order" button, bottom right of payment section

## Returns Policy
- Linked from checkout footer: /policies/refund-policy
- 30-day return window, free return shipping on orders over $50
- Policy page is plain HTML, easily parseable

## Known Issues
- Price on product page does not include the $4.99 handling fee (appears at checkout)
- Mobile search requires clicking a magnifying glass icon to open the search modal
- Agent 1 failed at variant selection (JS-heavy dropdowns) — use Playwright-based agent
```

---

## User Flow: Premium Scan Purchase

1. User visits `/agentic-shopping-score` and runs a free scan
2. Results page shows free ASX Score with a "Get Premium Scan" upgrade CTA
3. Clicking the CTA hits a paywall showing:
   - What the premium scan includes (10-step journey, multi-agent, playbook)
   - Example premium report (sample output)
   - Pricing
4. User pays → payment confirmed → premium scan triggered
5. Both agents are triggered simultaneously via webhooks
6. User sees a "Premium scan in progress" status (estimated time: 5-10 minutes)
7. As agents complete, results are received and analyzed
8. Premium results page loads with:
   - Re-scored ASX Score (typically higher fidelity, may go up or down)
   - Step-by-step journey breakdown (A-J) with scores, notes, screenshots
   - Cross-agent comparison highlights
   - Enhanced SKILL.md with full playbook
   - Downloadable report (PDF or Markdown)

---

## Scoring Integration

### Free Scan (existing)
- `scanTier: "free"` or `"agentic"`
- 100-point ASX Score from rubric (11 signals, 3 pillars)

### Premium Scan (new)
- `scanTier: "premium"`
- Same 100-point ASX Score (re-scored with richer evidence from journey)
- Plus: **Agent Journey Score** (10 steps × 1-5 points = 50 points max)
- Plus: per-step breakdown with retry counts, timing, screenshots, notes

The ASX Score remains comparable across tiers (same rubric, same 100-point scale). The Journey Score is premium-only and provides the operational depth.

---

## Build Phases

### Phase 1: Foundation
- Premium scan data model (journey steps, sub-scores, screenshots, citations, retry counts)
- Webhook trigger/receive endpoints on CreditClaw side
- Step checklist format and phased execution spec for agents
- Agent result schema (what each agent sends back)

### Phase 2: First Two Agents
- Local browser agent: headless CLI-driven, journey steps A-E
- VPS Playwright agent: browser-use integration, journey steps A-E
- Webhook integration: trigger both, receive results, basic comparison

### Phase 3: Complete Journey
- Extend both agents to steps F-J (shipping through post-purchase)
- Test card payment simulation
- Phase-by-phase reporting (5 phases, findings written up after each)

### Phase 4: Analysis & Scoring
- Cross-agent result comparison and consensus scoring
- Evidence merger: premium findings upgrade free scan baseline
- Re-scoring through existing rubric with enriched evidence
- Enhanced SKILL.md generator with playbook format

### Phase 5: Paywall & User Flow
- Premium scan purchase flow (CTA → paywall → payment → trigger)
- "Scan in progress" status page with estimated completion time
- Premium results page with journey breakdown, screenshots, cross-agent comparison
- Downloadable report

### Phase 6: Polish
- Agent 3 (Chrome Extension) integration
- Journey replay (visual step-by-step walkthrough)
- Historical comparison (how scores changed between scans)
- Premium scan scheduling (recurring monthly scans)

---

## Open Decisions

- **Pricing model:** One-time per scan? Monthly subscription with N scans included?
- **Payment provider:** Stripe integration (already in CreditClaw stack?)
- **Agent hosting:** Specific VPS provider for Agent 2? Local machine specs for Agent 1?
- **Scan duration SLA:** What's acceptable wait time? 5-10 minutes? Longer for complex sites?
- **Screenshot storage:** Where do step screenshots get stored? (S3, Cloudflare R2, etc.)
- **Test card strategy:** Stripe test numbers (4242...) won't work on real sites. Use a real-looking but invalid number that triggers a decline? Or a virtual card with $0 limit?
