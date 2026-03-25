# Shipping Address File — Phase 2

## Context

The companion details file (phase 1) includes the **billing address** for each card. However, shipping addresses may differ from billing addresses. Bots need a central place to find shipping addresses for checkout forms.

## Plan

- Create a single `.creditclaw/shipping.md` file that is shared across all cards (not per-card).
- The file contains one or more shipping addresses.
- One address is marked as the **default**. When a checkout requires a shipping address, the bot uses the default unless instructed otherwise.
- The file is plaintext markdown, consistent with the companion details file format.

## Open Questions

- Where does the user manage shipping addresses? (Settings page? During onboarding? Both?)
- How are addresses added/removed/reordered after initial setup?
- Should bots be able to request a specific non-default address by label or index?
