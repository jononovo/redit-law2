# Spending Limits

Spending limits are your first line of defense against unexpected charges. They define hard caps on how much your bot can spend in a single transaction, per day, and per month. If a transaction would exceed any limit, it is automatically blocked.

## How Spending Limits Work

Every wallet in CreditClaw has three configurable spending limits:

| Limit | What it controls |
|-------|-----------------|
| **Per-transaction** | The maximum amount allowed in a single purchase |
| **Daily budget** | The total amount the bot can spend in a rolling 24-hour window |
| **Monthly budget** | The total amount the bot can spend in a calendar month |

When your bot attempts a purchase, CreditClaw checks the transaction amount against all three limits. If the amount exceeds the per-transaction cap, it is blocked immediately. If the cumulative spending for the day or month would be exceeded, the transaction is also blocked.

## Default Limits

CreditClaw ships with conservative defaults so your bot is protected from the moment you create a wallet:

| Wallet Type | Per-Transaction | Daily Budget | Monthly Budget |
|-------------|----------------|--------------|----------------|
| Stripe/USDC Wallet | $5.00 | $10.00 | $50.00 |
| Card Wallet | $5.00 | $10.00 | $50.00 |
| Sub-Agent Card | $50.00 | $100.00 | $500.00 |
| Self-Hosted Card | $5.00 | $10.00 | $50.00 |

These defaults are intentionally low. You can raise them at any time once you are comfortable with your bot's behavior.

## Master Budget

In addition to per-wallet limits, CreditClaw enforces a **master budget** that applies across all wallets. The master budget acts as an overall safety net — even if individual wallets have high limits, the master budget caps total platform-wide spending.

The default master budget is:

- **Per-transaction**: $5.00
- **Daily**: $20.00
- **Monthly**: $100.00

You can adjust the master budget from **Settings** in the dashboard.

## Configuring Spending Limits

To change spending limits on a wallet:

1. Navigate to the wallet page for the wallet type you want to configure (e.g., **Stripe Wallet**, **Card Wallet**, or **Sub-Agent Cards**)
2. Select the wallet you want to edit
3. Click the **Guardrails** button in the action bar
4. Adjust the per-transaction, daily, and monthly limits
5. Save your changes

Changes take effect immediately. Any in-flight transactions that were already approved will still complete, but new transactions will be evaluated against the updated limits.

## Auto-Pause on Zero Balance

Each wallet has an **Auto-pause on zero balance** toggle. When enabled, the wallet automatically freezes if the balance drops to zero, preventing any further transaction attempts until you add funds. This is enabled by default on Stripe/USDC and Card wallets.

## Tips

- **Start low, raise gradually.** Begin with the defaults and increase limits as you gain confidence in your bot's purchasing patterns.
- **Use the master budget as a backstop.** Even if you set generous per-wallet limits, the master budget prevents runaway spending across your entire account.
- **Review spending regularly.** Check the Transactions page to see how your bot is spending relative to its limits and adjust accordingly.
