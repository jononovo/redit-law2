export function buildRail5TestInstructions(testCheckoutUrl: string): string {
  return `Complete a test purchase to verify your card works end-to-end.

Follow the standard checkout process described in creditclaw/CHECKOUT-GUIDE.md.

Test merchant details for the /checkout call:
- merchant_name: "CreditClaw Test Checkout"
- merchant_url: "${testCheckoutUrl}"
- item_name: "Card Verification Test"
- amount_cents: 100
- category: "test"

The test checkout form is at: ${testCheckoutUrl}

Once complete, your card status advances from "confirmed" to "active".`;
}
