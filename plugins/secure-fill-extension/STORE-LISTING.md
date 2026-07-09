# SecureFill — Chrome Web Store submission notes

Internal checklist for publishing. Not shipped to users.

The listing must **pass review by being accurate**, not by hiding what the
extension does. Do not write copy whose goal is to keep a reviewer from
understanding a data type the extension can handle.

## Listing copy

- **Name:** SecureFill (neutral, matches the value-type-agnostic design).
  Switch to a branded name only with owner sign-off.
- **Summary:** Fill form fields from a referenced source, keeping the values out
  of an assistant's context.
- **Category:** Productivity
- **Single purpose:** "Fill form fields from a referenced source." Do not add
  unrelated features — single-purpose is a review requirement.

## Permission justifications (paste into the dashboard)

- **storage** — Persist the pairing credential and configuration on the user's
  device between sessions.
- **webNavigation** — Enumerate the active tab's frames so a value can be routed
  to the correct field, including fields rendered inside iframes.
- **host permission `https://creditclaw.com/*`** — Fetch a one-time decryption
  key from the user's configured backend.
- **content scripts on `https://*/*`** — The fields to fill can be on any site
  the user visits; the extension must run on the page in use. This is the same
  broad-host model established password managers use.

## Data-use disclosures

Declare truthfully in the dashboard's data-use form. Depending on what the user
configures as a source, the extension can handle **authentication information**,
**personal information**, and **financial/payment information**. Declare every
category that matches actual use — do not under-declare. All handling is solely
to fill forms on the user's behalf; nothing is sold, shared, or sent anywhere
except the user's configured backend.

## Review gates (must hold before submission)

- Manifest V3. ✅ (set)
- No remotely-hosted code: all JS is bundled; no `eval`, no external script
  loads. The extension fetches data only, never code. ✅
- No code obfuscation; source is readable. ✅
- Privacy policy published and linked. ✅ hosted at
  `https://creditclaw.com/securefill/privacy` (docs at
  `https://creditclaw.com/securefill`).
- Data-use disclosures completed in the dashboard. ⛳
- Icons (16/48/128 px) added to `manifest.json` and the listing. ✅ icons in
  `icons/`, wired in `manifest.json`. Store assets in `store-assets/`
  (`icon-128.png`, `screenshot-1280x800.png`, `promo-tile-440x280.png`).

## Open decisions

- **Host permissions:** broad `https://*/*` content scripts are used so the
  assistant-driven fill works on arbitrary sites without per-site prompts. If a
  narrower model is preferred, switch to `optional_host_permissions` and request
  per-site — note this requires a user gesture per site and breaks unattended
  automation.

## Zip contents (runtime files only)

`manifest.json`, `background.js`, `content.js`, `page-bridge.js`,
`profiles.js`, `lib/`, `setup.html`, `setup.js`, `icons/`, `PRIVACY.md`.
Exclude `README.md`, `STORE-LISTING.md`, `test/`, `store-assets/`.
