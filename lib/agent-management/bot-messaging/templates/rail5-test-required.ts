export function buildRail5TestInstructions(testCheckoutUrl: string): string {
  return `Complete a test purchase to verify your encrypted card file works correctly.

TEST CHECKOUT URL: ${testCheckoutUrl}

Steps:
1. Navigate to ${testCheckoutUrl}
2. Decrypt the encrypted card file you saved in .creditclaw/cards/
3. Fill in ALL fields on the checkout form:
   - Card number
   - Expiry (MM/YY)
   - CVV
   - Cardholder name
   - Billing address, city, state, ZIP
4. Submit the test payment

This is a sandbox checkout — no real payment will be processed.
The system will verify that your card details were decrypted correctly.
This proves your card file works end-to-end before any real purchase.

Once you complete this, your card status advances from "confirmed" to "active".`;
}
