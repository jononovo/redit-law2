const CARD_NUMBER_LABELS = [
  "card number",
  "cardnumber",
  "card-number",
  "credit card number",
  "debit card number",
];

const CVV_LABELS = [
  "cvv",
  "cvc",
  "cvv2",
  "cvc2",
  "security code",
  "card verification",
];

interface FieldMatch {
  ref: string;
  label: string;
}

function findFieldRef(snapshot: string, labels: string[]): FieldMatch | null {
  const lines = snapshot.split("\n");
  for (const line of lines) {
    const lower = line.toLowerCase();
    const refMatch = line.match(/\[(?:ref=)?(e?\d+)\]/);
    if (!refMatch) continue;

    const hasInput =
      lower.includes("input") ||
      lower.includes("textbox") ||
      lower.includes("text field") ||
      lower.includes("<input");

    if (!hasInput) continue;

    for (const label of labels) {
      const idx = lower.indexOf(label);
      if (idx === -1) continue;
      const before = idx > 0 ? lower[idx - 1] : " ";
      const after = idx + label.length < lower.length ? lower[idx + label.length] : " ";
      const boundaryChars = " \t\"':;,.>]|/=-_#([{";
      if (boundaryChars.includes(before) && boundaryChars.includes(after)) {
        return { ref: refMatch[1], label };
      }
    }
  }
  return null;
}

const KNOWN_PAYMENT_IFRAME_PATTERNS = [
  "stripe.com",
  "js.stripe.com",
  "braintreegateway.com",
  "braintree-api.com",
  "adyen.com",
  "checkout.shopify.com",
  "squareup.com",
  "square.com",
];

function detectPaymentIframe(snapshot: string): string | null {
  const lower = snapshot.toLowerCase();
  for (const pattern of KNOWN_PAYMENT_IFRAME_PATTERNS) {
    if (lower.includes(pattern)) {
      return `iframe[src*='${pattern}']`;
    }
  }
  return null;
}

let passed = 0;
let failed = 0;

function assert(name: string, actual: unknown, expected: unknown) {
  const actualStr = JSON.stringify(actual);
  const expectedStr = JSON.stringify(expected);
  if (actualStr === expectedStr) {
    passed++;
    console.log(`  PASS  ${name}`);
  } else {
    failed++;
    console.log(`  FAIL  ${name}`);
    console.log(`        expected: ${expectedStr}`);
    console.log(`        actual:   ${actualStr}`);
  }
}

console.log("\n=== T4: True Positives ===\n");

assert(
  'input "Card Number" matches card_number',
  findFieldRef('[ref=e42] input "Card Number" placeholder="1234"', CARD_NUMBER_LABELS)?.ref,
  "e42"
);

assert(
  'input "CVV" matches cvv',
  findFieldRef('[ref=e58] input "CVV" placeholder="123"', CVV_LABELS)?.ref,
  "e58"
);

assert(
  'input aria-label="card number" matches',
  findFieldRef('[ref=e61] input type="text" aria-label="card number"', CARD_NUMBER_LABELS)?.ref,
  "e61"
);

assert(
  'textbox "Security Code" matches cvv',
  findFieldRef('[ref=e73] textbox "Security Code"', CVV_LABELS)?.ref,
  "e73"
);

assert(
  'input "CVC" matches cvv',
  findFieldRef('[ref=e80] input "CVC"', CVV_LABELS)?.ref,
  "e80"
);

assert(
  'text field "Credit Card Number" matches card_number',
  findFieldRef('[ref=e91] text field "Credit Card Number"', CARD_NUMBER_LABELS)?.ref,
  "e91"
);

assert(
  'input "card-number" matches via card-number label',
  findFieldRef('[ref=e95] input name="card-number"', CARD_NUMBER_LABELS)?.ref,
  "e95"
);

console.log("\n=== T5: False Positives (must NOT match) ===\n");

assert(
  'div with "card number" → no input semantics',
  findFieldRef('[ref=e10] div "Enter your card number below"', CARD_NUMBER_LABELS),
  null
);

assert(
  'span with cvv-help → no input semantics',
  findFieldRef('[ref=e20] span class="cvv-help" "The 3-digit security code"', CVV_LABELS),
  null
);

assert(
  'label "Card Number" → no input semantics',
  findFieldRef('[ref=e30] label "Card Number"', CARD_NUMBER_LABELS),
  null
);

assert(
  'button "Verify Card Number" → no input semantics',
  findFieldRef('[ref=e60] button "Verify Card Number"', CARD_NUMBER_LABELS),
  null
);

assert(
  'p tag with CVV text → no input semantics',
  findFieldRef('[ref=e70] p "Your CVV is the 3 digits on the back"', CVV_LABELS),
  null
);

console.log("\n=== T6: Boundary Matching ===\n");

assert(
  '"emailVerificationCode" → cvc is substring but no boundary',
  findFieldRef('[ref=e10] input "emailVerificationCode"', CVV_LABELS),
  null
);

assert(
  '"subcvvfield" → cvv is substring but no boundary',
  findFieldRef('[ref=e20] input "subcvvfield"', CVV_LABELS),
  null
);

assert(
  '"pre-card numberish" → card number has no right boundary',
  findFieldRef('[ref=e30] input "pre-card numberish"', CARD_NUMBER_LABELS),
  null
);

assert(
  'aria-label="cvv" → has boundaries (quotes)',
  findFieldRef('[ref=e40] input aria-label="cvv"', CVV_LABELS)?.ref,
  "e40"
);

assert(
  'name="card-number" → has boundaries (quotes)',
  findFieldRef('[ref=e50] input name="card-number"', CARD_NUMBER_LABELS)?.ref,
  "e50"
);

assert(
  '"cardnumber" with space before and quote after → matches',
  findFieldRef('[ref=e60] input name="cardnumber"', CARD_NUMBER_LABELS)?.ref,
  "e60"
);

console.log("\n=== T7: Iframe Auto-Detection ===\n");

assert(
  "stripe.com iframe detected (js.stripe.com matches stripe.com first)",
  detectPaymentIframe('iframe src="https://js.stripe.com/v3/elements"'),
  "iframe[src*='stripe.com']"
);

assert(
  "adyen.com iframe detected",
  detectPaymentIframe('iframe src="https://pay.adyen.com/checkout"'),
  "iframe[src*='adyen.com']"
);

assert(
  "unknown iframe returns null",
  detectPaymentIframe('iframe src="https://example.com/checkout"'),
  null
);

assert(
  "no iframe returns null",
  detectPaymentIframe("div class='payment-form'"),
  null
);

assert(
  "shopify checkout detected",
  detectPaymentIframe('iframe src="https://checkout.shopify.com/pay"'),
  "iframe[src*='checkout.shopify.com']"
);

assert(
  "squareup.com detected",
  detectPaymentIframe('iframe src="https://squareup.com/payments"'),
  "iframe[src*='squareup.com']"
);

console.log("\n=== T10: Error Sanitization (spot checks) ===\n");

const dangerousStrings = [
  "4111111111111111",
  "ENOENT: no such file",
  "decipher.final",
  "stack trace at Object",
  "key_hex=abc123",
];

const safeMessages = [
  "Could not read or parse the encrypted card file. Verify the file path and format.",
  "Checkout not approved or does not belong to this bot.",
  "Key retrieval failed with status 500. Check that the checkout_id is valid and approved.",
  "Card decryption failed. The key material may not match this card file.",
  "Browser automation encountered an unexpected error while filling card fields.",
  "Could not take browser snapshot. The page may not be ready or the frame selector may be wrong.",
  "Failed to type into the card number field. The element ref may be stale or the field may not accept input.",
  "Card number was filled but failed to type into the CVV field.",
  "Could not locate card number or CVV fields in the current page snapshot.",
  "Found CVV field but could not locate the card number input.",
  "Found card number field but could not locate the CVV input.",
  "CREDITCLAW_API_KEY environment variable is not set.",
];

let sanitizationPassed = true;
for (const msg of safeMessages) {
  for (const danger of dangerousStrings) {
    if (msg.toLowerCase().includes(danger.toLowerCase())) {
      console.log(`  FAIL  Message "${msg.slice(0, 50)}..." contains dangerous string "${danger}"`);
      sanitizationPassed = false;
      failed++;
    }
  }
}
if (sanitizationPassed) {
  passed++;
  console.log("  PASS  All error messages are free of dangerous strings");
}

console.log(`\n========================================`);
console.log(`  Results: ${passed} passed, ${failed} failed`);
console.log(`========================================\n`);

if (failed > 0) process.exit(1);
