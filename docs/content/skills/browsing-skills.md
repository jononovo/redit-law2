# Browsing the Supplier Hub

The Supplier Hub is CreditClaw's catalog of vendor skills — a searchable directory of all the stores and services your bot can shop at. You can browse it to see what's available, check vendor capabilities, and find the right suppliers for your purchasing needs.

## Accessing the Supplier Hub

Navigate to the **Skills** page from the main navigation. The Supplier Hub is publicly accessible — you don't need to be logged in to browse the catalog. You can find it at `/skills`.

## Searching and Filtering

### Search

Use the search bar at the top to find vendors by name. Results update as you type, making it easy to quickly locate a specific store.

### Sector Filters

Filter vendors by sector — the system uses 27 sectors derived from the Google Product Taxonomy, plus a Luxury filter:

- **Animals & Pet Supplies** — Pet food, supplies, and accessories
- **Apparel & Accessories** — Clothing, shoes, and fashion accessories
- **Arts & Entertainment** — Musical instruments, hobby supplies, art materials
- **Baby & Toddler** — Baby gear, clothing, and accessories
- **Business & Industrial** — Office equipment, industrial supplies
- **Cameras & Optics** — Photography equipment and optical instruments
- **Education** — Online courses, tutoring, certifications
- **Electronics** — Computers, phones, audio, and components
- **Events** — Concert tickets, sports tickets, conferences
- **Food, Beverages & Tobacco** — Grocery, specialty food, beverages
- **Food Services** — Restaurants, meal delivery, catering
- **Furniture** — Home and office furniture
- **Hardware** — Tools, fasteners, building materials
- **Health & Beauty** — Skincare, cosmetics, wellness products
- **Home & Garden** — Home decor, gardening, kitchen supplies
- **Luggage & Bags** — Travel bags, backpacks, handbags
- **Media** — Books, music, movies, video games
- **Office Supplies** — Stationery, paper, desk accessories
- **Religious & Ceremonial** — Religious items and ceremonial supplies
- **Software** — Desktop, mobile, and enterprise software
- **Sporting Goods** — Sports equipment, outdoor gear, fitness
- **Toys & Games** — Children's toys, board games, puzzles
- **Travel** — Flights, hotels, car rental, tours
- **Vehicles & Parts** — Automotive parts, vehicle accessories
- **General** — Department stores, supermarkets, and mega merchants that span multiple sectors
- **Specialty** — Niche vendors that don't fit other sectors
- **Luxury** — A special filter that shows brands with `luxury` or `ultra_luxury` tier, regardless of sector

### Checkout Method Filters

You can also filter by how the vendor accepts payments:

- **Native API** — Direct API integration for fully programmatic purchases
- **Agentic Checkout** — AI-assisted checkout flow
- **x402 Protocol** — Crypto-native payment protocol
- **CrossMint World** — CrossMint-powered checkout
- **Browser Automation** — Automated browser-based checkout

## Understanding Vendor Cards

Each vendor in the catalog is displayed as a card showing key information at a glance:

- **Vendor name and sector** — What they sell and their sector badge
- **Maturity level** — Verified, Beta, Community, or Draft
- **Checkout methods** — Which payment methods the vendor supports
- **Agent friendliness score** — A 0–5 rating of how easy it is for bots to shop there
- **Capabilities** — Icons indicating supported features like price lookup, stock checks, and order tracking

## Viewing Skill Details

Click on any vendor card to view the full skill detail page at `/skills/{vendor-slug}`. The detail page includes:

- **Complete capability list** — All supported features with descriptions
- **Checkout method details** — Configuration notes for each supported payment method
- **Search patterns** — How the bot finds products on this vendor
- **Shipping information** — Free shipping thresholds, estimated delivery, business shipping availability
- **Tips and best practices** — Vendor-specific advice for successful purchases
- **Version and verification info** — When the skill was last verified and what version it's on

## Choosing the Right Vendor

When selecting a vendor for your bot's purchases, consider:

1. **Maturity level** — Verified skills have the highest reliability
2. **Agent friendliness** — Higher scores mean fewer checkout failures
3. **Checkout methods** — Make sure the vendor supports a payment method compatible with your wallet type
4. **Capabilities** — Check that the vendor supports what you need (guest checkout, order tracking, returns, etc.)

## Next Steps

- [Skill Builder](/docs/skills/skill-builder) — Create a new skill for a vendor that's not in the catalog yet
- [Submitting a Supplier](/docs/skills/submitting-a-supplier) — Submit a vendor URL for the community to review
