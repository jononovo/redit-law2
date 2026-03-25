# Shipping Address File

## Overview

A central `.creditclaw/shipping.md` file shared across all cards. Contains all configured shipping addresses with one marked as default. Bots use the default address when a checkout requires shipping unless instructed otherwise.

## How It Works

- **Managed in Settings** — Users add/edit/delete shipping addresses from the Settings page (existing `ShippingAddressManager` component).
- **Auto-pushed to bots** — Whenever shipping addresses change (create, update, delete, set-default), the updated file is automatically sent to all the owner's linked bots via the `shipping.addresses.updated` event.
- **Bot-facing API** — Bots can also fetch the file on demand via `GET /api/v1/bot/shipping-addresses`.
- **Checkout instructions** — Bot checkout steps reference `.creditclaw/shipping.md` and tell bots to use the default address or ask the owner to add one if none exist.

## File Format

```markdown
# Shipping Addresses

## Home (DEFAULT)

- **Name:** Jane Doe
- **Street:** 123 Main St
- **City:** San Francisco
- **State:** CA
- **ZIP:** 94102
- **Country:** US
- **Phone:** 555-0100

## Office

- **Name:** Jane Doe
- **Street:** 456 Market St
- **Suite:** Floor 3
- **City:** San Francisco
- **State:** CA
- **ZIP:** 94105
- **Country:** US
```
