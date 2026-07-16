---
name: Crossmint Agent Checkouts API contract quirks
description: Payload shapes the /api/unstable/agent-checkouts API silently requires; prod-only testing
---

- Action submits (`POST /{id}/actions/{actionId}`) require the discriminator `action: "submit"` in the body alongside `values`; omitting it → `400 action: Invalid input`. Action id goes in the path only — including it in the body is rejected.
- Checkout create requires `constraints` to be present as an object even when empty → `400 constraints: Invalid input: expected object, received undefined` otherwise.
- Agent Checkouts is prod-only (no staging); poll-based, no webhooks in v1.
**How to apply:** any new call site into this API must mirror the quickstart doc payloads exactly; it validates strictly and its errors name the missing key.

## User action responseSchema
- 400 "User action response values do not match responseSchema": fixed choices may arrive as `oneOf`/`anyOf` of `const` variants or lone `const`, not just `enum`. Render as buttons and submit the canonical const value — free text answers get rejected by strict validation.
- Never log submitted action values in prod (can contain OTP codes); log the schema + value key/type shapes only.
