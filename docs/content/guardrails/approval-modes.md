# Approval Modes

Approval modes determine whether your bot can spend autonomously or needs your explicit permission before each purchase. This gives you fine-grained control over how much independence your bot has.

## Available Modes

CreditClaw supports three approval modes:

### Ask for Everything

Every transaction requires your approval before it can proceed. Your bot will submit a purchase request, and you will receive a notification (email or in-app) to approve or reject it.

This is the most conservative mode and is the **default** for most wallet types. It is ideal when you are first setting up a bot or working with a new vendor.

### Auto-Approve Under Threshold

Transactions below a dollar amount you set are approved automatically. Transactions at or above the threshold require your manual approval.

For example, if you set the threshold to $10:

- A $7.50 purchase → **auto-approved**
- A $10.00 purchase → **requires your approval**
- A $25.00 purchase → **requires your approval**

This mode is useful once you trust your bot for small, routine purchases but want oversight on larger ones.

### Auto-Approve by Category

Transactions in categories you have explicitly approved are auto-approved (up to your spending limits). Transactions in unapproved or blocked categories require manual approval or are blocked outright.

This mode works in conjunction with [Category Controls](/docs/guardrails/category-controls) to give you category-level autonomy.

## Setting the Approval Mode

To configure the approval mode on a wallet:

1. Go to the wallet page for the wallet type you want to configure
2. Select the wallet
3. Click the **Guardrails** button
4. Choose the approval mode from the dropdown
5. If using "Auto-approve under threshold," set the dollar threshold
6. Save your changes

## How Approvals Work

When a transaction requires approval:

1. Your bot submits the purchase request to CreditClaw
2. CreditClaw evaluates the request against your [spending limits](/docs/guardrails/spending-limits) and approval mode
3. If approval is required, CreditClaw sends you a notification with the details (amount, merchant, category)
4. You approve or reject the request from the dashboard or via the email link
5. If approved, the transaction proceeds. If rejected, the bot is notified

Pending approvals are visible in the **Approvals** section of your wallet page. Each approval shows the amount, merchant, and timestamp, and includes approve/reject buttons.

## Approval Expiry

Approval requests do not expire automatically — they remain pending until you act on them. However, the underlying purchase opportunity may expire depending on the merchant or vendor. It is a good practice to review pending approvals promptly.

## Choosing the Right Mode

| Scenario | Recommended Mode |
|----------|-----------------|
| New bot, testing behavior | Ask for Everything |
| Trusted bot, small routine purchases | Auto-Approve Under Threshold ($5–$10) |
| Bot purchasing from known vendors only | Auto-Approve by Category |
| High-value procurement | Ask for Everything |

You can change the approval mode at any time. The new mode applies to all future transactions on that wallet.
