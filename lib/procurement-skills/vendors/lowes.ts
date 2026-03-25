import type { VendorSkill } from "../types";

export const lowes: VendorSkill = {
    slug: "lowes",
  name: "Lowe's",
  logoUrl: "/assets/images/vendors/lowes.svg",
  sector: "home",
  url: "https://www.lowes.com",
  checkoutMethods: ["self_hosted_card"],
  capabilities: ["price_lookup", "stock_check", "order_tracking"],
  maturity: "beta",
  methodConfig: {
    self_hosted_card: {
      locatorFormat: "url:{product_url}",
      requiresAuth: false,
      notes: "Guest checkout available. Similar to Home Depot flow.",
    },
  },
  search: {
    pattern: "Search on lowes.com by product name or item number. Filter by brand, price, rating, and availability.",
    urlTemplate: "https://www.lowes.com/search?searchTerm={q}",
    productIdFormat: "Item # or Model # (found on product page)",
  },
  checkout: { guestCheckout: true, taxExemptField: false, poNumberField: false },
  shipping: { freeThreshold: 45, estimatedDays: "3-7 business days", businessShipping: false },
  tips: [
    "Guest checkout is straightforward",
    "Lowe's Pro accounts get volume pricing and dedicated support",
    "Price match guarantee — matches competitor pricing including Amazon",
    "Some items available for same-day delivery in select markets",
    "Bulk/pallet orders may require calling the pro desk",
  ],
  version: "1.0.0",
  lastVerified: "2026-02-10",
  generatedBy: "manual",
  taxonomy: {
    sector: "home",
    subSectors: ["building materials", "tools", "appliances", "plumbing", "electrical"],
    tier: "mid_range",
    tags: ["pro accounts", "price match", "home improvement"],
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
    freeDelivery: "for orders over $45",
  },
  deals: {
    currentDeals: true,
    dealsUrl: "https://www.lowes.com/l/shop/weekly-ad",
    loyaltyProgram: "MyLowe's Rewards",
  },
};
