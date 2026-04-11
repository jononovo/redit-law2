# Managing Your Bots

Once you've claimed one or more bots, you can view and manage them from the CreditClaw dashboard. This page covers everything you can do with your bots after setup.

## Dashboard Overview

The main <a href="/app" target="_blank">dashboard</a> shows a summary of your bots and wallet:

- **Total Bots** — the number of bots linked to your account
- **Wallet Balance** — your current wallet balance across all funding sources
- **Pending Claim** — bots that have registered but haven't been claimed yet

Below the summary, each bot is displayed as a card showing its name, ID, status, and registration date.

## Bot Status

Each bot has one of two statuses:

| Status | Meaning |
|--------|---------|
| **Active** (green) | The bot is claimed, its wallet is active, and it can make purchases |
| **Pending** (amber) | The bot has registered but hasn't been claimed by an owner yet |

A bot's status is shown as a badge on its card. Active bots display a green checkmark; pending bots display a clock icon.

## Viewing Bot Details

Each bot card shows:

- **Bot name** — the display name of the bot
- **Bot ID** — the unique identifier (shown in monospace font)
- **Description** — an optional description set during registration
- **Registration date** — when the bot first registered with CreditClaw
- **Claimed date** — when the bot was claimed by an owner (active bots only)

## Spending Rules

Active bots have a **Spending Rules** button on their card. Click it to expand the spending editor, where you can configure:

### Spending Limits

Set maximum amounts your bot can spend:

- **Per-transaction limit** — the most a bot can spend on a single purchase
- **Daily limit** — the maximum total spending in a 24-hour period
- **Monthly limit** — the maximum total spending in a calendar month

Enter amounts in dollars. Changes are saved when you click **Save**.

### Approval Mode

Choose how purchase requests are handled:

| Mode | Behavior |
|------|----------|
| **Ask me for everything** | The bot must request your approval before any purchase. You'll receive a notification for each request. |
| **Auto-approve under threshold** | Purchases below a dollar amount you set are approved automatically. Anything above requires your approval. |
| **Auto-approve by category** | Purchases in approved categories are auto-approved. All others require your approval. |

### Approved Categories

When using category-based auto-approval, select which merchant categories your bot can spend on freely:

- API Services & SaaS
- Cloud Compute & Hosting
- Research & Data Access
- Physical Goods & Shipping
- Advertising & Marketing
- Donations & Tips
- Entertainment & Media
- Other / Uncategorized

### Blocked Categories

Regardless of approval mode, you can block specific high-risk categories entirely:

- Gambling
- Adult Content
- Cryptocurrency
- Cash Advances / Money Transfers

Blocked categories are always denied, even if the amount is within limits.

### Additional Options

- **Recurring payments** — toggle whether the bot can make recurring/subscription payments
- **Special instructions** — free-text notes for additional context (e.g., "Only purchase from approved vendor list")

## Linking and Unlinking Wallets

Bots interact with wallets to make purchases. From the wallet management pages, you can:

- **Link a bot** to a specific wallet — allowing the bot to spend from that wallet
- **Unlink a bot** — removing the bot's access to a wallet

This is managed from the wallet detail pages. See [Wallet Types](/docs/wallets/wallet-types) for more information on the different wallet options available.

## Monitoring Bot Activity

Keep track of what your bots are doing:

- **Activity Log** — the dashboard shows a real-time feed of bot actions, including purchase attempts, approvals, and denials
- **Transaction History** — view all completed transactions in the [Transactions](/docs/transactions/viewing-transactions) section
- **Webhook Log** — if you've configured webhooks, the dashboard shows delivery status for each event
- **Webhook Health** — CreditClaw tracks whether your bot's webhook is working. If deliveries fail repeatedly, the status changes to "unreachable" and events are staged as pending messages instead. See [Webhook Health](/docs/bots/webhook-health) for details.

## Adding More Bots

To add another bot to your account:

1. **From the API** — have your new bot call the registration endpoint, then claim it on the <a href="/claim" target="_blank">claim page</a>
2. **Using a pairing code** — generate a pairing code from the onboarding flow and share it with your new bot

There is no limit to the number of bots you can have on your account. Each bot gets independent spending rules and can be linked to different wallets.

## Best Practices

- **Start with conservative limits.** You can always increase spending limits once you're confident in your bot's behavior.
- **Use category blocking** for high-risk categories you never want your bot to access (gambling, adult content, etc.).
- **Review the activity log regularly** to make sure your bot is operating as expected.
- **Set up approval mode** based on your comfort level — "ask for everything" is the safest starting point.
- **Use different wallets for different bots** if you want to track spending separately or set different funding levels.
