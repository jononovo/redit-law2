# What Are Procurement Skills

Procurement skills are structured packages that teach your bot how to shop at specific vendors. Each skill contains everything an AI agent needs to find products, compare prices, and complete a purchase at a particular store — from search patterns and checkout methods to shipping details and tips for avoiding common pitfalls.

## Why Skills Exist

Every online store works differently. Some have APIs, some require browser automation, and some support newer protocols like x402 or Agentic Checkout. Without skills, your bot would need custom integration code for each vendor. Skills standardize this into a portable format that any CreditClaw bot can use.

## What's Inside a Skill

Each skill defines:

- **Vendor identity** — Name, URL, category (retail, office supplies, electronics, etc.)
- **Checkout methods** — How the bot pays at this vendor (Native API, Agentic Checkout, x402 Protocol, Self-Hosted Card, Browser Automation, or CrossMint World)
- **Capabilities** — What the vendor supports: price lookup, stock checks, programmatic checkout, order tracking, returns, bulk pricing, PO numbers, and more
- **Search patterns** — How to find products on the vendor's site, including URL templates and product ID formats
- **Checkout details** — Whether guest checkout is available, tax exemption fields, PO number support
- **Shipping info** — Free shipping thresholds, estimated delivery times, business shipping options
- **Tips** — Best practices and gotchas specific to this vendor

## Maturity Levels

Skills go through a lifecycle of quality levels:

| Level | Meaning |
|-------|---------|
| **Verified** | Tested and confirmed working by the CreditClaw team |
| **Beta** | Functional but still being refined |
| **Community** | Submitted by users, reviewed but not fully verified |
| **Draft** | Work in progress, not yet ready for production use |

## Agent Friendliness Score

Each skill includes an agent friendliness score (0–5) that indicates how easy it is for a bot to shop at that vendor. The score considers:

- Whether guest checkout is available
- Whether authentication is required for the primary checkout method
- Support for programmatic checkout
- Historical success rate from real bot purchases

Higher scores mean smoother, more reliable automated purchasing.

## How Bots Use Skills

When your bot needs to buy something, it checks the available skills to find vendors that sell what it needs. The skill tells the bot:

1. How to search for products on that vendor's site
2. Which checkout method to use
3. What information is needed to complete the purchase
4. Any special considerations (free shipping thresholds, required fields, etc.)

The bot then follows the skill's instructions, applying your wallet's guardrails (spending limits, category controls, approval requirements) before completing the purchase.

## Next Steps

- [Browsing the Supplier Hub](/docs/skills/browsing-skills) — Find and explore available vendor skills
- [Skill Builder](/docs/skills/skill-builder) — Create new skills using the automated builder
- [Submitting a Supplier](/docs/skills/submitting-a-supplier) — Add a new vendor to the catalog
