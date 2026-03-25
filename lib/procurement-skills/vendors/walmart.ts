import type { VendorSkill } from "../types";

export const walmart: VendorSkill = {
    slug: "walmart",
  name: "Walmart",
  logoUrl: "/assets/images/vendors/walmart.svg",
  sector: "retail",
  url: "https://www.walmart.com",
  checkoutMethods: ["self_hosted_card", "browser_automation"],
  capabilities: ["price_lookup", "stock_check", "order_tracking"],
  maturity: "beta",
  methodConfig: {
    self_hosted_card: {
      locatorFormat: "url:{product_url}",
      requiresAuth: false,
      notes: "Guest checkout available. Standard credit card checkout flow.",
    },
    browser_automation: {
      requiresAuth: false,
      notes: "Fallback for complex product configurations or marketplace items.",
    },
  },
  search: {
    pattern: "Search on walmart.com. Products are identified by item number in the URL. Filter by price, rating, and availability.",
    urlTemplate: "https://www.walmart.com/search?q={q}",
    productIdFormat: "Item number (numeric, found in URL)",
  },
  checkout: { guestCheckout: true, taxExemptField: false, poNumberField: false },
  shipping: { freeThreshold: 35, estimatedDays: "2-7 business days", businessShipping: false },
  tips: [
    "Guest checkout is available — no account needed for basic purchases",
    "Walmart+ members get free shipping on all orders",
    "Marketplace items may have different shipping policies",
    "In-store pickup available for many items (not supported via API yet)",
    "Price matching is not available for online orders",
  ],
  version: "1.0.0",
  lastVerified: "2026-02-10",
  generatedBy: "manual",
  taxonomy: {
    sector: "retail",
    subSectors: ["general merchandise", "grocery", "home goods", "electronics"],
    tier: "value",
    tags: ["everyday low prices", "walmart+", "in-store pickup"],
  },
  searchDiscovery: {
    searchApi: false,
    mcp: false,
    searchInternal: true,
  },
  buying: {
    orderingPermission: "guest",
    checkoutProviders: ["in_house"],
    paymentMethods: ["card", "apple_pay", "google_pay"],
    deliveryOptions: "standard, express, in-store pickup",
    freeDelivery: "for orders over $35 or with Walmart+",
  },
  deals: {
    currentDeals: true,
    dealsUrl: "https://www.walmart.com/shop/deals",
    loyaltyProgram: "Walmart+",
  },
};
