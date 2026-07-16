---
name: Crossmint Agent Checkouts API contract quirks
description: Payload shapes the /api/unstable/agent-checkouts API silently requires; prod-only testing
---

- Action submits (`POST /{id}/actions/{actionId}`) require the discriminator `action: "submit"` in the body alongside `values`; omitting it → `400 action: Invalid input`. Action id goes in the path only — including it in the body is rejected.
- Checkout create requires `constraints` to be present as an object even when empty → `400 constraints: Invalid input: expected object, received undefined` otherwise.
- Agent Checkouts is prod-only (no staging); poll-based, no webhooks in v1.
**How to apply:** any new call site into this API must mirror the quickstart doc payloads exactly; it validates strictly and its errors name the missing key.
