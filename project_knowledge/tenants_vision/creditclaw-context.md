---
name: CreditClaw Context
description: The ecosystem, competition, and technology landscape around CreditClaw. Reference doc for strategic decisions — not required for day-to-day work.
---

# CreditClaw Context

## The OpenClaw Ecosystem

CreditClaw exists within the **OpenClaw** ecosystem — an open-source autonomous AI agent framework by Peter Steinberger. OpenClaw bots run locally, connect to LLMs (Claude, GPT, DeepSeek), and perform real tasks through messaging platforms (WhatsApp, Telegram, Discord).

A wave of services has emerged specifically for these bots:

| Service | What it does |
|---------|-------------|
| **ClawHub** | Skills marketplace — bots install plugins for new capabilities |
| **Moltbook** | Social network for AI agents |
| **SendClaw** | Email service — bots get their own email addresses |
| **ClawCredit** | Credit line service — bots access x402 services on credit |
| **Moltroad** | Marketplace where agents buy/sell services from each other |
| **Openwork** | Gig economy — bots hire humans or other bots |
| **Bankrbot** | AI crypto banking on Base |
| **Stripe ACP** | Agentic Commerce Protocol — agents buy from merchants via Stripe |

## Competition

- **ClawCredit** — credit line model (borrow now, pay later). We're prepaid (fund first, spend after). Different risk model.
- **Bankrbot** — crypto-native. We're fiat-native (Visa/Mastercard). Different merchant compatibility.
- **Stripe ACP** — requires merchant integration. We work at any merchant (card-based, no integration needed).
- **Shopify MCP** — Shopify-only. We're platform-agnostic.
- **Google UCP** — restricted access, Google ecosystem. We're open.

Our advantage: **universality**. A card works everywhere. No merchant needs to integrate with us.

## Technology Landscape

### Agent Skills Standard

Open spec adopted by Anthropic, Microsoft, OpenAI, GitHub, Cursor. Format: YAML frontmatter + markdown instructions. Bots discover and read these to learn new capabilities.

CreditClaw extends this standard with commerce-specific metadata:
- How to search for products (API, MCP, site search)
- Checkout flow (steps, guest vs. registered)
- Payment protocols supported (x402, ACP)
- Shipping and return policies

### x402 Protocol

Uses HTTP `402 Payment Required` for autonomous agent payments. Agent hits a 402, requests a cryptographic signature from CreditClaw, resubmits with `X-PAYMENT` header. Built on EIP-3009/EIP-712 signatures on Base chain using USDC.

### Model Context Protocol (MCP)

Anthropic's open standard for connecting AI models to external tools. Allows agents like Claude to discover wallets and execute transactions without custom API code. We probe for `mcp_endpoint` on merchant domains during scans.

## Key Terms

- **Skill file (SKILL.md)** — markdown doc teaching an agent how to use a service
- **ClawHub** — public registry where skills are published and installed
- **Heartbeat** — periodic check-in routine bots run to poll for updates
- **Claim token** — one-time code a bot gives its human owner to link accounts
