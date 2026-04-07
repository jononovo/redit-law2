# Skill File Update Advice

This document captures decisions, constraints, and gotchas for anyone updating the
CreditClaw bot-facing skill files in `public/`. Read this before making changes.

Last updated: 2026-03-14 (v2.8.0)

---

## File Structure

| File | Role | Listed in skill.json? |
|------|------|-----------------------|
| `skill.md` | Entry point — registration, card setup, webhooks, status, spending permissions, consolidated API reference | Yes |
| `CHECKOUT-GUIDE.md` | My Card — complete purchase flow, browser checkout, and confirmation | Yes |
| `STRIPE-X402-WALLET.md` | Rail 1 — x402 payment signing, USDC balance, Stripe Wallet transactions | Yes |
| `MANAGEMENT.md` | Bot self-management — transaction history, profile updates | Yes |
| `PROCUREMENT.md` | Discover vendors and merchants — find checkout skills for any purchase | Yes |
| `MY-STORE.md` | Selling — checkout pages, payment links, invoices, shops | Yes |
| `heartbeat.md` | Lightweight polling routine for balance and spending checks | Yes |
| `crossmint-wallet.md` | Draft stub for Crossmint Wallet (Rail 2) — referenced in skill.md Payment Rails table as "Coming Soon" but NOT listed in skill.json | **No** |
| `skill.json` | Machine-readable manifest — lists all live skill files | N/A |

### Variant Directories (Do Not Touch)

These directories contain separate skill variants for other contexts. Never modify them
when updating the main skill files:

- `public/stripe/`
- `public/creditcard/`
- `public/shopping/`
- `public/amazon/`

---

## Rails

### Rail 4 (Self-Hosted Cards) — Removed

Rail 4 was intentionally removed from all skill files. Do not re-introduce references to:
- `rail4`, `self-hosted`, `GET /bot/check/rail4`, `POST /bot/check/rail4/test`
- Any "pre-purchase dry run" endpoint
- `GET /bot/wallet/check` (legacy endpoint that pulls Rail 4 guardrails)

### Rail 2 (Crossmint Wallet) — Coming Soon

`crossmint-wallet.md` exists as a draft stub. It is referenced in the Payment Rails table
in `skill.md` with "Coming Soon" status, but is NOT in `skill.json`.

When Crossmint Wallet goes live:
1. Update its status in the `skill.md` Payment Rails table (change "Coming Soon" to the actual status)
2. Add `"CROSSMINT-WALLET.md": "https://creditclaw.com/crossmint-wallet.md"` to `skill.json`
3. Add its endpoints to the consolidated API Reference table in `skill.md`
4. Update `heartbeat.md` per-rail detail checks if applicable

### Stripe Wallet (x402) — Private Beta

Currently marked "Private Beta" in the Payment Rails table. When it moves to general
availability, update the status in `skill.md`.

---

## Webhook / callback_url

The `callback_url` field is presented as a standard part of registration (listed as "Yes"
in the Required column). The registration section does NOT frame it as optional or present
a decision point.

A footnote at the end of the registration section handles the exception case: bots that
can't expose a public HTTPS endpoint. This note explains that CreditClaw still works
without a webhook (polling fallback via Bot Messages), but the happy path assumes webhooks.

If the server-side implementation changes to truly require webhooks, remove the footnote.
If it changes to make webhooks genuinely optional, the footnote is already sufficient —
do not add "optional" labels to the request fields table.

---

## Language Rules

### No Legacy Language

Never use words or phrases like:
- "deprecated", "legacy", "formerly", "this replaces X", "previously known as"
- "old", "removed", "superseded"

Each file should read as if it has always existed in its current form.

### No Comments in Skill Files

Do not add HTML comments, markdown comments, or inline notes to any file in `public/`.
Any developer/agent guidance belongs in this file (`docs/skill-update-advice.md`), not
in the skill files themselves.

### Cross-File Links

Always use full URLs for links between skill files:
- `[CHECKOUT-GUIDE.md](https://creditclaw.com/CHECKOUT-GUIDE.md)`
- NOT relative paths like `./CHECKOUT-GUIDE.md`
- NOT fragment-only links like `#encrypted-card`

Bots read these files from the URL, not from a local filesystem.

---

## Endpoint Notes

### confirm-delivery Has No Rate Limit

`POST /bot/rail5/confirm-delivery` intentionally has no rate limit entry in the
server-side rate limit config. Document it as "—" in API reference tables.

### confirm-delivery Response Fields

The `confirm-delivery` response includes `test_checkout_url` and `test_instructions`
fields. These allow the bot to verify the card file works before using it for real purchases.

### pending_setup Card Status

Cards can be in a `pending_setup` status. This means the owner has created the card entry
but hasn't uploaded the encrypted file yet. Document this in the card status progression.

### checkout/status Rate Limit

`GET /bot/rail5/checkout/status` is rate-limited at 60 requests per hour (not 30).
This is intentionally higher because bots poll this endpoint while waiting for approval.

### Stripe Wallet 202 Response

When `POST /stripe-wallet/bot/sign` returns 202, the bot should wait approximately
5 minutes before retrying. Do NOT reference a "poll the approvals endpoint" — there
is no such endpoint.

---

## Spending Permissions

- Approval flows are rail-specific. Each rail's file covers its own approval mechanism.
  Do not add approval flow details to `MANAGEMENT.md`.
- The authoritative spending rules come from `GET /bot/wallet/spending`. There is no
  static spending config file.

---

## Version Bumping

When making changes, bump the version in:
1. `public/skill.md` frontmatter
2. `public/heartbeat.md` frontmatter
3. `public/skill.json` `version` field
4. Any companion file that was modified (each has its own frontmatter version)
