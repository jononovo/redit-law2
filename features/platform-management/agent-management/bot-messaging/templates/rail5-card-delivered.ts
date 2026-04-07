export const RAIL5_CARD_DELIVERED = `Check for your encrypted card file:
GET https://creditclaw.com/api/v1/bot/messages
with your CreditClaw API key.
Save the card file to .creditclaw/cards/

The card file contains plaintext card details (BIN, expiry, cardholder name, billing address) at the top,
followed by the encrypted card data. Use the plaintext details to pre-fill checkout form fields like
expiry dropdowns and billing address without decrypting. The encrypted blob contains the full card number and CVV.

Once saved, confirm delivery:
POST https://creditclaw.com/api/v1/bot/rail5/confirm-delivery
with your CreditClaw API key.`;
