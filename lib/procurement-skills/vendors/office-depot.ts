import type { VendorSkill } from "../types";

export const office_depot: VendorSkill = {
    slug: "office-depot",
  name: "Office Depot",
  logoUrl: "/assets/images/vendors/office-depot.svg",
  sector: "office",
  url: "https://www.officedepot.com",
  checkoutMethods: ["self_hosted_card"],
  capabilities: ["price_lookup", "stock_check", "tax_exemption", "po_numbers", "order_tracking", "business_invoicing"],
  maturity: "draft",
  methodConfig: {
    self_hosted_card: {
      locatorFormat: "url:{product_url}",
      requiresAuth: false,
      notes: "Guest checkout available. Business accounts unlock tax exemption and PO numbers.",
    },
  },
  search: {
    pattern: "Search on officedepot.com by product name, SKU, or brand. Filter by category and price.",
    urlTemplate: "https://www.officedepot.com/catalog/search.do?Ntt={q}",
    productIdFormat: "SKU / Item number",
  },
  checkout: { guestCheckout: true, taxExemptField: true, poNumberField: true },
  shipping: { freeThreshold: 45, estimatedDays: "2-5 business days", businessShipping: true },
  tips: [
    "Guest checkout for basic orders, business account for invoicing features",
    "BSD (Business Solutions Division) accounts get contract pricing",
    "Free next-business-day delivery on qualifying orders",
    "Price match available on identical items from select competitors",
  ],
  version: "0.1.0",
  lastVerified: "2026-02-05",
  generatedBy: "manual",
  taxonomy: {
    sector: "office",
    subSectors: ["office supplies", "ink & toner", "furniture", "technology", "cleaning"],
    tier: "mid_range",
    tags: ["bsd accounts", "contract pricing", "next-day delivery"],
  },
  searchDiscovery: {
    searchApi: false,
    mcp: false,
    searchInternal: true,
  },
  buying: {
    orderingPermission: "guest",
    checkoutProviders: ["in_house"],
    paymentMethods: ["card", "invoice"],
    deliveryOptions: "next-day, standard, in-store pickup",
    freeDelivery: "for orders over $45",
  },
  deals: {
    currentDeals: true,
    dealsUrl: "https://www.officedepot.com/a/browse/deals/N=5+588062/",
  },
};
