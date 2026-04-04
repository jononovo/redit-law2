import { VendorSkill, CHECKOUT_METHOD_LABELS, CAPABILITY_LABELS, SECTOR_LABELS, BRAND_TIER_LABELS, ORDERING_PERMISSION_LABELS, PAYMENT_METHOD_LABELS } from "./types";
import type { VendorSector } from "./taxonomy/sectors";

export function generateVendorSkill(vendor: VendorSkill): string {
  const primaryMethod = vendor.checkoutMethods[0];
  const primaryConfig = primaryMethod ? vendor.methodConfig[primaryMethod] : undefined;
  const asxScore = vendor.asxScore ?? 0;

  const methodsList = vendor.checkoutMethods
    .map(m => {
      const config = vendor.methodConfig[m];
      const label = CHECKOUT_METHOD_LABELS[m];
      const authNote = config?.requiresAuth ? " (requires login)" : "";
      return `- **${label}**${authNote}${config?.notes ? ` — ${config.notes}` : ""}`;
    })
    .join("\n");

  const capsList = vendor.capabilities
    .map(c => CAPABILITY_LABELS[c])
    .join(", ");

  const tipsSection = vendor.tips.map(t => `- ${t}`).join("\n");

  const searchSection = [
    vendor.search.pattern,
    vendor.search.urlTemplate ? `\nSearch URL: \`${vendor.search.urlTemplate}\`` : "",
    vendor.search.productIdFormat ? `\nProduct ID format: \`${vendor.search.productIdFormat}\`` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const shippingLines = [
    vendor.shipping.freeThreshold
      ? `Free shipping on orders over $${vendor.shipping.freeThreshold}.`
      : "No standard free shipping threshold.",
    `Estimated delivery: ${vendor.shipping.estimatedDays}`,
    vendor.shipping.businessShipping ? "Business/bulk shipping rates available." : "",
  ]
    .filter(Boolean)
    .join("\n");

  const checkoutLines = [
    vendor.checkout.guestCheckout
      ? "Guest checkout is available — no account needed."
      : "Account login required before checkout.",
    vendor.checkout.poNumberField
      ? "- PO number field available at checkout."
      : "",
    vendor.checkout.taxExemptField
      ? "- Tax exemption field available. Check if your owner has a tax certificate on file."
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  const purchaseExample = primaryConfig?.locatorFormat
    ? `
## Making the Purchase

\`\`\`bash
curl -X POST https://creditclaw.com/api/v1/${primaryMethod === "native_api" ? "card-wallet/bot/purchase" : "bot/merchant/checkout"} \\
  -H "Authorization: Bearer $CREDITCLAW_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "merchant": "${vendor.slug}",
    "product_id": "${primaryConfig.locatorFormat}",
    "shipping_address": { "name": "...", "line1": "...", "city": "...", "state": "...", "postalCode": "...", "country": "US" }
  }'
\`\`\`
`
    : "";

  const trackingNote = vendor.capabilities.includes("order_tracking")
    ? "Order tracking is available. Poll the status endpoint for shipping updates."
    : "Order tracking is not yet available for this vendor. Monitor email for shipping confirmation.";

  const taxonomySection = vendor.taxonomy
    ? `
## Taxonomy

- **Sector:** ${SECTOR_LABELS[vendor.taxonomy.sector as VendorSector] || vendor.taxonomy.sector}
- **Sub-sectors:** ${vendor.taxonomy.subSectors.join(", ")}
- **Tier:** ${BRAND_TIER_LABELS[vendor.taxonomy.tier]}
${vendor.taxonomy.tags?.length ? `- **Tags:** ${vendor.taxonomy.tags.join(", ")}` : ""}
`
    : "";

  const discoverySection = vendor.searchDiscovery
    ? `
## Search Discovery

- **Search API:** ${vendor.searchDiscovery.searchApi ? "Available" : "Not available"}
- **MCP Support:** ${vendor.searchDiscovery.mcp ? "Supported" : "Not supported"}
- **Internal Search:** ${vendor.searchDiscovery.searchInternal ? "Available" : "Not available"}
${vendor.searchDiscovery.apiDocUrl ? `- **API Docs:** ${vendor.searchDiscovery.apiDocUrl}` : ""}
`
    : "";

  const buyingSection = vendor.buying
    ? `
## Buying Configuration

- **Ordering:** ${ORDERING_PERMISSION_LABELS[vendor.buying.orderingPermission]}
- **Payment Methods:** ${vendor.buying.paymentMethods.map(m => PAYMENT_METHOD_LABELS[m]).join(", ")}
- **Delivery:** ${vendor.buying.deliveryOptions}
${vendor.buying.freeDelivery ? `- **Free Delivery:** ${vendor.buying.freeDelivery}` : ""}
${vendor.buying.returnsPolicy ? `- **Returns:** ${vendor.buying.returnsPolicy}` : ""}
${vendor.buying.returnsWindow ? `- **Returns Window:** ${vendor.buying.returnsWindow}` : ""}
`
    : "";

  const dealsSection = vendor.deals
    ? `
## Deals & Promotions

- **Active Deals:** ${vendor.deals.currentDeals ? "Yes" : "No"}
${vendor.deals.dealsUrl ? `- **Deals Page:** ${vendor.deals.dealsUrl}` : ""}
${vendor.deals.dealsApiEndpoint ? `- **Deals API:** ${vendor.deals.dealsApiEndpoint}` : ""}
${vendor.deals.loyaltyProgram ? `- **Loyalty Program:** ${vendor.deals.loyaltyProgram}` : ""}
`
    : "";

  return `---
name: creditclaw-shop-${vendor.slug}
version: ${vendor.version}
description: "Shop ${vendor.name} using CreditClaw payment rails"
homepage: https://creditclaw.com/skills/${vendor.slug}
requires: [creditclaw]
maturity: ${vendor.maturity}
asx_score: ${asxScore}/100
last_verified: ${vendor.lastVerified}
${vendor.taxonomy ? `sector: ${vendor.taxonomy.sector}
tier: ${vendor.taxonomy.tier}
sub_sectors: [${vendor.taxonomy.subSectors.join(", ")}]` : ""}
${vendor.buying ? `ordering_permission: ${vendor.buying.orderingPermission}
payment_methods: [${vendor.buying.paymentMethods.join(", ")}]` : ""}
${vendor.searchDiscovery ? `search_api: ${vendor.searchDiscovery.searchApi}
mcp: ${vendor.searchDiscovery.mcp}` : ""}
${vendor.deals ? `current_deals: ${vendor.deals.currentDeals}` : ""}
---

# Shopping at ${vendor.name}

**Store URL:** ${vendor.url}
**Sector:** ${SECTOR_LABELS[vendor.sector as VendorSector] || vendor.sector}
**ASX Score:** ${asxScore}/100
**Capabilities:** ${capsList}
${vendor.feedbackStats ? `**Success Rate:** ${Math.round(vendor.feedbackStats.successRate * 100)}%` : ""}

---

## Checkout Methods (in order of preference)

${methodsList}

---

## How to Search

${searchSection}

---

## How to Checkout

${checkoutLines}

Use your CreditClaw credentials to pay.
${primaryConfig?.searchEndpoint ? `\nCall \`POST ${primaryConfig.searchEndpoint}\` with the product URL to get variant/pricing info before purchasing.` : ""}

---

## Shipping

${shippingLines}

---
${taxonomySection}---
${discoverySection}---
${buyingSection}---
${dealsSection}---

## Tips

${tipsSection}

---
${purchaseExample}
## Tracking

${trackingNote}

---

## Metadata

- **Version:** ${vendor.version}
- **Last verified:** ${vendor.lastVerified}
- **Generated by:** ${vendor.generatedBy}
- **Skill URL:** https://creditclaw.com/api/v1/bot/skills/${vendor.slug}
- **Catalog page:** https://creditclaw.com/skills/${vendor.slug}
- **Machine-readable metadata:** [skill.json](/brands/${vendor.slug}/skill-json)

---

## Feedback

After your purchase attempt (successful or not), help improve this skill:

\`\`\`
POST https://creditclaw.com/api/v1/bot/skills/${vendor.slug}/feedback
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
\`\`\`

Ratings are 1-5. Outcome is one of: success, checkout_failed, search_failed, out_of_stock, price_mismatch, flow_changed.
Checkout method is one of: native_api, browser_automation, x402, acp, self_hosted_card, crossmint_world.
Authorization header is optional but improves rating weight.
This is optional but helps other agents find reliable vendors.
`;
}
