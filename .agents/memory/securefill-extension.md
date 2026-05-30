---
name: SecureFill extension
description: Why the SecureFill browser extension exists, what its credential-isolation actually guarantees, and the deliberate scope boundaries. Read before touching plugins/secure-fill-* or the v4 Cowork plugin.
---

# SecureFill extension

A generic MV3 Chrome extension (`plugins/secure-fill-extension/`) + companion Claude skill (`plugins/secure-fill-skill/`) that let an assistant fill sensitive form fields by passing only an opaque `ref`; values never enter the assistant's context. Full build brief: `project_knowledge/internal_docs/06-agent-plugins/secure-fill-extension-plan.md`.

**Why it exists:** the Cowork v4 plugin (`plugins/creditclaw-wallet-v4/`) depends on a "secure fill" extension that was never delivered, so its checkout half can't work. A Claude plugin alone (skill/hook/MCP) can't reach the live tab's DOM or cross-origin payment iframes — only a content script can. OpenClaw doesn't need one because its plugin model gives a code sandbox.

**Isolation boundary (don't over-claim):**
- Strong only for **cross-origin iframe fields** (Stripe/Shopify/Adyen/Braintree) — SOP keeps page JS (where the agent runs) from reading them. This is the real payment path.
- **Same-origin top-page fields are NOT confidential from the page** — page JS can read `input.value` after fill. Isolated world hides the credential/key/logic, not a typed value.

**Deliberate scope decisions:**
- **No bridge trust model** (signed challenge / per-origin allowlist) despite any page being able to post `securefill-fill`. **Why:** a fill needs a server-approved, bot-scoped, single-use `ref` (Mode B key endpoint 409s on reuse); a hostile page has no valid ref, so it can't exfiltrate — worst case it disrupts local config. Building trust gating would be unrequested scope for the actual threat.
- **Memory wipe is best-effort** — JS/WebCrypto give no hard zeroization. Accepted.

**Crypto (Mode B):** AES-256-GCM. The stored encrypted source's trailing 16 bytes are the auth tag, but `/bot/rail5/key` also returns an authoritative `tag_hex`; strip the trailing 16 and reattach `tag_hex`, then feed `ct||tag` to WebCrypto. `tag_hex` is required — omitting it (as v4 docs did) breaks decryption.

**Generic-naming rule:** the shipped extension (Google-reviewed) must never mention cards/CVV/payments in code, comments, filenames, UI, or its own docs — frame everything as "filling form fields out of the assistant's context." The internal plan doc and the Claude skill may speak plainly (not shipped to Google).
