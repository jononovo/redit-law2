import type { VendorSkill } from "../types";

export const grainger: VendorSkill = {
    slug: "grainger",
  name: "Grainger",
  logoUrl: "/assets/images/vendors/grainger.svg",
  category: "industrial",
  url: "https://www.grainger.com",
  checkoutMethods: ["self_hosted_card"],
  capabilities: ["price_lookup", "stock_check", "bulk_pricing", "tax_exemption", "po_numbers", "order_tracking", "business_invoicing", "account_creation"],
  maturity: "draft",
  methodConfig: {
    self_hosted_card: {
      locatorFormat: "url:{product_url}",
      requiresAuth: true,
      notes: "Account required for pricing. Guest browsing shows 'Sign in for price' on many items.",
    },
  },
  search: {
    pattern: "Search on grainger.com by product name, brand, or Grainger item number. Many prices require login to view.",
    urlTemplate: "https://www.grainger.com/search?searchQuery={q}",
    productIdFormat: "Grainger Item # (e.g., 6YA12)",
  },
  checkout: { guestCheckout: false, taxExemptField: true, poNumberField: true },
  shipping: { freeThreshold: undefined, estimatedDays: "1-3 business days", businessShipping: true },
  tips: [
    "Account required to see contract pricing — owner must set up beforehand",
    "One of the largest MRO (maintenance, repair, operations) suppliers",
    "Net 30/60/90 terms available for qualified business accounts",
    "Same-day shipping on most in-stock items ordered by noon local time",
    "Product specs and safety data sheets available on every product page",
  ],
  version: "0.1.0",
  lastVerified: "2026-02-05",
  generatedBy: "manual",
  taxonomy: {
    sector: "industrial",
    subSectors: ["mro", "safety", "electrical", "plumbing", "hvac", "hand tools", "power tools"],
    tier: "premium",
    tags: ["mro leader", "contract pricing", "sds available", "same-day shipping"],
  },
  searchDiscovery: {
    searchApi: false,
    mcp: false,
    searchInternal: true,
  },
  buying: {
    orderingPermission: "registered",
    checkoutProviders: ["in_house"],
    paymentMethods: ["card", "invoice", "ach", "wire"],
    deliveryOptions: "same-day, next-day, standard",
  },
  deals: {
    currentDeals: false,
  },
};
