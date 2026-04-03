import type { VendorSkill } from "../types";

export const shopify: VendorSkill = {
    slug: "shopify",
  name: "Shopify Stores",
  logoUrl: "/assets/images/vendors/shopify.svg",
  sector: "software",
  url: "https://www.shopify.com",
  checkoutMethods: ["native_api", "self_hosted_card"],
  capabilities: ["price_lookup", "stock_check", "programmatic_checkout"],
  maturity: "verified",
  methodConfig: {
    native_api: {
      locatorFormat: "{product_url}:{variant_id}",
      searchEndpoint: "/api/v1/card-wallet/bot/search",
      requiresAuth: false,
      notes: "Variant lookup required before purchase. Use the search endpoint with the product URL.",
    },
    self_hosted_card: {
      locatorFormat: "url:{product_url}",
      requiresAuth: false,
      notes: "Works with any Shopify store checkout. Guest checkout usually available.",
    },
  },
  search: {
    pattern: "Navigate to the Shopify store URL and search using the store's search bar. Use the CreditClaw search endpoint to look up variant IDs.",
    productIdFormat: "Product URL + Variant ID",
  },
  checkout: { guestCheckout: true, taxExemptField: false, poNumberField: false },
  shipping: { estimatedDays: "Varies by store", businessShipping: false },
  tips: [
    "Always look up variants before purchasing — Shopify products require a specific variant ID",
    "The search API is in beta and may not work for all Shopify stores",
    "No delivery tracking after order is placed through the API",
    "Guest checkout is usually available on most Shopify stores",
  ],
  version: "1.0.0",
  lastVerified: "2026-02-15",
  generatedBy: "manual",
  feedbackStats: { successRate: 0.87 },
  taxonomy: {
    sector: "software",
    subSectors: ["platform", "dtc brands", "independent stores"],
    tier: "mid_range",
    tags: ["platform", "shopify payments", "dtc"],
  },
  searchDiscovery: {
    searchApi: true,
    mcp: false,
    searchInternal: true,
  },
  buying: {
    orderingPermission: "guest",
    checkoutProviders: ["shopify"],
    paymentMethods: ["card", "apple_pay", "google_pay", "klarna", "afterpay"],
    deliveryOptions: "varies by store",
    freeDelivery: "varies by store",
  },
  deals: {
    currentDeals: false,
  },
};
