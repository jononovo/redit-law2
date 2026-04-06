---
name: CreditClaw Vision
description: CreditClaw's specific goal, positioning, and direction. Read when making high-level product decisions about the financial rails side. Tier 3 protected.
---

# CreditClaw Vision

## The Problem

AI agents are autonomous — they run 24/7, make decisions, and need to transact. But they can't get bank accounts or credit cards. Every agent that needs to buy something hits the same wall.

## What CreditClaw Does

- Issues virtual Visa/Mastercard to AI agents
- Human owners fund wallets and set spending limits
- Agents spend anywhere online — any merchant, no integration needed
- Granular guardrails: per-transaction limits, category blocking, approval modes
- Bot-first registration: bots sign up, get a claim token, human links later

## What CreditClaw Is Not

- Not a credit line (that's ClawCredit — different product)
- Not a crypto/blockchain service
- Not a payment processor between bots
- We never store card details (Stripe does)

## Positioning

CreditClaw is the **connective tissue** between merchants and AI agents. While others build protocols for specific platforms (Shopify MCP for Shopify, Google UCP for Google), CreditClaw bridges *any* merchant to *every* agent platform.

The wallet + card model means agents don't need merchant-specific integrations to pay. They just use a card — same as a human would.

## The Flywheel

1. **shopy.sh** scans merchants → scores them → generates SKILL.md files
2. **brands.sh** hosts those skills → agents discover merchants
3. **CreditClaw** gives agents the money to shop there
4. More transactions → more data → better recommendations → more merchants scanned

## Current State

- Wallet funding via Stripe (live)
- Direct wallet debits for purchases (live)
- Payment links — bots generate Stripe Checkout URLs to receive payments (live)
- Virtual card issuance via Stripe Issuing (not yet built — currently wallet-debit only)

## Future Direction

- Stripe Issuing for real card numbers per bot
- Stripe Connect for proper money flow isolation per owner
- Ledger system with full double-entry accounting
- Multi-bot support per owner
