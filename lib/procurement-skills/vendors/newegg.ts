import type { VendorSkill } from "../types";

export const newegg: VendorSkill = {
    slug: "newegg",
  name: "Newegg",
  logoUrl: "/assets/images/vendors/newegg.svg",
  category: "electronics",
  url: "https://www.newegg.com",
  checkoutMethods: ["self_hosted_card"],
  capabilities: ["price_lookup", "stock_check", "order_tracking", "returns"],
  maturity: "draft",
  methodConfig: {
    self_hosted_card: {
      locatorFormat: "url:{product_url}",
      requiresAuth: false,
      notes: "Guest checkout available. Strong for computer components and electronics.",
    },
  },
  search: {
    pattern: "Search on newegg.com by product name, brand, or model number. Excellent filtering by specs (CPU socket, RAM type, etc.).",
    urlTemplate: "https://www.newegg.com/p/pl?d={q}",
    productIdFormat: "Newegg Item # (e.g., N82E16835856145)",
  },
  checkout: { guestCheckout: true, taxExemptField: false, poNumberField: false },
  shipping: { freeThreshold: undefined, estimatedDays: "3-7 business days", businessShipping: false },
  tips: [
    "Best for computer components, peripherals, and consumer electronics",
    "Shell Shocker and daily deals can offer significant discounts",
    "Newegg Business available for tax-exempt and volume purchasing",
    "Marketplace sellers may have different return policies than Newegg direct",
    "Combo deals bundle related items at a discount",
  ],
  version: "0.1.0",
  lastVerified: "2026-02-05",
  generatedBy: "manual",
  taxonomy: {
    sector: "electronics",
    subSectors: ["computer components", "peripherals", "networking", "gaming", "consumer electronics"],
    tier: "mid_range",
    tags: ["pc building", "shell shocker", "tech deals", "spec filtering"],
  },
  searchDiscovery: {
    searchApi: false,
    mcp: false,
    searchInternal: true,
  },
  buying: {
    orderingPermission: "guest",
    checkoutProviders: ["in_house"],
    paymentMethods: ["card", "apple_pay", "google_pay", "crypto"],
    deliveryOptions: "standard, expedited",
    returnsPolicy: "30-day returns on most items",
  },
  deals: {
    currentDeals: true,
    dealsUrl: "https://www.newegg.com/todays-deals",
  },
};
