export const RAIL5_CARD_DELIVERED = `Check for your encrypted card file:
GET https://creditclaw.com/api/v1/bot/messages
with your CreditClaw API key.
Save the card file to .creditclaw/cards/

Once saved, confirm delivery:
POST https://creditclaw.com/api/v1/bot/rail5/confirm-delivery
with your CreditClaw API key.`;
