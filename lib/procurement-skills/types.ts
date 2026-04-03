export type {
  CheckoutMethod,
  VendorCapability,
  VendorSector,
  BrandTier,
  VendorTier,
  OrderingPermission,
  CheckoutProvider,
  PaymentMethod,
  SkillMaturity,
  BrandType,
} from "./taxonomy";

export {
  CHECKOUT_METHOD_LABELS,
  CHECKOUT_METHOD_COLORS,
  CAPABILITY_LABELS,
  SECTOR_LABELS,
  BRAND_TIER_LABELS,
  TIER_LABELS,
  ORDERING_PERMISSION_LABELS,
  CHECKOUT_PROVIDER_LABELS,
  PAYMENT_METHOD_LABELS,
  BRAND_TYPE_LABELS,
  ASSIGNABLE_SECTORS,
  GOOGLE_ROOT_IDS,
  LUXURY_TIERS,
  isSectorLuxuryFilter,
  hasGoogleRoot,
} from "./taxonomy";

import type { VendorSector } from "./taxonomy/sectors";
import type { BrandTier } from "./taxonomy/tiers";
import type { CheckoutMethod } from "./taxonomy/checkout-methods";
import type { VendorCapability } from "./taxonomy/capabilities";
import type { PaymentMethod } from "./taxonomy/payment-methods";
import type { CheckoutProvider } from "./taxonomy/checkout-providers";
import type { OrderingPermission } from "./taxonomy/ordering";
import type { SkillMaturity } from "./taxonomy/maturity";

export interface SearchDiscovery {
  searchApi: boolean;
  mcp: boolean;
  searchInternal: boolean;
  apiDocUrl?: string;
}

export interface BuyingConfig {
  orderingPermission: OrderingPermission;
  checkoutProviders: CheckoutProvider[];
  paymentMethods: PaymentMethod[];
  deliveryOptions: string;
  freeDelivery?: string;
  returnsPolicy?: string;
  returnsWindow?: string;
}

export interface DealsConfig {
  currentDeals: boolean;
  dealsUrl?: string;
  dealsApiEndpoint?: string;
  loyaltyProgram?: string;
}

export interface TaxonomyConfig {
  sector: VendorSector;
  subSectors: string[];
  tier: BrandTier;
  tags?: string[];
}

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
  sector: VendorSector;
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

  asxScore?: number;

  version: string;
  lastVerified: string;
  generatedBy: "skill_builder" | "agentic_scanner" | "manual";
  feedbackStats?: {
    successRate: number;
    lastFailure?: string;
    failureReason?: string;
  };

  taxonomy?: TaxonomyConfig;
  searchDiscovery?: SearchDiscovery;
  buying?: BuyingConfig;
  deals?: DealsConfig;
}

export function computeAgentFriendliness(vendor: VendorSkill): number {
  let score = 0;
  if (vendor.checkout.guestCheckout) score += 1;
  const primaryMethod = vendor.checkoutMethods[0];
  if (primaryMethod && !vendor.methodConfig[primaryMethod]?.requiresAuth) score += 1;
  if (vendor.capabilities.includes("programmatic_checkout")) score += 2;
  if ((vendor.feedbackStats?.successRate ?? 0) > 0.85) score += 1;
  if (vendor.searchDiscovery?.searchApi) score += 1;
  if (vendor.searchDiscovery?.mcp) score += 1;
  return Math.min(score, 5);
}
