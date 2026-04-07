# Onboarding Wizard

The onboarding wizard walks you through connecting your first bot to CreditClaw and configuring it for safe, autonomous spending. It launches automatically the first time you sign in, or you can access it from the dashboard.

## Starting the Wizard

After signing in, navigate to **Onboarding** from the dashboard or visit the <a href="/onboarding" target="_blank">onboarding page</a> directly. The wizard presents a step-by-step flow with a progress indicator at the top so you always know where you are.

You can close the wizard at any time by clicking the **X** button in the top-right corner. Your progress is not saved — if you close early, you'll restart from the beginning next time.

## Step 1: Choose Your Path

The first screen asks how you'd like to connect your bot. There are two options:

| Option | When to choose |
|--------|---------------|
| **My bot already registered** | Your bot has called the CreditClaw API to register itself and you received a claim token (e.g. `coral-X9K2`). |
| **I want to set up first** | You want to configure spending rules before your bot connects. CreditClaw will generate a pairing code you can give to your bot. |

Pick the option that matches your situation. Both paths end up in the same place — a fully configured bot with spending rules.

## Step 2a: Claim Token (Bot-First Path)

If you chose "My bot already registered," you'll be asked to enter the **claim token** your bot provided during registration. This is a short alphanumeric code (e.g. `coral-X9K2`) that was included in your bot's registration confirmation.

Paste the token and click **Claim Bot**. CreditClaw verifies the token and links the bot to your account immediately. If the token is invalid or already used, you'll see an error message — double-check the token and try again.

## Step 2b: Pairing Code (Owner-First Path)

If you chose "I want to set up first," CreditClaw generates a **pairing code** for you. This is a unique code that your bot can use to connect to your account later.

- **Copy the code** using the copy button and share it with your bot (or paste it into your bot's configuration).
- CreditClaw **polls automatically** every few seconds to detect when your bot uses the code.
- Once your bot pairs, you'll advance to the next step automatically.
- If you're not ready to connect your bot yet, click **Skip for now** to continue setting up spending rules. You can connect the bot from the dashboard later.

## Step 3: Spending Limits

This step lets you set initial spending guardrails for your bot. You'll configure three limits:

| Limit | Default | What it controls |
|-------|---------|-----------------|
| **Per-transaction** | $25.00 | Maximum amount for any single purchase |
| **Daily** | $50.00 | Maximum total spending in a 24-hour period |
| **Monthly** | $500.00 | Maximum total spending in a calendar month |

Use the sliders or type in custom amounts. These limits can be changed at any time from the dashboard after setup.

## Step 4: Connect Bot (If Skipped Earlier)

If your bot hasn't connected yet (you skipped the pairing step or it hasn't paired), the wizard shows a **Connect Bot** screen. You can:

- Share the pairing code with your bot
- Wait for the bot to connect
- Skip this step and connect later from the dashboard

## Step 5: Add Payment Method

Before your bot can spend, you need a way to fund its wallet. This step walks you through adding a payment method (such as a credit card or bank account via Stripe).

If you'd rather fund later, you can skip this step — but your bot won't be able to make purchases until the wallet has funds.

## Step 6: Fund Wallet

If you added a payment method in the previous step, you'll be prompted to make an initial deposit into your wallet. Choose an amount and confirm the funding.

This step only appears if a payment method was successfully added.

## Step 7: Complete

The final screen shows a summary of everything you've configured:

- Bot name and connection status
- Spending limits
- Wallet funding status

Click **Go to Dashboard** to start managing your bot. From the dashboard, you can adjust spending rules, fund your wallet, and monitor your bot's activity.

## Tips

- **You can always change settings later.** The wizard sets sensible defaults, but every option is adjustable from the dashboard.
- **Multiple bots?** The wizard is for your first bot. To add more bots, use the <a href="/claim" target="_blank">claim page</a> or register them through the API.
- **Lost your claim token?** Check the registration email or logs from your bot. If you can't find it, you can use the pairing code flow instead.
