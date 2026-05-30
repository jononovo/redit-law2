# SecureFill

A browser extension that fills form fields from a referenced source, keeping the
values out of the calling assistant's context.

An AI assistant driving a browser can ask SecureFill to fill a set of fields by
passing a single opaque **reference**. The extension fetches the actual values
itself, fills them into the page — including inside cross-origin iframes — and
returns only a status. The values never enter the assistant's reasoning, logs,
or tool calls.

## How it works

```
assistant (page world)            SecureFill (isolated world + worker)
  │  window.postMessage                │
  │  { securefill-fill, ref } ───────► │  content.js (top frame)
  │                                    │  └─► service worker
  │                                    │       ├─ resolve values from `ref`
  │                                    │       ├─ map each field to a frame
  │                                    │       └─ fill via content scripts
  │  ◄─── { status: "filled", … } ─────┤
```

The assistant runs in the page's main world. SecureFill's content scripts run in
an isolated world the page cannot read, and resolution/decryption happen in the
service worker. That boundary is what keeps values out of context.

## Security boundary & limitations

What this design guarantees, and what it doesn't:

- **Strong for cross-origin embedded fields.** Real payment fields render inside
  cross-origin iframes (Stripe, Shopify PCI, Adyen, Braintree). The page's own
  JavaScript (where the assistant runs) cannot read across that origin boundary,
  so values filled there stay out of the assistant's reach. This is the primary
  case.
- **Weaker for same-origin fields.** If a field lives in the top page (e.g. a
  plain same-origin login form), page JS can read `input.value` after the fill.
  The isolated-world boundary keeps the credential, the key, and the resolution
  logic out of the page, but it cannot hide a value already typed into a
  same-origin input. Don't treat same-origin fills as confidential from the
  page.
- **Triggering a fill requires a server-approved reference.** A `fill` request
  carries only an opaque `ref`. Mode B resolves it against a single-use,
  bot-scoped, approval-gated key endpoint (409 on reuse); Mode A against an
  authenticated values endpoint. A malicious page script cannot extract data by
  sending `securefill-fill` because it has no valid approved reference. It can
  at most disrupt local config via `securefill-setup`/`securefill-clear` — a
  nuisance, not an exfiltration path.
- **Memory wipe is best-effort.** Resolved values are overwritten and dropped
  after fill, but JS/WebCrypto give no hard zeroization guarantee. Values are
  short-lived but not provably erased.

## Resolution modes

- **Server-sourced values** — the worker fetches values by reference over HTTPS.
- **Client-held encrypted source** — the worker holds an encrypted source set at
  pairing, fetches a one-time key by reference, and decrypts locally
  (AES-256-GCM). The encrypted source and the key never co-locate anywhere except
  inside the worker.

## Message protocol (page → extension)

| Message | Payload | Result message |
|---|---|---|
| `securefill-ping` | — | `securefill-pong { ready, configured }` |
| `securefill-status` | — | `securefill-status-result { configured, version }` |
| `securefill-setup` | `{ credential, encrypted_source? }` | `securefill-setup-result { status }` |
| `securefill-fill` | `{ ref }` | `securefill-fill-result { status, fields_filled }` |
| `securefill-clear` | — | `securefill-clear-result { status }` |

Messages are accepted only from the same window and same origin.

## Files

| File | Purpose |
|---|---|
| `manifest.json` | MV3 manifest. |
| `background.js` | Service worker: resolution, optional decryption, frame routing, memory wipe. |
| `content.js` | Runs in all frames: detect/apply; in the top frame also bridges page ↔ worker. |
| `lib/field-detect.js` | Maps a field descriptor to an input element. |
| `lib/fill-engine.js` | Writes values and fires framework-compatible events. |
| `setup.html` / `setup.js` | Status / pairing page. |

## Permissions

- `storage` — store the pairing credential and configuration locally.
- `webNavigation` — enumerate the active tab's frames to route fills into the
  correct iframe.
- `host_permissions: https://creditclaw.com/*` — fetch referenced values / keys
  from the configured backend.
- content scripts on `https://*/*` — so fields can be filled on the page the
  assistant is on (the same broad-host model password managers use).

## Build / load

Unpacked: `chrome://extensions` → Developer mode → Load unpacked → this folder.
To submit: zip the contents of this folder. See `STORE-LISTING.md`.
