---
name: secure-fill
description: >
  Use when sensitive values must be entered into a web form during a checkout or
  authenticated flow — payment details, store logins, or any data that must not
  enter this conversation. Hands an opaque reference to the SecureFill browser
  extension, which resolves and fills the values itself. Trigger when a checkout
  returns a checkout_id to fill, when the user says "secure fill", "fill the
  card", "complete the checkout", "log me in securely", or "the extension is
  ready".
---

# Secure Fill

Fill sensitive fields on a web page **without ever seeing the values yourself**.
You only ever hold an opaque **reference** (e.g. a `checkout_id`). The SecureFill
browser extension fetches the real values, fills them into the page — including
cross-origin iframes — and returns only a status.

## Absolute rules

1. **Never fetch, decrypt, or read the values yourself.** Do not call key or
   value endpoints. The extension does that, out of your context.
2. **Only ever send a reference.** Never put a value into a `fill` message.
3. If the extension is not connected, tell the user to install/connect it. Do
   **not** attempt to fill fields manually as a fallback.

## Prerequisites

- The SecureFill extension is installed and connected.
- You have an opaque reference for the data to fill (for a purchase, the
  `checkout_id` returned by the checkout request).

## How to talk to the extension

Run these snippets with your browser JavaScript tool on the active page. The
extension only accepts same-origin messages.

### 1. Check it is connected

```js
new Promise((resolve) => {
  function on(e){ if (e.data?.type === "securefill-pong"){ window.removeEventListener("message", on); resolve(e.data); } }
  window.addEventListener("message", on);
  window.postMessage({ type: "securefill-ping" }, window.location.origin);
  setTimeout(() => resolve({ ready: false }), 1500);
});
```

If `ready` is false, the extension is not present — ask the user to install/connect it.

### 2. Pair it (first time only)

Pairing stores your bot credential (and, for the encrypted mode, the encrypted
source) inside the extension so it can resolve references on its own. Send this
once after the credential is available:

```js
window.postMessage({
  type: "securefill-setup",
  credential: "<YOUR_BOT_API_KEY>",
  encrypted_source: "<OPTIONAL_ENCRYPTED_SOURCE>"
}, window.location.origin);
```

Wait for `securefill-setup-result` with `{ status: "ready" }`.

### 3. Fill by reference

Fill all other non-sensitive fields yourself first (name, email, shipping,
expiry). Then hand off the sensitive fields:

```js
new Promise((resolve) => {
  function on(e){ if (e.data?.type === "securefill-fill-result"){ window.removeEventListener("message", on); resolve(e.data); } }
  window.addEventListener("message", on);
  window.postMessage({ type: "securefill-fill", ref: "<REFERENCE>" }, window.location.origin);
  setTimeout(() => resolve({ status: "error", reason: "timeout" }), 15000);
});
```

Read the result:

- `{ status: "filled", fields_filled: <count>, filled_tokens: [...] }` —
  everything requested was filled; proceed (e.g. submit / pay).
- `{ status: "partial", filled_tokens: [...], errors: [...] }` — some fields
  filled, some not. Check `errors` (entries like `"cvv: field_not_found"`),
  re-check the page for the missing fields, then retry with a **new**
  reference (a one-time reference is consumed on use) — or report to the user.
- `{ status: "error", reason?, errors? }` — nothing filled; surface the reason.
  If `not_configured`, pair the extension first. If the reason mentions a
  consumed/denied key (e.g. `key_fetch_failed_409`), get a new reference.

## Typical purchase flow

1. Request the checkout → receive a `checkout_id` (and approval status).
2. If approval is pending, wait until approved.
3. Fill non-sensitive fields yourself.
4. `securefill-fill { ref: checkout_id }` → wait for `filled`.
5. Submit / pay, detect the result, confirm with the backend.

At no point do the sensitive values pass through this conversation.
