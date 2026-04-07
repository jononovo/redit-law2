# Encrypted Cards

CreditClaw lets you use your own credit or debit cards with AI agents through **Sub-Agent Encrypted Cards** (Rail 5). End-to-end encryption ensures your card details are protected — CreditClaw never has access to the decrypted data.

## Why Encrypted Cards?

Giving an AI agent direct access to your full credit card number is risky. Encrypted cards solve this by ensuring:

- No single system (including CreditClaw) holds your complete card details in plaintext
- Your bot can make purchases without you manually entering card info each time
- Spending is bounded by limits you configure
- You can revoke access instantly by freezing the card

## How It Works

<a href="/sub-agent-cards" target="_blank">Sub-Agent Encrypted Cards</a> use **end-to-end encryption** with a key that only you and your bot share. CreditClaw acts as a secure intermediary but never has access to the decrypted card details.

### Encryption Flow

1. **Key generation**: During setup, an AES-256 encryption key is generated in your browser
2. **Card encryption**: Your card details (number, expiry, CVV, billing info) are encrypted with this key before leaving your browser
3. **Encrypted storage**: CreditClaw stores only the encrypted blob — it cannot decrypt it
4. **Key delivery**: You share the encryption key with your bot through a secure channel
5. **Bot decryption**: Your bot uses the key to decrypt the card details when making a purchase

### What CreditClaw Can See

Even though CreditClaw can't decrypt the card, it still knows:

- Card brand (Visa, Mastercard, etc.) and last 4 digits — for identification
- Spending limits you configured
- Whether the card is active or frozen
- Transaction history reported by the bot

This gives you dashboard visibility without compromising card security.

### Spending Controls

Encrypted Cards have granular spending controls:

| Control | Description |
|---------|-------------|
| Per-transaction limit | Maximum amount for a single purchase |
| Daily limit | Total spend allowed per day |
| Monthly limit | Total spend allowed per month |
| Human approval threshold | Purchases above this amount require your explicit approval |

These limits are enforced by CreditClaw before the bot receives the decrypted card data, adding a layer of protection even if the bot is compromised.

## Delivering Cards to Your Bot

### Direct Delivery

CreditClaw sends the encryption key directly to your bot via its API endpoint or stages it as a pending message. This is the simplest option if your bot is already connected and online.

### Manual Download

You download the key and deliver it to your bot yourself. Use this if:

- Your bot isn't connected to CreditClaw yet
- You want to inspect the encrypted data before delivering it
- You prefer to use your own secure delivery channel

### Confirming Delivery

After your bot saves the encrypted card file, it should confirm delivery by calling `POST /api/v1/bot/rail5/confirm-delivery`. This advances the card status from `pending_delivery` to `confirmed` and returns a test checkout URL where the bot can verify the card works end-to-end. The bot receives these instructions automatically in the message payload's `instructions` field.

See the [Webhook Events](/docs/bots/webhook-events) page for the full `rail5.card.delivered` event payload and expected bot behavior.

### Test Verification

After confirming delivery, the setup wizard advances to a **test verification** step. Here's what happens:

1. Your bot receives a sandbox test checkout URL in the confirm-delivery response
2. The bot decrypts the card file and completes the test checkout (no real charge is processed)
3. While this is happening, the wizard automatically checks for the test result
4. Once the bot submits, the wizard compares what the bot entered against the original card details you typed in — field by field (card number, expiry, CVV, name, billing address)
5. You'll see green checkmarks for each field that matches, or a red indicator if something didn't decrypt correctly

This proves the entire encryption-to-decryption pipeline works before your bot makes any real purchases. If all fields match, your card is verified and ready for use.


## Next Steps

- [Creating a Wallet](/docs/wallets/creating-a-wallet) — Set up a new wallet
- [Freezing & Controls](/docs/wallets/freezing-and-controls) — Configure spending limits for your wallets
