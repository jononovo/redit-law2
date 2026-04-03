import type { VendorSkill } from "./types";

export interface SkillJson {
  $schema: string;
  version: string;
  identity: {
    vendor: string;
    domain: string;
    displayName: string;
    logoUrl: string | null;
    url: string;
  };
  taxonomy: {
    sector: string;
    tier: string | null;
    productCategories: string[];
    categories: {
      id: number;
      name: string;
      path: string;
      depth: number;
      primary?: boolean;
    }[];
  };
  scoring: {
    asxScore: number;
    asxBreakdown: {
      clarity: number;
      discoverability: number;
      reliability: number;
    };
    asxPillarMax: {
      clarity: number;
      discoverability: number;
      reliability: number;
    };
    scanTier: string;
    lastScanned: string;
    axsRating: number | null;
    axsBreakdown: {
      searchAccuracy: number | null;
      stockReliability: number | null;
      checkoutCompletion: number | null;
    } | null;
    axsRatingCount: number;
  };
  access: {
    apiTier: string;
    mcpEndpoint: string | null;
    searchApi: boolean;
    searchUrlTemplate: string | null;
  };
  checkout: {
    authRequired: boolean;
    guestCheckout: boolean;
    platform: string | null;
    paymentMethods: string[];
    agenticPaymentProtocols: string[];
    poNumberSupported: boolean;
    taxExemptSupported: boolean;
  };
  shipping: {
    freeShippingThreshold: number | null;
    deliveryEstimate: string | null;
  };
  loyalty: {
    loyaltyProgram: string | null;
  };
  skillQuality: {
    skillVersion: string;
    generatedBy: string;
    generationTier: string;
    lastVerified: string;
  };
}

interface BrandRecord {
  slug: string;
  name: string;
  domain: string;
  url: string | null;
  logoUrl: string | null;
  sector: string | null;
  tier: string | null;
  subSectors: string[];
  overallScore: number | null;
  scoreBreakdown: Record<string, unknown> | null;
  scanTier: string | null;
  lastScannedAt: Date | string | null;
  axsRating: number | null;
  ratingCount: number | null;
  capabilities: string[];
  checkoutMethods: string[];
  hasMcp: boolean | null;
  hasApi: boolean | null;
  brandData: Record<string, unknown> | null;
  productCategoryStrings?: string[];
  categoryObjects?: { id: number; name: string; path: string; depth: number; primary: boolean }[];
}

function extractPillarScore(breakdown: Record<string, unknown> | null, pillar: string): number {
  if (!breakdown) return 0;
  const p = breakdown[pillar] as Record<string, unknown> | undefined;
  return typeof p?.score === "number" ? p.score : 0;
}

function extractPillarMax(breakdown: Record<string, unknown> | null, pillar: string): number {
  if (!breakdown) return 0;
  const p = breakdown[pillar] as Record<string, unknown> | undefined;
  return typeof p?.max === "number" ? p.max : 0;
}

function buildProductCategoryStrings(
  categories: { id: number; name: string; path: string; depth: number; primary?: boolean }[],
): string[] {
  return categories.map((c) => `${c.id} - ${c.path}`);
}

export function buildSkillJson(brand: BrandRecord): SkillJson {
  const bd = (brand.brandData ?? {}) as Partial<VendorSkill>;
  const breakdown = brand.scoreBreakdown as Record<string, unknown> | null;

  const searchUrl = bd.search?.urlTemplate ?? null;
  const hasSearchApi = brand.hasApi ?? false;
  const hasMcp = brand.hasMcp ?? false;

  let apiTier: string = "private";
  if (hasMcp || hasSearchApi) apiTier = "open";
  else if (brand.capabilities?.includes("programmatic_checkout")) apiTier = "keyed";

  const paymentMethods: string[] = [];
  const rawPayments = bd.checkout?.guestCheckout !== undefined
    ? (brand.brandData as Record<string, unknown>)?.paymentMethods
    : undefined;
  if (Array.isArray(rawPayments)) {
    paymentMethods.push(...rawPayments.filter((p): p is string => typeof p === "string"));
  }

  const lastScanned = brand.lastScannedAt
    ? new Date(brand.lastScannedAt).toISOString().split("T")[0]
    : new Date().toISOString().split("T")[0];

  const categories = (brand.categoryObjects ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    path: c.path,
    depth: c.depth,
    ...(c.primary ? { primary: true } : {}),
  }));

  return {
    $schema: "https://shopy.sh/schemas/skill.json/v1",
    version: "1.0",

    identity: {
      vendor: brand.slug,
      domain: brand.domain,
      displayName: brand.name,
      logoUrl: brand.logoUrl ?? null,
      url: brand.url ?? `https://${brand.domain}`,
    },

    taxonomy: {
      sector: brand.sector ?? "specialty",
      tier: brand.tier ?? null,
      productCategories: buildProductCategoryStrings(categories),
      categories,
    },

    scoring: {
      asxScore: brand.overallScore ?? 0,
      asxBreakdown: {
        clarity: extractPillarScore(breakdown, "clarity"),
        discoverability: extractPillarScore(breakdown, "discoverability"),
        reliability: extractPillarScore(breakdown, "reliability"),
      },
      asxPillarMax: {
        clarity: extractPillarMax(breakdown, "clarity") || 35,
        discoverability: extractPillarMax(breakdown, "discoverability") || 30,
        reliability: extractPillarMax(breakdown, "reliability") || 35,
      },
      scanTier: brand.scanTier ?? "free",
      lastScanned,
      axsRating: brand.axsRating ?? null,
      axsBreakdown: brand.axsRating
        ? { searchAccuracy: null, stockReliability: null, checkoutCompletion: null }
        : null,
      axsRatingCount: brand.ratingCount ?? 0,
    },

    access: {
      apiTier,
      mcpEndpoint: hasMcp ? `https://${brand.domain}/.well-known/mcp.json` : null,
      searchApi: hasSearchApi,
      searchUrlTemplate: searchUrl,
    },

    checkout: {
      authRequired: !(bd.checkout?.guestCheckout ?? false),
      guestCheckout: bd.checkout?.guestCheckout ?? false,
      platform: (brand.brandData as Record<string, unknown>)?.platformTech as string ?? null,
      paymentMethods,
      agenticPaymentProtocols: [],
      poNumberSupported: bd.checkout?.poNumberField ?? false,
      taxExemptSupported: bd.checkout?.taxExemptField ?? false,
    },

    shipping: {
      freeShippingThreshold: bd.shipping?.freeThreshold ?? null,
      deliveryEstimate: bd.shipping?.estimatedDays ?? null,
    },

    loyalty: {
      loyaltyProgram: (brand.brandData as Record<string, unknown>)?.loyaltyProgram as string ?? null,
    },

    skillQuality: {
      skillVersion: bd.version ?? "1.0.0",
      generatedBy: bd.generatedBy ?? "agentic_scanner",
      generationTier: brand.scanTier ?? "free",
      lastVerified: bd.lastVerified ?? lastScanned,
    },
  };
}
