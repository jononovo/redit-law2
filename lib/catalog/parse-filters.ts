import type { BrandSearchFilters } from "@/server/storage/brand-index";

function parseCSV(param: string | null | undefined): string[] | undefined {
  if (!param) return undefined;
  const vals = param.split(",").map(s => s.trim()).filter(Boolean);
  return vals.length > 0 ? vals : undefined;
}

export const DEFAULT_MATURITIES = ["verified", "official", "beta", "community"];

export function parseSearchParams(
  params: Record<string, string | string[] | undefined> | URLSearchParams
): BrandSearchFilters {
  const get = (key: string): string | null => {
    if (params instanceof URLSearchParams) {
      return params.get(key);
    }
    const val = params[key];
    return typeof val === "string" ? val : null;
  };

  return {
    q: get("q") ?? undefined,
    sectors: parseCSV(get("sector")),
    tiers: parseCSV(get("tier")),
    maturities: parseCSV(get("maturity")),
    hasMcp: get("mcp") === "true" ? true : undefined,
    hasApi: get("search_api") === "true" ? true : undefined,
    hasDeals: get("has_deals") === "true" ? true : undefined,
    taxExempt: get("tax_exempt") === "true" ? true : undefined,
    poNumber: get("po_number") === "true" ? true : undefined,
    carriesBrand: get("carries_brand") ?? undefined,
    shipsTo: get("ships_to") ?? undefined,
    checkoutMethods: parseCSV(get("checkout")),
    capabilities: parseCSV(get("capability")),
    orderings: parseCSV(get("ordering")),
    paymentMethods: parseCSV(get("payment_method")),
    subSector: get("sub_sector") ?? undefined,
    minScore: get("min_score") ? parseInt(get("min_score")!) : undefined,
    limit: get("limit") ? parseInt(get("limit")!) : 50,
    offset: get("offset") ? parseInt(get("offset")!) : 0,
    sortBy: (get("sort") as BrandSearchFilters["sortBy"]) || "score",
    sortDir: (get("dir") as BrandSearchFilters["sortDir"]) || "desc",
  };
}

export function filtersToMetaTitle(filters: BrandSearchFilters): string {
  const parts: string[] = [];

  if (filters.q) {
    parts.push(`"${filters.q}"`);
  }
  if (filters.tiers?.length) {
    const tierLabels: Record<string, string> = {
      value: "Value Tier",
      mid: "Mid Tier",
      premium: "Premium Tier",
      enterprise: "Enterprise",
    };
    parts.push(filters.tiers.map(t => tierLabels[t] ?? t).join(", "));
  }
  if (filters.checkoutMethods?.length) {
    const methodLabels: Record<string, string> = {
      native_api: "Native API",
      acp: "ACP",
      x402: "x402",
      crossmint_world: "Crossmint",
      self_hosted_card: "Card Checkout",
      browser_automation: "Browser Automation",
    };
    parts.push(filters.checkoutMethods.map(m => methodLabels[m] ?? m).join(", "));
  }
  if (filters.capabilities?.length) {
    const capLabels: Record<string, string> = {
      price_lookup: "Price Lookup",
      stock_check: "Stock Check",
      programmatic_checkout: "Programmatic Checkout",
      order_tracking: "Order Tracking",
      returns: "Returns",
      wishlist: "Wishlist",
      reviews: "Reviews",
    };
    parts.push(filters.capabilities.map(c => capLabels[c] ?? c).join(", "));
  }

  if (parts.length === 0) {
    return "Skill Index — AI Agent Procurement Skills | CreditClaw";
  }

  return `${parts.join(" · ")} Skills — Skill Index | CreditClaw`;
}

export function filtersToCanonicalParams(filters: BrandSearchFilters): string {
  const params = new URLSearchParams();

  if (filters.q) params.set("q", filters.q);
  if (filters.tiers?.length) params.set("tier", filters.tiers.sort().join(","));
  if (filters.checkoutMethods?.length) params.set("checkout", filters.checkoutMethods.sort().join(","));
  if (filters.capabilities?.length) params.set("capability", filters.capabilities.sort().join(","));
  if (filters.maturities?.length) {
    const defaultMaturities = ["beta", "community", "official", "verified"];
    const sorted = [...filters.maturities].sort();
    if (JSON.stringify(sorted) !== JSON.stringify(defaultMaturities)) {
      params.set("maturity", sorted.join(","));
    }
  }

  const str = params.toString();
  return str ? `?${str}` : "";
}
