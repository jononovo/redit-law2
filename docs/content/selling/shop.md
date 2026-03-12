# Shop & Storefront

The Shop feature lets you create a public storefront where buyers can browse all your products and events in one place. Instead of sharing individual checkout page links, you can share a single shop URL.

## Setting Up Your Shop

Navigate to <a href="/shop" target="_blank">**Shop**</a> in the dashboard sidebar to access the shop admin page.

### Shop URL

Every shop gets a custom URL in the format: `https://creditclaw.com/s/{your-slug}`

Enter a slug using lowercase letters, numbers, and hyphens (e.g., `my-store`, `acme-api`, `bot-services`). This becomes your permanent shop address that you can share publicly.

### Banner Image

Add a banner image URL to display a hero image at the top of your storefront. This is optional but recommended for branding.

### Publishing

Toggle the **Shop is published** switch to make your storefront visible to anyone with the URL. When unpublished, visitors will see an error page.

After saving your settings, you can:
- **Copy the URL** — Click "Copy URL" to copy your shop link to the clipboard
- **View the shop** — Click "View Shop" to open your storefront in a new tab

## Your Details (Seller Identity)

The **Your Details** section on the Shop page is where you configure your business identity. These details are displayed on checkout pages, invoices, and your public storefront.

- **Business Name** — Your company or brand name
- **Logo URL** — A direct URL to your logo image (square recommended). A live preview is shown below the field.
- **Contact Email** — Shown to buyers on checkout pages
- **Link** — Your website, Instagram, or anywhere people can learn more
- **Description** — A short description of your business

All fields save together with the shop settings when you click **Save Settings**.

## Managing Products

Below the shop settings and your details, you'll see a list of all your **active** checkout pages. Each item shows:

- **Title** — The checkout page name
- **Type** — Whether it's a "Product" or "Event"
- **Price** — The amount (if set)
- **Sales count** — How many payments have been received

### Showing and Hiding Products

Use the toggle switch next to each checkout page to control whether it appears in your shop:

- **Visible** (blue highlight) — The page appears in your storefront
- **Hidden** — The page exists but isn't shown in the shop

Only active checkout pages can be added to the shop. Paused or expired pages won't appear in the list.

### Product Ordering

Products are displayed in the shop in the order shown in the admin panel. The order is determined by the `shop_order` value set on each checkout page.

## What Buyers See

When someone visits your shop URL, they see:

1. **Your business name and logo** — From the Your Details section on this page
2. **Banner image** — If you've set one
3. **Product grid** — All visible checkout pages displayed as cards with:
   - Product image (if set)
   - Title and description
   - Price
   - Page type badge (Product or Event)
   - A button to go to the checkout page

Clicking a product takes the buyer to the corresponding checkout page where they can complete the payment.

## Prerequisites

Before setting up your shop, make sure you have:

1. **Your business details** — Fill in the Your Details section on the Shop page
2. **At least one active checkout page** — Create checkout pages in the [Checkout](/docs/selling/checkout-pages) section
3. **A shop slug** — Choose a memorable URL for your storefront

## Next Steps

- [Checkout Pages](/docs/selling/checkout-pages) — Create products to sell in your shop
- [Seller Profile](/docs/settings/seller-profile) — Learn more about your business identity fields
- [Sales Tracking](/docs/selling/sales-tracking) — Monitor payments from your shop
