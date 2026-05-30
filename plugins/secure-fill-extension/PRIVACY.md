# SecureFill — Privacy Policy

SecureFill helps an AI assistant fill form fields without exposing the field
values to the assistant.

## What it stores

On the user's device only (via the browser's extension storage):

- A connection credential, set during pairing.
- An optional encrypted source, set during pairing.
- A local connection id and configuration.

Nothing is stored on any SecureFill-operated server. The extension has no
analytics and no third-party trackers.

## What it transmits

When asked to fill, the extension sends the supplied reference and its stored
credential to the user's own configured backend over HTTPS, and receives the
field values (or a one-time key to decrypt the locally stored source). Values
are written into the current page and then cleared from memory.

The extension transmits data only to the user's configured backend. It never
sends data to any other destination.

## What it does NOT do

- It does not sell or share user data.
- It does not transmit field values to the assistant or to any third party.
- It does not collect browsing history or analytics.

## Permissions

- **storage** — keep the pairing credential and configuration on the device.
- **webNavigation** — find the active tab's frames so values reach the correct
  field, including inside iframes.
- **host access to the configured backend** — fetch referenced values / keys.
- **content scripts on web pages** — fill fields on the page in use.

## Contact

For privacy questions, contact the operator of the configured backend.
