# Freezing & Controls

CreditClaw gives you multiple ways to control and restrict how your wallets and cards are used. You can freeze wallets instantly, set spending limits, and manage bot access — all from your <a href="/app" target="_blank">dashboard</a>.

## Freezing a Wallet or Card

Freezing immediately blocks all transactions on a wallet or card. Your bot will be unable to make any purchases until you unfreeze it.

### How to Freeze

1. Navigate to the wallet or card you want to freeze
2. Click the **Freeze** button in the action bar
3. Confirm the freeze in the dialog

A frozen wallet shows a visual indicator (snowflake icon) and its status changes to "frozen" in the dashboard.

### How to Unfreeze

1. Navigate to the frozen wallet or card
2. Click **Unfreeze**
3. Confirm — transactions are immediately re-enabled

### When to Freeze

- **Suspicious activity**: If you see unexpected transactions, freeze first and investigate
- **Bot maintenance**: Freeze while updating or reconfiguring your bot
- **Temporary pause**: If you don't want your bot spending for a period
- **Lost bot access**: If you lose control of a bot, freeze all linked wallets immediately

## Spending Limits

Spending limits prevent your bot from spending more than you're comfortable with. Different wallet types support different limit structures.

### Stripe & Card Wallets (Rail 1 & Rail 2)

These wallets support guardrail-based limits:

- **Per-transaction limit**: Maximum USDC for a single purchase
- **Daily budget**: Total USDC your bot can spend per day
- **Monthly budget**: Total USDC your bot can spend per month
- **Approval threshold**: Purchases above this amount require your manual approval

To configure these limits:

1. Open the wallet detail page
2. Click **Guardrails** in the action bar
3. Adjust the limits
4. Save your changes

### Sub-Agent Cards (Rail 4)

Sub-Agent Cards use an **allowance** model:

- Set a dollar amount and duration (daily, weekly, or monthly)
- The allowance automatically resets at the end of each period
- Remaining allowance is visible on the dashboard
- When the allowance is exhausted, the bot cannot spend until the next reset

### Self-Hosted Cards (Rail 5)

Self-Hosted Cards have the most granular controls:

- Per-transaction spending limit
- Daily spending limit
- Monthly spending limit
- Human approval threshold — any purchase above this amount requires your sign-off before the bot can proceed

## Category Controls (Card Wallets)

Card Wallets (Rail 2) support merchant category controls:

### Allowlisted Merchants

Restrict your bot to only purchase from specific merchants or categories. When an allowlist is set, the bot can **only** buy from merchants on the list.

### Blocklisted Merchants

Block specific merchants or categories. The bot can purchase from anyone **except** merchants on the blocklist.

> You can use either an allowlist or a blocklist, but not both at the same time. An allowlist is more restrictive (deny by default), while a blocklist is more permissive (allow by default).

## Auto-Pause on Zero Balance

Card Wallets support **auto-pause when balance reaches zero**. When enabled:

- The wallet automatically pauses when the USDC balance drops to $0
- The bot receives a clear error that the wallet is paused
- You need to fund the wallet and manually unpause to resume

This prevents failed transaction attempts and helps you stay aware of when a wallet needs topping up.

## Linking and Unlinking Bots

You control which bot has access to each wallet:

### Linking a Bot

1. Open the wallet or card
2. Click **Link Bot**
3. Select the bot from your registered bots
4. Confirm — the bot now has access to this wallet

### Unlinking a Bot

1. Open the wallet or card
2. Click **Unlink Bot**
3. Confirm — the bot immediately loses access

Unlinking a bot is the safest way to revoke access without deleting the wallet. The wallet retains its balance and settings, ready to be linked to a different bot if needed.

## Best Practices

- **Start with conservative limits**: Set low spending limits initially and increase them as you gain confidence in your bot's behavior
- **Use approval thresholds**: Require manual approval for large purchases so you stay in the loop
- **Review transactions regularly**: Check the transaction history for each wallet to spot unexpected patterns
- **Freeze first, ask questions later**: If something looks wrong, freeze the wallet immediately — you can always unfreeze it
- **One bot per wallet**: While you can relink wallets, it's cleaner to have dedicated wallets per bot for easier tracking


## Next Steps

- [Spending Limits](/docs/guardrails/spending-limits) — Detailed guide to spending caps
- [Approval Modes](/docs/guardrails/approval-modes) — Configure how purchases are approved
- [Category Controls](/docs/guardrails/category-controls) — Block or allow specific merchant categories
