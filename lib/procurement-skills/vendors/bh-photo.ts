import type { VendorSkill } from "../types";

export const bh_photo: VendorSkill = {
    slug: "bh-photo",
  name: "B&H Photo",
  logoUrl: "/assets/images/vendors/bh-photo.svg",
  sector: "electronics",
  url: "https://www.bhphotovideo.com",
  checkoutMethods: ["browser_automation"],
  capabilities: ["price_lookup", "stock_check", "order_tracking", "tax_exemption", "returns"],
  maturity: "draft",
  methodConfig: {
    browser_automation: {
    }",
      requiresAuth: false,
      notes: "Guest checkout available. No sales tax on orders shipped outside NY.",
    },
  },
  search: {
    pattern: "Search on bhphotovideo.com by product name, brand, or B&H item number. Detailed spec filtering available.",
    urlTemplate: "https://www.bhphotovideo.com/c/search?q={q}",
    productIdFormat: "B&H # (e.g., CANR5)",
  },
  checkout: { guestCheckout: true, taxExemptField: true, poNumberField: false },
  shipping: { freeThreshold: 49, estimatedDays: "2-7 business days", businessShipping: false },
  tips: [
    "No sales tax on most orders shipped outside New York state",
    "Excellent for cameras, audio equipment, lighting, and pro video gear",
    "Used/refurbished section offers significant savings",
    "Closed on Saturdays and Jewish holidays — orders placed during these times ship the next business day",
    "Free expedited shipping on many items over $49",
  ],
  version: "0.1.0",
  lastVerified: "2026-02-05",
  generatedBy: "manual",
  taxonomy: {
    sector: "electronics",
    subSectors: ["cameras", "audio", "lighting", "pro video", "computers", "drones"],
    tier: "premium",
    tags: ["no sales tax", "pro gear", "used equipment", "photography"],
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
    deliveryOptions: "standard, expedited",
    freeDelivery: "for orders over $49",
    returnsPolicy: "30-day returns",
  },
  deals: {
    currentDeals: true,
    dealsUrl: "https://www.bhphotovideo.com/c/browse/Deal-Zone/ci/17906",
  },
};
