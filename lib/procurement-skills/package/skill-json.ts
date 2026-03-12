import { VendorSkill, CheckoutMethod, computeAgentFriendliness } from "../types";

export interface SkillJsonPackage {
  slug: string;
  name: string;
  version: string;
  category: string;
  url: string;
  checkoutMethods: string[];
  capabilities: string[];
  maturity: string;
  agentFriendliness: number;
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
  methodConfig: Record<string, {
    locatorFormat?: string;
    searchEndpoint?: string;
    requiresAuth: boolean;
    notes: string;
  }>;
  tips: string[];
  creditclaw: {
    requiredRails: string[];
    paymentEndpoint: string;
    walletTypes: string[];
  };
  generatedBy: string;
  lastVerified: string;
}

export function generateSkillJson(vendor: VendorSkill): SkillJsonPackage {
  return {
    slug: vendor.slug,
    name: vendor.name,
    version: vendor.version,
    category: vendor.category,
    url: vendor.url,
    checkoutMethods: vendor.checkoutMethods,
    capabilities: vendor.capabilities,
    maturity: vendor.maturity,
    agentFriendliness: computeAgentFriendliness(vendor),
    search: vendor.search,
    checkout: vendor.checkout,
    shipping: vendor.shipping,
    methodConfig: vendor.methodConfig as Record<string, any>,
    tips: vendor.tips,
    creditclaw: {
      requiredRails: inferRequiredRails(vendor),
      paymentEndpoint: "/api/v1/bot/wallets/:walletId/purchase",
      walletTypes: inferWalletTypes(vendor),
    },
    generatedBy: vendor.generatedBy,
    lastVerified: vendor.lastVerified,
  };
}

export function inferRequiredRails(vendor: VendorSkill): string[] {
  const rails: string[] = [];
  if (vendor.checkoutMethods.includes("x402")) rails.push("stripe_wallet");
  if (vendor.checkoutMethods.includes("crossmint_world")) rails.push("card_wallet");
  if (vendor.checkoutMethods.includes("native_api")) rails.push("card_wallet");
  if (vendor.checkoutMethods.includes("self_hosted_card")) rails.push("self_hosted");
  if (rails.length === 0) rails.push("stripe_wallet");
  return [...new Set(rails)];
}

function inferWalletTypes(vendor: VendorSkill): string[] {
  const types: string[] = [];
  if (vendor.checkoutMethods.includes("x402")) types.push("privy");
  if (vendor.checkoutMethods.includes("crossmint_world") || vendor.checkoutMethods.includes("native_api")) types.push("crossmint");
  if (vendor.checkoutMethods.includes("self_hosted_card")) types.push("rail4");
  if (types.length === 0) types.push("privy");
  return [...new Set(types)];
}
