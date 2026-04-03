INSERT INTO brand_index (slug, name, domain, url, logo_url, description, sector, sub_sectors, tier, tags, carries_brands, has_mcp, mcp_url, has_api, api_endpoint, api_auth_required, api_docs_url, has_cli, cli_install_command, site_search, product_feed, capabilities, checkout_methods, ordering, checkout_provider, payment_methods_accepted, creditclaw_supports, business_account, tax_exempt_supported, po_number_supported, delivery_options, free_shipping_threshold, ships_internationally, supported_countries, has_deals, deals_url, deals_api, loyalty_program, maturity, claimed_by, claim_id, submitted_by, submitter_type, version, last_verified, active_version_id, brand_data, skill_md, created_at, updated_at, brand_type, rating_search_accuracy, rating_stock_reliability, rating_checkout_completion, axs_rating, rating_count, overall_score, score_breakdown, recommendations, scan_tier, last_scanned_at, last_scanned_by) VALUES ('amazon', 'Amazon', 'amazon.com', 'https://www.amazon.com', '/assets/images/vendors/amazon.svg', 'The world''s largest online marketplace offering millions of products across electronics, home, fashion, grocery, and more. Supports programmatic purchasing via CreditClaw''s native API integration with ASIN-based ordering.', 'retail', '{"general merchandise",electronics,"home goods",books,grocery}', 'value', '{"everything store",prime,aws,fba}', '{Apple,Samsung,Sony,Bose,Anker,Logitech,Nike,Lego,KitchenAid,"Instant Pot"}', false, NULL, true, NULL, false, NULL, false, NULL, true, false, '{price_lookup,stock_check,programmatic_checkout,order_tracking,returns}', '{native_api,self_hosted_card}', 'guest', 'in_house', '{card,apple_pay,google_pay}', '{}', false, false, false, '{same-day,next-day,standard}', 35, false, '{US}', true, 'https://www.amazon.com/deals', NULL, 'Amazon Prime', 'verified', NULL, NULL, 'creditclaw', 'ai_generated', '1.0.0', '2026-02-15', NULL, '{"url": "https://www.amazon.com", "name": "Amazon", "slug": "amazon", "tips": ["Use ASIN for fastest checkout — no browser interaction needed", "CrossMint handles fulfillment end-to-end including tracking", "Prime shipping not available through API — standard shipping only", "Check product availability before purchasing; some items are marketplace-only"], "deals": {"dealsUrl": "https://www.amazon.com/deals", "currentDeals": true, "loyaltyProgram": "Amazon Prime"}, "buying": {"freeDelivery": "for orders over $35 or with Prime", "paymentMethods": ["card", "apple_pay", "google_pay"], "deliveryOptions": "same-day, next-day, standard", "checkoutProviders": ["in_house"], "orderingPermission": "guest"}, "search": {"pattern": "Search by product name or paste an ASIN directly. No login needed to browse products and prices.", "urlTemplate": "https://www.amazon.com/s?k={q}", "productIdFormat": "ASIN (e.g., B0EXAMPLE123)"}, "logoUrl": "/assets/images/vendors/amazon.svg", "version": "1.0.0", "category": "retail", "checkout": {"guestCheckout": false, "poNumberField": false, "taxExemptField": false}, "maturity": "verified", "shipping": {"estimatedDays": "1-5 business days", "freeThreshold": 35, "businessShipping": false}, "taxonomy": {"tags": ["everything store", "prime", "aws", "fba"], "tier": "value", "sector": "retail", "subSectors": ["general merchandise", "electronics", "home goods", "books", "grocery"]}, "generatedBy": "manual", "capabilities": ["price_lookup", "stock_check", "programmatic_checkout", "order_tracking", "returns"], "lastVerified": "2026-02-15", "methodConfig": {"native_api": {"notes": "Full programmatic purchasing via CrossMint. Use ASIN as product identifier.", "requiresAuth": false, "locatorFormat": "amazon:{ASIN}", "searchEndpoint": "/api/v1/card-wallet/bot/search"}, "self_hosted_card": {"notes": "Fallback for items not available through CrossMint API.", "requiresAuth": true, "locatorFormat": "url:{product_url}"}}, "feedbackStats": {"successRate": 0.94}, "checkoutMethods": ["native_api", "self_hosted_card"], "searchDiscovery": {"mcp": false, "searchApi": true, "searchInternal": true}}'::jsonb, E'---
name: creditclaw-shop-amazon
version: 1.0.0
description: "Shop Amazon using CreditClaw payment rails"
homepage: https://creditclaw.com/skills/amazon
requires: [creditclaw]
maturity: verified
agent_friendliness: 5/5
last_verified: 2026-02-15
sector: retail
tier: marketplace
sub_sectors: [general merchandise, electronics, home goods, books, grocery]
ordering_permission: guest
payment_methods: [card, apple_pay, google_pay]
search_api: true
mcp: false
current_deals: true
---

# Shopping at Amazon

**Store URL:** https://www.amazon.com
**Category:** retail
**Agent Friendliness:** ★★★★★ (5/5)
**Capabilities:** Price Lookup, Stock Check, Programmatic Checkout, Order Tracking, Returns
**Success Rate:** 94%

---

## Checkout Methods (in order of preference)

- **Native API** — Full programmatic purchasing via CrossMint. Use ASIN as product identifier.
- **Self-Hosted Card** (requires login) — Fallback for items not available through CrossMint API.

---

## How to Search

Search by product name or paste an ASIN directly. No login needed to browse products and prices.

Search URL: `https://www.amazon.com/s?k={q}`

Product ID format: `ASIN (e.g., B0EXAMPLE123)`

---

## How to Checkout

Account login required before checkout.

Use your CreditClaw credentials to pay.

Call `POST /api/v1/card-wallet/bot/search` with the product URL to get variant/pricing info before purchasing.

---

## Shipping

Free shipping on orders over $35.
Estimated delivery: 1-5 business days

---

## Taxonomy

- **Sector:** Retail
- **Sub-sectors:** general merchandise, electronics, home goods, books, grocery
- **Tier:** Marketplace
- **Tags:** everything store, prime, aws, fba
---

## Search Discovery

- **Search API:** Available
- **MCP Support:** Not supported
- **Internal Search:** Available

---

## Buying Configuration

- **Ordering:** Guest
- **Payment Methods:** Credit/Debit Card, Apple Pay, Google Pay
- **Delivery:** same-day, next-day, standard
- **Free Delivery:** for orders over $35 or with Prime


---

## Deals & Promotions

- **Active Deals:** Yes
- **Deals Page:** https://www.amazon.com/deals

- **Loyalty Program:** Amazon Prime
---

## Tips

- Use ASIN for fastest checkout — no browser interaction needed
- CrossMint handles fulfillment end-to-end including tracking
- Prime shipping not available through API — standard shipping only
- Check product availability before purchasing; some items are marketplace-only

---

## Making the Purchase

```bash
curl -X POST https://creditclaw.com/api/v1/card-wallet/bot/purchase \\
  -H "Authorization: Bearer $CREDITCLAW_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d ''{
    "merchant": "amazon",
    "product_id": "amazon:{ASIN}",
    "shipping_address": { "name": "...", "line1": "...", "city": "...", "state": "...", "postalCode": "...", "country": "US" }
  }''
```

## Tracking

Order tracking is available. Poll the status endpoint for shipping updates.

---

## Metadata

- **Version:** 1.0.0
- **Last verified:** 2026-02-15
- **Generated by:** manual
- **Skill URL:** https://creditclaw.com/api/v1/bot/skills/amazon
- **Catalog page:** https://creditclaw.com/skills/amazon
', '2026-03-24 18:50:21.285474', '2026-03-24 18:50:21.285474', 'marketplace', NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL) ON CONFLICT (slug) DO NOTHING;
INSERT INTO brand_index (slug, name, domain, url, logo_url, description, sector, sub_sectors, tier, tags, carries_brands, has_mcp, mcp_url, has_api, api_endpoint, api_auth_required, api_docs_url, has_cli, cli_install_command, site_search, product_feed, capabilities, checkout_methods, ordering, checkout_provider, payment_methods_accepted, creditclaw_supports, business_account, tax_exempt_supported, po_number_supported, delivery_options, free_shipping_threshold, ships_internationally, supported_countries, has_deals, deals_url, deals_api, loyalty_program, maturity, claimed_by, claim_id, submitted_by, submitter_type, version, last_verified, active_version_id, brand_data, skill_md, created_at, updated_at, brand_type, rating_search_accuracy, rating_stock_reliability, rating_checkout_completion, axs_rating, rating_count, overall_score, score_breakdown, recommendations, scan_tier, last_scanned_at, last_scanned_by) VALUES ('shopify', 'Shopify Stores', 'shopify.com', 'https://www.shopify.com', '/assets/images/vendors/shopify.svg', 'Universal connector for any Shopify-powered storefront. Supports programmatic checkout via Shopify''s Storefront API including product search, cart management, and direct checkout.', 'retail', '{platform,"dtc brands","independent stores"}', 'mid_range', '{platform,"shopify payments",dtc}', '{}', false, NULL, true, NULL, false, NULL, false, NULL, true, false, '{price_lookup,stock_check,programmatic_checkout}', '{native_api,self_hosted_card}', 'guest', 'shopify', '{card,apple_pay,google_pay,klarna,afterpay}', '{}', false, false, false, '{"varies by store"}', NULL, false, '{US}', false, NULL, NULL, NULL, 'verified', NULL, NULL, 'creditclaw', 'ai_generated', '1.0.0', '2026-02-15', NULL, '{"url": "https://www.shopify.com", "name": "Shopify Stores", "slug": "shopify", "tips": ["Always look up variants before purchasing — Shopify products require a specific variant ID", "The search API is in beta and may not work for all Shopify stores", "No delivery tracking after order is placed through the API", "Guest checkout is usually available on most Shopify stores"], "deals": {"currentDeals": false}, "buying": {"freeDelivery": "varies by store", "paymentMethods": ["card", "apple_pay", "google_pay", "klarna", "afterpay"], "deliveryOptions": "varies by store", "checkoutProviders": ["shopify"], "orderingPermission": "guest"}, "search": {"pattern": "Navigate to the Shopify store URL and search using the store''s search bar. Use the CreditClaw search endpoint to look up variant IDs.", "productIdFormat": "Product URL + Variant ID"}, "logoUrl": "/assets/images/vendors/shopify.svg", "version": "1.0.0", "category": "retail", "checkout": {"guestCheckout": true, "poNumberField": false, "taxExemptField": false}, "maturity": "verified", "shipping": {"estimatedDays": "Varies by store", "businessShipping": false}, "taxonomy": {"tags": ["platform", "shopify payments", "dtc"], "tier": "mid_range", "sector": "retail", "subSectors": ["platform", "dtc brands", "independent stores"]}, "generatedBy": "manual", "capabilities": ["price_lookup", "stock_check", "programmatic_checkout"], "lastVerified": "2026-02-15", "methodConfig": {"native_api": {"notes": "Variant lookup required before purchase. Use the search endpoint with the product URL.", "requiresAuth": false, "locatorFormat": "{product_url}:{variant_id}", "searchEndpoint": "/api/v1/card-wallet/bot/search"}, "self_hosted_card": {"notes": "Works with any Shopify store checkout. Guest checkout usually available.", "requiresAuth": false, "locatorFormat": "url:{product_url}"}}, "feedbackStats": {"successRate": 0.87}, "checkoutMethods": ["native_api", "self_hosted_card"], "searchDiscovery": {"mcp": false, "searchApi": true, "searchInternal": true}}'::jsonb, E'---
name: creditclaw-shop-shopify
version: 1.0.0
description: "Shop Shopify Stores using CreditClaw payment rails"
homepage: https://creditclaw.com/skills/shopify
requires: [creditclaw]
maturity: verified
agent_friendliness: 5/5
last_verified: 2026-02-15
sector: retail
tier: marketplace
sub_sectors: [platform, dtc brands, independent stores]
ordering_permission: guest
payment_methods: [card, apple_pay, google_pay, klarna, afterpay]
search_api: true
mcp: false
current_deals: false
---

# Shopping at Shopify Stores

**Store URL:** https://www.shopify.com
**Category:** retail
**Agent Friendliness:** ★★★★★ (5/5)
**Capabilities:** Price Lookup, Stock Check, Programmatic Checkout
**Success Rate:** 87%

---

## Checkout Methods (in order of preference)

- **Native API** — Variant lookup required before purchase. Use the search endpoint with the product URL.
- **Self-Hosted Card** — Works with any Shopify store checkout. Guest checkout usually available.

---

## How to Search

Navigate to the Shopify store URL and search using the store''s search bar. Use the CreditClaw search endpoint to look up variant IDs.

Product ID format: `Product URL + Variant ID`

---

## How to Checkout

Guest checkout is available — no account needed.

Use your CreditClaw credentials to pay.

Call `POST /api/v1/card-wallet/bot/search` with the product URL to get variant/pricing info before purchasing.

---

## Shipping

No standard free shipping threshold.
Estimated delivery: Varies by store

---

## Taxonomy

- **Sector:** Retail
- **Sub-sectors:** platform, dtc brands, independent stores
- **Tier:** Marketplace
- **Tags:** platform, shopify payments, dtc
---

## Search Discovery

- **Search API:** Available
- **MCP Support:** Not supported
- **Internal Search:** Available

---

## Buying Configuration

- **Ordering:** Guest
- **Payment Methods:** Credit/Debit Card, Apple Pay, Google Pay, Klarna, Afterpay
- **Delivery:** varies by store
- **Free Delivery:** varies by store


---

## Deals & Promotions

- **Active Deals:** No



---

## Tips

- Always look up variants before purchasing — Shopify products require a specific variant ID
- The search API is in beta and may not work for all Shopify stores
- No delivery tracking after order is placed through the API
- Guest checkout is usually available on most Shopify stores

---

## Making the Purchase

```bash
curl -X POST https://creditclaw.com/api/v1/card-wallet/bot/purchase \\
  -H "Authorization: Bearer $CREDITCLAW_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d ''{
    "merchant": "shopify",
    "product_id": "{product_url}:{variant_id}",
    "shipping_address": { "name": "...", "line1": "...", "city": "...", "state": "...", "postalCode": "...", "country": "US" }
  }''
```

## Tracking

Order tracking is not yet available for this vendor. Monitor email for shipping confirmation.

---

## Metadata

- **Version:** 1.0.0
- **Last verified:** 2026-02-15
- **Generated by:** manual
- **Skill URL:** https://creditclaw.com/api/v1/bot/skills/shopify
- **Catalog page:** https://creditclaw.com/skills/shopify
', '2026-03-24 18:50:21.315288', '2026-03-24 18:50:21.315288', 'marketplace', NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL) ON CONFLICT (slug) DO NOTHING;
INSERT INTO brand_index (slug, name, domain, url, logo_url, description, sector, sub_sectors, tier, tags, carries_brands, has_mcp, mcp_url, has_api, api_endpoint, api_auth_required, api_docs_url, has_cli, cli_install_command, site_search, product_feed, capabilities, checkout_methods, ordering, checkout_provider, payment_methods_accepted, creditclaw_supports, business_account, tax_exempt_supported, po_number_supported, delivery_options, free_shipping_threshold, ships_internationally, supported_countries, has_deals, deals_url, deals_api, loyalty_program, maturity, claimed_by, claim_id, submitted_by, submitter_type, version, last_verified, active_version_id, brand_data, skill_md, created_at, updated_at, brand_type, rating_search_accuracy, rating_stock_reliability, rating_checkout_completion, axs_rating, rating_count, overall_score, score_breakdown, recommendations, scan_tier, last_scanned_at, last_scanned_by) VALUES ('amazon-business', 'Amazon Business', 'business.amazon.com', 'https://business.amazon.com', '/assets/images/vendors/amazon-business.svg', 'Amazon''s B2B platform offering business pricing, quantity discounts, tax exemption, PO numbers, and approval workflows. Ideal for enterprise procurement with multi-user account management.', 'office', '{"business supplies","bulk purchasing","office equipment"}', 'value', '{b2b,"tax exempt","quantity discounts","business prime"}', '{3M,Rubbermaid,HP,Brother,Avery,Fellowes,Kimberly-Clark,Georgia-Pacific}', false, NULL, false, NULL, false, NULL, false, NULL, true, false, '{price_lookup,bulk_pricing,tax_exemption,po_numbers,order_tracking,business_invoicing,account_creation}', '{self_hosted_card}', 'registered', 'in_house', '{card,invoice,ach}', '{}', true, true, true, '{same-day,next-day,standard}', 25, false, '{US}', true, 'https://business.amazon.com/en/discover-products/deals', NULL, 'Business Prime', 'beta', NULL, NULL, 'creditclaw', 'ai_generated', '1.0.0', '2026-02-10', NULL, '{"url": "https://business.amazon.com", "name": "Amazon Business", "slug": "amazon-business", "tips": ["Requires Amazon Business account — owner must set up beforehand", "Tax exemption certificates can be uploaded in account settings", "Quantity discounts often beat consumer Amazon by 15-40%", "PO numbers can be attached to orders for accounting", "Business Prime offers free shipping on all orders"], "deals": {"dealsUrl": "https://business.amazon.com/en/discover-products/deals", "currentDeals": true, "loyaltyProgram": "Business Prime"}, "buying": {"freeDelivery": "with Business Prime", "paymentMethods": ["card", "invoice", "ach"], "deliveryOptions": "same-day, next-day, standard", "checkoutProviders": ["in_house"], "orderingPermission": "registered"}, "search": {"pattern": "Search normally on business.amazon.com. Look for ''Business Price'' and ''Quantity Discounts'' badges for bulk pricing.", "urlTemplate": "https://www.amazon.com/s?k={q}", "productIdFormat": "ASIN"}, "logoUrl": "/assets/images/vendors/amazon-business.svg", "version": "1.0.0", "category": "retail", "checkout": {"guestCheckout": false, "poNumberField": true, "taxExemptField": true}, "maturity": "beta", "shipping": {"estimatedDays": "1-5 business days", "freeThreshold": 25, "businessShipping": true}, "taxonomy": {"tags": ["b2b", "tax exempt", "quantity discounts", "business prime"], "tier": "value", "sector": "office", "subSectors": ["business supplies", "bulk purchasing", "office equipment"]}, "generatedBy": "manual", "capabilities": ["price_lookup", "bulk_pricing", "tax_exemption", "po_numbers", "order_tracking", "business_invoicing", "account_creation"], "lastVerified": "2026-02-10", "methodConfig": {"self_hosted_card": {"notes": "Requires Amazon Business account. Owner must set up account beforehand. Tax exemption certs can be uploaded in account settings.", "requiresAuth": true, "locatorFormat": "url:{product_url}"}}, "checkoutMethods": ["self_hosted_card"], "searchDiscovery": {"mcp": false, "searchApi": false, "searchInternal": true}}'::jsonb, E'---
name: creditclaw-shop-amazon-business
version: 1.0.0
description: "Shop Amazon Business using CreditClaw payment rails"
homepage: https://creditclaw.com/skills/amazon-business
requires: [creditclaw]
maturity: beta
agent_friendliness: 0/5
last_verified: 2026-02-10
sector: office
tier: wholesale
sub_sectors: [business supplies, bulk purchasing, office equipment]
ordering_permission: registered
payment_methods: [card, invoice, ach]
search_api: false
mcp: false
current_deals: true
---

# Shopping at Amazon Business

**Store URL:** https://business.amazon.com
**Category:** retail
**Agent Friendliness:** ☆☆☆☆☆ (0/5)
**Capabilities:** Price Lookup, Bulk Pricing, Tax Exemption, PO Numbers, Order Tracking, Business Invoicing, Account Creation


---

## Checkout Methods (in order of preference)

- **Self-Hosted Card** (requires login) — Requires Amazon Business account. Owner must set up account beforehand. Tax exemption certs can be uploaded in account settings.

---

## How to Search

Search normally on business.amazon.com. Look for ''Business Price'' and ''Quantity Discounts'' badges for bulk pricing.

Search URL: `https://www.amazon.com/s?k={q}`

Product ID format: `ASIN`

---

## How to Checkout

Account login required before checkout.
- PO number field available at checkout.
- Tax exemption field available. Check if your owner has a tax certificate on file.

Use your CreditClaw credentials to pay.


---

## Shipping

Free shipping on orders over $25.
Estimated delivery: 1-5 business days
Business/bulk shipping rates available.

---

## Taxonomy

- **Sector:** Office
- **Sub-sectors:** business supplies, bulk purchasing, office equipment
- **Tier:** Wholesale
- **Tags:** b2b, tax exempt, quantity discounts, business prime
---

## Search Discovery

- **Search API:** Not available
- **MCP Support:** Not supported
- **Internal Search:** Available

---

## Buying Configuration

- **Ordering:** Registered Account
- **Payment Methods:** Credit/Debit Card, Invoice / Net Terms, ACH Transfer
- **Delivery:** same-day, next-day, standard
- **Free Delivery:** with Business Prime


---

## Deals & Promotions

- **Active Deals:** Yes
- **Deals Page:** https://business.amazon.com/en/discover-products/deals

- **Loyalty Program:** Business Prime
---

## Tips

- Requires Amazon Business account — owner must set up beforehand
- Tax exemption certificates can be uploaded in account settings
- Quantity discounts often beat consumer Amazon by 15-40%
- PO numbers can be attached to orders for accounting
- Business Prime offers free shipping on all orders

---

## Making the Purchase

```bash
curl -X POST https://creditclaw.com/api/v1/bot/merchant/checkout \\
  -H "Authorization: Bearer $CREDITCLAW_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d ''{
    "merchant": "amazon-business",
    "product_id": "url:{product_url}",
    "shipping_address": { "name": "...", "line1": "...", "city": "...", "state": "...", "postalCode": "...", "country": "US" }
  }''
```

## Tracking

Order tracking is available. Poll the status endpoint for shipping updates.

---

## Metadata

- **Version:** 1.0.0
- **Last verified:** 2026-02-10
- **Generated by:** manual
- **Skill URL:** https://creditclaw.com/api/v1/bot/skills/amazon-business
- **Catalog page:** https://creditclaw.com/skills/amazon-business
', '2026-03-24 18:50:21.320974', '2026-03-25 18:56:28.732', 'marketplace', NULL, NULL, NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL) ON CONFLICT (slug) DO NOTHING;
INSERT INTO brand_index (slug, name, domain, url, logo_url, description, sector, sub_sectors, tier, tags, carries_brands, has_mcp, mcp_url, has_api, api_endpoint, api_auth_required, api_docs_url, has_cli, cli_install_command, site_search, product_feed, capabilities, checkout_methods, ordering, checkout_provider, payment_methods_accepted, creditclaw_supports, business_account, tax_exempt_supported, po_number_supported, delivery_options, free_shipping_threshold, ships_internationally, supported_countries, has_deals, deals_url, deals_api, loyalty_program, maturity, claimed_by, claim_id, submitted_by, submitter_type, version, last_verified, active_version_id, brand_data, skill_md, created_at, updated_at, brand_type, rating_search_accuracy, rating_stock_reliability, rating_checkout_completion, axs_rating, rating_count, overall_score, score_breakdown, recommendations, scan_tier, last_scanned_at, last_scanned_by) VALUES ('walmart', 'Walmart', 'walmart.com', 'https://www.walmart.com', '/assets/images/vendors/walmart.svg', 'America''s largest retailer with extensive online selection across groceries, electronics, home goods, and apparel. Guest checkout available with competitive pricing and free shipping over $35.', 'retail', '{"general merchandise",grocery,"home goods",electronics}', 'value', '{"everyday low prices",walmart+,"in-store pickup"}', '{Samsung,Apple,Sony,Ninja,"Ozark Trail","Great Value",Dyson,Keurig,Lego,Crayola}', false, NULL, false, NULL, false, NULL, false, NULL, true, false, '{price_lookup,stock_check,order_tracking}', '{self_hosted_card,browser_automation}', 'guest', 'in_house', '{card,apple_pay,google_pay}', '{}', false, false, false, '{standard,express,"in-store pickup"}', 35, false, '{US}', true, 'https://www.walmart.com/shop/deals', NULL, 'Walmart+', 'beta', NULL, NULL, 'creditclaw', 'ai_generated', '1.0.0', '2026-02-10', NULL, '{"url": "https://www.walmart.com", "name": "Walmart", "slug": "walmart", "tips": ["Guest checkout is available — no account needed for basic purchases", "Walmart+ members get free shipping on all orders", "Marketplace items may have different shipping policies", "In-store pickup available for many items (not supported via API yet)", "Price matching is not available for online orders"], "deals": {"dealsUrl": "https://www.walmart.com/shop/deals", "currentDeals": true, "loyaltyProgram": "Walmart+"}, "buying": {"freeDelivery": "for orders over $35 or with Walmart+", "paymentMethods": ["card", "apple_pay", "google_pay"], "deliveryOptions": "standard, express, in-store pickup", "checkoutProviders": ["in_house"], "orderingPermission": "guest"}, "search": {"pattern": "Search on walmart.com. Products are identified by item number in the URL. Filter by price, rating, and availability.", "urlTemplate": "https://www.walmart.com/search?q={q}", "productIdFormat": "Item number (numeric, found in URL)"}, "logoUrl": "/assets/images/vendors/walmart.svg", "version": "1.0.0", "category": "retail", "checkout": {"guestCheckout": true, "poNumberField": false, "taxExemptField": false}, "maturity": "beta", "shipping": {"estimatedDays": "2-7 business days", "freeThreshold": 35, "businessShipping": false}, "taxonomy": {"tags": ["everyday low prices", "walmart+", "in-store pickup"], "tier": "value", "sector": "retail", "subSectors": ["general merchandise", "grocery", "home goods", "electronics"]}, "generatedBy": "manual", "capabilities": ["price_lookup", "stock_check", "order_tracking"], "lastVerified": "2026-02-10", "methodConfig": {"self_hosted_card": {"notes": "Guest checkout available. Standard credit card checkout flow.", "requiresAuth": false, "locatorFormat": "url:{product_url}"}, "browser_automation": {"notes": "Fallback for complex product configurations or marketplace items.", "requiresAuth": false}}, "checkoutMethods": ["self_hosted_card", "browser_automation"], "searchDiscovery": {"mcp": false, "searchApi": false, "searchInternal": true}}'::jsonb, E'---
name: creditclaw-shop-walmart
version: 1.0.0
description: "Shop Walmart using CreditClaw payment rails"
homepage: https://creditclaw.com/skills/walmart
requires: [creditclaw]
maturity: beta
agent_friendliness: 2/5
last_verified: 2026-02-10
sector: retail
tier: value
sub_sectors: [general merchandise, grocery, home goods, electronics]
ordering_permission: guest
payment_methods: [card, apple_pay, google_pay]
search_api: false
mcp: false
current_deals: true
---

# Shopping at Walmart

**Store URL:** https://www.walmart.com
**Category:** retail
**Agent Friendliness:** ★★☆☆☆ (2/5)
**Capabilities:** Price Lookup, Stock Check, Order Tracking


---

## Checkout Methods (in order of preference)

- **Self-Hosted Card** — Guest checkout available. Standard credit card checkout flow.
- **Browser Automation** — Fallback for complex product configurations or marketplace items.

---

## How to Search

Search on walmart.com. Products are identified by item number in the URL. Filter by price, rating, and availability.

Search URL: `https://www.walmart.com/search?q={q}`

Product ID format: `Item number (numeric, found in URL)`

---

## How to Checkout

Guest checkout is available — no account needed.

Use your CreditClaw credentials to pay.


---

## Shipping

Free shipping on orders over $35.
Estimated delivery: 2-7 business days

---

## Taxonomy

- **Sector:** Retail
- **Sub-sectors:** general merchandise, grocery, home goods, electronics
- **Tier:** Value
- **Tags:** everyday low prices, walmart+, in-store pickup
---

## Search Discovery

- **Search API:** Not available
- **MCP Support:** Not supported
- **Internal Search:** Available

---

## Buying Configuration

- **Ordering:** Guest
- **Payment Methods:** Credit/Debit Card, Apple Pay, Google Pay
- **Delivery:** standard, express, in-store pickup
- **Free Delivery:** for orders over $35 or with Walmart+


---

## Deals & Promotions

- **Active Deals:** Yes
- **Deals Page:** https://www.walmart.com/shop/deals

- **Loyalty Program:** Walmart+
---

## Tips

- Guest checkout is available — no account needed for basic purchases
- Walmart+ members get free shipping on all orders
- Marketplace items may have different shipping policies
- In-store pickup available for many items (not supported via API yet)
- Price matching is not available for online orders

---

## Making the Purchase

```bash
curl -X POST https://creditclaw.com/api/v1/bot/merchant/checkout \\
  -H "Authorization: Bearer $CREDITCLAW_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d ''{
    "merchant": "walmart",
    "product_id": "url:{product_url}",
    "shipping_address": { "name": "...", "line1": "...", "city": "...", "state": "...", "postalCode": "...", "country": "US" }
  }''
```

## Tracking

Order tracking is available. Poll the status endpoint for shipping updates.

---

## Metadata

- **Version:** 1.0.0
- **Last verified:** 2026-02-10
- **Generated by:** manual
- **Skill URL:** https://creditclaw.com/api/v1/bot/skills/walmart
- **Catalog page:** https://creditclaw.com/skills/walmart
', '2026-03-24 18:50:21.334873', '2026-03-24 18:50:21.334873', 'retailer', NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL) ON CONFLICT (slug) DO NOTHING;
INSERT INTO brand_index (slug, name, domain, url, logo_url, description, sector, sub_sectors, tier, tags, carries_brands, has_mcp, mcp_url, has_api, api_endpoint, api_auth_required, api_docs_url, has_cli, cli_install_command, site_search, product_feed, capabilities, checkout_methods, ordering, checkout_provider, payment_methods_accepted, creditclaw_supports, business_account, tax_exempt_supported, po_number_supported, delivery_options, free_shipping_threshold, ships_internationally, supported_countries, has_deals, deals_url, deals_api, loyalty_program, maturity, claimed_by, claim_id, submitted_by, submitter_type, version, last_verified, active_version_id, brand_data, skill_md, created_at, updated_at, brand_type, rating_search_accuracy, rating_stock_reliability, rating_checkout_completion, axs_rating, rating_count, overall_score, score_breakdown, recommendations, scan_tier, last_scanned_at, last_scanned_by) VALUES ('walmart-business', 'Walmart Business', 'business.walmart.com', 'https://business.walmart.com', '/assets/images/vendors/walmart-business.svg', 'Walmart''s business purchasing platform with bulk pricing, tax exemption certificates, PO number support, and business invoicing for enterprise and government buyers.', 'office', '{"business supplies","bulk purchasing",janitorial}', 'value', '{b2b,"tax exempt",business+}', '{3M,Rubbermaid,Clorox,Bounty,Lysol,Hefty,Dixie,Scott}', false, NULL, false, NULL, false, NULL, false, NULL, true, false, '{price_lookup,bulk_pricing,tax_exemption,po_numbers,business_invoicing,account_creation}', '{self_hosted_card}', 'registered', 'in_house', '{card,invoice}', '{}', true, true, true, '{standard,"bulk delivery"}', 35, false, '{US}', false, NULL, NULL, NULL, 'draft', NULL, NULL, 'creditclaw', 'ai_generated', '0.1.0', '2026-02-08', NULL, '{"url": "https://business.walmart.com", "name": "Walmart Business", "slug": "walmart-business", "tips": ["Requires Walmart Business account — owner must register first", "Tax exemption available after uploading certificates", "Bulk pricing available on qualifying quantities", "Business+ membership includes free shipping and 2% rewards"], "deals": {"currentDeals": false}, "buying": {"freeDelivery": "for orders over $35 or with Business+", "paymentMethods": ["card", "invoice"], "deliveryOptions": "standard, bulk delivery", "checkoutProviders": ["in_house"], "orderingPermission": "registered"}, "search": {"pattern": "Search on business.walmart.com. Look for bulk pricing tiers and business-specific products.", "urlTemplate": "https://business.walmart.com/search?q={q}", "productIdFormat": "Item number"}, "logoUrl": "/assets/images/vendors/walmart-business.svg", "version": "0.1.0", "category": "retail", "checkout": {"guestCheckout": false, "poNumberField": true, "taxExemptField": true}, "maturity": "draft", "shipping": {"estimatedDays": "2-7 business days", "freeThreshold": 35, "businessShipping": true}, "taxonomy": {"tags": ["b2b", "tax exempt", "business+"], "tier": "value", "sector": "office", "subSectors": ["business supplies", "bulk purchasing", "janitorial"]}, "generatedBy": "manual", "capabilities": ["price_lookup", "bulk_pricing", "tax_exemption", "po_numbers", "business_invoicing", "account_creation"], "lastVerified": "2026-02-08", "methodConfig": {"self_hosted_card": {"notes": "Requires Walmart Business account. Supports tax exemption and purchase orders.", "requiresAuth": true, "locatorFormat": "url:{product_url}"}}, "checkoutMethods": ["self_hosted_card"], "searchDiscovery": {"mcp": false, "searchApi": false, "searchInternal": true}}'::jsonb, E'---
name: creditclaw-shop-walmart-business
version: 0.1.0
description: "Shop Walmart Business using CreditClaw payment rails"
homepage: https://creditclaw.com/skills/walmart-business
requires: [creditclaw]
maturity: draft
agent_friendliness: 0/5
last_verified: 2026-02-08
sector: office
tier: wholesale
sub_sectors: [business supplies, bulk purchasing, janitorial]
ordering_permission: registered
payment_methods: [card, invoice]
search_api: false
mcp: false
current_deals: false
---

# Shopping at Walmart Business

**Store URL:** https://business.walmart.com
**Category:** retail
**Agent Friendliness:** ☆☆☆☆☆ (0/5)
**Capabilities:** Price Lookup, Bulk Pricing, Tax Exemption, PO Numbers, Business Invoicing, Account Creation


---

## Checkout Methods (in order of preference)

- **Self-Hosted Card** (requires login) — Requires Walmart Business account. Supports tax exemption and purchase orders.

---

## How to Search

Search on business.walmart.com. Look for bulk pricing tiers and business-specific products.

Search URL: `https://business.walmart.com/search?q={q}`

Product ID format: `Item number`

---

## How to Checkout

Account login required before checkout.
- PO number field available at checkout.
- Tax exemption field available. Check if your owner has a tax certificate on file.

Use your CreditClaw credentials to pay.


---

## Shipping

Free shipping on orders over $35.
Estimated delivery: 2-7 business days
Business/bulk shipping rates available.

---

## Taxonomy

- **Sector:** Office
- **Sub-sectors:** business supplies, bulk purchasing, janitorial
- **Tier:** Wholesale
- **Tags:** b2b, tax exempt, business+
---

## Search Discovery

- **Search API:** Not available
- **MCP Support:** Not supported
- **Internal Search:** Available

---

## Buying Configuration

- **Ordering:** Registered Account
- **Payment Methods:** Credit/Debit Card, Invoice / Net Terms
- **Delivery:** standard, bulk delivery
- **Free Delivery:** for orders over $35 or with Business+


---

## Deals & Promotions

- **Active Deals:** No



---

## Tips

- Requires Walmart Business account — owner must register first
- Tax exemption available after uploading certificates
- Bulk pricing available on qualifying quantities
- Business+ membership includes free shipping and 2% rewards

---

## Making the Purchase

```bash
curl -X POST https://creditclaw.com/api/v1/bot/merchant/checkout \\
  -H "Authorization: Bearer $CREDITCLAW_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d ''{
    "merchant": "walmart-business",
    "product_id": "url:{product_url}",
    "shipping_address": { "name": "...", "line1": "...", "city": "...", "state": "...", "postalCode": "...", "country": "US" }
  }''
```

## Tracking

Order tracking is not yet available for this vendor. Monitor email for shipping confirmation.

---

## Metadata

- **Version:** 0.1.0
- **Last verified:** 2026-02-08
- **Generated by:** manual
- **Skill URL:** https://creditclaw.com/api/v1/bot/skills/walmart-business
- **Catalog page:** https://creditclaw.com/skills/walmart-business
', '2026-03-24 18:50:21.340258', '2026-03-24 18:50:21.340258', 'retailer', NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL) ON CONFLICT (slug) DO NOTHING;
INSERT INTO brand_index (slug, name, domain, url, logo_url, description, sector, sub_sectors, tier, tags, carries_brands, has_mcp, mcp_url, has_api, api_endpoint, api_auth_required, api_docs_url, has_cli, cli_install_command, site_search, product_feed, capabilities, checkout_methods, ordering, checkout_provider, payment_methods_accepted, creditclaw_supports, business_account, tax_exempt_supported, po_number_supported, delivery_options, free_shipping_threshold, ships_internationally, supported_countries, has_deals, deals_url, deals_api, loyalty_program, maturity, claimed_by, claim_id, submitted_by, submitter_type, version, last_verified, active_version_id, brand_data, skill_md, created_at, updated_at, brand_type, rating_search_accuracy, rating_stock_reliability, rating_checkout_completion, axs_rating, rating_count, overall_score, score_breakdown, recommendations, scan_tier, last_scanned_at, last_scanned_by) VALUES ('staples', 'Staples', 'staples.com', 'https://www.staples.com', '/assets/images/vendors/staples.svg', 'Major office supply retailer offering supplies, ink & toner, furniture, and technology. Guest checkout with business account options for volume discounts and tax exemption.', 'office', '{"office supplies","ink & toner",furniture,technology}', 'mid_range', '{"staples advantage","next-day delivery","office essentials"}', '{HP,Brother,Epson,Canon,Avery,3M,Bic,Sharpie,Hammermill,Swingline}', false, NULL, false, NULL, false, NULL, false, NULL, true, false, '{price_lookup,stock_check,bulk_pricing,tax_exemption,po_numbers,order_tracking,business_invoicing}', '{self_hosted_card}', 'guest', 'in_house', '{card,invoice,apple_pay}', '{}', true, true, true, '{next-day,standard,"in-store pickup"}', 49.99, false, '{US}', true, 'https://www.staples.com/deals/deals/BI1703', NULL, 'Staples Rewards', 'beta', NULL, NULL, 'creditclaw', 'ai_generated', '1.0.0', '2026-02-10', NULL, '{"url": "https://www.staples.com", "name": "Staples", "slug": "staples", "tips": ["Guest checkout available but business accounts get better pricing", "Staples Advantage (business tier) offers volume discounts", "Free next-day delivery on orders over $49.99 in eligible areas", "Tax exemption requires a Staples business account with certificate on file", "Weekly deals and coupons can significantly reduce costs"], "deals": {"dealsUrl": "https://www.staples.com/deals/deals/BI1703", "currentDeals": true, "loyaltyProgram": "Staples Rewards"}, "buying": {"freeDelivery": "for orders over $49.99", "paymentMethods": ["card", "invoice", "apple_pay"], "deliveryOptions": "next-day, standard, in-store pickup", "checkoutProviders": ["in_house"], "orderingPermission": "guest"}, "search": {"pattern": "Search on staples.com by product name or SKU. Filter by brand, price, and availability. Check for Staples Advantage pricing on business accounts.", "urlTemplate": "https://www.staples.com/search?query={q}", "productIdFormat": "SKU / Item number"}, "logoUrl": "/assets/images/vendors/staples.svg", "version": "1.0.0", "category": "office", "checkout": {"guestCheckout": true, "poNumberField": true, "taxExemptField": true}, "maturity": "beta", "shipping": {"estimatedDays": "1-5 business days", "freeThreshold": 49.99, "businessShipping": true}, "taxonomy": {"tags": ["staples advantage", "next-day delivery", "office essentials"], "tier": "mid_range", "sector": "office", "subSectors": ["office supplies", "ink & toner", "furniture", "technology"]}, "generatedBy": "manual", "capabilities": ["price_lookup", "stock_check", "bulk_pricing", "tax_exemption", "po_numbers", "order_tracking", "business_invoicing"], "lastVerified": "2026-02-10", "methodConfig": {"self_hosted_card": {"notes": "Guest checkout available for basic orders. Business account needed for PO numbers and tax exemption.", "requiresAuth": false, "locatorFormat": "url:{product_url}"}}, "checkoutMethods": ["self_hosted_card"], "searchDiscovery": {"mcp": false, "searchApi": false, "searchInternal": true}}'::jsonb, E'---
name: creditclaw-shop-staples
version: 1.0.0
description: "Shop Staples using CreditClaw payment rails"
homepage: https://creditclaw.com/skills/staples
requires: [creditclaw]
maturity: beta
agent_friendliness: 2/5
last_verified: 2026-02-10
sector: office
tier: mid_range
sub_sectors: [office supplies, ink & toner, furniture, technology]
ordering_permission: guest
payment_methods: [card, invoice, apple_pay]
search_api: false
mcp: false
current_deals: true
---

# Shopping at Staples

**Store URL:** https://www.staples.com
**Category:** office
**Agent Friendliness:** ★★☆☆☆ (2/5)
**Capabilities:** Price Lookup, Stock Check, Bulk Pricing, Tax Exemption, PO Numbers, Order Tracking, Business Invoicing


---

## Checkout Methods (in order of preference)

- **Self-Hosted Card** — Guest checkout available for basic orders. Business account needed for PO numbers and tax exemption.

---

## How to Search

Search on staples.com by product name or SKU. Filter by brand, price, and availability. Check for Staples Advantage pricing on business accounts.

Search URL: `https://www.staples.com/search?query={q}`

Product ID format: `SKU / Item number`

---

## How to Checkout

Guest checkout is available — no account needed.
- PO number field available at checkout.
- Tax exemption field available. Check if your owner has a tax certificate on file.

Use your CreditClaw credentials to pay.


---

## Shipping

Free shipping on orders over $49.99.
Estimated delivery: 1-5 business days
Business/bulk shipping rates available.

---

## Taxonomy

- **Sector:** Office
- **Sub-sectors:** office supplies, ink & toner, furniture, technology
- **Tier:** Mid-Range
- **Tags:** staples advantage, next-day delivery, office essentials
---

## Search Discovery

- **Search API:** Not available
- **MCP Support:** Not supported
- **Internal Search:** Available

---

## Buying Configuration

- **Ordering:** Guest
- **Payment Methods:** Credit/Debit Card, Invoice / Net Terms, Apple Pay
- **Delivery:** next-day, standard, in-store pickup
- **Free Delivery:** for orders over $49.99


---

## Deals & Promotions

- **Active Deals:** Yes
- **Deals Page:** https://www.staples.com/deals/deals/BI1703

- **Loyalty Program:** Staples Rewards
---

## Tips

- Guest checkout available but business accounts get better pricing
- Staples Advantage (business tier) offers volume discounts
- Free next-day delivery on orders over $49.99 in eligible areas
- Tax exemption requires a Staples business account with certificate on file
- Weekly deals and coupons can significantly reduce costs

---

## Making the Purchase

```bash
curl -X POST https://creditclaw.com/api/v1/bot/merchant/checkout \\
  -H "Authorization: Bearer $CREDITCLAW_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d ''{
    "merchant": "staples",
    "product_id": "url:{product_url}",
    "shipping_address": { "name": "...", "line1": "...", "city": "...", "state": "...", "postalCode": "...", "country": "US" }
  }''
```

## Tracking

Order tracking is available. Poll the status endpoint for shipping updates.

---

## Metadata

- **Version:** 1.0.0
- **Last verified:** 2026-02-10
- **Generated by:** manual
- **Skill URL:** https://creditclaw.com/api/v1/bot/skills/staples
- **Catalog page:** https://creditclaw.com/skills/staples
', '2026-03-24 18:50:21.345905', '2026-03-24 18:50:21.345905', 'chain', NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL) ON CONFLICT (slug) DO NOTHING;
INSERT INTO brand_index (slug, name, domain, url, logo_url, description, sector, sub_sectors, tier, tags, carries_brands, has_mcp, mcp_url, has_api, api_endpoint, api_auth_required, api_docs_url, has_cli, cli_install_command, site_search, product_feed, capabilities, checkout_methods, ordering, checkout_provider, payment_methods_accepted, creditclaw_supports, business_account, tax_exempt_supported, po_number_supported, delivery_options, free_shipping_threshold, ships_internationally, supported_countries, has_deals, deals_url, deals_api, loyalty_program, maturity, claimed_by, claim_id, submitted_by, submitter_type, version, last_verified, active_version_id, brand_data, skill_md, created_at, updated_at, brand_type, rating_search_accuracy, rating_stock_reliability, rating_checkout_completion, axs_rating, rating_count, overall_score, score_breakdown, recommendations, scan_tier, last_scanned_at, last_scanned_by) VALUES ('home-depot', 'Home Depot', 'homedepot.com', 'https://www.homedepot.com', '/assets/images/vendors/home-depot.svg', 'America''s largest home improvement retailer. Guest checkout with real-time inventory for tools, building materials, appliances, paint, and hardware. Pro Xtra accounts for contractors.', 'home', '{"building materials",tools,appliances,plumbing,electrical,paint}', 'mid_range', '{"pro xtra",diy,contractors,"home improvement"}', '{DeWalt,Milwaukee,Ryobi,Husky,Behr,LG,Samsung,Whirlpool,"Glacier Bay",HDX}', false, NULL, false, NULL, false, NULL, false, NULL, true, false, '{price_lookup,stock_check,order_tracking,bulk_pricing,programmatic_checkout,business_invoicing,tax_exemption,account_creation,returns,po_numbers}', '{self_hosted_card}', 'guest', 'in_house', '{card,apple_pay,google_pay}', '{}', false, false, false, '{standard,express,ship-to-store,"in-store pickup"}', 45, false, '{US}', true, 'https://www.homedepot.com/c/savings_center', NULL, 'Pro Xtra', 'beta', NULL, NULL, 'creditclaw', 'ai_generated', '1.0.0', '2026-02-10', NULL, '{"url": "https://www.homedepot.com", "name": "Home Depot", "slug": "home-depot", "tips": ["Guest checkout works for standard online orders", "Product pages show real-time local store inventory", "Pro Xtra accounts offer volume pricing on qualifying orders", "Some items are ''ship to store'' only and cannot be delivered", "Large/heavy items may incur additional shipping charges"], "deals": {"dealsUrl": "https://www.homedepot.com/c/savings_center", "currentDeals": true, "loyaltyProgram": "Pro Xtra"}, "buying": {"freeDelivery": "for orders over $45", "paymentMethods": ["card", "apple_pay", "google_pay"], "deliveryOptions": "standard, express, ship-to-store, in-store pickup", "checkoutProviders": ["in_house"], "orderingPermission": "guest"}, "search": {"pattern": "Search on homedepot.com by product name, brand, or model number. Products show real-time stock levels for both online and nearby stores.", "urlTemplate": "https://www.homedepot.com/s/{q}", "productIdFormat": "Internet # or Model # (found on product page)"}, "logoUrl": "/assets/images/vendors/home-depot.svg", "version": "1.0.0", "category": "hardware", "checkout": {"guestCheckout": true, "poNumberField": false, "taxExemptField": false}, "maturity": "beta", "shipping": {"estimatedDays": "3-7 business days", "freeThreshold": 45, "businessShipping": false}, "taxonomy": {"tags": ["pro xtra", "diy", "contractors", "home improvement"], "tier": "mid_range", "sector": "home", "subSectors": ["building materials", "tools", "appliances", "plumbing", "electrical", "paint"]}, "generatedBy": "manual", "capabilities": ["price_lookup", "stock_check", "order_tracking", "bulk_pricing"], "lastVerified": "2026-02-10", "methodConfig": {"self_hosted_card": {"notes": "Guest checkout available. Product pages show real-time store and online inventory.", "requiresAuth": false, "locatorFormat": "url:{product_url}"}}, "checkoutMethods": ["self_hosted_card"], "searchDiscovery": {"mcp": false, "searchApi": false, "searchInternal": true}}'::jsonb, '---
name: creditclaw-shop-home-depot
version: 1.0.0
description: "Shop Home Depot using CreditClaw payment rails"
homepage: https://creditclaw.com/skills/home-depot
requires: [creditclaw]
maturity: draft
asx_score: 80/100
last_verified: 2026-04-02




---

# Shopping at Home Depot

**Store URL:** https://homedepot.com
**Sector:** home
**ASX Score:** 80/100
**Capabilities:** Price Lookup, Stock Check, Programmatic Checkout, Business Invoicing, Bulk Pricing, Tax Exemption, Account Creation, Order Tracking, Returns, PO Numbers


---

## Checkout Methods (in order of preference)

- **Browser Automation** — Guest checkout available

---

## How to Search

Use the main search bar or browse by categories like Tools, Appliances, Building Materials

Search URL: `https://www.homedepot.com/s/{q}`

Product ID format: `SKU`

---

## How to Checkout

Guest checkout is available — no account needed.
- PO number field available at checkout.
- Tax exemption field available. Check if your owner has a tax certificate on file.

Use your CreditClaw credentials to pay.


---

## Shipping

Free shipping on orders over $45.
Estimated delivery: 2-7 business days
Business/bulk shipping rates available.

---
---
---
---
---

## Tips

- Use the Pro Services section for bulk orders and contractor pricing
- Check local store inventory for immediate pickup availability
- Look for seasonal promotions and bulk discounts on building materials
- Utilize the rental services for tools and equipment needs
- Consider the credit card offers for financing large purchases

---

## Tracking

Order tracking is available. Poll the status endpoint for shipping updates.

---

## Metadata

- **Version:** 1.0.0
- **Last verified:** 2026-04-02
- **Generated by:** skill_builder
- **Skill URL:** https://creditclaw.com/api/v1/bot/skills/home-depot
- **Catalog page:** https://creditclaw.com/skills/home-depot

---

## Feedback

After your purchase attempt (successful or not), help improve this skill:

```
POST https://creditclaw.com/api/v1/bot/skills/home-depot/feedback
Authorization: Bearer <your-creditclaw-api-key>
Content-Type: application/json

{
  "search_accuracy": 4,
  "stock_reliability": 5,
  "checkout_completion": 3,
  "checkout_method": "browser_automation",
  "outcome": "success",
  "comment": "optional — what happened?"
}
```

Ratings are 1-5. Outcome is one of: success, checkout_failed, search_failed, out_of_stock, price_mismatch, flow_changed.
Checkout method is one of: native_api, browser_automation, x402, acp, self_hosted_card, crossmint_world.
Authorization header is optional but improves rating weight.
This is optional but helps other agents find reliable vendors.
', '2026-03-24 18:50:21.35118', '2026-04-02 01:04:25.419', 'chain', NULL, NULL, NULL, NULL, 0, 45, '{"speed": {"max": 25, "score": 11, "signals": [{"key": "search_api", "max": 10, "label": "Search API / MCP", "score": 0, "detail": "No programmatic API, MCP endpoint, or agentic commerce protocol detected"}, {"key": "site_search", "max": 10, "label": "Internal Site Search", "score": 6, "detail": "Search form detected on homepage. Search autocomplete/typeahead capability detected"}, {"key": "page_load", "max": 5, "label": "Page Load Performance", "score": 5, "detail": "Excellent load time: 867ms"}]}, "clarity": {"max": 40, "score": 8, "signals": [{"key": "json_ld", "max": 20, "label": "JSON-LD / Structured Data", "score": 0, "detail": "No JSON-LD structured data or Open Graph commerce tags found"}, {"key": "product_feed", "max": 10, "label": "Product Feed / Sitemap", "score": 1, "detail": "No sitemap.xml found. Sitemap referenced in robots.txt"}, {"key": "clean_html", "max": 10, "label": "Clean HTML / Semantic Markup", "score": 7, "detail": "Partial semantic structure (2/7 landmark elements). 18 heading(s) found, missing H1. Good accessibility markup (32 roles, 52 aria-labels). 100% of images have alt text"}]}, "reliability": {"max": 35, "score": 26, "signals": [{"key": "access_auth", "max": 10, "label": "Access & Authentication", "score": 6, "detail": "Direct checkout/cart links found"}, {"key": "order_management", "max": 10, "label": "Order Management", "score": 6, "detail": "Predictable cart/basket URL structure"}, {"key": "checkout_flow", "max": 10, "label": "Checkout Flow", "score": 10, "detail": "Discount/promo code field detected. Clearly labeled card payment detected. Shipping/delivery options described"}, {"key": "bot_tolerance", "max": 5, "label": "Bot Tolerance", "score": 4, "detail": "robots.txt allows general crawling. No CAPTCHA or bot challenge on homepage"}]}}'::jsonb, '[{"title": "Add JSON-LD structured data", "impact": "high", "signal": "json_ld", "description": "Implement Schema.org Product markup using JSON-LD on your product pages. This is the single highest-impact improvement — it lets AI agents read product names, prices, and availability directly without rendering the page.", "potentialGain": 20}, {"title": "Expose a search API or MCP endpoint", "impact": "high", "signal": "search_api", "description": "Provide a programmatic search endpoint that AI agents can query directly. Consider implementing MCP (Model Context Protocol) to let agents interact with your catalog natively. This eliminates the need for browser-based navigation entirely.", "potentialGain": 10}, {"title": "Publish a sitemap with product URLs", "impact": "medium", "signal": "product_feed", "description": "Create or improve your sitemap.xml to include product page URLs. Reference it in robots.txt. This helps AI agents discover your full catalog efficiently.", "potentialGain": 9}, {"title": "Enable guest checkout", "impact": "high", "signal": "access_auth", "description": "Allow purchases without mandatory account creation. Guest checkout is critical for AI agents — most cannot complete registration flows, verify email addresses, or handle phone verification steps.", "potentialGain": 8}, {"title": "Simplify product selection and cart management", "impact": "high", "signal": "order_management", "description": "Use clear, predictable URL patterns for cart and product pages. Make variant selectors (size, color, quantity) easily identifiable with standard HTML form elements. Ensure add-to-cart actions are straightforward.", "potentialGain": 8}, {"title": "Make site search discoverable", "impact": "medium", "signal": "site_search", "description": "Ensure your site search form is accessible on the homepage with a clear action URL. Add an OpenSearch description file so agents can discover your search template automatically.", "potentialGain": 4}, {"title": "Improve HTML semantic structure", "impact": "medium", "signal": "clean_html", "description": "Use semantic HTML5 elements (header, nav, main, article, footer) and proper heading hierarchy. Add alt text to images and ARIA labels to interactive elements. This makes your site parseable even without structured data.", "potentialGain": 3}, {"title": "Clarify checkout options", "impact": "medium", "signal": "checkout_flow", "description": "Clearly label payment methods, shipping options, and discount/promo code fields. Use descriptive text that an AI agent can parse to understand the differences between options (e.g., ''Standard Shipping - 5-7 business days - $5.99'').", "potentialGain": 2}, {"title": "Reduce bot-blocking measures", "impact": "medium", "signal": "bot_tolerance", "description": "Review your robots.txt to allow AI agent crawling. Avoid aggressive CAPTCHAs on landing and product pages. Consider whitelisting known AI agent user-agents to enable automated shopping.", "potentialGain": 1}]'::jsonb, 'enhanced', '2026-04-02 01:04:25.418', 'public') ON CONFLICT (slug) DO NOTHING;
INSERT INTO brand_index (slug, name, domain, url, logo_url, description, sector, sub_sectors, tier, tags, carries_brands, has_mcp, mcp_url, has_api, api_endpoint, api_auth_required, api_docs_url, has_cli, cli_install_command, site_search, product_feed, capabilities, checkout_methods, ordering, checkout_provider, payment_methods_accepted, creditclaw_supports, business_account, tax_exempt_supported, po_number_supported, delivery_options, free_shipping_threshold, ships_internationally, supported_countries, has_deals, deals_url, deals_api, loyalty_program, maturity, claimed_by, claim_id, submitted_by, submitter_type, version, last_verified, active_version_id, brand_data, skill_md, created_at, updated_at, brand_type, rating_search_accuracy, rating_stock_reliability, rating_checkout_completion, axs_rating, rating_count, overall_score, score_breakdown, recommendations, scan_tier, last_scanned_at, last_scanned_by) VALUES ('lowes', 'Lowe''s', 'lowes.com', 'https://www.lowes.com', '/assets/images/vendors/lowes.svg', 'Leading home improvement retailer offering building materials, tools, appliances, and decor. Guest checkout with store inventory visibility and contractor-focused Pro loyalty program.', 'home', '{"building materials",tools,appliances,plumbing,electrical}', 'mid_range', '{"pro accounts","price match","home improvement"}', '{Craftsman,Kobalt,"Allen + Roth",GE,Whirlpool,Samsung,Valspar,STAINMASTER,"John Deere",Husqvarna}', false, NULL, false, NULL, false, NULL, false, NULL, true, false, '{price_lookup,stock_check,order_tracking}', '{self_hosted_card}', 'guest', 'in_house', '{card,apple_pay,google_pay}', '{}', false, false, false, '{standard,express,"in-store pickup"}', 45, false, '{US}', true, 'https://www.lowes.com/l/shop/weekly-ad', NULL, 'MyLowe''s Rewards', 'beta', NULL, NULL, 'creditclaw', 'ai_generated', '1.0.0', '2026-02-10', NULL, '{"url": "https://www.lowes.com", "name": "Lowe''s", "slug": "lowes", "tips": ["Guest checkout is straightforward", "Lowe''s Pro accounts get volume pricing and dedicated support", "Price match guarantee — matches competitor pricing including Amazon", "Some items available for same-day delivery in select markets", "Bulk/pallet orders may require calling the pro desk"], "deals": {"dealsUrl": "https://www.lowes.com/l/shop/weekly-ad", "currentDeals": true, "loyaltyProgram": "MyLowe''s Rewards"}, "buying": {"freeDelivery": "for orders over $45", "paymentMethods": ["card", "apple_pay", "google_pay"], "deliveryOptions": "standard, express, in-store pickup", "checkoutProviders": ["in_house"], "orderingPermission": "guest"}, "search": {"pattern": "Search on lowes.com by product name or item number. Filter by brand, price, rating, and availability.", "urlTemplate": "https://www.lowes.com/search?searchTerm={q}", "productIdFormat": "Item # or Model # (found on product page)"}, "logoUrl": "/assets/images/vendors/lowes.svg", "version": "1.0.0", "category": "hardware", "checkout": {"guestCheckout": true, "poNumberField": false, "taxExemptField": false}, "maturity": "beta", "shipping": {"estimatedDays": "3-7 business days", "freeThreshold": 45, "businessShipping": false}, "taxonomy": {"tags": ["pro accounts", "price match", "home improvement"], "tier": "mid_range", "sector": "home", "subSectors": ["building materials", "tools", "appliances", "plumbing", "electrical"]}, "generatedBy": "manual", "capabilities": ["price_lookup", "stock_check", "order_tracking"], "lastVerified": "2026-02-10", "methodConfig": {"self_hosted_card": {"notes": "Guest checkout available. Similar to Home Depot flow.", "requiresAuth": false, "locatorFormat": "url:{product_url}"}}, "checkoutMethods": ["self_hosted_card"], "searchDiscovery": {"mcp": false, "searchApi": false, "searchInternal": true}}'::jsonb, E'---
name: creditclaw-shop-lowes
version: 1.0.0
description: "Shop Lowe''s using CreditClaw payment rails"
homepage: https://creditclaw.com/skills/lowes
requires: [creditclaw]
maturity: beta
agent_friendliness: 2/5
last_verified: 2026-02-10
sector: home
tier: mid_range
sub_sectors: [building materials, tools, appliances, plumbing, electrical]
ordering_permission: guest
payment_methods: [card, apple_pay, google_pay]
search_api: false
mcp: false
current_deals: true
---

# Shopping at Lowe''s

**Store URL:** https://www.lowes.com
**Category:** hardware
**Agent Friendliness:** ★★☆☆☆ (2/5)
**Capabilities:** Price Lookup, Stock Check, Order Tracking


---

## Checkout Methods (in order of preference)

- **Self-Hosted Card** — Guest checkout available. Similar to Home Depot flow.

---

## How to Search

Search on lowes.com by product name or item number. Filter by brand, price, rating, and availability.

Search URL: `https://www.lowes.com/search?searchTerm={q}`

Product ID format: `Item # or Model # (found on product page)`

---

## How to Checkout

Guest checkout is available — no account needed.

Use your CreditClaw credentials to pay.


---

## Shipping

Free shipping on orders over $45.
Estimated delivery: 3-7 business days

---

## Taxonomy

- **Sector:** Home
- **Sub-sectors:** building materials, tools, appliances, plumbing, electrical
- **Tier:** Mid-Range
- **Tags:** pro accounts, price match, home improvement
---

## Search Discovery

- **Search API:** Not available
- **MCP Support:** Not supported
- **Internal Search:** Available

---

## Buying Configuration

- **Ordering:** Guest
- **Payment Methods:** Credit/Debit Card, Apple Pay, Google Pay
- **Delivery:** standard, express, in-store pickup
- **Free Delivery:** for orders over $45


---

## Deals & Promotions

- **Active Deals:** Yes
- **Deals Page:** https://www.lowes.com/l/shop/weekly-ad

- **Loyalty Program:** MyLowe''s Rewards
---

## Tips

- Guest checkout is straightforward
- Lowe''s Pro accounts get volume pricing and dedicated support
- Price match guarantee — matches competitor pricing including Amazon
- Some items available for same-day delivery in select markets
- Bulk/pallet orders may require calling the pro desk

---

## Making the Purchase

```bash
curl -X POST https://creditclaw.com/api/v1/bot/merchant/checkout \\
  -H "Authorization: Bearer $CREDITCLAW_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d ''{
    "merchant": "lowes",
    "product_id": "url:{product_url}",
    "shipping_address": { "name": "...", "line1": "...", "city": "...", "state": "...", "postalCode": "...", "country": "US" }
  }''
```

## Tracking

Order tracking is available. Poll the status endpoint for shipping updates.

---

## Metadata

- **Version:** 1.0.0
- **Last verified:** 2026-02-10
- **Generated by:** manual
- **Skill URL:** https://creditclaw.com/api/v1/bot/skills/lowes
- **Catalog page:** https://creditclaw.com/skills/lowes
', '2026-03-24 18:50:21.356618', '2026-03-24 18:50:21.356618', 'chain', NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL) ON CONFLICT (slug) DO NOTHING;
INSERT INTO brand_index (slug, name, domain, url, logo_url, description, sector, sub_sectors, tier, tags, carries_brands, has_mcp, mcp_url, has_api, api_endpoint, api_auth_required, api_docs_url, has_cli, cli_install_command, site_search, product_feed, capabilities, checkout_methods, ordering, checkout_provider, payment_methods_accepted, creditclaw_supports, business_account, tax_exempt_supported, po_number_supported, delivery_options, free_shipping_threshold, ships_internationally, supported_countries, has_deals, deals_url, deals_api, loyalty_program, maturity, claimed_by, claim_id, submitted_by, submitter_type, version, last_verified, active_version_id, brand_data, skill_md, created_at, updated_at, brand_type, rating_search_accuracy, rating_stock_reliability, rating_checkout_completion, axs_rating, rating_count, overall_score, score_breakdown, recommendations, scan_tier, last_scanned_at, last_scanned_by) VALUES ('office-depot', 'Office Depot', 'officedepot.com', 'https://www.officedepot.com', '/assets/images/vendors/office-depot.svg', 'Office products retailer offering supplies, furniture, technology, and cleaning products. Guest checkout with business account options for PO numbers and tax exemption.', 'office', '{"office supplies","ink & toner",furniture,technology,cleaning}', 'mid_range', '{"bsd accounts","contract pricing","next-day delivery"}', '{HP,Brother,Epson,Canon,Avery,3M,Bic,Serta,Realspace,TUL}', false, NULL, false, NULL, false, NULL, false, NULL, true, false, '{price_lookup,stock_check,tax_exemption,po_numbers,order_tracking,business_invoicing}', '{self_hosted_card}', 'guest', 'in_house', '{card,invoice}', '{}', true, true, true, '{next-day,standard,"in-store pickup"}', 45, false, '{US}', true, 'https://www.officedepot.com/a/browse/deals/N=5+588062/', NULL, NULL, 'draft', NULL, NULL, 'creditclaw', 'ai_generated', '0.1.0', '2026-02-05', NULL, '{"url": "https://www.officedepot.com", "name": "Office Depot", "slug": "office-depot", "tips": ["Guest checkout for basic orders, business account for invoicing features", "BSD (Business Solutions Division) accounts get contract pricing", "Free next-business-day delivery on qualifying orders", "Price match available on identical items from select competitors"], "deals": {"dealsUrl": "https://www.officedepot.com/a/browse/deals/N=5+588062/", "currentDeals": true}, "buying": {"freeDelivery": "for orders over $45", "paymentMethods": ["card", "invoice"], "deliveryOptions": "next-day, standard, in-store pickup", "checkoutProviders": ["in_house"], "orderingPermission": "guest"}, "search": {"pattern": "Search on officedepot.com by product name, SKU, or brand. Filter by category and price.", "urlTemplate": "https://www.officedepot.com/catalog/search.do?Ntt={q}", "productIdFormat": "SKU / Item number"}, "logoUrl": "/assets/images/vendors/office-depot.svg", "version": "0.1.0", "category": "office", "checkout": {"guestCheckout": true, "poNumberField": true, "taxExemptField": true}, "maturity": "draft", "shipping": {"estimatedDays": "2-5 business days", "freeThreshold": 45, "businessShipping": true}, "taxonomy": {"tags": ["bsd accounts", "contract pricing", "next-day delivery"], "tier": "mid_range", "sector": "office", "subSectors": ["office supplies", "ink & toner", "furniture", "technology", "cleaning"]}, "generatedBy": "manual", "capabilities": ["price_lookup", "stock_check", "tax_exemption", "po_numbers", "order_tracking", "business_invoicing"], "lastVerified": "2026-02-05", "methodConfig": {"self_hosted_card": {"notes": "Guest checkout available. Business accounts unlock tax exemption and PO numbers.", "requiresAuth": false, "locatorFormat": "url:{product_url}"}}, "checkoutMethods": ["self_hosted_card"], "searchDiscovery": {"mcp": false, "searchApi": false, "searchInternal": true}}'::jsonb, E'---
name: creditclaw-shop-office-depot
version: 0.1.0
description: "Shop Office Depot using CreditClaw payment rails"
homepage: https://creditclaw.com/skills/office-depot
requires: [creditclaw]
maturity: draft
agent_friendliness: 2/5
last_verified: 2026-02-05
sector: office
tier: mid_range
sub_sectors: [office supplies, ink & toner, furniture, technology, cleaning]
ordering_permission: guest
payment_methods: [card, invoice]
search_api: false
mcp: false
current_deals: true
---

# Shopping at Office Depot

**Store URL:** https://www.officedepot.com
**Category:** office
**Agent Friendliness:** ★★☆☆☆ (2/5)
**Capabilities:** Price Lookup, Stock Check, Tax Exemption, PO Numbers, Order Tracking, Business Invoicing


---

## Checkout Methods (in order of preference)

- **Self-Hosted Card** — Guest checkout available. Business accounts unlock tax exemption and PO numbers.

---

## How to Search

Search on officedepot.com by product name, SKU, or brand. Filter by category and price.

Search URL: `https://www.officedepot.com/catalog/search.do?Ntt={q}`

Product ID format: `SKU / Item number`

---

## How to Checkout

Guest checkout is available — no account needed.
- PO number field available at checkout.
- Tax exemption field available. Check if your owner has a tax certificate on file.

Use your CreditClaw credentials to pay.


---

## Shipping

Free shipping on orders over $45.
Estimated delivery: 2-5 business days
Business/bulk shipping rates available.

---

## Taxonomy

- **Sector:** Office
- **Sub-sectors:** office supplies, ink & toner, furniture, technology, cleaning
- **Tier:** Mid-Range
- **Tags:** bsd accounts, contract pricing, next-day delivery
---

## Search Discovery

- **Search API:** Not available
- **MCP Support:** Not supported
- **Internal Search:** Available

---

## Buying Configuration

- **Ordering:** Guest
- **Payment Methods:** Credit/Debit Card, Invoice / Net Terms
- **Delivery:** next-day, standard, in-store pickup
- **Free Delivery:** for orders over $45


---

## Deals & Promotions

- **Active Deals:** Yes
- **Deals Page:** https://www.officedepot.com/a/browse/deals/N=5+588062/


---

## Tips

- Guest checkout for basic orders, business account for invoicing features
- BSD (Business Solutions Division) accounts get contract pricing
- Free next-business-day delivery on qualifying orders
- Price match available on identical items from select competitors

---

## Making the Purchase

```bash
curl -X POST https://creditclaw.com/api/v1/bot/merchant/checkout \\
  -H "Authorization: Bearer $CREDITCLAW_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d ''{
    "merchant": "office-depot",
    "product_id": "url:{product_url}",
    "shipping_address": { "name": "...", "line1": "...", "city": "...", "state": "...", "postalCode": "...", "country": "US" }
  }''
```

## Tracking

Order tracking is available. Poll the status endpoint for shipping updates.

---

## Metadata

- **Version:** 0.1.0
- **Last verified:** 2026-02-05
- **Generated by:** manual
- **Skill URL:** https://creditclaw.com/api/v1/bot/skills/office-depot
- **Catalog page:** https://creditclaw.com/skills/office-depot
', '2026-03-24 18:50:21.362148', '2026-03-24 18:50:21.362148', 'chain', NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL) ON CONFLICT (slug) DO NOTHING;
INSERT INTO brand_index (slug, name, domain, url, logo_url, description, sector, sub_sectors, tier, tags, carries_brands, has_mcp, mcp_url, has_api, api_endpoint, api_auth_required, api_docs_url, has_cli, cli_install_command, site_search, product_feed, capabilities, checkout_methods, ordering, checkout_provider, payment_methods_accepted, creditclaw_supports, business_account, tax_exempt_supported, po_number_supported, delivery_options, free_shipping_threshold, ships_internationally, supported_countries, has_deals, deals_url, deals_api, loyalty_program, maturity, claimed_by, claim_id, submitted_by, submitter_type, version, last_verified, active_version_id, brand_data, skill_md, created_at, updated_at, brand_type, rating_search_accuracy, rating_stock_reliability, rating_checkout_completion, axs_rating, rating_count, overall_score, score_breakdown, recommendations, scan_tier, last_scanned_at, last_scanned_by) VALUES ('uline', 'Uline', 'uline.com', 'https://www.uline.com', '/assets/images/vendors/uline.svg', 'Leading distributor of shipping, packaging, and industrial supplies. Extensive catalog of boxes, labels, warehouse equipment, and safety products with same-day shipping.', 'industrial', '{packaging,"shipping supplies",janitorial,"warehouse equipment",safety}', 'commodity', '{"fast shipping","quantity breaks","net 30","13 warehouses"}', '{3M,Rubbermaid,Georgia-Pacific,Kimberly-Clark,Scotch,"Duck Brand",Shurtape,Brady}', false, NULL, false, NULL, false, NULL, false, NULL, true, false, '{price_lookup,stock_check,bulk_pricing,order_tracking,business_invoicing,po_numbers}', '{self_hosted_card}', 'guest', 'in_house', '{card,invoice,ach}', '{}', true, true, true, '{"1-2 day from nearest warehouse"}', NULL, false, '{US}', false, NULL, NULL, NULL, 'draft', NULL, NULL, 'creditclaw', 'ai_generated', '0.1.0', '2026-02-05', NULL, '{"url": "https://www.uline.com", "name": "Uline", "slug": "uline", "tips": ["Ships from the nearest of 13 US warehouses — typically arrives in 1-2 days", "Quantity pricing breaks are clearly shown on product pages", "Net 30 terms available for established business accounts", "Catalog is strongest for shipping, packaging, janitorial, and warehouse supplies", "Free catalog available by request — useful for product discovery"], "deals": {"currentDeals": false}, "buying": {"returnsPolicy": "365-day returns", "paymentMethods": ["card", "invoice", "ach"], "deliveryOptions": "1-2 day from nearest warehouse", "checkoutProviders": ["in_house"], "orderingPermission": "guest"}, "search": {"pattern": "Search on uline.com by product name or model number. Uline''s catalog is extremely deep for shipping, packaging, and industrial supplies.", "urlTemplate": "https://www.uline.com/BL/Search?keywords={q}", "productIdFormat": "Model # (e.g., S-12345)"}, "logoUrl": "/assets/images/vendors/uline.svg", "version": "0.1.0", "category": "industrial", "checkout": {"guestCheckout": true, "poNumberField": true, "taxExemptField": true}, "maturity": "draft", "shipping": {"estimatedDays": "1-2 business days (ships from nearest warehouse)", "businessShipping": true}, "taxonomy": {"tags": ["fast shipping", "quantity breaks", "net 30", "13 warehouses"], "tier": "commodity", "sector": "industrial", "subSectors": ["packaging", "shipping supplies", "janitorial", "warehouse equipment", "safety"]}, "generatedBy": "manual", "capabilities": ["price_lookup", "stock_check", "bulk_pricing", "order_tracking", "business_invoicing", "po_numbers"], "lastVerified": "2026-02-05", "methodConfig": {"self_hosted_card": {"notes": "Phone orders also accepted. Website checkout is straightforward.", "requiresAuth": false, "locatorFormat": "url:{product_url}"}}, "checkoutMethods": ["self_hosted_card"], "searchDiscovery": {"mcp": false, "searchApi": false, "searchInternal": true}}'::jsonb, E'---
name: creditclaw-shop-uline
version: 0.1.0
description: "Shop Uline using CreditClaw payment rails"
homepage: https://creditclaw.com/skills/uline
requires: [creditclaw]
maturity: draft
agent_friendliness: 2/5
last_verified: 2026-02-05
sector: industrial
tier: utility
sub_sectors: [packaging, shipping supplies, janitorial, warehouse equipment, safety]
ordering_permission: guest
payment_methods: [card, invoice, ach]
search_api: false
mcp: false
current_deals: false
---

# Shopping at Uline

**Store URL:** https://www.uline.com
**Category:** industrial
**Agent Friendliness:** ★★☆☆☆ (2/5)
**Capabilities:** Price Lookup, Stock Check, Bulk Pricing, Order Tracking, Business Invoicing, PO Numbers


---

## Checkout Methods (in order of preference)

- **Self-Hosted Card** — Phone orders also accepted. Website checkout is straightforward.

---

## How to Search

Search on uline.com by product name or model number. Uline''s catalog is extremely deep for shipping, packaging, and industrial supplies.

Search URL: `https://www.uline.com/BL/Search?keywords={q}`

Product ID format: `Model # (e.g., S-12345)`

---

## How to Checkout

Guest checkout is available — no account needed.
- PO number field available at checkout.
- Tax exemption field available. Check if your owner has a tax certificate on file.

Use your CreditClaw credentials to pay.


---

## Shipping

No standard free shipping threshold.
Estimated delivery: 1-2 business days (ships from nearest warehouse)
Business/bulk shipping rates available.

---

## Taxonomy

- **Sector:** Industrial
- **Sub-sectors:** packaging, shipping supplies, janitorial, warehouse equipment, safety
- **Tier:** Utility
- **Tags:** fast shipping, quantity breaks, net 30, 13 warehouses
---

## Search Discovery

- **Search API:** Not available
- **MCP Support:** Not supported
- **Internal Search:** Available

---

## Buying Configuration

- **Ordering:** Guest
- **Payment Methods:** Credit/Debit Card, Invoice / Net Terms, ACH Transfer
- **Delivery:** 1-2 day from nearest warehouse

- **Returns:** 365-day returns

---

## Deals & Promotions

- **Active Deals:** No



---

## Tips

- Ships from the nearest of 13 US warehouses — typically arrives in 1-2 days
- Quantity pricing breaks are clearly shown on product pages
- Net 30 terms available for established business accounts
- Catalog is strongest for shipping, packaging, janitorial, and warehouse supplies
- Free catalog available by request — useful for product discovery

---

## Making the Purchase

```bash
curl -X POST https://creditclaw.com/api/v1/bot/merchant/checkout \\
  -H "Authorization: Bearer $CREDITCLAW_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d ''{
    "merchant": "uline",
    "product_id": "url:{product_url}",
    "shipping_address": { "name": "...", "line1": "...", "city": "...", "state": "...", "postalCode": "...", "country": "US" }
  }''
```

## Tracking

Order tracking is available. Poll the status endpoint for shipping updates.

---

## Metadata

- **Version:** 0.1.0
- **Last verified:** 2026-02-05
- **Generated by:** manual
- **Skill URL:** https://creditclaw.com/api/v1/bot/skills/uline
- **Catalog page:** https://creditclaw.com/skills/uline
', '2026-03-24 18:50:21.368764', '2026-03-24 18:50:21.368764', 'retailer', NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL) ON CONFLICT (slug) DO NOTHING;
INSERT INTO brand_index (slug, name, domain, url, logo_url, description, sector, sub_sectors, tier, tags, carries_brands, has_mcp, mcp_url, has_api, api_endpoint, api_auth_required, api_docs_url, has_cli, cli_install_command, site_search, product_feed, capabilities, checkout_methods, ordering, checkout_provider, payment_methods_accepted, creditclaw_supports, business_account, tax_exempt_supported, po_number_supported, delivery_options, free_shipping_threshold, ships_internationally, supported_countries, has_deals, deals_url, deals_api, loyalty_program, maturity, claimed_by, claim_id, submitted_by, submitter_type, version, last_verified, active_version_id, brand_data, skill_md, created_at, updated_at, brand_type, rating_search_accuracy, rating_stock_reliability, rating_checkout_completion, axs_rating, rating_count, overall_score, score_breakdown, recommendations, scan_tier, last_scanned_at, last_scanned_by) VALUES ('grainger', 'Grainger', 'grainger.com', 'https://www.grainger.com', '/assets/images/vendors/grainger.svg', 'One of the largest MRO (maintenance, repair, operations) distributors. Account required for pricing; offers contract pricing, same-day shipping, and extensive product specs.', 'industrial', '{mro,safety,electrical,plumbing,hvac,"hand tools","power tools"}', 'premium', '{"mro leader","contract pricing","sds available","same-day shipping"}', '{3M,Honeywell,DeWalt,Milwaukee,Dayton,MSA,Condor,"Tough Guy"}', false, NULL, false, NULL, false, NULL, false, NULL, true, false, '{price_lookup,stock_check,bulk_pricing,tax_exemption,po_numbers,order_tracking,business_invoicing,account_creation}', '{self_hosted_card}', 'registered', 'in_house', '{card,invoice,ach,wire}', '{}', true, true, true, '{same-day,next-day,standard}', NULL, false, '{US}', false, NULL, NULL, NULL, 'draft', NULL, NULL, 'creditclaw', 'ai_generated', '0.1.0', '2026-02-05', NULL, '{"url": "https://www.grainger.com", "name": "Grainger", "slug": "grainger", "tips": ["Account required to see contract pricing — owner must set up beforehand", "One of the largest MRO (maintenance, repair, operations) suppliers", "Net 30/60/90 terms available for qualified business accounts", "Same-day shipping on most in-stock items ordered by noon local time", "Product specs and safety data sheets available on every product page"], "deals": {"currentDeals": false}, "buying": {"paymentMethods": ["card", "invoice", "ach", "wire"], "deliveryOptions": "same-day, next-day, standard", "checkoutProviders": ["in_house"], "orderingPermission": "registered"}, "search": {"pattern": "Search on grainger.com by product name, brand, or Grainger item number. Many prices require login to view.", "urlTemplate": "https://www.grainger.com/search?searchQuery={q}", "productIdFormat": "Grainger Item # (e.g., 6YA12)"}, "logoUrl": "/assets/images/vendors/grainger.svg", "version": "0.1.0", "category": "industrial", "checkout": {"guestCheckout": false, "poNumberField": true, "taxExemptField": true}, "maturity": "draft", "shipping": {"estimatedDays": "1-3 business days", "businessShipping": true}, "taxonomy": {"tags": ["mro leader", "contract pricing", "sds available", "same-day shipping"], "tier": "premium", "sector": "industrial", "subSectors": ["mro", "safety", "electrical", "plumbing", "hvac", "hand tools", "power tools"]}, "generatedBy": "manual", "capabilities": ["price_lookup", "stock_check", "bulk_pricing", "tax_exemption", "po_numbers", "order_tracking", "business_invoicing", "account_creation"], "lastVerified": "2026-02-05", "methodConfig": {"self_hosted_card": {"notes": "Account required for pricing. Guest browsing shows ''Sign in for price'' on many items.", "requiresAuth": true, "locatorFormat": "url:{product_url}"}}, "checkoutMethods": ["self_hosted_card"], "searchDiscovery": {"mcp": false, "searchApi": false, "searchInternal": true}}'::jsonb, E'---
name: creditclaw-shop-grainger
version: 0.1.0
description: "Shop Grainger using CreditClaw payment rails"
homepage: https://creditclaw.com/skills/grainger
requires: [creditclaw]
maturity: draft
agent_friendliness: 0/5
last_verified: 2026-02-05
sector: industrial
tier: premium
sub_sectors: [mro, safety, electrical, plumbing, hvac, hand tools, power tools]
ordering_permission: registered
payment_methods: [card, invoice, ach, wire]
search_api: false
mcp: false
current_deals: false
---

# Shopping at Grainger

**Store URL:** https://www.grainger.com
**Category:** industrial
**Agent Friendliness:** ☆☆☆☆☆ (0/5)
**Capabilities:** Price Lookup, Stock Check, Bulk Pricing, Tax Exemption, PO Numbers, Order Tracking, Business Invoicing, Account Creation


---

## Checkout Methods (in order of preference)

- **Self-Hosted Card** (requires login) — Account required for pricing. Guest browsing shows ''Sign in for price'' on many items.

---

## How to Search

Search on grainger.com by product name, brand, or Grainger item number. Many prices require login to view.

Search URL: `https://www.grainger.com/search?searchQuery={q}`

Product ID format: `Grainger Item # (e.g., 6YA12)`

---

## How to Checkout

Account login required before checkout.
- PO number field available at checkout.
- Tax exemption field available. Check if your owner has a tax certificate on file.

Use your CreditClaw credentials to pay.


---

## Shipping

No standard free shipping threshold.
Estimated delivery: 1-3 business days
Business/bulk shipping rates available.

---

## Taxonomy

- **Sector:** Industrial
- **Sub-sectors:** mro, safety, electrical, plumbing, hvac, hand tools, power tools
- **Tier:** Premium
- **Tags:** mro leader, contract pricing, sds available, same-day shipping
---

## Search Discovery

- **Search API:** Not available
- **MCP Support:** Not supported
- **Internal Search:** Available

---

## Buying Configuration

- **Ordering:** Registered Account
- **Payment Methods:** Credit/Debit Card, Invoice / Net Terms, ACH Transfer, Wire Transfer
- **Delivery:** same-day, next-day, standard



---

## Deals & Promotions

- **Active Deals:** No



---

## Tips

- Account required to see contract pricing — owner must set up beforehand
- One of the largest MRO (maintenance, repair, operations) suppliers
- Net 30/60/90 terms available for qualified business accounts
- Same-day shipping on most in-stock items ordered by noon local time
- Product specs and safety data sheets available on every product page

---

## Making the Purchase

```bash
curl -X POST https://creditclaw.com/api/v1/bot/merchant/checkout \\
  -H "Authorization: Bearer $CREDITCLAW_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d ''{
    "merchant": "grainger",
    "product_id": "url:{product_url}",
    "shipping_address": { "name": "...", "line1": "...", "city": "...", "state": "...", "postalCode": "...", "country": "US" }
  }''
```

## Tracking

Order tracking is available. Poll the status endpoint for shipping updates.

---

## Metadata

- **Version:** 0.1.0
- **Last verified:** 2026-02-05
- **Generated by:** manual
- **Skill URL:** https://creditclaw.com/api/v1/bot/skills/grainger
- **Catalog page:** https://creditclaw.com/skills/grainger
', '2026-03-24 18:50:21.375367', '2026-03-24 18:50:21.375367', 'retailer', NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL) ON CONFLICT (slug) DO NOTHING;
INSERT INTO brand_index (slug, name, domain, url, logo_url, description, sector, sub_sectors, tier, tags, carries_brands, has_mcp, mcp_url, has_api, api_endpoint, api_auth_required, api_docs_url, has_cli, cli_install_command, site_search, product_feed, capabilities, checkout_methods, ordering, checkout_provider, payment_methods_accepted, creditclaw_supports, business_account, tax_exempt_supported, po_number_supported, delivery_options, free_shipping_threshold, ships_internationally, supported_countries, has_deals, deals_url, deals_api, loyalty_program, maturity, claimed_by, claim_id, submitted_by, submitter_type, version, last_verified, active_version_id, brand_data, skill_md, created_at, updated_at, brand_type, rating_search_accuracy, rating_stock_reliability, rating_checkout_completion, axs_rating, rating_count, overall_score, score_breakdown, recommendations, scan_tier, last_scanned_at, last_scanned_by) VALUES ('newegg', 'Newegg', 'newegg.com', 'https://www.newegg.com', '/assets/images/vendors/newegg.svg', 'Leading electronics and computer hardware retailer. Guest checkout available for components, peripherals, networking, and consumer electronics with detailed tech specs.', 'electronics', '{"computer components",peripherals,networking,gaming,"consumer electronics"}', 'mid_range', '{"pc building","shell shocker","tech deals","spec filtering"}', '{NVIDIA,AMD,Intel,ASUS,Corsair,EVGA,MSI,"Western Digital",Seagate,Logitech}', false, NULL, false, NULL, false, NULL, false, NULL, true, false, '{price_lookup,stock_check,order_tracking,returns}', '{self_hosted_card}', 'guest', 'in_house', '{card,apple_pay,google_pay,crypto}', '{}', false, false, false, '{standard,expedited}', NULL, false, '{US}', true, 'https://www.newegg.com/todays-deals', NULL, NULL, 'draft', NULL, NULL, 'creditclaw', 'ai_generated', '0.1.0', '2026-02-05', NULL, '{"url": "https://www.newegg.com", "name": "Newegg", "slug": "newegg", "tips": ["Best for computer components, peripherals, and consumer electronics", "Shell Shocker and daily deals can offer significant discounts", "Newegg Business available for tax-exempt and volume purchasing", "Marketplace sellers may have different return policies than Newegg direct", "Combo deals bundle related items at a discount"], "deals": {"dealsUrl": "https://www.newegg.com/todays-deals", "currentDeals": true}, "buying": {"returnsPolicy": "30-day returns on most items", "paymentMethods": ["card", "apple_pay", "google_pay", "crypto"], "deliveryOptions": "standard, expedited", "checkoutProviders": ["in_house"], "orderingPermission": "guest"}, "search": {"pattern": "Search on newegg.com by product name, brand, or model number. Excellent filtering by specs (CPU socket, RAM type, etc.).", "urlTemplate": "https://www.newegg.com/p/pl?d={q}", "productIdFormat": "Newegg Item # (e.g., N82E16835856145)"}, "logoUrl": "/assets/images/vendors/newegg.svg", "version": "0.1.0", "category": "electronics", "checkout": {"guestCheckout": true, "poNumberField": false, "taxExemptField": false}, "maturity": "draft", "shipping": {"estimatedDays": "3-7 business days", "businessShipping": false}, "taxonomy": {"tags": ["pc building", "shell shocker", "tech deals", "spec filtering"], "tier": "mid_range", "sector": "electronics", "subSectors": ["computer components", "peripherals", "networking", "gaming", "consumer electronics"]}, "generatedBy": "manual", "capabilities": ["price_lookup", "stock_check", "order_tracking", "returns"], "lastVerified": "2026-02-05", "methodConfig": {"self_hosted_card": {"notes": "Guest checkout available. Strong for computer components and electronics.", "requiresAuth": false, "locatorFormat": "url:{product_url}"}}, "checkoutMethods": ["self_hosted_card"], "searchDiscovery": {"mcp": false, "searchApi": false, "searchInternal": true}}'::jsonb, E'---
name: creditclaw-shop-newegg
version: 0.1.0
description: "Shop Newegg using CreditClaw payment rails"
homepage: https://creditclaw.com/skills/newegg
requires: [creditclaw]
maturity: draft
agent_friendliness: 2/5
last_verified: 2026-02-05
sector: electronics
tier: mid_range
sub_sectors: [computer components, peripherals, networking, gaming, consumer electronics]
ordering_permission: guest
payment_methods: [card, apple_pay, google_pay, crypto]
search_api: false
mcp: false
current_deals: true
---

# Shopping at Newegg

**Store URL:** https://www.newegg.com
**Category:** electronics
**Agent Friendliness:** ★★☆☆☆ (2/5)
**Capabilities:** Price Lookup, Stock Check, Order Tracking, Returns


---

## Checkout Methods (in order of preference)

- **Self-Hosted Card** — Guest checkout available. Strong for computer components and electronics.

---

## How to Search

Search on newegg.com by product name, brand, or model number. Excellent filtering by specs (CPU socket, RAM type, etc.).

Search URL: `https://www.newegg.com/p/pl?d={q}`

Product ID format: `Newegg Item # (e.g., N82E16835856145)`

---

## How to Checkout

Guest checkout is available — no account needed.

Use your CreditClaw credentials to pay.


---

## Shipping

No standard free shipping threshold.
Estimated delivery: 3-7 business days

---

## Taxonomy

- **Sector:** Electronics
- **Sub-sectors:** computer components, peripherals, networking, gaming, consumer electronics
- **Tier:** Mid-Range
- **Tags:** pc building, shell shocker, tech deals, spec filtering
---

## Search Discovery

- **Search API:** Not available
- **MCP Support:** Not supported
- **Internal Search:** Available

---

## Buying Configuration

- **Ordering:** Guest
- **Payment Methods:** Credit/Debit Card, Apple Pay, Google Pay, Cryptocurrency
- **Delivery:** standard, expedited

- **Returns:** 30-day returns on most items

---

## Deals & Promotions

- **Active Deals:** Yes
- **Deals Page:** https://www.newegg.com/todays-deals


---

## Tips

- Best for computer components, peripherals, and consumer electronics
- Shell Shocker and daily deals can offer significant discounts
- Newegg Business available for tax-exempt and volume purchasing
- Marketplace sellers may have different return policies than Newegg direct
- Combo deals bundle related items at a discount

---

## Making the Purchase

```bash
curl -X POST https://creditclaw.com/api/v1/bot/merchant/checkout \\
  -H "Authorization: Bearer $CREDITCLAW_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d ''{
    "merchant": "newegg",
    "product_id": "url:{product_url}",
    "shipping_address": { "name": "...", "line1": "...", "city": "...", "state": "...", "postalCode": "...", "country": "US" }
  }''
```

## Tracking

Order tracking is available. Poll the status endpoint for shipping updates.

---

## Metadata

- **Version:** 0.1.0
- **Last verified:** 2026-02-05
- **Generated by:** manual
- **Skill URL:** https://creditclaw.com/api/v1/bot/skills/newegg
- **Catalog page:** https://creditclaw.com/skills/newegg
', '2026-03-24 18:50:21.380396', '2026-03-24 18:50:21.380396', 'retailer', NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL) ON CONFLICT (slug) DO NOTHING;
INSERT INTO brand_index (slug, name, domain, url, logo_url, description, sector, sub_sectors, tier, tags, carries_brands, has_mcp, mcp_url, has_api, api_endpoint, api_auth_required, api_docs_url, has_cli, cli_install_command, site_search, product_feed, capabilities, checkout_methods, ordering, checkout_provider, payment_methods_accepted, creditclaw_supports, business_account, tax_exempt_supported, po_number_supported, delivery_options, free_shipping_threshold, ships_internationally, supported_countries, has_deals, deals_url, deals_api, loyalty_program, maturity, claimed_by, claim_id, submitted_by, submitter_type, version, last_verified, active_version_id, brand_data, skill_md, created_at, updated_at, brand_type, rating_search_accuracy, rating_stock_reliability, rating_checkout_completion, axs_rating, rating_count, overall_score, score_breakdown, recommendations, scan_tier, last_scanned_at, last_scanned_by) VALUES ('bh-photo', 'B&H Photo', 'bhphotovideo.com', 'https://www.bhphotovideo.com', '/assets/images/vendors/bh-photo.svg', 'Premier photo, video, and electronics retailer. Known for camera gear, pro audio/video equipment, and consumer electronics. Tax-free shopping outside NY.', 'electronics', '{cameras,audio,lighting,"pro video",computers,drones}', 'premium', '{"no sales tax","pro gear","used equipment",photography}', '{Canon,Nikon,Sony,Fujifilm,DJI,Apple,Samsung,Panasonic,Blackmagic,Rode}', false, NULL, false, NULL, false, NULL, false, NULL, true, false, '{price_lookup,stock_check,order_tracking,tax_exemption,returns}', '{self_hosted_card}', 'guest', 'in_house', '{card,apple_pay,google_pay}', '{}', false, true, false, '{standard,expedited}', 49, false, '{US}', true, 'https://www.bhphotovideo.com/c/browse/Deal-Zone/ci/17906', NULL, NULL, 'draft', NULL, NULL, 'creditclaw', 'ai_generated', '0.1.0', '2026-02-05', NULL, '{"url": "https://www.bhphotovideo.com", "name": "B&H Photo", "slug": "bh-photo", "tips": ["No sales tax on most orders shipped outside New York state", "Excellent for cameras, audio equipment, lighting, and pro video gear", "Used/refurbished section offers significant savings", "Closed on Saturdays and Jewish holidays — orders placed during these times ship the next business day", "Free expedited shipping on many items over $49"], "deals": {"dealsUrl": "https://www.bhphotovideo.com/c/browse/Deal-Zone/ci/17906", "currentDeals": true}, "buying": {"freeDelivery": "for orders over $49", "returnsPolicy": "30-day returns", "paymentMethods": ["card", "apple_pay", "google_pay"], "deliveryOptions": "standard, expedited", "checkoutProviders": ["in_house"], "orderingPermission": "guest"}, "search": {"pattern": "Search on bhphotovideo.com by product name, brand, or B&H item number. Detailed spec filtering available.", "urlTemplate": "https://www.bhphotovideo.com/c/search?q={q}", "productIdFormat": "B&H # (e.g., CANR5)"}, "logoUrl": "/assets/images/vendors/bh-photo.svg", "version": "0.1.0", "category": "electronics", "checkout": {"guestCheckout": true, "poNumberField": false, "taxExemptField": true}, "maturity": "draft", "shipping": {"estimatedDays": "2-7 business days", "freeThreshold": 49, "businessShipping": false}, "taxonomy": {"tags": ["no sales tax", "pro gear", "used equipment", "photography"], "tier": "premium", "sector": "electronics", "subSectors": ["cameras", "audio", "lighting", "pro video", "computers", "drones"]}, "generatedBy": "manual", "capabilities": ["price_lookup", "stock_check", "order_tracking", "tax_exemption", "returns"], "lastVerified": "2026-02-05", "methodConfig": {"self_hosted_card": {"notes": "Guest checkout available. No sales tax on orders shipped outside NY.", "requiresAuth": false, "locatorFormat": "url:{product_url}"}}, "checkoutMethods": ["self_hosted_card"], "searchDiscovery": {"mcp": false, "searchApi": false, "searchInternal": true}}'::jsonb, E'---
name: creditclaw-shop-bh-photo
version: 0.1.0
description: "Shop B&H Photo using CreditClaw payment rails"
homepage: https://creditclaw.com/skills/bh-photo
requires: [creditclaw]
maturity: draft
agent_friendliness: 2/5
last_verified: 2026-02-05
sector: electronics
tier: premium
sub_sectors: [cameras, audio, lighting, pro video, computers, drones]
ordering_permission: guest
payment_methods: [card, apple_pay, google_pay]
search_api: false
mcp: false
current_deals: true
---

# Shopping at B&H Photo

**Store URL:** https://www.bhphotovideo.com
**Category:** electronics
**Agent Friendliness:** ★★☆☆☆ (2/5)
**Capabilities:** Price Lookup, Stock Check, Order Tracking, Tax Exemption, Returns


---

## Checkout Methods (in order of preference)

- **Self-Hosted Card** — Guest checkout available. No sales tax on orders shipped outside NY.

---

## How to Search

Search on bhphotovideo.com by product name, brand, or B&H item number. Detailed spec filtering available.

Search URL: `https://www.bhphotovideo.com/c/search?q={q}`

Product ID format: `B&H # (e.g., CANR5)`

---

## How to Checkout

Guest checkout is available — no account needed.
- Tax exemption field available. Check if your owner has a tax certificate on file.

Use your CreditClaw credentials to pay.


---

## Shipping

Free shipping on orders over $49.
Estimated delivery: 2-7 business days

---

## Taxonomy

- **Sector:** Electronics
- **Sub-sectors:** cameras, audio, lighting, pro video, computers, drones
- **Tier:** Premium
- **Tags:** no sales tax, pro gear, used equipment, photography
---

## Search Discovery

- **Search API:** Not available
- **MCP Support:** Not supported
- **Internal Search:** Available

---

## Buying Configuration

- **Ordering:** Guest
- **Payment Methods:** Credit/Debit Card, Apple Pay, Google Pay
- **Delivery:** standard, expedited
- **Free Delivery:** for orders over $49
- **Returns:** 30-day returns

---

## Deals & Promotions

- **Active Deals:** Yes
- **Deals Page:** https://www.bhphotovideo.com/c/browse/Deal-Zone/ci/17906


---

## Tips

- No sales tax on most orders shipped outside New York state
- Excellent for cameras, audio equipment, lighting, and pro video gear
- Used/refurbished section offers significant savings
- Closed on Saturdays and Jewish holidays — orders placed during these times ship the next business day
- Free expedited shipping on many items over $49

---

## Making the Purchase

```bash
curl -X POST https://creditclaw.com/api/v1/bot/merchant/checkout \\
  -H "Authorization: Bearer $CREDITCLAW_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d ''{
    "merchant": "bh-photo",
    "product_id": "url:{product_url}",
    "shipping_address": { "name": "...", "line1": "...", "city": "...", "state": "...", "postalCode": "...", "country": "US" }
  }''
```

## Tracking

Order tracking is available. Poll the status endpoint for shipping updates.

---

## Metadata

- **Version:** 0.1.0
- **Last verified:** 2026-02-05
- **Generated by:** manual
- **Skill URL:** https://creditclaw.com/api/v1/bot/skills/bh-photo
- **Catalog page:** https://creditclaw.com/skills/bh-photo
', '2026-03-24 18:50:21.385617', '2026-03-24 18:50:21.385617', 'retailer', NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL) ON CONFLICT (slug) DO NOTHING;
INSERT INTO brand_index (slug, name, domain, url, logo_url, description, sector, sub_sectors, tier, tags, carries_brands, has_mcp, mcp_url, has_api, api_endpoint, api_auth_required, api_docs_url, has_cli, cli_install_command, site_search, product_feed, capabilities, checkout_methods, ordering, checkout_provider, payment_methods_accepted, creditclaw_supports, business_account, tax_exempt_supported, po_number_supported, delivery_options, free_shipping_threshold, ships_internationally, supported_countries, has_deals, deals_url, deals_api, loyalty_program, maturity, claimed_by, claim_id, submitted_by, submitter_type, version, last_verified, active_version_id, brand_data, skill_md, created_at, updated_at, brand_type, rating_search_accuracy, rating_stock_reliability, rating_checkout_completion, axs_rating, rating_count, overall_score, score_breakdown, recommendations, scan_tier, last_scanned_at, last_scanned_by) VALUES ('mcmaster-carr', 'McMaster-Carr', 'mcmaster.com', 'https://www.mcmaster.com', '/assets/images/vendors/mcmaster-carr.svg', 'Industrial supply catalog with 700,000+ products. Account required; known for fastest delivery in industrial supply. Fasteners, raw materials, tools, and maintenance supplies.', 'industrial', '{fasteners,"raw materials",pneumatics,hydraulics,bearings,hardware}', 'premium', '{"next-day delivery","cad models","fixed pricing","engineering grade"}', '{3M,Parker,Grainger,"Lincoln Electric",Mitutoyo,Starrett,Vishay,Eaton}', false, NULL, false, NULL, false, NULL, false, NULL, true, false, '{price_lookup,stock_check,order_tracking,bulk_pricing}', '{self_hosted_card}', 'registered', 'in_house', '{card,invoice,ach}', '{}', false, true, true, '{"next-day standard"}', NULL, false, '{US}', false, NULL, NULL, NULL, 'draft', NULL, NULL, 'creditclaw', 'ai_generated', '0.1.0', '2026-02-05', NULL, '{"url": "https://www.mcmaster.com", "name": "McMaster-Carr", "slug": "mcmaster-carr", "tips": ["Account required — owner must register before bot can purchase", "Fastest shipping in industrial supply — most items arrive next day", "The definitive source for fasteners, raw materials, and industrial components", "No price matching or negotiation — prices are fixed", "CAD models available for most products"], "deals": {"currentDeals": false}, "buying": {"paymentMethods": ["card", "invoice", "ach"], "deliveryOptions": "next-day standard", "checkoutProviders": ["in_house"], "orderingPermission": "registered"}, "search": {"pattern": "Search on mcmaster.com by product description or McMaster part number. The site uses a proprietary navigation system — no standard URL-based search.", "productIdFormat": "McMaster Part # (e.g., 91251A545)"}, "logoUrl": "/assets/images/vendors/mcmaster-carr.svg", "version": "0.1.0", "category": "industrial", "checkout": {"guestCheckout": false, "poNumberField": true, "taxExemptField": true}, "maturity": "draft", "shipping": {"estimatedDays": "Next day (most items)", "businessShipping": true}, "taxonomy": {"tags": ["next-day delivery", "cad models", "fixed pricing", "engineering grade"], "tier": "premium", "sector": "industrial", "subSectors": ["fasteners", "raw materials", "pneumatics", "hydraulics", "bearings", "hardware"]}, "generatedBy": "manual", "capabilities": ["price_lookup", "stock_check", "order_tracking", "bulk_pricing"], "lastVerified": "2026-02-05", "methodConfig": {"self_hosted_card": {"notes": "Account required. McMaster-Carr is notoriously difficult to browse without an account.", "requiresAuth": true, "locatorFormat": "url:{product_url}"}}, "checkoutMethods": ["self_hosted_card"], "searchDiscovery": {"mcp": false, "searchApi": false, "searchInternal": true}}'::jsonb, E'---
name: creditclaw-shop-mcmaster-carr
version: 0.1.0
description: "Shop McMaster-Carr using CreditClaw payment rails"
homepage: https://creditclaw.com/skills/mcmaster-carr
requires: [creditclaw]
maturity: draft
agent_friendliness: 0/5
last_verified: 2026-02-05
sector: industrial
tier: premium
sub_sectors: [fasteners, raw materials, pneumatics, hydraulics, bearings, hardware]
ordering_permission: registered
payment_methods: [card, invoice, ach]
search_api: false
mcp: false
current_deals: false
---

# Shopping at McMaster-Carr

**Store URL:** https://www.mcmaster.com
**Category:** industrial
**Agent Friendliness:** ☆☆☆☆☆ (0/5)
**Capabilities:** Price Lookup, Stock Check, Order Tracking, Bulk Pricing


---

## Checkout Methods (in order of preference)

- **Self-Hosted Card** (requires login) — Account required. McMaster-Carr is notoriously difficult to browse without an account.

---

## How to Search

Search on mcmaster.com by product description or McMaster part number. The site uses a proprietary navigation system — no standard URL-based search.

Product ID format: `McMaster Part # (e.g., 91251A545)`

---

## How to Checkout

Account login required before checkout.
- PO number field available at checkout.
- Tax exemption field available. Check if your owner has a tax certificate on file.

Use your CreditClaw credentials to pay.


---

## Shipping

No standard free shipping threshold.
Estimated delivery: Next day (most items)
Business/bulk shipping rates available.

---

## Taxonomy

- **Sector:** Industrial
- **Sub-sectors:** fasteners, raw materials, pneumatics, hydraulics, bearings, hardware
- **Tier:** Premium
- **Tags:** next-day delivery, cad models, fixed pricing, engineering grade
---

## Search Discovery

- **Search API:** Not available
- **MCP Support:** Not supported
- **Internal Search:** Available

---

## Buying Configuration

- **Ordering:** Registered Account
- **Payment Methods:** Credit/Debit Card, Invoice / Net Terms, ACH Transfer
- **Delivery:** next-day standard



---

## Deals & Promotions

- **Active Deals:** No



---

## Tips

- Account required — owner must register before bot can purchase
- Fastest shipping in industrial supply — most items arrive next day
- The definitive source for fasteners, raw materials, and industrial components
- No price matching or negotiation — prices are fixed
- CAD models available for most products

---

## Making the Purchase

```bash
curl -X POST https://creditclaw.com/api/v1/bot/merchant/checkout \\
  -H "Authorization: Bearer $CREDITCLAW_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d ''{
    "merchant": "mcmaster-carr",
    "product_id": "url:{product_url}",
    "shipping_address": { "name": "...", "line1": "...", "city": "...", "state": "...", "postalCode": "...", "country": "US" }
  }''
```

## Tracking

Order tracking is available. Poll the status endpoint for shipping updates.

---

## Metadata

- **Version:** 0.1.0
- **Last verified:** 2026-02-05
- **Generated by:** manual
- **Skill URL:** https://creditclaw.com/api/v1/bot/skills/mcmaster-carr
- **Catalog page:** https://creditclaw.com/skills/mcmaster-carr
', '2026-03-24 18:50:21.390752', '2026-03-24 18:50:21.390752', 'retailer', NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL) ON CONFLICT (slug) DO NOTHING;
INSERT INTO brand_index (slug, name, domain, url, logo_url, description, sector, sub_sectors, tier, tags, carries_brands, has_mcp, mcp_url, has_api, api_endpoint, api_auth_required, api_docs_url, has_cli, cli_install_command, site_search, product_feed, capabilities, checkout_methods, ordering, checkout_provider, payment_methods_accepted, creditclaw_supports, business_account, tax_exempt_supported, po_number_supported, delivery_options, free_shipping_threshold, ships_internationally, supported_countries, has_deals, deals_url, deals_api, loyalty_program, maturity, claimed_by, claim_id, submitted_by, submitter_type, version, last_verified, active_version_id, brand_data, skill_md, created_at, updated_at, brand_type, rating_search_accuracy, rating_stock_reliability, rating_checkout_completion, axs_rating, rating_count, overall_score, score_breakdown, recommendations, scan_tier, last_scanned_at, last_scanned_by) VALUES ('target', 'Target', 'target.com', 'https://target.com', NULL, 'Online store at target.com', 'retail', '{}', NULL, '{}', '{}', false, NULL, false, NULL, false, NULL, false, NULL, true, false, '{}', '{}', NULL, NULL, '{}', '{}', false, false, false, '{}', NULL, false, '{}', false, NULL, NULL, NULL, 'community', NULL, NULL, 'asx-scanner', 'auto_scan', '1.0.0', NULL, NULL, '{}'::jsonb, '---
name: creditclaw-shop-target
version: 1.0.0
description: "Shop Target using CreditClaw payment rails"
homepage: https://creditclaw.com/skills/target
requires: [creditclaw]
maturity: draft
asx_score: 0/100
last_verified: 2026-04-02




---

# Shopping at Target

**Store URL:** https://target.com
**Sector:** uncategorized
**ASX Score:** 0/100
**Capabilities:** 


---

## Checkout Methods (in order of preference)

- **Browser Automation** (requires login) — Account may be required

---

## How to Search

Search on Target

---

## How to Checkout

Account login required before checkout.

Use your CreditClaw credentials to pay.


---

## Shipping

No standard free shipping threshold.
Estimated delivery: Varies

---
---
---
---
---

## Tips

- Visit https://target.com to browse products
- Use the site search to find specific items

---

## Tracking

Order tracking is not yet available for this vendor. Monitor email for shipping confirmation.

---

## Metadata

- **Version:** 1.0.0
- **Last verified:** 2026-04-02
- **Generated by:** skill_builder
- **Skill URL:** https://creditclaw.com/api/v1/bot/skills/target
- **Catalog page:** https://creditclaw.com/skills/target

---

## Feedback

After your purchase attempt (successful or not), help improve this skill:

```
POST https://creditclaw.com/api/v1/bot/skills/target/feedback
Authorization: Bearer <your-creditclaw-api-key>
Content-Type: application/json

{
  "search_accuracy": 4,
  "stock_reliability": 5,
  "checkout_completion": 3,
  "checkout_method": "browser_automation",
  "outcome": "success",
  "comment": "optional — what happened?"
}
```

Ratings are 1-5. Outcome is one of: success, checkout_failed, search_failed, out_of_stock, price_mismatch, flow_changed.
Checkout method is one of: native_api, browser_automation, x402, acp, self_hosted_card, crossmint_world.
Authorization header is optional but improves rating weight.
This is optional but helps other agents find reliable vendors.
', '2026-04-02 00:59:17.248963', '2026-04-02 00:59:17.245', NULL, NULL, NULL, NULL, NULL, 0, 32, E'{"speed": {"max": 25, "score": 11, "signals": [{"key": "search_api", "max": 10, "label": "Search API / MCP", "score": 0, "detail": "No programmatic API, MCP endpoint, or agentic commerce protocol detected"}, {"key": "site_search", "max": 10, "label": "Internal Site Search", "score": 6, "detail": "Search form detected on homepage. Search autocomplete/typeahead capability detected"}, {"key": "page_load", "max": 5, "label": "Page Load Performance", "score": 5, "detail": "Excellent load time: 699ms"}]}, "clarity": {"max": 40, "score": 6, "signals": [{"key": "json_ld", "max": 20, "label": "JSON-LD / Structured Data", "score": 0, "detail": "No JSON-LD structured data or Open Graph commerce tags found"}, {"key": "product_feed", "max": 10, "label": "Product Feed / Sitemap", "score": 1, "detail": "No sitemap.xml found. Sitemap referenced in robots.txt"}, {"key": "clean_html", "max": 10, "label": "Clean HTML / Semantic Markup", "score": 5, "detail": "Few semantic HTML5 elements found. Good heading hierarchy (12 headings, H1 present). Good accessibility markup (60 roles, 95 aria-labels). 79% of images have alt text"}]}, "reliability": {"max": 35, "score": 15, "signals": [{"key": "access_auth", "max": 10, "label": "Access & Authentication", "score": 2, "detail": "Direct checkout/cart links found"}, {"key": "order_management", "max": 10, "label": "Order Management", "score": 7, "detail": "Product variant selector found. \\"Add to cart\\" action detected. Predictable cart/basket URL structure"}, {"key": "checkout_flow", "max": 10, "label": "Checkout Flow", "score": 2, "detail": "Discount/promo code field detected"}, {"key": "bot_tolerance", "max": 5, "label": "Bot Tolerance", "score": 4, "detail": "robots.txt allows general crawling. No CAPTCHA or bot challenge on homepage"}]}}'::jsonb, '[{"title": "Add JSON-LD structured data", "impact": "high", "signal": "json_ld", "description": "Implement Schema.org Product markup using JSON-LD on your product pages. This is the single highest-impact improvement — it lets AI agents read product names, prices, and availability directly without rendering the page.", "potentialGain": 20}, {"title": "Expose a search API or MCP endpoint", "impact": "high", "signal": "search_api", "description": "Provide a programmatic search endpoint that AI agents can query directly. Consider implementing MCP (Model Context Protocol) to let agents interact with your catalog natively. This eliminates the need for browser-based navigation entirely.", "potentialGain": 10}, {"title": "Publish a sitemap with product URLs", "impact": "medium", "signal": "product_feed", "description": "Create or improve your sitemap.xml to include product page URLs. Reference it in robots.txt. This helps AI agents discover your full catalog efficiently.", "potentialGain": 9}, {"title": "Enable guest checkout", "impact": "high", "signal": "access_auth", "description": "Allow purchases without mandatory account creation. Guest checkout is critical for AI agents — most cannot complete registration flows, verify email addresses, or handle phone verification steps.", "potentialGain": 8}, {"title": "Clarify checkout options", "impact": "medium", "signal": "checkout_flow", "description": "Clearly label payment methods, shipping options, and discount/promo code fields. Use descriptive text that an AI agent can parse to understand the differences between options (e.g., ''Standard Shipping - 5-7 business days - $5.99'').", "potentialGain": 8}, {"title": "Improve HTML semantic structure", "impact": "medium", "signal": "clean_html", "description": "Use semantic HTML5 elements (header, nav, main, article, footer) and proper heading hierarchy. Add alt text to images and ARIA labels to interactive elements. This makes your site parseable even without structured data.", "potentialGain": 5}, {"title": "Make site search discoverable", "impact": "medium", "signal": "site_search", "description": "Ensure your site search form is accessible on the homepage with a clear action URL. Add an OpenSearch description file so agents can discover your search template automatically.", "potentialGain": 4}, {"title": "Simplify product selection and cart management", "impact": "high", "signal": "order_management", "description": "Use clear, predictable URL patterns for cart and product pages. Make variant selectors (size, color, quantity) easily identifiable with standard HTML form elements. Ensure add-to-cart actions are straightforward.", "potentialGain": 3}, {"title": "Reduce bot-blocking measures", "impact": "medium", "signal": "bot_tolerance", "description": "Review your robots.txt to allow AI agent crawling. Avoid aggressive CAPTCHAs on landing and product pages. Consider whitelisting known AI agent user-agents to enable automated shopping.", "potentialGain": 1}]'::jsonb, 'free', '2026-04-02 00:59:17.245', 'public') ON CONFLICT (slug) DO NOTHING;
INSERT INTO brand_index (slug, name, domain, url, logo_url, description, sector, sub_sectors, tier, tags, carries_brands, has_mcp, mcp_url, has_api, api_endpoint, api_auth_required, api_docs_url, has_cli, cli_install_command, site_search, product_feed, capabilities, checkout_methods, ordering, checkout_provider, payment_methods_accepted, creditclaw_supports, business_account, tax_exempt_supported, po_number_supported, delivery_options, free_shipping_threshold, ships_internationally, supported_countries, has_deals, deals_url, deals_api, loyalty_program, maturity, claimed_by, claim_id, submitted_by, submitter_type, version, last_verified, active_version_id, brand_data, skill_md, created_at, updated_at, brand_type, rating_search_accuracy, rating_stock_reliability, rating_checkout_completion, axs_rating, rating_count, overall_score, score_breakdown, recommendations, scan_tier, last_scanned_at, last_scanned_by) VALUES ('zappos', 'Zappos', 'zappos.com', 'https://zappos.com', NULL, 'Online store at zappos.com', 'footwear', '{}', NULL, '{}', '{}', false, NULL, false, NULL, false, NULL, false, NULL, true, false, '{}', '{}', NULL, NULL, '{}', '{}', false, false, false, '{}', NULL, false, '{}', false, NULL, NULL, NULL, 'community', NULL, NULL, 'asx-scanner', 'auto_scan', '1.0.0', NULL, NULL, '{}'::jsonb, '---
name: creditclaw-shop-zappos
version: 1.0.0
description: "Shop Zappos using CreditClaw payment rails"
homepage: https://creditclaw.com/skills/zappos
requires: [creditclaw]
maturity: draft
asx_score: 0/100
last_verified: 2026-04-02




---

# Shopping at Zappos

**Store URL:** https://zappos.com
**Sector:** uncategorized
**ASX Score:** 0/100
**Capabilities:** 


---

## Checkout Methods (in order of preference)

- **Browser Automation** (requires login) — Account may be required

---

## How to Search

Search on Zappos

---

## How to Checkout

Account login required before checkout.

Use your CreditClaw credentials to pay.


---

## Shipping

No standard free shipping threshold.
Estimated delivery: Varies

---
---
---
---
---

## Tips

- Visit https://zappos.com to browse products
- Use the site search to find specific items

---

## Tracking

Order tracking is not yet available for this vendor. Monitor email for shipping confirmation.

---

## Metadata

- **Version:** 1.0.0
- **Last verified:** 2026-04-02
- **Generated by:** skill_builder
- **Skill URL:** https://creditclaw.com/api/v1/bot/skills/zappos
- **Catalog page:** https://creditclaw.com/skills/zappos

---

## Feedback

After your purchase attempt (successful or not), help improve this skill:

```
POST https://creditclaw.com/api/v1/bot/skills/zappos/feedback
Authorization: Bearer <your-creditclaw-api-key>
Content-Type: application/json

{
  "search_accuracy": 4,
  "stock_reliability": 5,
  "checkout_completion": 3,
  "checkout_method": "browser_automation",
  "outcome": "success",
  "comment": "optional — what happened?"
}
```

Ratings are 1-5. Outcome is one of: success, checkout_failed, search_failed, out_of_stock, price_mismatch, flow_changed.
Checkout method is one of: native_api, browser_automation, x402, acp, self_hosted_card, crossmint_world.
Authorization header is optional but improves rating weight.
This is optional but helps other agents find reliable vendors.
', '2026-04-02 00:59:28.045406', '2026-04-02 00:59:28.041', NULL, NULL, NULL, NULL, NULL, 0, 25, '{"speed": {"max": 25, "score": 5, "signals": [{"key": "search_api", "max": 10, "label": "Search API / MCP", "score": 0, "detail": "No programmatic API, MCP endpoint, or agentic commerce protocol detected"}, {"key": "site_search", "max": 10, "label": "Internal Site Search", "score": 0, "detail": "No site search functionality detected on homepage"}, {"key": "page_load", "max": 5, "label": "Page Load Performance", "score": 5, "detail": "Excellent load time: 894ms"}]}, "clarity": {"max": 40, "score": 9, "signals": [{"key": "json_ld", "max": 20, "label": "JSON-LD / Structured Data", "score": 0, "detail": "No JSON-LD structured data or Open Graph commerce tags found"}, {"key": "product_feed", "max": 10, "label": "Product Feed / Sitemap", "score": 1, "detail": "No sitemap.xml found. Sitemap referenced in robots.txt"}, {"key": "clean_html", "max": 10, "label": "Clean HTML / Semantic Markup", "score": 8, "detail": "Partial semantic structure (3/7 landmark elements). Good heading hierarchy (4 headings, H1 present). Good accessibility markup (21 roles, 88 aria-labels). 92% of images have alt text"}]}, "reliability": {"max": 35, "score": 11, "signals": [{"key": "access_auth", "max": 10, "label": "Access & Authentication", "score": 2, "detail": "Shopping actions available on homepage"}, {"key": "order_management", "max": 10, "label": "Order Management", "score": 3, "detail": "Product variant selector found"}, {"key": "checkout_flow", "max": 10, "label": "Checkout Flow", "score": 2, "detail": "Discount/promo code field detected"}, {"key": "bot_tolerance", "max": 5, "label": "Bot Tolerance", "score": 4, "detail": "robots.txt allows general crawling. No CAPTCHA or bot challenge on homepage"}]}}'::jsonb, '[{"title": "Add JSON-LD structured data", "impact": "high", "signal": "json_ld", "description": "Implement Schema.org Product markup using JSON-LD on your product pages. This is the single highest-impact improvement — it lets AI agents read product names, prices, and availability directly without rendering the page.", "potentialGain": 20}, {"title": "Expose a search API or MCP endpoint", "impact": "high", "signal": "search_api", "description": "Provide a programmatic search endpoint that AI agents can query directly. Consider implementing MCP (Model Context Protocol) to let agents interact with your catalog natively. This eliminates the need for browser-based navigation entirely.", "potentialGain": 10}, {"title": "Make site search discoverable", "impact": "medium", "signal": "site_search", "description": "Ensure your site search form is accessible on the homepage with a clear action URL. Add an OpenSearch description file so agents can discover your search template automatically.", "potentialGain": 10}, {"title": "Publish a sitemap with product URLs", "impact": "medium", "signal": "product_feed", "description": "Create or improve your sitemap.xml to include product page URLs. Reference it in robots.txt. This helps AI agents discover your full catalog efficiently.", "potentialGain": 9}, {"title": "Enable guest checkout", "impact": "high", "signal": "access_auth", "description": "Allow purchases without mandatory account creation. Guest checkout is critical for AI agents — most cannot complete registration flows, verify email addresses, or handle phone verification steps.", "potentialGain": 8}, {"title": "Clarify checkout options", "impact": "medium", "signal": "checkout_flow", "description": "Clearly label payment methods, shipping options, and discount/promo code fields. Use descriptive text that an AI agent can parse to understand the differences between options (e.g., ''Standard Shipping - 5-7 business days - $5.99'').", "potentialGain": 8}, {"title": "Simplify product selection and cart management", "impact": "high", "signal": "order_management", "description": "Use clear, predictable URL patterns for cart and product pages. Make variant selectors (size, color, quantity) easily identifiable with standard HTML form elements. Ensure add-to-cart actions are straightforward.", "potentialGain": 7}, {"title": "Improve HTML semantic structure", "impact": "medium", "signal": "clean_html", "description": "Use semantic HTML5 elements (header, nav, main, article, footer) and proper heading hierarchy. Add alt text to images and ARIA labels to interactive elements. This makes your site parseable even without structured data.", "potentialGain": 2}, {"title": "Reduce bot-blocking measures", "impact": "medium", "signal": "bot_tolerance", "description": "Review your robots.txt to allow AI agent crawling. Avoid aggressive CAPTCHAs on landing and product pages. Consider whitelisting known AI agent user-agents to enable automated shopping.", "potentialGain": 1}]'::jsonb, 'free', '2026-04-02 00:59:28.041', 'public') ON CONFLICT (slug) DO NOTHING;
INSERT INTO brand_index (slug, name, domain, url, logo_url, description, sector, sub_sectors, tier, tags, carries_brands, has_mcp, mcp_url, has_api, api_endpoint, api_auth_required, api_docs_url, has_cli, cli_install_command, site_search, product_feed, capabilities, checkout_methods, ordering, checkout_provider, payment_methods_accepted, creditclaw_supports, business_account, tax_exempt_supported, po_number_supported, delivery_options, free_shipping_threshold, ships_internationally, supported_countries, has_deals, deals_url, deals_api, loyalty_program, maturity, claimed_by, claim_id, submitted_by, submitter_type, version, last_verified, active_version_id, brand_data, skill_md, created_at, updated_at, brand_type, rating_search_accuracy, rating_stock_reliability, rating_checkout_completion, axs_rating, rating_count, overall_score, score_breakdown, recommendations, scan_tier, last_scanned_at, last_scanned_by) VALUES ('allbirds', 'Allbirds', 'allbirds.com', 'https://allbirds.com', NULL, 'Online store at allbirds.com', 'footwear', '{}', NULL, '{}', '{}', false, NULL, false, NULL, false, NULL, false, NULL, true, false, '{}', '{}', NULL, NULL, '{}', '{}', false, false, false, '{}', NULL, false, '{}', false, NULL, NULL, NULL, 'community', NULL, NULL, 'asx-scanner', 'auto_scan', '1.0.0', NULL, NULL, '{}'::jsonb, '---
name: creditclaw-shop-allbirds
version: 1.0.0
description: "Shop Allbirds using CreditClaw payment rails"
homepage: https://creditclaw.com/skills/allbirds
requires: [creditclaw]
maturity: draft
asx_score: 0/100
last_verified: 2026-04-02




---

# Shopping at Allbirds

**Store URL:** https://allbirds.com
**Sector:** specialty
**ASX Score:** 0/100
**Capabilities:** 


---

## Checkout Methods (in order of preference)

- **Browser Automation** (requires login) — Account may be required

---

## How to Search

Search on Allbirds

---

## How to Checkout

Account login required before checkout.

Use your CreditClaw credentials to pay.


---

## Shipping

No standard free shipping threshold.
Estimated delivery: Varies

---
---
---
---
---

## Tips

- Visit https://allbirds.com to browse products
- Use the site search to find specific items

---

## Tracking

Order tracking is not yet available for this vendor. Monitor email for shipping confirmation.

---

## Metadata

- **Version:** 1.0.0
- **Last verified:** 2026-04-02
- **Generated by:** agentic_scanner
- **Skill URL:** https://creditclaw.com/api/v1/bot/skills/allbirds
- **Catalog page:** https://creditclaw.com/skills/allbirds

---

## Feedback

After your purchase attempt (successful or not), help improve this skill:

```
POST https://creditclaw.com/api/v1/bot/skills/allbirds/feedback
Authorization: Bearer <your-creditclaw-api-key>
Content-Type: application/json

{
  "search_accuracy": 4,
  "stock_reliability": 5,
  "checkout_completion": 3,
  "checkout_method": "browser_automation",
  "outcome": "success",
  "comment": "optional — what happened?"
}
```

Ratings are 1-5. Outcome is one of: success, checkout_failed, search_failed, out_of_stock, price_mismatch, flow_changed.
Checkout method is one of: native_api, browser_automation, x402, acp, self_hosted_card, crossmint_world.
Authorization header is optional but improves rating weight.
This is optional but helps other agents find reliable vendors.
', '2026-04-02 22:39:07.68489', '2026-04-02 22:49:54.685', NULL, NULL, NULL, NULL, NULL, 0, 49, '{"clarity": {"max": 35, "score": 18, "signals": [{"key": "json_ld", "max": 15, "label": "JSON-LD / Structured Data", "score": 0, "detail": "No evidence found for json-ld / structured data"}, {"key": "product_feed", "max": 10, "label": "Product Feed / Sitemap", "score": 10, "detail": "sitemap.xml found and accessible. Sitemap has valid XML structure (urlset or sitemapindex). Product page URLs detected in sitemap (/products/, /p/, /shop/, /catalog). Multi-sitemap index found (sitemapindex element). Sitemap URL referenced in robots.txt"}, {"key": "clean_html", "max": 10, "label": "Clean HTML / Semantic Markup", "score": 8, "detail": "4+ semantic HTML5 landmark elements (header, nav, main, article, section, aside, footer). H1 present with 3+ total headings (good hierarchy). 5+ ARIA attributes (roles + aria-labels)"}]}, "reliability": {"max": 35, "score": 23, "signals": [{"key": "access_auth", "max": 10, "label": "Access & Authentication", "score": 7, "detail": "Guest checkout available (no account required to purchase). Direct checkout or cart links found on homepage"}, {"key": "order_management", "max": 10, "label": "Order Management", "score": 5, "detail": "Product variant selectors found (size, color, options). Predictable cart/basket URL structure (/cart or /basket)"}, {"key": "checkout_flow", "max": 10, "label": "Checkout Flow", "score": 8, "detail": "Promo code, coupon, or discount field available. Shipping or delivery options described with methods/timeframes. Payment methods clearly labeled (Visa, PayPal, Apple Pay, etc.)"}, {"key": "bot_tolerance", "max": 5, "label": "Bot Tolerance", "score": 3, "detail": "No CAPTCHA or bot challenge detected on homepage. robots.txt present with selective (partial) rules"}]}, "discoverability": {"max": 30, "score": 8, "signals": [{"key": "search_api", "max": 10, "label": "Search API / MCP", "score": 0, "detail": "No evidence found for search api / mcp"}, {"key": "site_search", "max": 10, "label": "Internal Site Search", "score": 0, "detail": "No evidence found for internal site search"}, {"key": "page_load", "max": 5, "label": "Page Load Performance", "score": 5, "detail": "Page load time ≤ 1,000ms"}, {"key": "product_page", "max": 5, "label": "Product Page Quality", "score": 3, "detail": "Machine-readable pricing on product page (JSON-LD Offer, microdata, or clearly tagged price element). Product identifier visible in URL (enables direct agent navigation)"}]}}'::jsonb, '[{"title": "Add JSON-LD structured data", "impact": "high", "signal": "json_ld", "description": "Implement Schema.org Product markup using JSON-LD on your product pages. This is the single highest-impact improvement — it lets AI agents read product names, prices, and availability directly without rendering the page.", "potentialGain": 15}, {"title": "Expose a search API or MCP endpoint", "impact": "high", "signal": "search_api", "description": "Provide a programmatic search endpoint that AI agents can query directly. Consider implementing MCP (Model Context Protocol) to let agents interact with your catalog natively. This eliminates the need for browser-based navigation entirely.", "potentialGain": 10}, {"title": "Make site search discoverable", "impact": "medium", "signal": "site_search", "description": "Ensure your site search form is accessible on the homepage with a clear action URL. Add an OpenSearch description file so agents can discover your search template automatically.", "potentialGain": 10}, {"title": "Simplify product selection and cart management", "impact": "high", "signal": "order_management", "description": "Use clear, predictable URL patterns for cart and product pages. Make variant selectors (size, color, quantity) easily identifiable with standard HTML form elements. Ensure add-to-cart actions are straightforward.", "potentialGain": 5}, {"title": "Enable guest checkout", "impact": "high", "signal": "access_auth", "description": "Allow purchases without mandatory account creation. Guest checkout is critical for AI agents — most cannot complete registration flows, verify email addresses, or handle phone verification steps.", "potentialGain": 3}, {"title": "Improve HTML semantic structure", "impact": "medium", "signal": "clean_html", "description": "Use semantic HTML5 elements (header, nav, main, article, footer) and proper heading hierarchy. Add alt text to images and ARIA labels to interactive elements. This makes your site parseable even without structured data.", "potentialGain": 2}, {"title": "Improve product page agent-readability", "impact": "high", "signal": "product_page", "description": "Make product pages easy for AI agents to parse: include machine-readable pricing (JSON-LD Offer or clearly tagged price elements), use standard HTML form elements for variant selection (size, color), ensure add-to-cart is a single clear action, and include product identifiers in URLs for direct navigation.", "potentialGain": 2}, {"title": "Clarify checkout options", "impact": "medium", "signal": "checkout_flow", "description": "Clearly label payment methods, shipping options, and discount/promo code fields. Use descriptive text that an AI agent can parse to understand the differences between options (e.g., ''Standard Shipping - 5-7 business days - $5.99'').", "potentialGain": 2}, {"title": "Reduce bot-blocking measures", "impact": "medium", "signal": "bot_tolerance", "description": "Review your robots.txt to allow AI agent crawling. Avoid aggressive CAPTCHAs on landing and product pages. Consider whitelisting known AI agent user-agents to enable automated shopping.", "potentialGain": 2}]'::jsonb, 'agentic', '2026-04-02 22:49:54.685', 'public') ON CONFLICT (slug) DO NOTHING;
INSERT INTO brand_index (slug, name, domain, url, logo_url, description, sector, sub_sectors, tier, tags, carries_brands, has_mcp, mcp_url, has_api, api_endpoint, api_auth_required, api_docs_url, has_cli, cli_install_command, site_search, product_feed, capabilities, checkout_methods, ordering, checkout_provider, payment_methods_accepted, creditclaw_supports, business_account, tax_exempt_supported, po_number_supported, delivery_options, free_shipping_threshold, ships_internationally, supported_countries, has_deals, deals_url, deals_api, loyalty_program, maturity, claimed_by, claim_id, submitted_by, submitter_type, version, last_verified, active_version_id, brand_data, skill_md, created_at, updated_at, brand_type, rating_search_accuracy, rating_stock_reliability, rating_checkout_completion, axs_rating, rating_count, overall_score, score_breakdown, recommendations, scan_tier, last_scanned_at, last_scanned_by) VALUES ('rei', 'REI', 'rei.com', 'https://rei.com', NULL, 'Online store at rei.com', 'outdoor', '{}', NULL, '{}', '{}', false, NULL, false, NULL, false, NULL, false, NULL, true, false, '{}', '{}', NULL, NULL, '{}', '{}', false, false, false, '{}', NULL, false, '{}', false, NULL, NULL, NULL, 'community', NULL, NULL, 'asx-scanner', 'auto_scan', '1.0.0', NULL, NULL, '{}'::jsonb, '---
name: creditclaw-shop-rei
version: 1.0.0
description: "Shop REI using CreditClaw payment rails"
homepage: https://creditclaw.com/skills/rei
requires: [creditclaw]
maturity: draft
asx_score: 0/100
last_verified: 2026-04-02




---

# Shopping at REI

**Store URL:** https://rei.com
**Sector:** specialty
**ASX Score:** 0/100
**Capabilities:** 


---

## Checkout Methods (in order of preference)

- **Browser Automation** (requires login) — Account may be required

---

## How to Search

Search on REI

---

## How to Checkout

Account login required before checkout.

Use your CreditClaw credentials to pay.


---

## Shipping

No standard free shipping threshold.
Estimated delivery: Varies

---
---
---
---
---

## Tips

- Visit https://rei.com to browse products
- Use the site search to find specific items

---

## Tracking

Order tracking is not yet available for this vendor. Monitor email for shipping confirmation.

---

## Metadata

- **Version:** 1.0.0
- **Last verified:** 2026-04-02
- **Generated by:** agentic_scanner
- **Skill URL:** https://creditclaw.com/api/v1/bot/skills/rei
- **Catalog page:** https://creditclaw.com/skills/rei

---

## Feedback

After your purchase attempt (successful or not), help improve this skill:

```
POST https://creditclaw.com/api/v1/bot/skills/rei/feedback
Authorization: Bearer <your-creditclaw-api-key>
Content-Type: application/json

{
  "search_accuracy": 4,
  "stock_reliability": 5,
  "checkout_completion": 3,
  "checkout_method": "browser_automation",
  "outcome": "success",
  "comment": "optional — what happened?"
}
```

Ratings are 1-5. Outcome is one of: success, checkout_failed, search_failed, out_of_stock, price_mismatch, flow_changed.
Checkout method is one of: native_api, browser_automation, x402, acp, self_hosted_card, crossmint_world.
Authorization header is optional but improves rating weight.
This is optional but helps other agents find reliable vendors.
', '2026-04-02 22:39:07.697098', '2026-04-02 22:49:54.994', NULL, NULL, NULL, NULL, NULL, 0, 46, '{"clarity": {"max": 35, "score": 20, "signals": [{"key": "json_ld", "max": 15, "label": "JSON-LD / Structured Data", "score": 0, "detail": "No evidence found for json-ld / structured data"}, {"key": "product_feed", "max": 10, "label": "Product Feed / Sitemap", "score": 10, "detail": "sitemap.xml found and accessible. Sitemap has valid XML structure (urlset or sitemapindex). Product page URLs detected in sitemap (/products/, /p/, /shop/, /catalog). Multi-sitemap index found (sitemapindex element). Sitemap URL referenced in robots.txt"}, {"key": "clean_html", "max": 10, "label": "Clean HTML / Semantic Markup", "score": 10, "detail": "4+ semantic HTML5 landmark elements (header, nav, main, article, section, aside, footer). H1 present with 3+ total headings (good hierarchy). 5+ ARIA attributes (roles + aria-labels). 80%+ of images have meaningful alt text"}]}, "reliability": {"max": 35, "score": 15, "signals": [{"key": "access_auth", "max": 10, "label": "Access & Authentication", "score": 2, "detail": "Direct checkout or cart links found on homepage"}, {"key": "order_management", "max": 10, "label": "Order Management", "score": 2, "detail": "Predictable cart/basket URL structure (/cart or /basket)"}, {"key": "checkout_flow", "max": 10, "label": "Checkout Flow", "score": 7, "detail": "Promo code, coupon, or discount field available. Loyalty, rewards, or membership program mentioned. Payment methods clearly labeled (Visa, PayPal, Apple Pay, etc.)"}, {"key": "bot_tolerance", "max": 5, "label": "Bot Tolerance", "score": 4, "detail": "No CAPTCHA or bot challenge detected on homepage. robots.txt allows general crawling (User-agent: * without Disallow: /)"}]}, "discoverability": {"max": 30, "score": 11, "signals": [{"key": "search_api", "max": 10, "label": "Search API / MCP", "score": 0, "detail": "No evidence found for search api / mcp"}, {"key": "site_search", "max": 10, "label": "Internal Site Search", "score": 6, "detail": "Search form or search input field detected on homepage. Search form has a parseable action URL (e.g. /search?q=)"}, {"key": "page_load", "max": 5, "label": "Page Load Performance", "score": 5, "detail": "Page load time ≤ 1,000ms"}, {"key": "product_page", "max": 5, "label": "Product Page Quality", "score": 0, "detail": "No evidence found for product page quality"}]}}'::jsonb, '[{"title": "Add JSON-LD structured data", "impact": "high", "signal": "json_ld", "description": "Implement Schema.org Product markup using JSON-LD on your product pages. This is the single highest-impact improvement — it lets AI agents read product names, prices, and availability directly without rendering the page.", "potentialGain": 15}, {"title": "Expose a search API or MCP endpoint", "impact": "high", "signal": "search_api", "description": "Provide a programmatic search endpoint that AI agents can query directly. Consider implementing MCP (Model Context Protocol) to let agents interact with your catalog natively. This eliminates the need for browser-based navigation entirely.", "potentialGain": 10}, {"title": "Enable guest checkout", "impact": "high", "signal": "access_auth", "description": "Allow purchases without mandatory account creation. Guest checkout is critical for AI agents — most cannot complete registration flows, verify email addresses, or handle phone verification steps.", "potentialGain": 8}, {"title": "Simplify product selection and cart management", "impact": "high", "signal": "order_management", "description": "Use clear, predictable URL patterns for cart and product pages. Make variant selectors (size, color, quantity) easily identifiable with standard HTML form elements. Ensure add-to-cart actions are straightforward.", "potentialGain": 8}, {"title": "Improve product page agent-readability", "impact": "high", "signal": "product_page", "description": "Make product pages easy for AI agents to parse: include machine-readable pricing (JSON-LD Offer or clearly tagged price elements), use standard HTML form elements for variant selection (size, color), ensure add-to-cart is a single clear action, and include product identifiers in URLs for direct navigation.", "potentialGain": 5}, {"title": "Make site search discoverable", "impact": "medium", "signal": "site_search", "description": "Ensure your site search form is accessible on the homepage with a clear action URL. Add an OpenSearch description file so agents can discover your search template automatically.", "potentialGain": 4}, {"title": "Clarify checkout options", "impact": "medium", "signal": "checkout_flow", "description": "Clearly label payment methods, shipping options, and discount/promo code fields. Use descriptive text that an AI agent can parse to understand the differences between options (e.g., ''Standard Shipping - 5-7 business days - $5.99'').", "potentialGain": 3}, {"title": "Reduce bot-blocking measures", "impact": "medium", "signal": "bot_tolerance", "description": "Review your robots.txt to allow AI agent crawling. Avoid aggressive CAPTCHAs on landing and product pages. Consider whitelisting known AI agent user-agents to enable automated shopping.", "potentialGain": 1}]'::jsonb, 'agentic', '2026-04-02 22:49:54.994', 'public') ON CONFLICT (slug) DO NOTHING;
INSERT INTO brand_index (slug, name, domain, url, logo_url, description, sector, sub_sectors, tier, tags, carries_brands, has_mcp, mcp_url, has_api, api_endpoint, api_auth_required, api_docs_url, has_cli, cli_install_command, site_search, product_feed, capabilities, checkout_methods, ordering, checkout_provider, payment_methods_accepted, creditclaw_supports, business_account, tax_exempt_supported, po_number_supported, delivery_options, free_shipping_threshold, ships_internationally, supported_countries, has_deals, deals_url, deals_api, loyalty_program, maturity, claimed_by, claim_id, submitted_by, submitter_type, version, last_verified, active_version_id, brand_data, skill_md, created_at, updated_at, brand_type, rating_search_accuracy, rating_stock_reliability, rating_checkout_completion, axs_rating, rating_count, overall_score, score_breakdown, recommendations, scan_tier, last_scanned_at, last_scanned_by) VALUES ('bombas', 'Bombas', 'bombas.com', 'https://bombas.com', NULL, 'Online store at bombas.com', 'apparel', '{socks,underwear,slippers,t-shirts,"comfort wear"}', 'premium', '{}', '{}', false, NULL, false, NULL, false, NULL, false, NULL, true, false, '{price_lookup,stock_check,account_creation,order_tracking,returns}', '{}', NULL, NULL, '{}', '{}', false, false, false, '{}', NULL, false, '{}', false, NULL, NULL, NULL, 'community', NULL, NULL, 'asx-scanner', 'auto_scan', '1.0.0', NULL, NULL, '{}'::jsonb, '---
name: creditclaw-shop-bombas
version: 1.0.0
description: "Shop Bombas using CreditClaw payment rails"
homepage: https://creditclaw.com/skills/bombas
requires: [creditclaw]
maturity: draft
asx_score: 0/100
last_verified: 2026-04-02




---

# Shopping at Bombas

**Store URL:** https://bombas.com
**Sector:** specialty
**ASX Score:** 0/100
**Capabilities:** Price Lookup, Stock Check, Account Creation, Order Tracking, Returns


---

## Checkout Methods (in order of preference)

- **Browser Automation** (requires login) — Account may be required

---

## How to Search

/search

Search URL: `https://bombas.com/search?q={q}`

Product ID format: `product-slug`

---

## How to Checkout

Account login required before checkout.

Use your CreditClaw credentials to pay.


---

## Shipping

Free shipping on orders over $75.
Estimated delivery: Standard shipping available
Business/bulk shipping rates available.

---
---
---
---
---

## Tips

- Use the search function to find specific sock styles or collections
- Check product variants for size and color selection before adding to cart
- Look for pack discounts which offer up to 20% savings on multi-item purchases
- Free shipping is available on orders over $75
- The site offers a size guide to help select proper fit for socks and slippers

---

## Tracking

Order tracking is available. Poll the status endpoint for shipping updates.

---

## Metadata

- **Version:** 1.0.0
- **Last verified:** 2026-04-02
- **Generated by:** agentic_scanner
- **Skill URL:** https://creditclaw.com/api/v1/bot/skills/bombas
- **Catalog page:** https://creditclaw.com/skills/bombas

---

## Feedback

After your purchase attempt (successful or not), help improve this skill:

```
POST https://creditclaw.com/api/v1/bot/skills/bombas/feedback
Authorization: Bearer <your-creditclaw-api-key>
Content-Type: application/json

{
  "search_accuracy": 4,
  "stock_reliability": 5,
  "checkout_completion": 3,
  "checkout_method": "browser_automation",
  "outcome": "success",
  "comment": "optional — what happened?"
}
```

Ratings are 1-5. Outcome is one of: success, checkout_failed, search_failed, out_of_stock, price_mismatch, flow_changed.
Checkout method is one of: native_api, browser_automation, x402, acp, self_hosted_card, crossmint_world.
Authorization header is optional but improves rating weight.
This is optional but helps other agents find reliable vendors.
', '2026-04-02 22:39:08.715134', '2026-04-02 22:48:00.338', NULL, NULL, NULL, NULL, NULL, 0, 56, '{"clarity": {"max": 35, "score": 15, "signals": [{"key": "json_ld", "max": 15, "label": "JSON-LD / Structured Data", "score": 0, "detail": "No evidence found for json-ld / structured data"}, {"key": "product_feed", "max": 10, "label": "Product Feed / Sitemap", "score": 9, "detail": "sitemap.xml found and accessible. Sitemap has valid XML structure (urlset or sitemapindex). Product page URLs detected in sitemap (/products/, /p/, /shop/, /catalog). Sitemap URL referenced in robots.txt"}, {"key": "clean_html", "max": 10, "label": "Clean HTML / Semantic Markup", "score": 6, "detail": "2-3 semantic HTML5 landmark elements. H1 present with 3+ total headings (good hierarchy). 5+ ARIA attributes (roles + aria-labels)"}]}, "reliability": {"max": 35, "score": 26, "signals": [{"key": "access_auth", "max": 10, "label": "Access & Authentication", "score": 3, "detail": "Direct checkout or cart links found on homepage. Both sign-in and cart options present (guest checkout likely)"}, {"key": "order_management", "max": 10, "label": "Order Management", "score": 10, "detail": "MCP or agentic commerce protocol enables programmatic ordering"}, {"key": "checkout_flow", "max": 10, "label": "Checkout Flow", "score": 10, "detail": "MCP or agentic commerce protocol enables programmatic checkout"}, {"key": "bot_tolerance", "max": 5, "label": "Bot Tolerance", "score": 3, "detail": "No CAPTCHA or bot challenge detected on homepage. robots.txt present with selective (partial) rules"}]}, "discoverability": {"max": 30, "score": 15, "signals": [{"key": "search_api", "max": 10, "label": "Search API / MCP", "score": 0, "detail": "No evidence found for search api / mcp"}, {"key": "site_search", "max": 10, "label": "Internal Site Search", "score": 6, "detail": "Search form or search input field detected on homepage. Autocomplete, autosuggest, or typeahead capability detected"}, {"key": "page_load", "max": 5, "label": "Page Load Performance", "score": 4, "detail": "Page load time 1,001–1,500ms"}, {"key": "product_page", "max": 5, "label": "Product Page Quality", "score": 5, "detail": "Machine-readable pricing on product page (JSON-LD Offer, microdata, or clearly tagged price element). Product variants use standard form elements (select, radio, labeled buttons). Clear, single-action add-to-cart button (not hidden behind modals or multi-step wizards). Product identifier visible in URL (enables direct agent navigation)"}]}}'::jsonb, '[{"title": "Add JSON-LD structured data", "impact": "high", "signal": "json_ld", "description": "Implement Schema.org Product markup using JSON-LD on your product pages. This is the single highest-impact improvement — it lets AI agents read product names, prices, and availability directly without rendering the page.", "potentialGain": 15}, {"title": "Expose a search API or MCP endpoint", "impact": "high", "signal": "search_api", "description": "Provide a programmatic search endpoint that AI agents can query directly. Consider implementing MCP (Model Context Protocol) to let agents interact with your catalog natively. This eliminates the need for browser-based navigation entirely.", "potentialGain": 10}, {"title": "Enable guest checkout", "impact": "high", "signal": "access_auth", "description": "Allow purchases without mandatory account creation. Guest checkout is critical for AI agents — most cannot complete registration flows, verify email addresses, or handle phone verification steps.", "potentialGain": 7}, {"title": "Improve HTML semantic structure", "impact": "medium", "signal": "clean_html", "description": "Use semantic HTML5 elements (header, nav, main, article, footer) and proper heading hierarchy. Add alt text to images and ARIA labels to interactive elements. This makes your site parseable even without structured data.", "potentialGain": 4}, {"title": "Make site search discoverable", "impact": "medium", "signal": "site_search", "description": "Ensure your site search form is accessible on the homepage with a clear action URL. Add an OpenSearch description file so agents can discover your search template automatically.", "potentialGain": 4}, {"title": "Reduce bot-blocking measures", "impact": "medium", "signal": "bot_tolerance", "description": "Review your robots.txt to allow AI agent crawling. Avoid aggressive CAPTCHAs on landing and product pages. Consider whitelisting known AI agent user-agents to enable automated shopping.", "potentialGain": 2}, {"title": "Publish a sitemap with product URLs", "impact": "medium", "signal": "product_feed", "description": "Create or improve your sitemap.xml to include product page URLs. Reference it in robots.txt. This helps AI agents discover your full catalog efficiently.", "potentialGain": 1}, {"title": "Improve page load performance", "impact": "low", "signal": "page_load", "description": "Optimize your homepage load time to under 2 seconds. Faster pages mean agents can interact with your site more efficiently, reducing timeout failures and retry costs.", "potentialGain": 1}]'::jsonb, 'agentic', '2026-04-02 22:48:00.337', 'public') ON CONFLICT (slug) DO NOTHING;
