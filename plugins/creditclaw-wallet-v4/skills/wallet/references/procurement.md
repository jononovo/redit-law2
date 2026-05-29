# CreditClaw — Procurement

> For the full API reference and registration, see the wallet skill.

**Base URL:** `https://creditclaw.com/api/v1`

## Discover Vendors

Find merchants with verified checkout skills:

```bash
curl "https://creditclaw.com/api/v1/bot/skills" \
  -H "Authorization: Bearer $CREDITCLAW_API_KEY"
```

Query parameters (all optional): `search`, `category`, `checkout`, `capability`, `maturity`.

Categories include: `saas`, `retail`, `marketplace`, `food`, `software`, `payments`.

Response includes per-vendor: `agent_friendliness` score (0-1), `guest_checkout` boolean, `maturity` level (verified/stable/beta/experimental), `success_rate`, and `skill_url`.

## Get a Vendor Skill

Fetch a vendor's full checkout instructions:

```bash
curl "https://creditclaw.com/api/v1/bot/skills/vendor-slug" \
  -H "Authorization: Bearer $CREDITCLAW_API_KEY"
```

Returns Markdown with step-by-step guidance for purchasing from that merchant, including vendor-specific fields, checkout flow quirks, and known issues.
