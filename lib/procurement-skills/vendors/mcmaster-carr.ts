import type { VendorSkill } from "../types";

export const mcmaster_carr: VendorSkill = {
    slug: "mcmaster-carr",
  name: "McMaster-Carr",
  logoUrl: "/assets/images/vendors/mcmaster-carr.svg",
  sector: "industrial",
  url: "https://www.mcmaster.com",
  checkoutMethods: ["self_hosted_card"],
  capabilities: ["price_lookup", "stock_check", "order_tracking", "bulk_pricing"],
  maturity: "draft",
  methodConfig: {
    self_hosted_card: {
      locatorFormat: "url:{product_url}",
      requiresAuth: true,
      notes: "Account required. McMaster-Carr is notoriously difficult to browse without an account.",
    },
  },
  search: {
    pattern: "Search on mcmaster.com by product description or McMaster part number. The site uses a proprietary navigation system — no standard URL-based search.",
    productIdFormat: "McMaster Part # (e.g., 91251A545)",
  },
  checkout: { guestCheckout: false, taxExemptField: true, poNumberField: true },
  shipping: { estimatedDays: "Next day (most items)", businessShipping: true },
  tips: [
    "Account required — owner must register before bot can purchase",
    "Fastest shipping in industrial supply — most items arrive next day",
    "The definitive source for fasteners, raw materials, and industrial components",
    "No price matching or negotiation — prices are fixed",
    "CAD models available for most products",
  ],
  version: "0.1.0",
  lastVerified: "2026-02-05",
  generatedBy: "manual",
  taxonomy: {
    sector: "industrial",
    subSectors: ["fasteners", "raw materials", "pneumatics", "hydraulics", "bearings", "hardware"],
    tier: "premium",
    tags: ["next-day delivery", "cad models", "fixed pricing", "engineering grade"],
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
    deliveryOptions: "next-day standard",
  },
  deals: {
    currentDeals: false,
  },
};
