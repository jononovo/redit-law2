import type { VendorSkill } from "../types";

export const uline: VendorSkill = {
    slug: "uline",
  name: "Uline",
  logoUrl: "/assets/images/vendors/uline.svg",
  sector: "business-industrial",
  url: "https://www.uline.com",
  checkoutMethods: ["browser_automation"],
  capabilities: ["price_lookup", "stock_check", "bulk_pricing", "order_tracking", "business_invoicing", "po_numbers"],
  maturity: "draft",
  methodConfig: {
    browser_automation: {
    }",
      requiresAuth: false,
      notes: "Phone orders also accepted. Website checkout is straightforward.",
    },
  },
  search: {
    pattern: "Search on uline.com by product name or model number. Uline's catalog is extremely deep for shipping, packaging, and industrial supplies.",
    urlTemplate: "https://www.uline.com/BL/Search?keywords={q}",
    productIdFormat: "Model # (e.g., S-12345)",
  },
  checkout: { guestCheckout: true, taxExemptField: true, poNumberField: true },
  shipping: { freeThreshold: undefined, estimatedDays: "1-2 business days (ships from nearest warehouse)", businessShipping: true },
  tips: [
    "Ships from the nearest of 13 US warehouses — typically arrives in 1-2 days",
    "Quantity pricing breaks are clearly shown on product pages",
    "Net 30 terms available for established business accounts",
    "Catalog is strongest for shipping, packaging, janitorial, and warehouse supplies",
    "Free catalog available by request — useful for product discovery",
  ],
  version: "0.1.0",
  lastVerified: "2026-02-05",
  generatedBy: "manual",
  taxonomy: {
    sector: "business-industrial",
    subSectors: ["packaging", "shipping supplies", "janitorial", "warehouse equipment", "safety"],
    tier: "commodity",
    tags: ["fast shipping", "quantity breaks", "net 30", "13 warehouses"],
  },
  searchDiscovery: {
    searchApi: false,
    mcp: false,
    searchInternal: true,
  },
  buying: {
    orderingPermission: "guest",
    checkoutProviders: ["in_house"],
    paymentMethods: ["card", "invoice", "ach"],
    deliveryOptions: "1-2 day from nearest warehouse",
    returnsPolicy: "365-day returns",
  },
  deals: {
    currentDeals: false,
  },
};
