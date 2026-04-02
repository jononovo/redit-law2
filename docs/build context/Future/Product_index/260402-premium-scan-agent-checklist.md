# Premium Scan — Agent Inspection Checklist

**Date:** 2026-04-02
**Companion to:** 260402-premium-merchant-scan.md
**Purpose:** This is the checklist the browser agent follows during a premium scan. It works like a property inspection — the agent moves through sections one at a time, scores each sub-point, records notes, and submits findings at the end of each phase before moving on.

---

## Instructions for the Agent

1. You will receive a **domain** and **baseline evidence** from the free ASX scan.
2. Work through this checklist **phase by phase**. After completing each phase, submit your findings for that phase before continuing to the next.
3. For every checkpoint, record:
   - **Result:** pass | partial | fail | blocked | n/a
   - **Retries:** how many attempts before you succeeded (0 = first try)
   - **Score:** 1-5 (see scale below)
   - **Notes:** what you observed, any gotchas, selectors or URLs you used
   - **Screenshot:** capture at key moments (before action, after action, on error)
4. If you are **blocked** at any checkpoint and cannot proceed after 3 retries, record the blocker, score it 1, and move to the next checkpoint. If an entire step is blocked, still attempt the next step where possible.
5. Use the baseline evidence to orient yourself — don't re-discover what the free scan already knows (search URL patterns, sitemap URLs, checkout type, etc.).

### Score Scale

| Score | Label | Meaning |
|-------|-------|---------|
| 5 | Effortless | Completed on first try. Everything clearly labeled, standard elements, logical flow. |
| 4 | Minor friction | Completed but needed a small adjustment — an extra click, a slightly unclear label, a brief pause to orient. |
| 3 | Moderate effort | Completed but required workarounds, guessing, or 2-3 attempts. An average user/agent would struggle slightly. |
| 2 | Significant difficulty | Partially completed. Major confusion, non-standard UI, unclear paths. Required substantial effort. |
| 1 | Blocked | Could not complete. Element not found, flow broken, hard wall encountered. |

---

## PHASE 1: DISCOVERY (Steps A–B)

*Goal: Find the site's search, run a product search, evaluate 2-3 results.*
*Submit Phase 1 findings before moving to Phase 2.*

---

### Step A: Product Search

**Objective:** Locate the site's search functionality and search for a product type.

#### A1. Search Discovery
- [ ] **A1.1** — Can you find the search input? Where is it located (header, sidebar, modal, icon that opens)?
- [ ] **A1.2** — Is the search input visible by default, or does it require clicking an icon/button to reveal?
- [ ] **A1.3** — Does the search input have a clear placeholder or label indicating its purpose?
- [ ] **A1.4** — Record the search URL pattern (e.g., `/search?q={query}`, `/pages/search-results?q={query}`).

#### A2. Search Execution
- [ ] **A2.1** — Enter a general product-type search term (e.g., "shoes", "laptop", "moisturizer" — appropriate to the store's category). Record the term used.
- [ ] **A2.2** — Did the search return results? How many?
- [ ] **A2.3** — Are results displayed as a grid/list with clear product cards?
- [ ] **A2.4** — Does each result show: product name, price, image? Note any missing elements.

#### A3. Search Quality
- [ ] **A3.1** — Are the results relevant to the search term?
- [ ] **A3.2** — Are filters available (price range, category, size, color, etc.)? List what's available.
- [ ] **A3.3** — Are sort options available (price, relevance, newest, etc.)? List what's available.
- [ ] **A3.4** — If filters exist, apply one filter. Does it work? Do results update correctly?
- [ ] **A3.5** — Is there pagination or infinite scroll? Can the agent access page 2 of results?

#### A4. Search Edge Cases
- [ ] **A4.1** — Search for a misspelled term. Does the site offer "Did you mean…?" or fuzzy matching?
- [ ] **A4.2** — Search for something the store clearly doesn't sell. Is the "no results" message clear and helpful (suggestions, popular products, etc.)?

**Step A Summary:**
```
Status: completed | partial | blocked
Score: _/5
Retries: _
Search URL pattern: ___
Notes: ___
```

---

### Step B: Product Comparison

**Objective:** Open 2-3 product pages from search results and evaluate how easily an agent can compare them.

#### B1. Product Page Access
- [ ] **B1.1** — Click on the first search result. Does it open a product page? Record the URL pattern.
- [ ] **B1.2** — Is the product page URL clean and human/agent-readable (e.g., `/products/blue-running-shoe` vs `/p?id=938271`)?
- [ ] **B1.3** — Can you navigate back to search results without losing your place?
- [ ] **B1.4** — Open a second and third product from the results. Record URLs.

#### B2. Product Information Clarity
*Evaluate on the first product page, then note if the other 2 differ significantly.*

- [ ] **B2.1** — Is the product name clearly displayed and unambiguous?
- [ ] **B2.2** — Is the price clearly visible? Record the price and where it appears.
- [ ] **B2.3** — If there's a sale/discount, is the original price shown alongside the sale price?
- [ ] **B2.4** — Is there a product description? Is it structured (bullet points, specs table) or a wall of text?
- [ ] **B2.5** — Are product images present? How many? Can you determine what the product looks like?
- [ ] **B2.6** — Is there availability/stock information ("In Stock", "Only 3 left", etc.)?
- [ ] **B2.7** — Are there customer reviews/ratings visible on the page?

#### B3. Comparison Feasibility
- [ ] **B3.1** — Can you extract the key comparison data points from all 3 products (name, price, key specs)?
- [ ] **B3.2** — Is the information structured consistently across the 3 products (same fields in same locations)?
- [ ] **B3.3** — Does the site offer a built-in comparison feature? If yes, is it usable?
- [ ] **B3.4** — Are product specs or features presented in a way that allows side-by-side comparison (table, structured data vs. free-text)?

**Step B Summary:**
```
Status: completed | partial | blocked
Score: _/5
Retries: _
Product URL pattern: ___
Notes: ___
```

**>>> SUBMIT PHASE 1 FINDINGS NOW <<<**

---

## PHASE 2: PRODUCT INTERACTION (Steps C–D)

*Goal: Select product variants, then change them. Evaluate clarity and responsiveness.*
*Use one of the products from Phase 1. Submit Phase 2 findings before moving to Phase 3.*

---

### Step C: Variant Selection

**Objective:** Select product options (color, size, material, quantity, etc.).

#### C1. Variant Discovery
- [ ] **C1.1** — Does the product have selectable variants (size, color, material, style, etc.)? List all variant types available.
- [ ] **C1.2** — If no variants exist, note this and score based on whether the absence is clearly communicated (i.e., "One size" or just nothing). Skip to Step D summary.
- [ ] **C1.3** — Are variants displayed as dropdowns, buttons, swatches, radio buttons, or something else? Note the UI element type for each variant.
- [ ] **C1.4** — Are variant labels clear? (e.g., "Size: Large" vs an unlabeled dropdown)
- [ ] **C1.5** — Is there a default variant pre-selected, or must the user choose before proceeding?

#### C2. Variant Selection Execution
- [ ] **C2.1** — Select a variant (e.g., pick a size). Did the selection register? Is there visual feedback (highlight, checkmark, border change)?
- [ ] **C2.2** — If there are multiple variant types (e.g., size AND color), select one of each. Does each selection register independently?
- [ ] **C2.3** — Does the price update when a variant is selected (if variants have different prices)?
- [ ] **C2.4** — Does the product image update to reflect the selected variant (e.g., showing the selected color)?
- [ ] **C2.5** — Does the availability/stock status update per variant (e.g., "Size L — Out of stock")?

#### C3. Variant Clarity
- [ ] **C3.1** — Are unavailable variants clearly marked (greyed out, struck through, "Sold Out" label)?
- [ ] **C3.2** — If you try to select an unavailable variant, what happens? Is the feedback clear?
- [ ] **C3.3** — Is it clear which combination of variants is currently selected at all times?

**Step C Summary:**
```
Status: completed | partial | blocked
Score: _/5
Retries: _
Variant types found: ___
UI element types: ___
Notes: ___
```

---

### Step D: Variant Change

**Objective:** Change a previously selected variant. Evaluate whether the page updates correctly.

#### D1. Change Execution
- [ ] **D1.1** — Change the selected size (or primary variant) to a different option. Did it work on the first try?
- [ ] **D1.2** — Change the selected color (or secondary variant) to a different option. Did it work?
- [ ] **D1.3** — After changing, are all other selections preserved? (e.g., changing color doesn't reset size)

#### D2. Page Response to Change
- [ ] **D2.1** — Did the price update correctly after the variant change?
- [ ] **D2.2** — Did the product image update to reflect the new selection?
- [ ] **D2.3** — Did availability/stock status update for the new variant?
- [ ] **D2.4** — Was there a page reload, or did the page update dynamically (AJAX/JS)?
- [ ] **D2.5** — Was there any lag, flicker, or visual glitch during the update?

#### D3. State Integrity
- [ ] **D3.1** — Is the URL updated to reflect the new variant (e.g., query params or hash)?
- [ ] **D3.2** — If you reload the page with the current URL, does it restore the selected variants?
- [ ] **D3.3** — Is the "Add to Cart" button still accessible and clearly functional after the change?

**Step D Summary:**
```
Status: completed | partial | blocked
Score: _/5
Retries: _
Notes: ___
```

**>>> SUBMIT PHASE 2 FINDINGS NOW <<<**

---

## PHASE 3: CART (Step E)

*Goal: Full cart management cycle — add, modify quantity, remove, re-add.*
*Submit Phase 3 findings before moving to Phase 4.*

---

### Step E: Cart Management

**Objective:** Add a product to cart, change quantity, remove it, and re-add. Test the full cart lifecycle.

#### E1. Add to Cart
- [ ] **E1.1** — Is there a clear "Add to Cart" button? What does it say and where is it positioned?
- [ ] **E1.2** — Click "Add to Cart." What feedback do you get? (popup, slide-out cart, redirect to cart page, subtle notification)
- [ ] **E1.3** — Is it clear that the item was actually added? (cart icon count update, confirmation message)
- [ ] **E1.4** — If variants were required but not selected, does the site prevent adding and show a clear error?

#### E2. View Cart
- [ ] **E2.1** — Navigate to the cart page or open the cart drawer. How? (link in header, cart icon, redirect)
- [ ] **E2.2** — Record the cart URL (e.g., `/cart`, `/bag`, `/basket`).
- [ ] **E2.3** — Is the cart item displayed with: product name, selected variants, price, quantity, image? Note any missing elements.
- [ ] **E2.4** — Is there a cart subtotal clearly shown?
- [ ] **E2.5** — Is there an estimated total (with tax/shipping estimates if applicable)?

#### E3. Quantity Change
- [ ] **E3.1** — Can you change the quantity? What UI element is used (number input, +/- buttons, dropdown)?
- [ ] **E3.2** — Change quantity from 1 to 2. Does the line item total update?
- [ ] **E3.3** — Does the cart subtotal update correctly?
- [ ] **E3.4** — Is there a maximum quantity limit? Is it communicated if you hit it?

#### E4. Remove Item
- [ ] **E4.1** — Is there a clear "Remove" or delete button/link for the cart item?
- [ ] **E4.2** — Remove the item. What happens? (item disappears, empty cart message, confirmation prompt)
- [ ] **E4.3** — Is the empty cart state clear? Does it suggest continuing shopping?

#### E5. Re-Add
- [ ] **E5.1** — Navigate back to a product page and add a product to cart again. Does the full flow work a second time?
- [ ] **E5.2** — Is the cart in a correct state with 1 item, correct variant, quantity 1?

#### E6. Cart Persistence
- [ ] **E6.1** — Reload the page. Is the cart preserved?
- [ ] **E6.2** — Navigate away from the cart and come back. Is the cart preserved?

**Step E Summary:**
```
Status: completed | partial | blocked
Score: _/5
Retries: _
Cart URL: ___
Add-to-cart button text: ___
Cart feedback type: ___
Notes: ___
```

**>>> SUBMIT PHASE 3 FINDINGS NOW <<<**

---

## PHASE 4: CHECKOUT SETUP (Steps F–G)

*Goal: Enter shipping info, review shipping options, find return policy, and check price consistency.*
*Submit Phase 4 findings before moving to Phase 5.*

---

### Step F: Shipping Details

**Objective:** Initiate checkout, enter a shipping address, view and select shipping options, and find the return/refund policy.

#### F1. Checkout Initiation
- [ ] **F1.1** — From the cart, find and click the checkout button. What does it say? ("Checkout", "Proceed to Checkout", "Buy Now", etc.)
- [ ] **F1.2** — Does checkout require an account, or is guest checkout available?
- [ ] **F1.3** — If account required: is the sign-up form simple (email + password) or complex (many required fields)?
- [ ] **F1.4** — If guest checkout available: how do you access it? Is it the default, or do you need to find a "Continue as Guest" link?
- [ ] **F1.5** — Record the checkout URL pattern.

#### F2. Address Entry
- [ ] **F2.1** — Is there a clear shipping address form? List all required fields.
- [ ] **F2.2** — Are field labels clear and standard (First Name, Last Name, Address Line 1, City, State/Province, ZIP/Postal, Country)?
- [ ] **F2.3** — Are required fields marked (asterisk, "required" label, etc.)?
- [ ] **F2.4** — Enter a test address. Use: 123 Test Street, Apt 4B, New York, NY, 10001, United States.
- [ ] **F2.5** — Does the form accept the address without errors?
- [ ] **F2.6** — Is there address autocomplete (Google Places, etc.)? Does it work or interfere?
- [ ] **F2.7** — Are there inline validation errors if you leave a required field blank? Are the error messages clear?
- [ ] **F2.8** — Is there a phone number field? Is it required? Does it accept standard formats?

#### F3. Shipping Options
- [ ] **F3.1** — After entering the address, are shipping options displayed?
- [ ] **F3.2** — List all available shipping options with: name, price, estimated delivery time.
- [ ] **F3.3** — Is a default shipping option pre-selected?
- [ ] **F3.4** — Can you change the shipping option? Does the total update when you do?
- [ ] **F3.5** — Are delivery timeframes clear (specific dates vs. "5-7 business days" vs. vague)?
- [ ] **F3.6** — Is there a free shipping option or free shipping threshold mentioned?

#### F4. Return & Refund Policy
- [ ] **F4.1** — Without leaving the checkout flow, can you find a link to the return/refund policy?
- [ ] **F4.2** — If not in checkout, navigate to it from the footer or a product page. Record the URL.
- [ ] **F4.3** — Is the policy page clearly written and structured (headings, bullet points) or a dense legal block?
- [ ] **F4.4** — Can you determine the return window (e.g., 30 days, 90 days)?
- [ ] **F4.5** — Can you determine who pays for return shipping?
- [ ] **F4.6** — Can you determine refund method (original payment, store credit, exchange only)?
- [ ] **F4.7** — Is the policy in plain HTML that an agent can parse, or in a PDF / behind a login / in an accordion that's collapsed?

**Step F Summary:**
```
Status: completed | partial | blocked
Score: _/5
Retries: _
Checkout URL: ___
Guest checkout: yes | no | unclear
Shipping options found: ___
Return policy URL: ___
Return window: ___
Notes: ___
```

---

### Step G: Pricing Clarity

**Objective:** Compare the price shown at different stages and check for hidden fees or surprise additions.

#### G1. Price Tracking
- [ ] **G1.1** — Record the product price as shown on the product page.
- [ ] **G1.2** — Record the product price as shown in the cart.
- [ ] **G1.3** — Record the product price as shown at checkout.
- [ ] **G1.4** — Are all three prices consistent? If not, note the discrepancy.

#### G2. Fee Transparency
- [ ] **G2.1** — Is tax shown or estimated at checkout? Is it a separate line item?
- [ ] **G2.2** — Are there any additional fees (handling, processing, service fee, surcharge)? List them.
- [ ] **G2.3** — Were any of these fees visible before reaching checkout?
- [ ] **G2.4** — Is the shipping cost shown as a separate line item?

#### G3. Total Breakdown
- [ ] **G3.1** — Is there a clear order summary with itemized breakdown (subtotal, shipping, tax, fees, total)?
- [ ] **G3.2** — Is the final total prominently displayed?
- [ ] **G3.3** — If there's a discount/promo code field, is it clearly accessible (not hidden)?
- [ ] **G3.4** — Enter a fake promo code (e.g., "TESTCODE"). Is the error message clear ("Invalid code" vs. nothing happens)?

#### G4. Surprise Additions
- [ ] **G4.1** — Are there any pre-checked add-ons (warranty, insurance, gift wrapping) that add to the total?
- [ ] **G4.2** — Are there upsells or cross-sells injected into the checkout flow? Do they add items automatically?
- [ ] **G4.3** — Has the total changed from what you expected based on product page + shipping? If yes, by how much and why?

**Step G Summary:**
```
Status: completed | partial | blocked
Score: _/5
Retries: _
Price on product page: ___
Price in cart: ___
Price at checkout: ___
Additional fees found: ___
Pre-checked add-ons: yes | no
Notes: ___
```

**>>> SUBMIT PHASE 4 FINDINGS NOW <<<**

---

## PHASE 5: PAYMENT & COMPLETION (Steps H–I–J)

*Goal: Enter payment details (test card), attempt checkout, evaluate the result.*
*This is the final phase. Submit Phase 5 findings to complete the inspection.*

---

### Step H: Payment Entry

**Objective:** View payment options and enter test card details.

#### H1. Payment Methods
- [ ] **H1.1** — What payment methods are available? List all visible options (credit card, PayPal, Apple Pay, Google Pay, Afterpay, Klarna, etc.).
- [ ] **H1.2** — Are payment methods clearly labeled with icons/logos?
- [ ] **H1.3** — Is there a default payment method pre-selected?
- [ ] **H1.4** — Is it clear how to switch between payment methods?

#### H2. Card Entry Form
- [ ] **H2.1** — Select credit/debit card payment. Is there a clear card entry form?
- [ ] **H2.2** — Is the card form native HTML inputs or an iframe (e.g., Stripe Elements, Braintree)? Note which payment processor if identifiable.
- [ ] **H2.3** — Are field labels clear (Card Number, Expiration, CVC/CVV, Name on Card)?
- [ ] **H2.4** — Enter test card: Number `4111 1111 1111 1111`, Exp `12/29`, CVC `123`, Name `Test Agent`.
- [ ] **H2.5** — Does the form accept the input without immediate validation errors?
- [ ] **H2.6** — If there's a billing address section, is it pre-filled from shipping or separate?
- [ ] **H2.7** — Are there inline validation messages as you type (card number format, expiry in past, etc.)?

#### H3. Payment Form Usability
- [ ] **H3.1** — Is the card entry form accessible without scrolling or navigating away from the checkout summary?
- [ ] **H3.2** — Are card type icons shown (Visa, MC, Amex) to indicate accepted cards?
- [ ] **H3.3** — Is there a security indicator (lock icon, "Secure checkout" text, SSL badge)?

**Step H Summary:**
```
Status: completed | partial | blocked
Score: _/5
Retries: _
Payment methods available: ___
Payment processor: ___
Card form type: native | iframe
Notes: ___
```

---

### Step I: Checkout Finalization

**Objective:** Review the final checkout state before submitting.

#### I1. Order Review
- [ ] **I1.1** — Before clicking the final submit button, is there a complete order summary visible?
- [ ] **I1.2** — Does the summary show: product name, variant, quantity, price, shipping method, shipping cost, tax, total?
- [ ] **I1.3** — Does the summary show the shipping address you entered?
- [ ] **I1.4** — Does the summary show the payment method (e.g., "Visa ending in 1111")?
- [ ] **I1.5** — Is there an option to edit/change items, address, or payment from the review screen?

#### I2. Submit Button
- [ ] **I2.1** — Is the "Place Order" / "Complete Purchase" / "Pay Now" button clearly visible?
- [ ] **I2.2** — What does the button say exactly? Record the text.
- [ ] **I2.3** — Does the button show the total amount (e.g., "Pay $42.99")?
- [ ] **I2.4** — Is the button positioned where you'd expect it (bottom of form, prominent color)?

#### I3. Last-Minute Additions
- [ ] **I3.1** — Are there any final upsells, cross-sells, or "Add gift message" prompts on the review screen?
- [ ] **I3.2** — Are any new pre-checked options that weren't visible before (newsletter signup, SMS alerts, etc.)?
- [ ] **I3.3** — Are there terms & conditions that must be accepted? Is the checkbox required?
- [ ] **I3.4** — Is the final total EXACTLY what you expected, or has anything changed since the pricing review (Step G)?

#### I4. Submit
- [ ] **I4.1** — Click the final purchase/submit button.
- [ ] **I4.2** — Record what happens: loading spinner, redirect, error message, success page, etc.
- [ ] **I4.3** — How long did the submission take (seconds)?

**Step I Summary:**
```
Status: completed | partial | blocked
Score: _/5
Retries: _
Submit button text: ___
Final total: ___
Matches expected total: yes | no
Notes: ___
```

---

### Step J: Post-Purchase

**Objective:** Evaluate the response after checkout submission. With a test card, we expect a payment decline — the clarity of that response is what we're scoring.

#### J1. Response Page
- [ ] **J1.1** — What page are you on after submission? Record the URL.
- [ ] **J1.2** — Is it a success page, error page, or did you stay on the checkout page with an inline error?
- [ ] **J1.3** — If payment was declined (expected with test card): Is the decline message clear? Does it say why? Does it suggest what to do?
- [ ] **J1.4** — If somehow payment succeeded: Is there an order confirmation number? Is the success message clear?

#### J2. Error Handling Quality
- [ ] **J2.1** — Is the error message specific ("Card declined") or generic ("An error occurred")?
- [ ] **J2.2** — Does the error message guide the user on next steps ("Try a different card", "Check your card details")?
- [ ] **J2.3** — After the error, is the form still populated with your entries (address, items) or has it been wiped?
- [ ] **J2.4** — Can you try again without re-entering all information?
- [ ] **J2.5** — Is the cart still intact after a failed checkout attempt?

#### J3. Confirmation Communication (if payment succeeded)
- [ ] **J3.1** — Is there a confirmation email address shown ("Confirmation sent to test@test.com")?
- [ ] **J3.2** — Does the confirmation page show order details (items, total, shipping address, estimated delivery)?
- [ ] **J3.3** — Is there a clear "Continue Shopping" or "Track Order" call to action?
- [ ] **J3.4** — Is there an order status page or tracking link provided?

#### J4. Overall Flow Reflection
- [ ] **J4.1** — Looking back at the entire journey (A through J): what was the single biggest point of friction?
- [ ] **J4.2** — What was the easiest/most well-implemented part of the flow?
- [ ] **J4.3** — Were there any moments where you were completely lost or unsure how to proceed?
- [ ] **J4.4** — If another AI agent were to shop on this site, what's the one thing they must know to succeed?

**Step J Summary:**
```
Status: completed | partial | blocked
Score: _/5
Retries: _
Response type: success_page | error_page | inline_error | redirect | other
Error clarity: specific | generic | none
Cart preserved after error: yes | no
Notes: ___
```

**>>> SUBMIT PHASE 5 FINDINGS — INSPECTION COMPLETE <<<**

---

## Final Report Template

After all 5 phases are submitted, the agent compiles the final report:

```
=== PREMIUM SCAN REPORT ===
Domain: ___
Agent: [Agent 1 Local | Agent 2 VPS]
Scan Date: ___
Total Time: ___

PHASE SCORES:
  Phase 1 — Discovery (A+B):     _/10
  Phase 2 — Product (C+D):       _/10
  Phase 3 — Cart (E):            _/5
  Phase 4 — Checkout Setup (F+G): _/10
  Phase 5 — Payment (H+I+J):     _/15

JOURNEY SCORE: _/50

STEP BREAKDOWN:
  A. Product Search:        _/5  (retries: _)
  B. Product Comparison:    _/5  (retries: _)
  C. Variant Selection:     _/5  (retries: _)
  D. Variant Change:        _/5  (retries: _)
  E. Cart Management:       _/5  (retries: _)
  F. Shipping Details:      _/5  (retries: _)
  G. Pricing Clarity:       _/5  (retries: _)
  H. Payment Entry:         _/5  (retries: _)
  I. Checkout Finalization:  _/5  (retries: _)
  J. Post-Purchase:         _/5  (retries: _)

TOP BLOCKERS:
  1. ___
  2. ___
  3. ___

TOP STRENGTHS:
  1. ___
  2. ___
  3. ___

CRITICAL GOTCHAS FOR AI AGENTS:
  1. ___
  2. ___

KEY URLS:
  Search: ___
  Cart: ___
  Checkout: ___
  Return Policy: ___

KEY SELECTORS / PATTERNS:
  Add to Cart: ___
  Quantity Input: ___
  Checkout Button: ___
  Submit Order: ___
```

---

## Checkpoint Count Summary

| Phase | Step | Checkpoints |
|-------|------|-------------|
| 1 | A. Product Search | 13 |
| 1 | B. Product Comparison | 11 |
| 2 | C. Variant Selection | 10 |
| 2 | D. Variant Change | 8 |
| 3 | E. Cart Management | 13 |
| 4 | F. Shipping Details | 19 |
| 4 | G. Pricing Clarity | 12 |
| 5 | H. Payment Entry | 10 |
| 5 | I. Checkout Finalization | 12 |
| 5 | J. Post-Purchase | 13 |
| **Total** | | **121 checkpoints** |
