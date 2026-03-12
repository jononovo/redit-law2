import { NextRequest, NextResponse } from "next/server";
import { VENDOR_REGISTRY } from "@/lib/procurement-skills/registry";
import { computeAgentFriendliness, CheckoutMethod, VendorCapability, SkillMaturity } from "@/lib/procurement-skills/types";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const category = url.searchParams.get("category");
  const search = url.searchParams.get("search")?.toLowerCase();
  const checkoutParam = url.searchParams.get("checkout");
  const capabilityParam = url.searchParams.get("capability");
  const maturityParam = url.searchParams.get("maturity");

  const checkoutFilters = checkoutParam?.split(",").filter(Boolean) as CheckoutMethod[] | undefined;
  const capabilityFilters = capabilityParam?.split(",").filter(Boolean) as VendorCapability[] | undefined;
  const maturityFilters = maturityParam?.split(",").filter(Boolean) as SkillMaturity[] | undefined;

  let vendors = VENDOR_REGISTRY;

  if (category) {
    vendors = vendors.filter(v => v.category === category);
  }

  if (search) {
    vendors = vendors.filter(
      v => v.name.toLowerCase().includes(search) || v.slug.includes(search)
    );
  }

  if (checkoutFilters?.length) {
    vendors = vendors.filter(v =>
      checkoutFilters.some(cf => v.checkoutMethods.includes(cf))
    );
  }

  if (capabilityFilters?.length) {
    vendors = vendors.filter(v =>
      capabilityFilters.every(cf => v.capabilities.includes(cf))
    );
  }

  if (maturityFilters?.length) {
    vendors = vendors.filter(v => maturityFilters.includes(v.maturity));
  }

  return NextResponse.json({
    vendors: vendors.map(v => ({
      slug: v.slug,
      name: v.name,
      category: v.category,
      url: v.url,
      checkout_methods: v.checkoutMethods,
      capabilities: v.capabilities,
      maturity: v.maturity,
      agent_friendliness: computeAgentFriendliness(v),
      guest_checkout: v.checkout.guestCheckout,
      bulk_pricing: v.capabilities.includes("bulk_pricing"),
      free_shipping_above: v.shipping.freeThreshold ?? null,
      skill_url: `https://creditclaw.com/api/v1/bot/skills/${v.slug}`,
      catalog_url: `https://creditclaw.com/skills/${v.slug}`,
      version: v.version,
      last_verified: v.lastVerified,
      success_rate: v.feedbackStats?.successRate ?? null,
    })),
    total: vendors.length,
    categories: [...new Set(VENDOR_REGISTRY.map(v => v.category))],
  });
}
