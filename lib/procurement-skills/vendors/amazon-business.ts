import type { VendorSkill } from "../types";

export const amazon_business: VendorSkill = {
    slug: "amazon-business",
  name: "Amazon Business",
  logoUrl: "/assets/images/vendors/amazon-business.svg",
  sector: "specialty",
  url: "https://business.amazon.com",
  checkoutMethods: ["self_hosted_card"],
  capabilities: ["price_lookup", "bulk_pricing", "tax_exemption", "po_numbers", "order_tracking", "business_invoicing", "account_creation"],
  maturity: "beta",
  methodConfig: {
    self_hosted_card: {
      locatorFormat: "url:{product_url}",
      requiresAuth: true,
      notes: "Requires Amazon Business account. Owner must set up account beforehand. Tax exemption certs can be uploaded in account settings.",
    },
  },
  search: {
    pattern: "Search normally on business.amazon.com. Look for 'Business Price' and 'Quantity Discounts' badges for bulk pricing.",
    urlTemplate: "https://www.amazon.com/s?k={q}",
    productIdFormat: "ASIN",
  },
  checkout: { guestCheckout: false, taxExemptField: true, poNumberField: true },
  shipping: { freeThreshold: 25, estimatedDays: "1-5 business days", businessShipping: true },
  tips: [
    "Requires Amazon Business account — owner must set up beforehand",
    "Tax exemption certificates can be uploaded in account settings",
    "Quantity discounts often beat consumer Amazon by 15-40%",
    "PO numbers can be attached to orders for accounting",
    "Business Prime offers free shipping on all orders",
  ],
  version: "1.0.0",
  lastVerified: "2026-02-10",
  generatedBy: "manual",
  taxonomy: {
    sector: "office-supplies",
    subSectors: ["business supplies", "bulk purchasing", "office equipment"],
    tier: "value",
    tags: ["b2b", "tax exempt", "quantity discounts", "business prime"],
  },
  searchDiscovery: {
    searchApi: false,
    mcp: false,
    searchInternal: true,
  },
  buying: {
    orderingPermission: "registered",
    checkoutProviders: ["in_house"],
    paymentMethods: ["card", "invoice", "ach"],
    deliveryOptions: "same-day, next-day, standard",
    freeDelivery: "with Business Prime",
  },
  deals: {
    currentDeals: true,
    dealsUrl: "https://business.amazon.com/en/discover-products/deals",
    loyaltyProgram: "Business Prime",
  },
};
