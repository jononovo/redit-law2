# Getting Started with MCP and CreditClaw

The Model Context Protocol (MCP) is quickly becoming the standard way for AI agents to interact with external tools and services. In this guide, we'll walk through connecting your Claude or ChatGPT agent to CreditClaw using MCP, giving your bot the ability to make purchases with built-in spending controls.

## What is MCP?

MCP (Model Context Protocol) is an open protocol that lets AI models discover, authenticate with, and use external tools. Instead of hard-coding API calls, your agent can dynamically discover what CreditClaw offers and use those capabilities in a structured, safe way.

Think of MCP as a universal adapter between your AI agent and the services it needs to interact with.

## Prerequisites

Before you begin, make sure you have:

- A CreditClaw account with at least one funded wallet
- An API key from your CreditClaw dashboard (Settings → API Keys)
- An AI agent that supports MCP (Claude Desktop, ChatGPT with plugins, or any MCP-compatible client)

## Step 1: Install the CreditClaw MCP Server

The CreditClaw MCP server is available as an npm package:

```bash
npm install -g @creditclaw/mcp-server
```

Or if you prefer running it directly:

```bash
npx @creditclaw/mcp-server --api-key YOUR_API_KEY
```

## Step 2: Configure Your Agent

### For Claude Desktop

Add the following to your Claude Desktop MCP configuration file (`~/.claude/mcp.json`):

```json
{
  "servers": {
    "creditclaw": {
      "command": "npx",
      "args": ["@creditclaw/mcp-server"],
      "env": {
        "CREDITCLAW_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

### For ChatGPT

If you're using a ChatGPT-based agent with MCP support, configure the server URL in your agent's tool configuration:

```json
{
  "tools": [
    {
      "type": "mcp",
      "server_url": "http://localhost:3100",
      "auth": {
        "api_key": "your-api-key-here"
      }
    }
  ]
}
```

## Step 3: Available Tools

Once connected, your agent will have access to these CreditClaw tools:

| Tool | Description |
|------|-------------|
| `list_wallets` | View all wallets and their balances |
| `get_wallet_balance` | Check the current balance of a specific wallet |
| `create_purchase` | Initiate a purchase using a wallet |
| `list_transactions` | View recent transactions |
| `check_spending_limits` | See remaining budget for a wallet |
| `list_skills` | Browse available procurement skills |
| `execute_skill` | Run a procurement skill (e.g., order from a specific vendor) |

## Step 4: Test the Connection

Ask your agent to check its CreditClaw connection:

> "What CreditClaw wallets do I have, and what are their balances?"

Your agent should respond with a list of your wallets, their types, balances, and spending limits. If it does, you're all set.

## Step 5: Make a Test Purchase

Try a small test purchase to verify everything works end-to-end:

> "Using my Card Wallet, buy a $5 test item from the CreditClaw test vendor."

The agent will use the `execute_skill` tool to run the test vendor skill, which simulates a purchase without actually charging your card. You'll see the test transaction appear in your dashboard.

## Best Practices

1. **Start with low limits.** Set your wallet's per-transaction limit to $10-$20 while testing. You can always increase it later.

2. **Use approval mode.** During initial setup, set your wallet to "human-in-the-loop" approval mode. You'll get a notification for each purchase and can approve or deny it from your dashboard or phone.

3. **Monitor the dashboard.** Keep your CreditClaw dashboard open while testing. You'll see transactions appear in real time.

4. **Use procurement skills.** Instead of letting your agent browse the open web, use CreditClaw's procurement skills for structured purchasing from known vendors. It's faster, safer, and more reliable.

## Troubleshooting

**Agent can't find CreditClaw tools:** Make sure the MCP server is running and your API key is correct. Check the server logs for authentication errors.

**Purchases are being declined:** Check your wallet's spending limits and merchant category controls. The transaction might exceed a limit or fall into a blocked category.

**Slow responses:** MCP connections are real-time. If you're experiencing latency, check your network connection and ensure the MCP server is running locally rather than over the internet.

---

That's it! Your AI agent now has a secure, controlled way to make purchases through CreditClaw. As you get comfortable, explore more advanced features like multi-wallet setups, sub-agent cards, and custom procurement skills.

Have questions? Check our [documentation](/docs) or reach out on [Twitter](https://x.com/creditclawapp).
