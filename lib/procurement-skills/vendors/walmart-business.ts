import type { VendorSkill } from "../types";

export const walmart_business: VendorSkill = {
    slug: "walmart-business",
  name: "Walmart Business",
  logoUrl: "/assets/images/vendors/walmart-business.svg",
  sector: "specialty",
  url: "https://business.walmart.com",
  checkoutMethods: ["self_hosted_card"],
  capabilities: ["price_lookup", "bulk_pricing", "tax_exemption", "po_numbers", "business_invoicing", "account_creation"],
  maturity: "draft",
  methodConfig: {
    self_hosted_card: {
      locatorFormat: "url:{product_url}",
      requiresAuth: true,
      notes: "Requires Walmart Business account. Supports tax exemption and purchase orders.",
    },
  },
  search: {
    pattern: "Search on business.walmart.com. Look for bulk pricing tiers and business-specific products.",
    urlTemplate: "https://business.walmart.com/search?q={q}",
    productIdFormat: "Item number",
  },
  checkout: { guestCheckout: false, taxExemptField: true, poNumberField: true },
  shipping: { freeThreshold: 35, estimatedDays: "2-7 business days", businessShipping: true },
  tips: [
    "Requires Walmart Business account — owner must register first",
    "Tax exemption available after uploading certificates",
    "Bulk pricing available on qualifying quantities",
    "Business+ membership includes free shipping and 2% rewards",
  ],
  version: "0.1.0",
  lastVerified: "2026-02-08",
  generatedBy: "manual",
  taxonomy: {
    sector: "office-supplies",
    subSectors: ["business supplies", "bulk purchasing", "janitorial"],
    tier: "value",
    tags: ["b2b", "tax exempt", "business+"],
  },
  searchDiscovery: {
    searchApi: false,
    mcp: false,
    searchInternal: true,
  },
  buying: {
    orderingPermission: "registered",
    checkoutProviders: ["in_house"],
    paymentMethods: ["card", "invoice"],
    deliveryOptions: "standard, bulk delivery",
    freeDelivery: "for orders over $35 or with Business+",
  },
  deals: {
    currentDeals: false,
  },
};
