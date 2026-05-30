# SecureFill — Chrome Web Store submission notes

Internal checklist for publishing. Not shipped to users.

## Listing copy

- **Name:** SecureFill
- **Summary:** Fill form fields from a referenced source, keeping the values out
  of an assistant's context.
- **Category:** Productivity
- **Single purpose:** "Securely fill form fields from a referenced source." Do
  not add unrelated features — single-purpose is a review requirement.

## Permission justifications (paste into the dashboard)

- **storage** — Persist the pairing credential and configuration on the user's
  device between sessions.
- **webNavigation** — Enumerate the active tab's frames so a value can be routed
  to the correct field, including fields rendered inside iframes.
- **host permission `https://creditclaw.com/*`** — Fetch the referenced values
  (or a one-time decryption key) from the user's configured backend.
- **content scripts on `https://*/*`** — The fields to fill can be on any site
  the user visits; the extension must run on the page in use. This is the same
  broad-host model established password managers use.

## Review gates (must hold before submission)

- Manifest V3. ✅ (set)
- No remotely-hosted code: all JS is bundled; no `eval`, no external script
  loads. The extension fetches data only, never code. ✅
- No code obfuscation; source is readable. ✅
- Privacy policy published and linked (`PRIVACY.md` content, hosted at a public
  URL). ⛳ host before submitting.
- Data-use disclosures completed in the dashboard (handles user-provided data;
  not sold/shared). ⛳
- Icons (16/48/128 px) added to `manifest.json` and the listing. ⛳ add before
  submitting.

## Open decisions

- **Listing name:** "SecureFill" (neutral) is the default to avoid evoking a
  specific data type during review. Switch to a branded name only with owner
  sign-off.
- **Host permissions:** broad `https://*/*` content scripts are used so the
  assistant-driven fill works on arbitrary sites without per-site prompts. If a
  narrower model is preferred, switch to `optional_host_permissions` and request
  per-site — note this requires a user gesture per site and breaks unattended
  automation.
