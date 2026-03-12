# Account Settings

The **Account Settings** page is your central hub for managing your CreditClaw account preferences, payment methods, shipping addresses, notification preferences, and master budget controls.

## Accessing Account Settings

Navigate to <a href="/settings" target="_blank">**Settings**</a> from the dashboard sidebar. The settings page displays all configurable options in a single, scrollable view.

## Display Name & Email

At the top of the settings page, you'll find your basic account information:

- **Display Name** — The name shown throughout the dashboard. You can update this at any time.
- **Email** — Your account email address. This is set during signup and cannot be changed from the settings page.

## Master Budget

The **Master Budget** is a global spending cap that applies across all your payment rails combined. It acts as an overarching safety net on top of any per-wallet guardrails you've configured.

### Enabling the Master Budget

Toggle the Master Budget switch to enable it. When you first enable it, default limits are applied that you can customize.

### Configurable Limits

| Limit | Description |
|-------|-------------|
| **Max per transaction** | The maximum amount (in USDC) allowed for any single transaction |
| **Daily budget** | Total spending allowed across all rails in a single day |
| **Monthly budget** | Total spending allowed across all rails in a calendar month |

### Monitoring Spend

When enabled, the master budget section shows:

- **Progress bars** for daily and monthly spend against your limits
- **Per-rail breakdown** showing how much has been spent through each payment rail (Stripe Wallet, Card Wallet, Self-Hosted)

Click **Edit** to adjust your limits at any time.

## Bot Payment Rails

If you have bots connected to your account, this section shows:

- Which payment rails each bot has access to (Stripe Wallet, Card Wallet, Self-Hosted Cards, etc.)
- The current balance or card count for each rail
- The bot's overall status (active, frozen, etc.)

### Setting a Default Rail

Each bot can have a **default payment rail** — the preferred method it uses when making purchases. Use the dropdown next to each bot to set this:

- **Auto (no preference)** — The bot will use whichever rail is available and funded
- **Specific rail** — The bot will prefer this rail when possible

## Payment Method

This section lets you add or manage the card used to fund your bot's wallet. Click to add a new payment method or update an existing one. Your card details are securely handled through Stripe.

## Shipping Addresses

Manage the shipping addresses used for physical goods orders. You can:

- **Add** new shipping addresses
- **Edit** existing addresses
- **Set a default** address that's automatically used for new orders
- **Delete** addresses you no longer need

Each address includes fields for name, street address, city, state/province, postal code, and country.

## Notifications

CreditClaw supports both **in-app** and **email** notifications. You can independently control each channel and fine-tune which events trigger alerts.

### Notification Channels

| Channel | Description |
|---------|-------------|
| **In-App Notifications** | Alerts appear in the bell icon menu in the dashboard header |
| **Email Notifications** | Alerts are sent to your account email address |

### Event Types

| Event | Description |
|-------|-------------|
| **Transaction Alerts** | Notified for every transaction your bot makes |
| **Budget Warnings** | Alert when your balance drops below a threshold |
| **Weekly Summary** | A weekly email summarizing your spending activity |

### Thresholds

You can set two numeric thresholds:

- **Purchase alert threshold** — Receive an email alert for any single purchase over this dollar amount (default: $50)
- **Low balance warning** — Get notified when your wallet balance falls below this dollar amount (default: $5)

To change a threshold, enter the new value and click away from the field — it saves automatically.

## Tips

- **Enable the master budget** if you have multiple wallets or bots. It provides a single guardrail across all spending.
- **Set up notifications early** so you're always aware of your bot's activity, especially transaction alerts and budget warnings.
- **Keep a default shipping address** set if your bot frequently orders physical goods — it speeds up the checkout process.
- **Review your bot's default rail** periodically to ensure it's using the most cost-effective or preferred payment method.


## Next Steps

- [Wallet Types](/docs/wallets/wallet-types) — Learn about the different wallet types
- [Spending Limits](/docs/guardrails/spending-limits) — Configure detailed spending controls
- [Shop](/docs/selling/shop) — Set up your business profile and storefront
