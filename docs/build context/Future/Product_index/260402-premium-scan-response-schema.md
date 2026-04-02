# Premium Scan — Agent Response Schema

**Date:** 2026-04-02
**Companion to:** 260402-premium-scan-agent-checklist.md
**Purpose:** Defines the exact data structures agents must return — both per-phase submissions during the scan and the final complete report. Also defines the input payload sent to agents when triggering a scan.

---

## Part 1: Trigger Payload (What We Send to the Agent)

When CreditClaw triggers a premium scan via webhook, this is the payload the agent receives. It includes selective baseline data from the free scan — enough to orient the agent without spoiling the inspection.

```json
{
  "scanId": "pscan_abc123",
  "callbackUrl": "https://creditclaw.com/api/v1/premium-scan/callback",
  "domain": "example-store.com",
  "homepageUrl": "https://example-store.com",

  "baseline": {
    "storeCategory": "fashion",
    "searchUrlPattern": "/search?q={query}",
    "guestCheckout": true,
    "sitemapUrl": "https://example-store.com/sitemap.xml",
    "productFeedUrl": null,
    "knownProductCategories": ["shoes", "accessories", "outerwear"],
    "platform": "shopify"
  },

  "config": {
    "testAddress": {
      "firstName": "Test",
      "lastName": "Agent",
      "address1": "123 Test Street",
      "address2": "Apt 4B",
      "city": "New York",
      "state": "NY",
      "zip": "10001",
      "country": "US",
      "phone": "+1 555-000-0000",
      "email": "scan@creditclaw.com"
    },
    "testCard": {
      "number": "4111111111111111",
      "expiry": "12/29",
      "cvc": "123",
      "name": "Test Agent"
    },
    "testPromoCode": "TESTCODE",
    "searchTerm": "shoes",
    "maxRetries": 3,
    "screenshotOn": ["before_action", "after_action", "on_error", "on_block"]
  }
}
```

### Field Notes

| Field | Purpose | Source |
|-------|---------|--------|
| `scanId` | Unique ID for correlating callbacks | Generated on trigger |
| `callbackUrl` | Where the agent POSTs results | CreditClaw endpoint |
| `baseline.storeCategory` | What the store sells, so the agent picks a sensible search term | Free scan / brand index |
| `baseline.searchUrlPattern` | Saves the agent from hunting for search — that's not what we're scoring | Free scan detection |
| `baseline.guestCheckout` | Whether guest checkout was detected, so the agent doesn't waste time creating an account | Free scan detection |
| `baseline.sitemapUrl` | Helps the agent understand catalog structure | Free scan detection |
| `baseline.knownProductCategories` | Guides product search term selection | Free scan / sitemap analysis |
| `baseline.platform` | Helps the agent anticipate common patterns (Shopify checkout, WooCommerce cart, etc.) | Free scan detection |
| `config.searchTerm` | Suggested search term (can be overridden by agent if irrelevant to store) | Derived from storeCategory |
| `config.maxRetries` | Max attempts per checkpoint before marking as blocked | Default: 3 |

### What We Deliberately Don't Send

- Page HTML selectors or DOM structure
- JSON-LD / structured data findings
- Free scan score or breakdown
- Specific product page URLs
- Checkout page selectors or form field IDs

The agent discovers these through the inspection — that's part of what's being scored.

---

## Part 2: Per-Phase Submission

Agents submit findings after each of the 5 phases. This lets CreditClaw track progress in real-time and means partial results are captured even if a later phase times out.

### Phase Submission Endpoint

```
POST {callbackUrl}
Content-Type: application/json
```

### Phase Submission Payload

```json
{
  "scanId": "pscan_abc123",
  "agentId": "agent-local-1",
  "agentType": "local_headless",
  "submissionType": "phase",
  "phaseNumber": 1,
  "phaseName": "discovery",
  "timestamp": "2026-04-02T14:32:00Z",
  "duration": 47,

  "steps": [
    {
      "stepId": "A",
      "stepName": "Product Search",
      "status": "completed",
      "score": 4,
      "retries": 0,
      "timeSeconds": 22,
      "checkpoints": [
        {
          "id": "A1.1",
          "group": "Search Discovery",
          "description": "Can you find the search input?",
          "result": "pass",
          "retries": 0,
          "score": 5,
          "notes": "Search icon in header, click to expand input field. Selector: button.header__search-toggle",
          "screenshotUrl": null
        },
        {
          "id": "A1.2",
          "group": "Search Discovery",
          "description": "Is the search input visible by default?",
          "result": "partial",
          "retries": 0,
          "score": 4,
          "notes": "Not visible by default — requires clicking magnifying glass icon. Input appears as overlay.",
          "screenshotUrl": "https://storage.example.com/pscan_abc123/A1.2_after.png"
        },
        {
          "id": "A1.3",
          "group": "Search Discovery",
          "description": "Does the search input have a clear placeholder?",
          "result": "pass",
          "retries": 0,
          "score": 5,
          "notes": "Placeholder text: 'Search our store'",
          "screenshotUrl": null
        },
        {
          "id": "A1.4",
          "group": "Search Discovery",
          "description": "Record the search URL pattern",
          "result": "pass",
          "retries": 0,
          "score": 5,
          "notes": "/search?q={query}&type=product",
          "screenshotUrl": null
        }
      ],

      "discoveries": {
        "searchUrlPattern": "/search?q={query}&type=product",
        "searchInputSelector": "input.header__search-input",
        "searchToggleSelector": "button.header__search-toggle",
        "resultsPerPage": 20,
        "filtersAvailable": ["price", "size", "color"],
        "sortOptions": ["relevance", "price-ascending", "price-descending", "created-descending"]
      }
    },
    {
      "stepId": "B",
      "stepName": "Product Comparison",
      "status": "completed",
      "score": 3,
      "retries": 1,
      "timeSeconds": 25,
      "checkpoints": [],

      "discoveries": {
        "productUrlPattern": "/products/{handle}",
        "productsEvaluated": [
          {
            "url": "/products/classic-leather-boot",
            "name": "Classic Leather Boot",
            "price": "$149.00",
            "hasVariants": true,
            "hasReviews": true,
            "hasAvailability": false
          }
        ]
      }
    }
  ]
}
```

---

## Part 3: Checkpoint Schema (Detailed)

Every one of the 121 checkpoints follows this exact shape:

```json
{
  "id": "F2.4",
  "group": "Address Entry",
  "description": "Enter a test address",
  "result": "pass | partial | fail | blocked | n_a",
  "retries": 0,
  "score": 5,
  "notes": "All fields accepted. Autocomplete triggered on Address Line 1 but didn't interfere.",
  "screenshotUrl": "https://storage.example.com/pscan_abc123/F2.4_after.png",
  "metadata": {}
}
```

### Result Values

| Value | Meaning | When to Use |
|-------|---------|-------------|
| `pass` | Checkpoint fully satisfied | Element found, action completed, result as expected |
| `partial` | Checkpoint partially satisfied | Found but with caveats, completed with workaround |
| `fail` | Checkpoint not satisfied | Element found but interaction failed, or result was wrong |
| `blocked` | Could not attempt | Element not found, prerequisite failed, hard wall |
| `n_a` | Not applicable | Feature doesn't exist on this site (e.g., no variants to select) |

### The `metadata` Object

For certain checkpoints, structured data beyond free-text notes is valuable. The `metadata` field captures this. It's optional and checkpoint-specific.

```json
// A1.4 — Search URL pattern
{ "urlPattern": "/search?q={query}" }

// B2.2 — Price visibility
{ "price": "$149.00", "currency": "USD", "location": "below title, right-aligned" }

// C1.3 — Variant UI elements
{ "variantTypes": ["size", "color"], "uiElements": {"size": "dropdown", "color": "swatch"} }

// E2.4 — Cart subtotal
{ "subtotal": "$149.00", "currency": "USD" }

// F3.2 — Shipping options
{
  "options": [
    { "name": "Standard", "price": "$5.99", "timeframe": "5-7 business days" },
    { "name": "Express", "price": "$12.99", "timeframe": "2-3 business days" }
  ]
}

// G1 — Price tracking across stages
{
  "productPage": "$149.00",
  "cart": "$149.00",
  "checkout": "$149.00",
  "consistent": true
}

// G2 — Fees
{
  "fees": [
    { "name": "Handling", "amount": "$4.99", "visibleBeforeCheckout": false }
  ]
}

// H1.1 — Payment methods
{ "methods": ["credit_card", "paypal", "apple_pay", "afterpay"] }

// H2.2 — Payment processor
{ "processor": "stripe", "formType": "iframe" }
```

---

## Part 4: Step-Level Discoveries

Each step includes a `discoveries` object for structured operational data the SKILL.md generator needs. These are the actionable findings — selectors, URLs, patterns — that go into the agent playbook.

```json
// Step A discoveries
{
  "searchUrlPattern": "/search?q={query}&type=product",
  "searchInputSelector": "input.header__search-input",
  "searchToggleSelector": "button.header__search-toggle",
  "resultsPerPage": 20,
  "filtersAvailable": ["price", "size", "color"],
  "sortOptions": ["relevance", "price-ascending", "price-descending"],
  "fuzzyMatchSupported": true,
  "noResultsMessage": "No products found. Try a different search term."
}

// Step B discoveries
{
  "productUrlPattern": "/products/{handle}",
  "productsEvaluated": [
    {
      "url": "/products/classic-leather-boot",
      "name": "Classic Leather Boot",
      "price": "$149.00",
      "hasVariants": true,
      "variantTypes": ["size", "color"],
      "hasReviews": true,
      "reviewCount": 47,
      "hasAvailability": true,
      "hasSpecsTable": false
    }
  ],
  "comparisonFeatureExists": false,
  "infoConsistencyAcrossProducts": "high"
}

// Step C discoveries
{
  "variantTypes": [
    { "name": "Size", "uiElement": "dropdown", "selector": "select#Size", "options": ["S", "M", "L", "XL"] },
    { "name": "Color", "uiElement": "swatch", "selector": "fieldset.color-swatch input[type=radio]", "options": ["Black", "Brown", "Tan"] }
  ],
  "defaultVariantPreselected": true,
  "priceUpdatesOnVariantChange": true,
  "imageUpdatesOnVariantChange": true,
  "unavailableVariantsMarked": true,
  "unavailableVariantBehavior": "greyed out with 'Sold Out' label"
}

// Step D discoveries
{
  "statePreservedOnChange": true,
  "updateMethod": "ajax",
  "urlUpdatesWithVariant": true,
  "urlReloadRestoresVariant": true,
  "addToCartAccessibleAfterChange": true
}

// Step E discoveries
{
  "cartUrl": "/cart",
  "addToCartSelector": "button[name='add']",
  "addToCartFeedback": "slide-out drawer from right",
  "quantityInputType": "number_input_with_buttons",
  "quantitySelector": "input.cart__quantity",
  "removeSelector": "a.cart__remove",
  "emptyCartMessage": "Your cart is empty. Continue shopping.",
  "cartPersistsOnReload": true
}

// Step F discoveries
{
  "checkoutUrl": "/checkout",
  "guestCheckoutMethod": "default (no account required)",
  "addressFields": ["firstName", "lastName", "address1", "address2", "city", "state", "zip", "country", "phone"],
  "requiredFieldsMarked": true,
  "autocompletePresent": true,
  "autocompleteProvider": "google_places",
  "shippingOptions": [
    { "name": "Standard Shipping", "price": "$5.99", "timeframe": "5-7 business days" },
    { "name": "Express Shipping", "price": "$12.99", "timeframe": "2-3 business days" },
    { "name": "Next Day", "price": "$24.99", "timeframe": "1 business day" }
  ],
  "defaultShippingPreselected": true,
  "defaultShippingOption": "Standard Shipping",
  "returnPolicyUrl": "/policies/refund-policy",
  "returnPolicyLinkedFromCheckout": false,
  "returnPolicyLinkedFromFooter": true,
  "returnWindow": "30 days",
  "returnShippingPaidBy": "customer",
  "refundMethod": "original payment method",
  "policyFormat": "html"
}

// Step G discoveries
{
  "priceProductPage": "$149.00",
  "priceCart": "$149.00",
  "priceCheckout": "$149.00",
  "priceConsistent": true,
  "taxShown": true,
  "taxAmount": "$13.41",
  "taxLabel": "Estimated tax",
  "additionalFees": [
    { "name": "Handling fee", "amount": "$4.99", "visibleBeforeCheckout": false }
  ],
  "preCheckedAddons": [],
  "promoCodeFieldAccessible": true,
  "promoCodeFieldLocation": "collapsed link below subtotal",
  "promoCodeErrorMessage": "Enter a valid discount code",
  "orderSummaryItemized": true
}

// Step H discoveries
{
  "paymentMethods": ["credit_card", "paypal", "apple_pay"],
  "paymentProcessor": "stripe",
  "cardFormType": "iframe",
  "cardFields": ["number", "expiry", "cvc", "name"],
  "billingAddressPrefilledFromShipping": true,
  "inlineValidation": true,
  "securityIndicators": ["lock icon", "Secure checkout text"]
}

// Step I discoveries
{
  "orderSummaryVisible": true,
  "summaryIncludes": ["product", "variant", "quantity", "price", "shipping", "tax", "total"],
  "shippingAddressShown": true,
  "paymentMethodShown": true,
  "editLinksAvailable": true,
  "submitButtonText": "Complete Order",
  "submitButtonShowsTotal": false,
  "submitButtonPosition": "bottom right",
  "lastMinuteUpsells": false,
  "preCheckedOptions": ["newsletter_signup"],
  "termsCheckboxRequired": false,
  "finalTotal": "$173.39",
  "finalTotalMatchesExpected": false,
  "discrepancyReason": "Handling fee $4.99 not shown on product page"
}

// Step J discoveries
{
  "responseType": "inline_error",
  "responseUrl": "/checkout",
  "errorMessage": "Your card was declined. Please try a different payment method.",
  "errorSpecificity": "specific",
  "errorGuidance": true,
  "formPreservedAfterError": true,
  "cartPreservedAfterError": true,
  "canRetryWithoutReentry": true
}
```

---

## Part 5: Final Report Submission

After all 5 phases are submitted, the agent sends one final payload that summarizes the entire journey.

```json
{
  "scanId": "pscan_abc123",
  "agentId": "agent-local-1",
  "agentType": "local_headless",
  "submissionType": "final",
  "timestamp": "2026-04-02T14:38:00Z",
  "totalDuration": 312,

  "journeyScore": {
    "total": 38,
    "maxPossible": 50,
    "byPhase": {
      "discovery": { "score": 7, "max": 10, "steps": ["A", "B"] },
      "product_interaction": { "score": 9, "max": 10, "steps": ["C", "D"] },
      "cart": { "score": 5, "max": 5, "steps": ["E"] },
      "checkout_setup": { "score": 7, "max": 10, "steps": ["F", "G"] },
      "payment_completion": { "score": 10, "max": 15, "steps": ["H", "I", "J"] }
    },
    "byStep": {
      "A": { "score": 4, "retries": 0, "status": "completed", "timeSeconds": 22 },
      "B": { "score": 3, "retries": 1, "status": "completed", "timeSeconds": 25 },
      "C": { "score": 5, "retries": 0, "status": "completed", "timeSeconds": 18 },
      "D": { "score": 4, "retries": 0, "status": "completed", "timeSeconds": 12 },
      "E": { "score": 5, "retries": 0, "status": "completed", "timeSeconds": 35 },
      "F": { "score": 3, "retries": 2, "status": "completed", "timeSeconds": 65 },
      "G": { "score": 4, "retries": 0, "status": "completed", "timeSeconds": 28 },
      "H": { "score": 4, "retries": 0, "status": "completed", "timeSeconds": 40 },
      "I": { "score": 3, "retries": 1, "status": "completed", "timeSeconds": 30 },
      "J": { "score": 3, "retries": 0, "status": "completed", "timeSeconds": 37 }
    }
  },

  "topBlockers": [
    {
      "stepId": "F",
      "checkpointId": "F4.1",
      "description": "Return policy not linked from checkout flow — had to navigate to footer link on homepage",
      "severity": "moderate"
    },
    {
      "stepId": "G",
      "checkpointId": "G2.2",
      "description": "$4.99 handling fee appears only at checkout, not on product page or cart",
      "severity": "high"
    },
    {
      "stepId": "I",
      "checkpointId": "I3.2",
      "description": "Newsletter signup pre-checked at checkout — not visible until scrolling down",
      "severity": "low"
    }
  ],

  "topStrengths": [
    {
      "stepId": "C",
      "description": "Variant selection is flawless — standard dropdowns, clear labels, price updates instantly"
    },
    {
      "stepId": "E",
      "description": "Cart management is excellent — responsive quantity controls, clear remove action, cart persists across sessions"
    },
    {
      "stepId": "H",
      "description": "Payment form is clean Stripe Elements with clear field labels and inline validation"
    }
  ],

  "criticalGotchas": [
    "Search requires clicking magnifying glass icon — not visible as input by default",
    "Handling fee ($4.99) not shown until checkout — total will differ from product page + shipping",
    "Return policy page is only accessible via homepage footer, not from checkout or product pages"
  ],

  "keyUrls": {
    "search": "/search?q={query}&type=product",
    "cart": "/cart",
    "checkout": "/checkout",
    "returnPolicy": "/policies/refund-policy",
    "productPattern": "/products/{handle}"
  },

  "keySelectors": {
    "searchToggle": "button.header__search-toggle",
    "searchInput": "input.header__search-input",
    "addToCart": "button[name='add']",
    "cartQuantity": "input.cart__quantity",
    "cartRemove": "a.cart__remove",
    "checkoutButton": "button[name='checkout']",
    "submitOrder": "button.step__footer__continue-btn"
  },

  "allDiscoveries": {
    "A": {},
    "B": {},
    "C": {},
    "D": {},
    "E": {},
    "F": {},
    "G": {},
    "H": {},
    "I": {},
    "J": {}
  },

  "screenshots": [
    { "checkpointId": "A1.2", "type": "after_action", "url": "https://storage.example.com/pscan_abc123/A1.2_after.png" },
    { "checkpointId": "F2.4", "type": "after_action", "url": "https://storage.example.com/pscan_abc123/F2.4_after.png" },
    { "checkpointId": "G2.2", "type": "on_error", "url": "https://storage.example.com/pscan_abc123/G2.2_error.png" },
    { "checkpointId": "I4.2", "type": "after_action", "url": "https://storage.example.com/pscan_abc123/I4.2_after.png" },
    { "checkpointId": "J1.2", "type": "after_action", "url": "https://storage.example.com/pscan_abc123/J1.2_after.png" }
  ]
}
```

---

## Part 6: Multi-Agent Results Comparison

When both agents complete, CreditClaw receives two final reports. The results analyzer compares them using this structure:

```json
{
  "scanId": "pscan_abc123",
  "domain": "example-store.com",
  "agentResults": [
    {
      "agentId": "agent-local-1",
      "agentType": "local_headless",
      "journeyScore": 38,
      "completedSteps": 10,
      "totalDuration": 312
    },
    {
      "agentId": "agent-vps-1",
      "agentType": "vps_playwright",
      "journeyScore": 41,
      "completedSteps": 10,
      "totalDuration": 287
    }
  ],

  "consensus": {
    "journeyScore": 40,
    "method": "weighted_average_higher_performer",

    "stepComparison": [
      {
        "stepId": "A",
        "agent1Score": 4,
        "agent2Score": 5,
        "consensus": 5,
        "agreement": "close",
        "note": "VPS agent found search immediately; local agent needed icon click"
      },
      {
        "stepId": "C",
        "agent1Score": 2,
        "agent2Score": 5,
        "consensus": 4,
        "agreement": "disagreement",
        "note": "Local headless agent failed with JS-heavy color swatches. VPS Playwright handled them fine. Finding: variant UI requires full JS rendering."
      }
    ],

    "disagreements": [
      {
        "stepId": "C",
        "checkpointId": "C2.1",
        "agent1Result": "fail",
        "agent2Result": "pass",
        "insight": "Color swatch selection requires JavaScript rendering — headless CLI agent cannot interact with custom swatch elements"
      }
    ]
  },

  "combinedGotchas": [
    "Search icon must be clicked to reveal input (both agents confirmed)",
    "Color swatches require full JS rendering (agent disagreement — headless fails)",
    "Handling fee not visible until checkout (both agents confirmed)",
    "Return policy only accessible from homepage footer (both agents confirmed)"
  ],

  "combinedDiscoveries": {}
}
```

### Consensus Scoring Rules

1. **Both agree (within 1 point):** Use the average, rounded up.
2. **Disagreement (2+ point gap):** Use the higher score (we're measuring "can an agent do this", not "can every agent do this"), but flag the disagreement as a finding.
3. **One agent blocked, one passed:** Use the passing score minus 1 (the blockage is still informative even if one agent succeeded).
4. **Both blocked:** Score is 1. This is a genuine site problem.

---

## Part 7: Error & Timeout Handling

### Agent Timeout
If an agent hasn't submitted a phase within 5 minutes, the system marks that phase as timed out. Any phases already submitted are preserved.

```json
{
  "scanId": "pscan_abc123",
  "agentId": "agent-local-1",
  "submissionType": "timeout",
  "lastCompletedPhase": 3,
  "timedOutPhase": 4,
  "phasesSubmitted": [1, 2, 3],
  "partialResults": true
}
```

### Agent Crash
If the webhook callback never arrives, the system waits 15 minutes total, then marks the agent as failed. The other agent's results (if available) are used alone.

### Partial Scan Scoring
If only some phases complete:
- Journey Score is prorated: `(actual_score / checkpoints_completed) × 50`
- A `completeness` percentage is shown alongside the score
- The premium results page clearly indicates which phases weren't completed and why

---

## Summary: The Three Documents

| Document | Purpose | Used By |
|----------|---------|---------|
| **Checklist** (260402-premium-scan-agent-checklist.md) | What the agent does — step-by-step instructions with 121 checkpoints | The browser agents during scanning |
| **Response Schema** (this doc) | How the agent sends results — exact JSON structures for phases, checkpoints, final report | Agents (outbound) and CreditClaw analyzer (inbound) |
| **Plan** (260402-premium-merchant-scan.md) | Why we're building this — architecture, user flow, build phases | Product planning and engineering |
