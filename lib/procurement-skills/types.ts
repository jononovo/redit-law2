export type CheckoutMethod =
  | "native_api"
  | "acp"
  | "x402"
  | "crossmint_world"
  | "self_hosted_card"
  | "browser_automation";

export type VendorCapability =
  | "price_lookup"
  | "stock_check"
  | "programmatic_checkout"
  | "business_invoicing"
  | "bulk_pricing"
  | "tax_exemption"
  | "account_creation"
  | "order_tracking"
  | "returns"
  | "po_numbers";

export type SkillMaturity = "verified" | "beta" | "community" | "draft";

export type VendorCategory =
  | "retail"
  | "office"
  | "hardware"
  | "electronics"
  | "industrial"
  | "specialty";

export interface MethodConfig {
  locatorFormat?: string;
  searchEndpoint?: string;
  requiresAuth: boolean;
  notes: string;
}

export interface VendorSkill {
  slug: string;
  name: string;
  logoUrl?: string;
  category: VendorCategory;
  url: string;

  checkoutMethods: CheckoutMethod[];
  capabilities: VendorCapability[];
  maturity: SkillMaturity;

  methodConfig: Partial<Record<CheckoutMethod, MethodConfig>>;

  search: {
    pattern: string;
    urlTemplate?: string;
    productIdFormat?: string;
  };

  checkout: {
    guestCheckout: boolean;
    taxExemptField: boolean;
    poNumberField: boolean;
  };

  shipping: {
    freeThreshold?: number;
    estimatedDays: string;
    businessShipping: boolean;
  };

  tips: string[];

  version: string;
  lastVerified: string;
  generatedBy: "skill_builder" | "manual";
  feedbackStats?: {
    successRate: number;
    lastFailure?: string;
    failureReason?: string;
  };
}

export function computeAgentFriendliness(vendor: VendorSkill): number {
  let score = 0;
  if (vendor.checkout.guestCheckout) score += 1;
  const primaryMethod = vendor.checkoutMethods[0];
  if (primaryMethod && !vendor.methodConfig[primaryMethod]?.requiresAuth) score += 1;
  if (vendor.capabilities.includes("programmatic_checkout")) score += 2;
  if ((vendor.feedbackStats?.successRate ?? 0) > 0.85) score += 1;
  return Math.min(score, 5);
}

export const CHECKOUT_METHOD_LABELS: Record<CheckoutMethod, string> = {
  native_api: "Native API",
  acp: "Agentic Checkout",
  x402: "x402 Protocol",
  crossmint_world: "CrossMint World",
  self_hosted_card: "Self-Hosted Card",
  browser_automation: "Browser Automation",
};

export const CHECKOUT_METHOD_COLORS: Record<CheckoutMethod, string> = {
  native_api: "bg-green-100 text-green-700 border-green-200",
  acp: "bg-blue-100 text-blue-700 border-blue-200",
  x402: "bg-purple-100 text-purple-700 border-purple-200",
  crossmint_world: "bg-cyan-100 text-cyan-700 border-cyan-200",
  self_hosted_card: "bg-orange-100 text-orange-700 border-orange-200",
  browser_automation: "bg-neutral-100 text-neutral-600 border-neutral-200",
};

export const CAPABILITY_LABELS: Record<VendorCapability, string> = {
  price_lookup: "Price Lookup",
  stock_check: "Stock Check",
  programmatic_checkout: "Programmatic Checkout",
  business_invoicing: "Business Invoicing",
  bulk_pricing: "Bulk Pricing",
  tax_exemption: "Tax Exemption",
  account_creation: "Account Creation",
  order_tracking: "Order Tracking",
  returns: "Returns",
  po_numbers: "PO Numbers",
};

export const CATEGORY_LABELS: Record<VendorCategory, string> = {
  retail: "Retail",
  office: "Office Supplies",
  hardware: "Hardware & Tools",
  electronics: "Electronics",
  industrial: "Industrial",
  specialty: "Specialty",
};
