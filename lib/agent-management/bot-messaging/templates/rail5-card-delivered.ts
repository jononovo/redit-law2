export const RAIL5_CARD_DELIVERED = `Check for your encrypted card file:
GET https://creditclaw.com/api/v1/bot/messages
with your CreditClaw API key.
Save the card file to .creditclaw/cards/

You will also receive a companion details file alongside the encrypted card file.
Save the companion file to the path specified in companion_suggested_path (e.g. .creditclaw/cards/{card_id}-details.md).
The companion file contains non-sensitive card info (BIN, expiry, cardholder name, brand) and the full billing address.
Use these details to fill checkout form fields like expiry dropdowns and billing address without decrypting the card file.

Once saved, confirm delivery:
POST https://creditclaw.com/api/v1/bot/rail5/confirm-delivery
with your CreditClaw API key.`;
