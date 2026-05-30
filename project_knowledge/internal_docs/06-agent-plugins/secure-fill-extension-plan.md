---
name: "Plan: Secure-Fill Browser Extension"
description: Full build brief for a new Chrome extension that fills sensitive form fields in the live browser without the data ever entering the agent's context. Read this before building the extension or touching the Cowork plugin. Explains CreditClaw, the payment rails, why credential isolation matters, how OpenClaw solves it, why the existing Cowork plugin does NOT, and the design + Chrome-review constraints for the new extension.
created: 2026-05-30
last_updated: 2026-05-30
status: plan
---

# Plan: Secure-Fill Browser Extension

**For the agent picking this up cold:** you can build this without knowing anything about the rest of the platform. This doc gives you the whole context, the reason the thing exists, what already exists and why it's insufficient, the design, and the hard constraints. Read it top to bottom once.

---

## 1. What CreditClaw is

CreditClaw is the **financial layer for autonomous AI agents**. An AI agent (a "bot") needs to spend money — buy a SaaS subscription, procure goods from a merchant, pay another agent — but its human owner needs to stay in control: set spending limits, approve big purchases, and never hand the agent raw payment credentials it could leak.

So CreditClaw sits between the agent and the money. The agent asks the platform to pay; the platform enforces the owner's rules (per-transaction / daily / monthly limits, approval thresholds, category allow/block lists) and routes the payment through whichever **rail** the owner set up. Auth is a bearer API key (`cck_live_...`) the agent holds; it's bcrypt-hashed server-side and must never be sent to any non-creditclaw.com domain.

There is one codebase, three hostname-routed tenants (CreditClaw / shopy.sh / brands.sh). Only CreditClaw matters for this work.

## 2. How the payment systems work (the rails)

"Payments" is not one product — it's a small portfolio of outbound rails, each for a different class of spend, all sharing one guardrails engine, one approvals queue, one orders ledger:

| Rail | Tile | What it is |
|---|---|---|
| 1 | Crypto Wallet | Privy self-custodied stablecoin wallet on Base; x402 / crypto-native flows. |
| 3 | Virtual Cards | Owner vaults a real Visa/MC with Crossmint once, mints N virtual cards. Real card never leaves Crossmint's PCI vault. |
| 5 | My Card · Encrypted | Owner's real card, **encrypted at rest, split-knowledge** (see below). No third-party vault. |

**This extension is about the card-filling problem, which is sharpest on Rail 5** — but the extension itself is built generic (see §7) and is reusable for any sensitive form fill.

### Rail 5's split-knowledge model (the crux of why this is hard)

Rail 5 deliberately splits the secret so no single party can read the card:

| Entity | Holds | Can decrypt alone? |
|---|---|---|
| CreditClaw server | AES-256-GCM key (key + IV + auth tag) | No — has no ciphertext |
| Bot / agent | Encrypted card file (ciphertext) | No — has no key |
| Owner | Backup of encrypted file | No — has no key |
| Ephemeral decryptor | Key + ciphertext, momentarily | Yes — then discarded |

The whole design goal: **card plaintext and the decryption key must never both land in the agent's context / reasoning trace.** The agent orchestrates the purchase but is structurally prevented from ever seeing the card.

Real endpoints that matter (verified against `app/api/v1/bot/rail5/`):
- `POST /bot/rail5/checkout` → returns `{ approved: true, checkout_id, checkout_steps, spawn_payload }` or `{ approved: false, status: "pending_approval", checkout_id }`.
- `POST /bot/rail5/key` (body `{ checkout_id }`) → returns `{ key_hex, iv_hex, tag_hex }`. **Single-use** — enforced server-side via a `keyDelivered` flag; second call returns 409. Only works when the checkout status is `approved` and belongs to the calling bot.
- `POST /bot/rail5/confirm` — confirm delivery after the purchase.

Auth helper: `features/platform-management/agent-management/auth.ts` — requires `Authorization: Bearer cck_live_...`.

## 3. Why we do it this way (credential isolation)

Agents are LLMs. Anything in their context can surface in reasoning, logs, tool calls, or compacted summaries. If the agent ever holds a card number or a decryption key, that's a leak surface. The entire architecture exists to make leakage **structurally impossible**, not merely discouraged: the component that decrypts and types the card must be **outside** the agent's context. The agent only ever holds an opaque reference (a `checkout_id`) and a fill result (`{ status: "filled" }`).

This is the single most important property. Every design decision below serves it.

## 4. How the OpenClaw plugin already solves this (the working reference)

`public/Plugins/OpenClaw/` is a working plugin for the **OpenClaw** agent runtime. It does NOT need a browser extension, because OpenClaw's plugin model gives the plugin a **real code sandbox** — a tool (`creditclaw_fill_card`) whose execute function runs Node.js code out of the agent's view.

Flow (`src/decrypt.ts`, `src/api.ts`, `src/fill-card.ts`):
1. Agent calls the tool with `{ checkout_id, card_file_path, frame_hint? }`.
2. Tool reads the encrypted blob, calls `POST /bot/rail5/key` for the one-time key.
3. Decrypts with AES-256-GCM using **`key_hex` + `iv_hex` + `tag_hex`** (`createDecipheriv("aes-256-gcm", key, iv); decipher.setAuthTag(tag)`).
4. Snapshots the page, locates card-number + CVV fields (incl. iframes), types them.
5. **Zeroes all card data from memory.**
6. Returns `{ status: "filled" }`. Agent never sees card data.

**Use OpenClaw's `decrypt.ts` as the canonical crypto reference for the extension.** The math, the `tag_hex` requirement, and the memory-wipe pattern are correct there.

## 5. What we already have for Claude, and why it does NOT solve it

`plugins/creditclaw-wallet-v4/` is a plugin for **Claude (Cowork / Claude Code)**. A Claude plugin can bundle six component types — skills, subagents, hooks, MCP servers, LSP servers, monitors — but the v4 plugin only ships **skills + hooks**. It is intended to drive an external "secure fill" Chrome extension via `window.postMessage`. It does NOT work end-to-end, for three reasons found during audit:

1. **The extension it depends on does not exist.** v4 references a "Secure Fill Chrome extension" ~30 times but it is *maintained separately* — there is no URL, no Web Store link, and no extension anywhere in this repo (no `manifest.json`, no `content-iframe.js`, no service worker). The plugin points at a component that was never delivered. **This is the gap this build closes.**
2. **A documented defense-in-depth hook is missing and unwired.** `scripts/card-data-guard.py` (a PreToolUse guard) is referenced by the README, internal docs, a skill, and `tests/smoke.sh` — but the file isn't in `scripts/`, and `hooks/hooks.json` has no `PreToolUse` entry. `smoke.sh` "passes" are false (python3 exits 2 on file-not-found, which happens to match the expected block code). Low impact (card data shouldn't enter context anyway) but the docs overstate protection.
3. **Two advertised endpoints don't exist** → guaranteed 404s: `GET /bot/wallet/transactions` and `POST /bot/payments/create-link`. Real transaction reads are per-rail (`/card-wallet/transactions`, `/stripe-wallet/transactions`, `/rail3/transactions`).

Also: v4's docs describe the key material as `key_hex` + `iv_hex` only, **omitting `tag_hex`**. The real endpoint returns `tag_hex` and AES-GCM decryption fails without it. OpenClaw uses it correctly; the extension MUST use it.

**Why Claude can't just do what OpenClaw does:** Claude's plugin model has no in-tab code sandbox that can both hold a secret out of context AND touch the page the agent is driving. A bundled **MCP server** is a code sandbox, but it runs as a separate process and **cannot reach the DOM of the live browser tab** — especially not the cross-origin payment iframes (Stripe, Shopify PCI) where card fields live. The only thing that can inject into that tab is a **content script — i.e. a browser extension.** Hence: for Claude/Cowork, the extension is the non-negotiable missing piece.

## 6. Why we are building the extension (one paragraph)

To give Claude the same credential-isolation guarantee OpenClaw has, in the one environment where a plugin alone can't: the live browser. The extension is the out-of-context surface that pulls the real values itself and types them into the page — including cross-origin iframes — so the agent only ever holds a reference. Without it, the Claude checkout story is broken; with it, the existing v4 plugin's checkout half works.

## 7. Design — keep it generic, simple, secure

### 7.1 The product is generic
The extension is a **context-safe data injector**, not a "card filler." It receives a reference, fetches the real values itself, fills them, wipes memory. What it fills (card fields, store logins, addresses, anything) is irrelevant to the extension.

**Hard naming rule:** nothing in the shipped extension — file names, code, comments, UI strings, README, Web Store listing — may mention credit cards, CVV, payments, PAN, or any financial term. Everything is framed as "securely filling form fields from a referenced source, keeping values out of the agent's context." (This doc is internal and never shipped, so it speaks plainly. The extension package must not.)

### 7.2 Two data modes, same ending
- **Mode A — server-sourced values (the common case).** Extension calls *our* API with its own stored credential + the reference; gets field values back over TLS; fills them. No client-side crypto. Covers DB-stored secrets like store usernames/passwords.
- **Mode B — client-held encrypted blob (max isolation).** Extension holds an encrypted blob (from pairing) and fetches only a one-time key at fill time, then decrypts locally with AES-256-GCM (`key_hex` + `iv_hex` + `tag_hex`). Blob and key never co-locate except inside the extension. This is the Rail 5 split-knowledge path.

Both return only `{ status, fields_filled }` to the page. Neither ever exposes a value to the agent.

### 7.3 Handoff protocol (agent ↔ extension)
The agent never sends data — only a reference. It talks to the extension by running a tiny `window.postMessage` snippet in the page (via Claude's browser/JS tool). Keep the v4 message names so the existing plugin stays compatible, but generalize the payloads:
- `securefill-ping` → `securefill-pong { ready, configured }`
- `securefill-setup { credential, vault_ref? }` → `{ status: "ready" }` (pairing)
- `securefill-status` → `{ configured, version }`
- `securefill-fill { ref }` → `{ status: "filled" | "fill_failed" | "error", fields_filled, reason? }`

(`ref` is opaque — a `checkout_id` today, any record id tomorrow.)

### 7.4 Architecture (MV3)
```
secure-fill-extension/                  ← shippable; generic; zip this for the Web Store
  manifest.json                         ← Manifest V3, minimal permissions
  background.js                         ← service worker: pairing, API fetch, optional decrypt, route, wipe
  content.js                            ← main-page field detection + fill
  content-iframe.js                     ← injected into payment/login iframes; registers fields with worker
  setup.html / setup.js                 ← pairing page; emits the connection string
  lib/field-detect.js                   ← generic field matching (reuse logic from plugins/.../browser/detect-fields.js)
  lib/fill-engine.js                    ← typing/dispatch into fields incl. iframes
  README.md / PRIVACY.md / STORE-LISTING.md
```
- **Decryption (Mode B) lives in `background.js`** (service worker), reusing OpenClaw's `decrypt.ts` logic via WebCrypto (`crypto.subtle`, AES-GCM). Mirror the memory-wipe.
- **Cross-origin iframes** (e.g. Stripe Elements, `*://checkout.pci.shopifyinc.com/*`) need `content-iframe.js` matched in the manifest; the worker routes fill commands to the correct frame.

### 7.5 Security properties to preserve
- Agent never receives values — only `ref` in, status out.
- Extension reads its API credential from its own storage, set at pairing — the agent does not pass it.
- One-time keys (Mode B) are server-issued and single-use; a burned key means start a new `ref`.
- Wipe decrypted values from memory immediately after fill.
- Never transmit anything to a non-creditclaw.com domain.

## 8. Chrome Web Store review — the real gates

These cause rejections; build to them from the start:
- **Manifest V3 only** (MV2 is rejected).
- **No remotely-hosted code.** All JS bundled; no `eval`, no CDN script loads. We fetch *data* from our API, never *code*. (#1 rejection cause.)
- **Single narrow purpose:** "securely fill form fields from a referenced source." Don't bundle unrelated features.
- **Minimal permissions:** `scripting` + `activeTab`, our API domain in `host_permissions`, and **optional** per-site host permissions requested at runtime instead of `<all_urls>` (blanket host access triggers heavy review + data-use disclosures).
- **Privacy policy + data-use disclosure** required (handles user data): data flows only between the user's configured backend and the page; never sold/shared.
- **No obfuscation**, readable source, per-permission justifications in the listing.
- **Neutral listing name** (e.g. "SecureFill" / "Context-Safe Form Filler"). Avoid evoking payments during review. Decision pending owner: neutral name vs. CreditClaw brand on the public listing.

## 9. Where an MCP server could slot in later (optional, not required)

A bundled MCP server could turn the API orchestration (register / status / spending / checkout / confirm) into real *tools* the agent calls, instead of the skill.md instructing ad-hoc HTTP. That's a robustness upgrade to the *orchestration* half. It does **not** replace the extension (MCP can't touch the live tab) and is **not** required for the security property. Build the extension + skill.md first; consider MCP only if hand-rolled API calls prove flaky.

## 10. Minimum viable deliverable

1. `plugins/secure-fill-extension/` — the MV3 extension above (Mode A + Mode B), generic, review-ready.
2. One generic `SKILL.md` telling the agent the flow: get a `ref` from the checkout call → `securefill-fill { ref }` → read status → confirm. Never decrypt, never call the key endpoint itself.
3. (Separately, not in this build) reword v4's card-first skills to generic terms and fix the two phantom endpoints + the missing hook.

That pair (extension + skill.md) is sufficient: agent never holds card data, works in the live browser, passes Chrome review.

## Status

Plan only. Nothing built yet. Audit of v4 + OpenClaw complete; endpoints, auth, and crypto requirements verified against the live codebase as of 2026-05-30.
