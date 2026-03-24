import { NextRequest, NextResponse } from "next/server";
import { VENDOR_REGISTRY } from "@/lib/procurement-skills/registry";
import { computeAgentFriendliness, CheckoutMethod, VendorCapability, SkillMaturity, VendorSector, VendorTier, OrderingPermission, PaymentMethod } from "@/lib/procurement-skills/types";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const category = url.searchParams.get("category");
  const search = url.searchParams.get("search")?.toLowerCase();
  const checkoutParam = url.searchParams.get("checkout");
  const capabilityParam = url.searchParams.get("capability");
  const maturityParam = url.searchParams.get("maturity");

  const sectorParam = url.searchParams.get("sector");
  const tierParam = url.searchParams.get("tier");
  const subSectorParam = url.searchParams.get("sub_sector")?.toLowerCase();
  const orderingParam = url.searchParams.get("ordering_permission");
  const paymentMethodParam = url.searchParams.get("payment_method");
  const hasDeals = url.searchParams.get("has_deals");
  const hasSearchApi = url.searchParams.get("search_api");
  const hasMcp = url.searchParams.get("mcp");

  const checkoutFilters = checkoutParam?.split(",").filter(Boolean) as CheckoutMethod[] | undefined;
  const capabilityFilters = capabilityParam?.split(",").filter(Boolean) as VendorCapability[] | undefined;
  const maturityFilters = maturityParam?.split(",").filter(Boolean) as SkillMaturity[] | undefined;
  const sectorFilters = sectorParam?.split(",").filter(Boolean) as VendorSector[] | undefined;
  const tierFilters = tierParam?.split(",").filter(Boolean) as VendorTier[] | undefined;
  const orderingFilters = orderingParam?.split(",").filter(Boolean) as OrderingPermission[] | undefined;
  const paymentMethodFilters = paymentMethodParam?.split(",").filter(Boolean) as PaymentMethod[] | undefined;

  let vendors = VENDOR_REGISTRY;

  if (category) {
    vendors = vendors.filter(v => v.category === category);
  }

  if (search) {
    vendors = vendors.filter(
      v =>
        v.name.toLowerCase().includes(search) ||
        v.slug.includes(search) ||
        v.taxonomy?.sector.includes(search) ||
        v.taxonomy?.subSectors.some(s => s.toLowerCase().includes(search)) ||
        v.taxonomy?.tags?.some(t => t.toLowerCase().includes(search))
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

  if (sectorFilters?.length) {
    vendors = vendors.filter(v =>
      v.taxonomy && sectorFilters.includes(v.taxonomy.sector)
    );
  }

  if (tierFilters?.length) {
    vendors = vendors.filter(v =>
      v.taxonomy && tierFilters.includes(v.taxonomy.tier)
    );
  }

  if (subSectorParam) {
    vendors = vendors.filter(v =>
      v.taxonomy?.subSectors.some(s => s.toLowerCase().includes(subSectorParam))
    );
  }

  if (orderingFilters?.length) {
    vendors = vendors.filter(v =>
      v.buying && orderingFilters.includes(v.buying.orderingPermission)
    );
  }

  if (paymentMethodFilters?.length) {
    vendors = vendors.filter(v =>
      v.buying && paymentMethodFilters.some(pm => v.buying!.paymentMethods.includes(pm))
    );
  }

  if (hasDeals === "true") {
    vendors = vendors.filter(v => v.deals?.currentDeals === true);
  }

  if (hasSearchApi === "true") {
    vendors = vendors.filter(v => v.searchDiscovery?.searchApi === true);
  }

  if (hasMcp === "true") {
    vendors = vendors.filter(v => v.searchDiscovery?.mcp === true);
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
      taxonomy: v.taxonomy ? {
        sector: v.taxonomy.sector,
        sub_sectors: v.taxonomy.subSectors,
        tier: v.taxonomy.tier,
        tags: v.taxonomy.tags ?? [],
      } : null,
      search_discovery: v.searchDiscovery ? {
        search_api: v.searchDiscovery.searchApi,
        mcp: v.searchDiscovery.mcp,
        search_internal: v.searchDiscovery.searchInternal,
      } : null,
      buying: v.buying ? {
        ordering_permission: v.buying.orderingPermission,
        checkout_providers: v.buying.checkoutProviders,
        payment_methods: v.buying.paymentMethods,
        delivery_options: v.buying.deliveryOptions,
        free_delivery: v.buying.freeDelivery ?? null,
        returns_policy: v.buying.returnsPolicy ?? null,
      } : null,
      deals: v.deals ? {
        current_deals: v.deals.currentDeals,
        deals_url: v.deals.dealsUrl ?? null,
        loyalty_program: v.deals.loyaltyProgram ?? null,
      } : null,
    })),
    total: vendors.length,
    categories: [...new Set(VENDOR_REGISTRY.map(v => v.category))],
    sectors: [...new Set(VENDOR_REGISTRY.map(v => v.taxonomy?.sector).filter(Boolean))],
    tiers: [...new Set(VENDOR_REGISTRY.map(v => v.taxonomy?.tier).filter(Boolean))],
  });
}
