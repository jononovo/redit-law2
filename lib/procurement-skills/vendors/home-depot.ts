import type { VendorSkill } from "../types";

export const home_depot: VendorSkill = {
    slug: "home-depot",
  name: "Home Depot",
  logoUrl: "/assets/images/vendors/home-depot.svg",
  sector: "home",
  url: "https://www.homedepot.com",
  checkoutMethods: ["self_hosted_card"],
  capabilities: ["price_lookup", "stock_check", "order_tracking", "bulk_pricing"],
  maturity: "beta",
  methodConfig: {
    self_hosted_card: {
      locatorFormat: "url:{product_url}",
      requiresAuth: false,
      notes: "Guest checkout available. Product pages show real-time store and online inventory.",
    },
  },
  search: {
    pattern: "Search on homedepot.com by product name, brand, or model number. Products show real-time stock levels for both online and nearby stores.",
    urlTemplate: "https://www.homedepot.com/s/{q}",
    productIdFormat: "Internet # or Model # (found on product page)",
  },
  checkout: { guestCheckout: true, taxExemptField: false, poNumberField: false },
  shipping: { freeThreshold: 45, estimatedDays: "3-7 business days", businessShipping: false },
  tips: [
    "Guest checkout works for standard online orders",
    "Product pages show real-time local store inventory",
    "Pro Xtra accounts offer volume pricing on qualifying orders",
    "Some items are 'ship to store' only and cannot be delivered",
    "Large/heavy items may incur additional shipping charges",
  ],
  version: "1.0.0",
  lastVerified: "2026-02-10",
  generatedBy: "manual",
  taxonomy: {
    sector: "home",
    subSectors: ["building materials", "tools", "appliances", "plumbing", "electrical", "paint"],
    tier: "mid_range",
    tags: ["pro xtra", "diy", "contractors", "home improvement"],
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
    deliveryOptions: "standard, express, ship-to-store, in-store pickup",
    freeDelivery: "for orders over $45",
  },
  deals: {
    currentDeals: true,
    dealsUrl: "https://www.homedepot.com/c/savings_center",
    loyaltyProgram: "Pro Xtra",
  },
};
