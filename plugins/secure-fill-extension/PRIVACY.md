# SecureFill — Privacy Policy

SecureFill fills form fields on the user's behalf from a source the user
configures, while keeping the field values out of the AI assistant that requests
the fill.

## What it stores

On the user's device only (browser extension storage):

- A **connection credential**, entered during setup.
- An optional **encrypted source** (opaque; not readable without a key fetched
  at fill time).
- A backend base URL and local configuration.

Nothing is stored on any SecureFill-operated server. No analytics, no trackers.

## What it transmits

When asked to fill, the extension sends the supplied **reference** and its stored
credential to the user's configured backend over HTTPS, and receives a one-time
key used to decrypt the local source. The decrypted values are written into the
current page and then cleared from memory. Data is transmitted only to the
configured backend, never to any other destination, and never to the assistant.

## Data it may handle

The values filled are whatever the user configures. Depending on use, these can
include **authentication information** (usernames, passwords, tokens),
**personal information** (names, addresses, phone numbers), and **financial /
payment information** (card details). When you publish this extension, declare in
the store's data-use form whichever of these categories match your actual
configuration — do not under-declare. All handling is solely to fill the user's
own forms; data is never sold or shared.

## What it does not do

- Does not sell or share user data.
- Does not transmit field values to the assistant or any third party.
- Does not collect browsing history or analytics.
- Does not accept credential setup/clear commands from web pages.

## Permissions

- `storage` — keep the credential and configuration on the device.
- `webNavigation` — enumerate the active tab's frames to route a value into the
  correct field, including inside cross-origin iframes.
- host access to the configured backend — fetch the one-time key.
- content scripts on web pages — fill fields on the page in use (the broad-host
  model established password managers use).

## Contact

For privacy questions, contact the operator of the configured backend.
