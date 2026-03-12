# Viewing Transactions

The **Transactions** page gives you a unified ledger of every financial event across your wallets — top-ups, purchases, refunds, and transfers. It's the single place to understand where your money went and what your bots have been doing.

## Accessing the Transaction Ledger

Navigate to **Transactions** in the left sidebar of your dashboard. The page opens on the **Transactions** tab by default, showing a chronological list of all wallet activity.

## Understanding the Table

Each row in the transaction table shows:

| Column | Description |
|--------|-------------|
| **Type** | The kind of transaction — `topup`, `purchase`, `refund`, `transfer in`, `transfer out`, or `reconciliation`. Each type has a color-coded icon for quick scanning. |
| **Amount** | The transaction value. Inbound amounts (top-ups, refunds, incoming transfers) appear in green with a `+` prefix. Outbound amounts (purchases, outgoing transfers) appear in red with a `−` prefix. |
| **Balance** | Your wallet balance immediately after this transaction was processed. Useful for auditing how your balance changed over time. |
| **Details** | Additional context — for transfers this shows the counterparty wallet address; for other types it may show a resource URL or merchant reference. |
| **Status** | The current state of the transaction: **Confirmed** (complete), **Pending** (processing), or **Failed**. |
| **Date** | When the transaction occurred. |

## Transaction Types

### Top-up

A deposit into your wallet. This happens when you fund your wallet via card, bank transfer, Base Pay, or crypto on-ramp.

### Purchase

A payment made by your bot to a merchant or vendor. The description typically includes what was purchased and from where.

### Refund

Money returned to your wallet after a cancelled or reversed purchase.

### Transfer

Funds moved between wallets. Transfers show a direction — **Transfer in** for received funds, **Transfer out** for sent funds — along with the counterparty wallet address.

### Reconciliation

An automatic balance adjustment made by the system to keep your on-chain and displayed balances in sync.

## Tips for Reading Your Ledger

- **Follow the balance column** to trace how your wallet balance evolved over time. Each row's balance reflects the state right after that transaction settled.
- **Check the status column** if a transaction seems missing from your balance — it may still be pending.
- **Use the date column** to correlate transactions with specific bot activity or approval decisions you made.

## Switching to Orders

The Transactions page includes a second tab — **Orders** — where you can track physical goods purchases and their shipping status. See [Orders & Shipping](/docs/transactions/orders) for details.

## Next Steps

- [Orders & Shipping](/docs/transactions/orders) — Track physical goods your bots have purchased
- [Spending Limits](/docs/guardrails/spending-limits) — Configure limits to control how much your bots can spend
- [Approval Modes](/docs/guardrails/approval-modes) — Set up approval workflows for purchases
