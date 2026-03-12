# Self-Hosted & Encrypted Cards

CreditClaw offers two ways to use your own credit or debit cards with AI agents: **Sub-Agent Cards** (Rail 4) and **Self-Hosted Encrypted Cards** (Rail 5). Both use encryption to protect your card details, but they differ in how the encryption works and who has access to what.

## Why Encrypted Cards?

Giving an AI agent direct access to your full credit card number is risky. Encrypted cards solve this by ensuring:

- No single system (including CreditClaw) holds your complete card details in plaintext
- Your bot can make purchases without you manually entering card info each time
- Spending is bounded by allowances and limits you configure
- You can revoke access instantly by freezing the card

## Sub-Agent Cards (Rail 4): Split-Knowledge Encryption

<a href="/sub-agent-cards" target="_blank">Sub-Agent Cards</a> use a **split-knowledge** approach. When you enter your card number during setup:

1. **Card splitting**: Your card number is divided across multiple encrypted "payment profiles"
2. **Decoy profiles**: Fake profiles are generated alongside the real one, so even if intercepted, an attacker can't tell which profile is real
3. **Hidden digits**: Certain digit positions are masked from the system — only the encrypted file contains them
4. **Obfuscation**: The card data can be periodically re-encrypted with new obfuscation parameters for additional protection

### How It Works in Practice

- You enter your card details into the setup wizard
- CreditClaw generates an encrypted file containing payment profiles
- You deliver this file to your bot (directly via API or manual download)
- Your bot uses the profiles to make purchases within the allowance you set
- CreditClaw sees the allowance and spend tracking, but not the full card number

### Setting Allowances

Each Sub-Agent Card has an allowance that controls how much your bot can spend:

- **Amount**: The maximum spend per period (e.g., $500)
- **Duration**: How often the allowance resets — daily, weekly, or monthly
- **Tracking**: The dashboard shows remaining allowance and when it resets

When the allowance is exhausted, the bot cannot make further purchases until the period resets.

### Obfuscation Engine

Sub-Agent Cards support an optional **obfuscation engine** that periodically re-encrypts card data:

- The engine runs on a schedule, generating new encrypted profiles
- Previous encrypted data becomes stale and unusable
- This adds a time-based security layer — even if old encrypted data is compromised, it's no longer valid

## Self-Hosted Encrypted Cards (Rail 5): End-to-End Encryption

<a href="/self-hosted" target="_blank">Self-Hosted Cards</a> use **end-to-end encryption** with a key that only you and your bot share. CreditClaw acts as a secure intermediary but never has access to the decrypted card details.

### How It Works

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

Self-Hosted Cards have granular spending controls:

| Control | Description |
|---------|-------------|
| Per-transaction limit | Maximum amount for a single purchase |
| Daily limit | Total spend allowed per day |
| Monthly limit | Total spend allowed per month |
| Human approval threshold | Purchases above this amount require your explicit approval |

These limits are enforced by CreditClaw before the bot receives the decrypted card data, adding a layer of protection even if the bot is compromised.

## Delivering Cards to Your Bot

Both card types support two delivery methods:

### Direct Delivery

CreditClaw sends the encrypted card data (Rail 4) or encryption key (Rail 5) directly to your bot via its API endpoint or stages it as a pending message. This is the simplest option if your bot is already connected and online.

### Manual Download

You download the encrypted file or key and deliver it to your bot yourself. Use this if:

- Your bot isn't connected to CreditClaw yet
- You want to inspect the encrypted data before delivering it
- You prefer to use your own secure delivery channel

### Confirming Delivery (Rail 5)

After your bot saves the encrypted card file, it should confirm delivery by calling `POST /api/v1/bot/rail5/confirm-delivery`. This advances the card status from `pending_delivery` to `confirmed` and returns a test checkout URL where the bot can verify the card works end-to-end. The bot receives these instructions automatically in the message payload's `instructions` field.

See the [Webhook Events](/docs/api/webhooks/events) page for the full `rail5.card.delivered` event payload and expected bot behavior.

### Test Verification (Rail 5)

After confirming delivery, the setup wizard advances to a **test verification** step. Here's what happens:

1. Your bot receives a sandbox test checkout URL in the confirm-delivery response
2. The bot decrypts the card file and completes the test checkout (no real charge is processed)
3. While this is happening, the wizard automatically checks for the test result
4. Once the bot submits, the wizard compares what the bot entered against the original card details you typed in — field by field (card number, expiry, CVV, name, billing address)
5. You'll see green checkmarks for each field that matches, or a red indicator if something didn't decrypt correctly

This proves the entire encryption-to-decryption pipeline works before your bot makes any real purchases. If all fields match, your card is verified and ready for use.

## Choosing Between Rail 4 and Rail 5

| Feature | Sub-Agent Card (Rail 4) | Self-Hosted Card (Rail 5) |
|---------|------------------------|--------------------------|
| Encryption model | Split-knowledge | End-to-end (AES-256) |
| CreditClaw access | Partial (split profiles) | None (encrypted blob) |
| Key management | Managed by CreditClaw | You manage the key |
| Obfuscation engine | Yes | No |
| Spending controls | Allowance-based | Per-tx / daily / monthly limits |
| Human approval | Via allowance limits | Configurable threshold |
| Best for | Convenience + security | Maximum security |

**Choose Rail 4** if you want a balance of security and convenience with automatic obfuscation.

**Choose Rail 5** if you need end-to-end encryption where CreditClaw has zero access to card details.


## Next Steps

- [Creating a Wallet](/docs/wallets/creating-a-wallet) — Set up a new wallet
- [Freezing & Controls](/docs/wallets/freezing-and-controls) — Configure spending limits for your wallets
