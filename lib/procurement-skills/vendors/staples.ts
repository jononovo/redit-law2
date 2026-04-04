import type { VendorSkill } from "../types";

export const staples: VendorSkill = {
    slug: "staples",
  name: "Staples",
  logoUrl: "/assets/images/vendors/staples.svg",
  sector: "office-supplies",
  url: "https://www.staples.com",
  checkoutMethods: ["self_hosted_card"],
  capabilities: ["price_lookup", "stock_check", "bulk_pricing", "tax_exemption", "po_numbers", "order_tracking", "business_invoicing"],
  maturity: "beta",
  methodConfig: {
    self_hosted_card: {
      locatorFormat: "url:{product_url}",
      requiresAuth: false,
      notes: "Guest checkout available for basic orders. Business account needed for PO numbers and tax exemption.",
    },
  },
  search: {
    pattern: "Search on staples.com by product name or SKU. Filter by brand, price, and availability. Check for Staples Advantage pricing on business accounts.",
    urlTemplate: "https://www.staples.com/search?query={q}",
    productIdFormat: "SKU / Item number",
  },
  checkout: { guestCheckout: true, taxExemptField: true, poNumberField: true },
  shipping: { freeThreshold: 49.99, estimatedDays: "1-5 business days", businessShipping: true },
  tips: [
    "Guest checkout available but business accounts get better pricing",
    "Staples Advantage (business tier) offers volume discounts",
    "Free next-day delivery on orders over $49.99 in eligible areas",
    "Tax exemption requires a Staples business account with certificate on file",
    "Weekly deals and coupons can significantly reduce costs",
  ],
  version: "1.0.0",
  lastVerified: "2026-02-10",
  generatedBy: "manual",
  taxonomy: {
    sector: "office-supplies",
    subSectors: ["office supplies", "ink & toner", "furniture", "technology"],
    tier: "mid_range",
    tags: ["staples advantage", "next-day delivery", "office essentials"],
  },
  searchDiscovery: {
    searchApi: false,
    mcp: false,
    searchInternal: true,
  },
  buying: {
    orderingPermission: "guest",
    checkoutProviders: ["in_house"],
    paymentMethods: ["card", "invoice", "apple_pay"],
    deliveryOptions: "next-day, standard, in-store pickup",
    freeDelivery: "for orders over $49.99",
  },
  deals: {
    currentDeals: true,
    dealsUrl: "https://www.staples.com/deals/deals/BI1703",
    loyaltyProgram: "Staples Rewards",
  },
};
