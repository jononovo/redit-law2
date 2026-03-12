# Claiming a Bot

Claiming a bot links it to your CreditClaw account so you can manage its wallet, set spending rules, and approve purchases. There are two ways to claim a bot: using a **claim token** or a **pairing code**.

## What Is Claiming?

When a bot registers with the CreditClaw API, it exists in a **pending** state — it has an identity but no owner. Claiming is the process of associating that bot with your account. Once claimed, the bot's wallet becomes active and it can start making purchases (subject to your spending rules).

## Method 1: Claim Token

A claim token is a short code (e.g. `coral-X9K2`) generated when your bot registers via the API. The token is returned in the registration response and is typically sent to you via email or displayed in your bot's setup logs.

### Using the Claim Page

1. Go to the <a href="/claim" target="_blank">claim page</a> (or click the claim link in your registration email).
2. If you're not signed in, you'll be prompted to sign in first.
3. Enter the claim token in the input field.
4. Click **Claim This Bot**.
5. On success, you'll see a confirmation with the bot's name and a link to your dashboard.

You can also pass the token as a URL parameter: <a href="/claim?token=coral-X9K2" target="_blank">`/claim?token=coral-X9K2`</a> — the field will be pre-filled for you.

### Using the Onboarding Wizard

If this is your first bot, the [onboarding wizard](/docs/bots/onboarding-wizard) includes a claim step. Choose "My bot already registered" and enter the token when prompted.

### Common Issues

| Problem | Solution |
|---------|----------|
| "Invalid claim token" | Double-check the token for typos. Tokens are case-sensitive. |
| "Token already claimed" | This bot has already been claimed by an account. If that was you, check your dashboard. |
| "Network error" | Check your internet connection and try again. |

## Method 2: Pairing Code

Pairing codes work in the opposite direction — you generate a code from CreditClaw and give it to your bot. This is useful when you want to set up your account and spending rules before your bot connects.

### How It Works

1. During onboarding (or from the dashboard), CreditClaw generates a unique pairing code.
2. Copy the code and provide it to your bot (paste it into the bot's configuration or environment variables).
3. Your bot calls the CreditClaw API with the pairing code to register and link itself to your account.
4. CreditClaw detects the pairing automatically — the wizard advances and the bot appears on your dashboard.

### Polling and Auto-Detection

When you're on the pairing code screen, CreditClaw checks every few seconds whether your bot has used the code. You don't need to refresh the page — it updates automatically.

If your bot hasn't connected yet and you want to continue setup, click **Skip for now**. You can always connect the bot later.

## After Claiming

Once a bot is claimed:

- Its status changes from **Pending** to **Active** on your dashboard.
- Its wallet is activated and ready for funding.
- You can configure [spending limits](/docs/guardrails/spending-limits) and [approval modes](/docs/guardrails/approval-modes).
- The bot can begin making purchases as soon as the wallet has funds.

## Multiple Bots

You can claim as many bots as you need. Each bot gets its own:

- Spending rules (per-transaction, daily, and monthly limits)
- Approval mode (ask for everything, auto-approve under threshold, or auto-approve by category)
- Category controls (approved and blocked merchant categories)

To claim additional bots, visit the <a href="/claim" target="_blank">claim page</a> or use the API directly.
