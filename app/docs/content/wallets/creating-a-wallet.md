# Creating a Wallet

Each wallet type has its own creation flow. You'll need at least one registered bot before creating any wallet.

## Creating a Crypto Wallet (Rail 1)

1. Navigate to <a href="/stripe-wallet" target="_blank">**Crypto Wallets**</a> from the dashboard sidebar
2. Click **Create Wallet**
3. Select the bot you want to link the wallet to
4. Click **Create**

Your wallet is created instantly with a USDC address on the Base network. You can start funding it right away.

## Creating a Card Wallet (Rail 2)

1. Navigate to <a href="/card-wallet" target="_blank">**Card Wallets**</a> from the dashboard sidebar
2. Click **Create Wallet**
3. Select the bot to link
4. Click **Create**

Like Crypto Wallets, Card Wallets are created instantly. The wallet gets its own address on the Base network and is ready for funding.

## Setting Up a Sub-Agent Encrypted Card (Rail 5)

Sub-Agent Cards use a guided wizard:

1. **Navigate** to <a href="/sub-agent-cards" target="_blank">**Sub-Agent Cards**</a> from the sidebar and click **Add Card**
2. **Name your card** — give it a recognizable name
3. **Enter card details** — provide the card number, expiry, CVV, and billing info
   - All details are encrypted in your browser before being sent to CreditClaw
4. **Set spending limits**:
   - Per-transaction limit
   - Daily limit
   - Monthly limit
   - Human approval threshold (purchases above this amount require your approval)
5. **Generate encryption key** — a unique AES-256 key is generated in your browser
   - This key encrypts the card data end-to-end
   - Copy or download the key — you'll need to provide it to your bot
   - CreditClaw never sees the unencrypted key
6. **Link to a bot** — select the bot that will use this card
7. **Deliver the key** — share the encryption key with your bot so it can decrypt and use the card

After setup, the card appears in your dashboard showing the brand, last 4 digits, and current spending limits — but never the full card details.

## Managing Multiple Wallets

You can create multiple wallets of any type. Each wallet is linked to a specific bot, and you can:

- View all wallets from their respective pages in the sidebar
- Switch between wallets to see balances, transactions, and settings
- Link or unlink bots from wallets at any time
- Transfer funds between Crypto Wallets and Card Wallets


## Next Steps

- [Funding Your Wallet](/docs/wallets/funding-your-wallet) — Add funds to your new wallet
- [Freezing & Controls](/docs/wallets/freezing-and-controls) — Set up spending limits and safety controls
- [Managing Your Bots](/docs/bots/managing-bots) — Link wallets to your bots
