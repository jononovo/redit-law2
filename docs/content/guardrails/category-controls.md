# Category Controls

Category controls let you restrict where your bot can shop by blocking or allowing specific merchant categories. This prevents your bot from making purchases in areas you consider off-limits, regardless of the amount.

## How Category Controls Work

Every merchant and vendor is associated with a category (e.g., "electronics," "office_supplies," "food_delivery"). When your bot attempts a purchase, CreditClaw checks the merchant's category against your category rules:

- If the category is **blocked**, the transaction is rejected immediately
- If you have an **allowlist** configured, only transactions in allowed categories proceed
- If neither applies, the transaction is evaluated against your other guardrails (spending limits, approval mode)

Category controls work alongside spending limits and approval modes — a transaction must pass all checks to proceed.

## Default Blocked Categories

CreditClaw blocks the following categories by default to protect against common misuse:

- **Gambling** — Online betting, casinos, lottery
- **Adult content** — Age-restricted content and services
- **Cryptocurrency** — Crypto exchanges and trading platforms
- **Cash advances** — ATM withdrawals and cash-equivalent transactions

These defaults apply to all new wallets and can be modified per wallet.

## Configuring Category Controls

### Per-Wallet Controls

To configure category controls on a specific wallet:

1. Go to the wallet page for the wallet type you want to configure
2. Select the wallet
3. Click the **Guardrails** button
4. Scroll to the category controls section
5. Add or remove categories from the blocked list or allowlist
6. Save your changes

### Platform-Wide Controls (Procurement Controls)

For broader control, you can set procurement controls that apply across all wallets:

1. Navigate to **Settings** in the dashboard
2. Open the **Procurement Controls** section
3. Configure blocked and allowed categories, merchants, and domains

Procurement controls support six rule types:

| Rule Type | What it controls |
|-----------|-----------------|
| **Allowed domains** | Only purchases from these website domains are permitted |
| **Blocked domains** | Purchases from these domains are always rejected |
| **Allowed merchants** | Only purchases from these merchants are permitted |
| **Blocked merchants** | Purchases from these merchants are always rejected |
| **Allowed categories** | Only purchases in these categories are permitted |
| **Blocked categories** | Purchases in these categories are always rejected |

If you define an allowlist (e.g., allowed domains), then *only* domains on that list are permitted — everything else is blocked by default.

## Categories and Skills

When you install a [procurement skill](/docs/skills/what-are-skills), the skill may specify which categories it operates in. Your category controls are still enforced — if a skill tries to make a purchase in a blocked category, the transaction is rejected.

This means you can safely install skills without worrying about them spending in unauthorized categories.

## Best Practices

- **Keep the default blocks.** The four default blocked categories cover the most common misuse patterns. Only remove them if you have a specific business need.
- **Use allowlists for focused bots.** If your bot should only shop at specific merchants or in specific categories, use an allowlist instead of trying to block everything else.
- **Combine with approval modes.** Category controls and approval modes work together. You might allow a category but still require approval for purchases above a threshold.
- **Review blocked transactions.** Check the activity log periodically to see if legitimate transactions are being blocked by your category rules. Adjust as needed.
