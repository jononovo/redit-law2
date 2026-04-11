# What is shopy.sh

shopy.sh is an open standard and platform that makes online stores discoverable and shoppable by AI agents. It extends Vercel's skills.sh format with commerce-specific metadata — turning a plain SKILL.md file into a complete procurement instruction set that any AI agent can read and execute.

## The problem it solves

AI shopping agents are emerging from every major platform — ChatGPT (Operator), Claude (MCP), Gemini, and custom procurement bots. But there's no standard way for agents to understand a store's checkout flow, payment methods, shipping options, or product catalog structure.

Existing metadata standards like Schema.org and Open Graph describe what products **are** — but not how an agent should **buy** them.

shopy.sh fills that gap.

## How it works

1. **Scan** — An AI agent visits your store and evaluates 11 agent-readiness signals
2. **Score** — Your store receives an ASX Score (0–100) measuring clarity, discoverability, and reliability
3. **Generate** — A SKILL.md file is created with machine-readable shopping instructions
4. **Distribute** — The skill is published to the catalog. AI agents discover your store and start buying.

## Key concepts

### ASX Score

The Agentic Shopping Experience Score. A 0–100 score computed by scanning a store for 11 signals across three pillars: Clarity (can agents read the catalog?), Discoverability (can agents find products?), and Reliability (can agents complete a purchase?).

### AXS Rating

The Agentic Experience Score Rating. A crowdsourced 1–5 rating from real agent purchase attempts, measuring search accuracy, stock reliability, and checkout completion.

### SKILL.md

A markdown file in the skills.sh format with commerce-specific frontmatter. It contains everything an agent needs to shop at a store — search instructions, checkout flows, payment methods, error handling, and more.

### The Catalog

A searchable directory of all published commerce skills. Developers install skills with `npx shopy add {vendor}` and agents use them to shop.

## Who it's for

- **Merchants and their dev teams** — check your ASX Score, improve your agent-readiness, get listed in the catalog
- **Agent developers** — install shopping skills for your AI agent, search the catalog by sector or capability
- **Platform builders** — a single standard format for commerce skills instead of custom integrations per merchant
