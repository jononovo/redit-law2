import type { VendorSkill } from "../types";

export const amazon: VendorSkill = {
    slug: "amazon",
  name: "Amazon",
  logoUrl: "/assets/images/vendors/amazon.svg",
  sector: "specialty",
  url: "https://www.amazon.com",
  checkoutMethods: ["native_api", "self_hosted_card"],
  capabilities: ["price_lookup", "stock_check", "programmatic_checkout", "order_tracking", "returns"],
  maturity: "verified",
  methodConfig: {
    native_api: {
      locatorFormat: "amazon:{ASIN}",
      searchEndpoint: "/api/v1/card-wallet/bot/search",
      requiresAuth: false,
      notes: "Full programmatic purchasing via CrossMint. Use ASIN as product identifier.",
    },
    self_hosted_card: {
      locatorFormat: "url:{product_url}",
      requiresAuth: true,
      notes: "Fallback for items not available through CrossMint API.",
    },
  },
  search: {
    pattern: "Search by product name or paste an ASIN directly. No login needed to browse products and prices.",
    urlTemplate: "https://www.amazon.com/s?k={q}",
    productIdFormat: "ASIN (e.g., B0EXAMPLE123)",
  },
  checkout: { guestCheckout: false, taxExemptField: false, poNumberField: false },
  shipping: { freeThreshold: 35, estimatedDays: "1-5 business days", businessShipping: false },
  tips: [
    "Use ASIN for fastest checkout — no browser interaction needed",
    "CrossMint handles fulfillment end-to-end including tracking",
    "Prime shipping not available through API — standard shipping only",
    "Check product availability before purchasing; some items are marketplace-only",
  ],
  version: "1.0.0",
  lastVerified: "2026-02-15",
  generatedBy: "manual",
  feedbackStats: { successRate: 0.94 },
  taxonomy: {
    sector: "specialty",
    subSectors: ["general merchandise", "electronics", "home goods", "books", "grocery"],
    tier: "value",
    tags: ["everything store", "prime", "aws", "fba"],
  },
  searchDiscovery: {
    searchApi: true,
    mcp: false,
    searchInternal: true,
  },
  buying: {
    orderingPermission: "guest",
    checkoutProviders: ["in_house"],
    paymentMethods: ["card", "apple_pay", "google_pay"],
    deliveryOptions: "same-day, next-day, standard",
    freeDelivery: "for orders over $35 or with Prime",
  },
  deals: {
    currentDeals: true,
    dealsUrl: "https://www.amazon.com/deals",
    loyaltyProgram: "Amazon Prime",
  },
};
