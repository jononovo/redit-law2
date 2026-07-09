# SecureFill (v2)

A Chrome extension (Manifest V3) that fills form fields **from a referenced
source**, keeping the values out of the calling assistant's context.

An AI assistant driving a browser asks SecureFill to fill fields by passing a
single opaque **reference**. The extension resolves the real values itself,
fills them into the page — including inside cross-origin iframes — and returns
only a **status**. The values never enter the assistant's reasoning, logs, or
tool calls.

It is **value-type agnostic**: a referenced source can hold a login, an API
token, a shipping address, a phone number — anything that should stay out of
the model context.

## How it works

```
assistant (page main world)          SecureFill (isolated world + worker)
  │  postMessage {…-fill, ref}             │  content.js (top frame)
  │                                        │  └─► service worker
  │                                        │       ├─ fetch one-time key by ref
  │                                        │       ├─ AES-256-GCM decrypt source
  │                                        │       ├─ map each field → its frame
  │                                        │       └─ fill via per-frame scripts
  │  ◄── {status:"filled", …} ─────────────┤
```

The assistant runs in the page's main world. SecureFill's content scripts run
in an isolated world the page cannot read, and resolution/decryption happen in
the service worker. That boundary keeps values out of context.

### Two message namespaces (drop-in compatible)

The top-frame bridge accepts **both** `creditclaw-*` (what the CreditClaw v4
skills post) and `securefill-*` (neutral). They are treated identically.

| Message | Payload | Result |
|---|---|---|
| `…-ping` | — | `…-pong { ready, configured, version }` |
| `…-status` | — | `…-status-result { configured, has_api_key, has_blob, profile, version }` |
| `…-schema` | — | `…-schema-result { profile, tokens }` (names only, no decrypt) |
| `…-setup` | `{ credential \| api_key, encrypted_source \| encrypted_blob, api_base?, profile? }` | `…-setup-result { status: "ready" }` |
| `…-fill` | `{ ref }` or `{ checkout_id, fields?, targets? }` | `…-fill-result { status, fields_filled, filled_tokens, exp_month, exp_year, errors? }` |
| `…-clear` | — | `…-clear-result { status: "cleared" }` |

Both field-name conventions in `setup` are accepted (`api_key`/`encrypted_blob`
is what the v4 pairing skill sends; `credential`/`encrypted_source` is the
neutral form).

### MAIN-world touch-points (for property polling)

`page-bridge.js` exposes two non-sensitive globals in the top frame:

- `window.__creditclawExtensionReady === true` — extension installed.
- `window.__creditclawFillResult` — status of the most recent fill (reset to
  `null` when a new fill starts, so pollers never read a stale result). Never
  contains field values.

## Resolution & crypto (matches the backend wire format)

- The stored source is `base64( ciphertext ‖ 16-byte GCM tag )` — the tag is
  inline (standard WebCrypto output). Paste it with or without the delivery
  file's `ENCRYPTED_CARD_START/END` markers; setup strips them.
- `POST /bot/rail5/key { checkout_id }` returns `key_hex` (32-byte key) and
  `iv_hex` (12-byte IV) as lowercase hex. (`tag_hex` is also returned but is
  the same bytes already inline, so the WebCrypto path ignores it.)
- Decrypt = base64-decode the source, import the key, `subtle.decrypt` with
  the IV. Plaintext is a JSON record.
- Key delivery is **single-use** (second call → `409`) and requires the
  reference to be approved and owned by the calling credential. These surface
  as typed errors (`key_fetch_failed_409`, etc.).

## Field mapping: agent-driven first, table as fallback

The driving assistant already sees the page, so **agent-provided selectors are
the primary mapping path** and the profiles table is the fallback:

1. `…-schema` returns the token **names** the source exposes (from the profile
   tagged at setup). No decryption, no values.
2. The agent inspects the page and passes a `targets` map (token → CSS
   selector) in the fill request. Explicit selectors take priority.
3. Where the agent gives no selector, the extension falls back to the generic
   detector + the curated profile aliases (exact attribute matches only).

Note: a `targets` selector that matches an `<iframe>` element (rather than an
input inside it) is not fillable and falls through to alias auto-detection
inside each frame — provider-standard field names make this succeed in
practice. Selectors for the actual inputs work when frame-internal markup is
known.

`profiles.js` also **canonicalizes** requested names to record keys (e.g. a
request for `verification_value` resolves the record's `cvv` entry), so
callers can use whichever alias the page uses.

## Security boundary & honest limitations

- **Strong for cross-origin embedded fields.** Provider-hosted inputs render
  in cross-origin iframes; page JS can't read across that origin, so values
  filled there stay out of the assistant's reach. This is the primary case,
  and the frame routing (`webNavigation` + per-frame `sendMessage`) targets it
  directly.
- **Weaker for same-origin fields.** If a field is a plain same-origin input,
  page JS can read `input.value` after the fill. The isolated world keeps the
  credential, key, and resolution logic out of the page, but cannot hide a
  value already typed into a same-origin field.
- **A fill needs an approved reference.** A page script can't exfiltrate by
  sending `…-fill` — it has no valid single-use, approval-gated `ref`. It can
  at most disrupt local config via `…-setup`/`…-clear` — a nuisance, not an
  exfiltration path. (Page-bridged setup is deliberate: the pairing flow is
  agent-driven from page JS.)
- **Memory wipe is best-effort.** Values are overwritten and dropped after
  fill; JS/WebCrypto give no hard zeroization guarantee.

## Files

| File | Purpose |
|---|---|
| `manifest.json` | MV3 manifest. |
| `background.js` | Service worker: key fetch, AES-256-GCM decrypt, frame routing, wipe. |
| `content.js` | All frames: detect/apply; top frame also bridges page ↔ worker (both namespaces). |
| `page-bridge.js` | MAIN world: readiness flag + status-only result property. |
| `lib/field-detect.js` | Descriptor → element (selector, token, aliases). |
| `lib/fill-engine.js` | Writes values + framework-compatible events. |
| `profiles.js` | Schema tables (canonicalize + detection aliases). |
| `setup.html` / `setup.js` | Pairing / status (options page). |
| `test/harness.html` | Offline detection/fill/alias/decrypt checks (no network, no real data). |
| `PRIVACY.md`, `STORE-LISTING.md` | Store submission material. |

## Permissions

- `storage` — store the pairing credential and configuration locally.
- `webNavigation` — enumerate the active tab's frames to route fills into the
  correct iframe.
- `host_permissions: https://creditclaw.com/*` — fetch one-time keys from the
  configured backend.
- content scripts on `https://*/*` — fields can be on any site the user
  visits (the same broad-host model established password managers use).

## Load / build

Unpacked: `chrome://extensions` → Developer mode → Load unpacked → this folder
→ open the options page → enter credential (+ optional source).
To submit: zip the runtime files (see `STORE-LISTING.md`).
