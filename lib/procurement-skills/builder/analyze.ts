import type { BuilderOutput, AnalysisEvidence } from "./types";
import type { VendorSkill, VendorCapability, VendorCategory, CheckoutMethod, MethodConfig } from "../types";
import { fetchPages } from "./fetch";
import { probeForAPIs, detectBusinessFeatures, checkProtocolSupport } from "./probes";
import { analyzeCheckoutFlow } from "./llm";

export async function analyzeVendor(url: string): Promise<BuilderOutput> {
  const baseUrl = url.replace(/\/+$/, "");
  const allEvidence: AnalysisEvidence[] = [];
  const allWarnings: string[] = [];
  const confidence: Record<string, number> = {};

  const [apiResult, businessResult, pages] = await Promise.all([
    probeForAPIs(baseUrl).catch(err => {
      allWarnings.push(`API probe failed: ${err.message}`);
      return { methods: ["self_hosted_card", "browser_automation"] as CheckoutMethod[], evidence: [] as AnalysisEvidence[] };
    }),
    detectBusinessFeatures(baseUrl).catch(err => {
      allWarnings.push(`Business feature detection failed: ${err.message}`);
      return { capabilities: [] as string[], evidence: [] as AnalysisEvidence[] };
    }),
    fetchPages([
      baseUrl,
      `${baseUrl}/cart`,
      `${baseUrl}/checkout`,
      `${baseUrl}/business`,
      `${baseUrl}/about`,
    ]).catch(err => {
      allWarnings.push(`Page fetch failed: ${err.message}`);
      return [];
    }),
  ]);

  allEvidence.push(...apiResult.evidence, ...businessResult.evidence);

  confidence["checkoutMethods"] = apiResult.methods.includes("native_api") || apiResult.methods.includes("acp") || apiResult.methods.includes("x402") ? 0.9 : 0.5;
  confidence["capabilities"] = businessResult.capabilities.length > 0 ? 0.8 : 0.4;

  const llmResult = await analyzeCheckoutFlow(pages, baseUrl).catch(err => {
    allWarnings.push(`LLM analysis failed: ${err.message}`);
    return { analysis: {}, confidence: {} as Record<string, number>, evidence: [] as AnalysisEvidence[] };
  });

  allEvidence.push(...llmResult.evidence);

  for (const [key, value] of Object.entries(llmResult.confidence)) {
    confidence[key] = value;
  }

  const protocolResult = await checkProtocolSupport(baseUrl, apiResult.methods).catch(err => {
    allWarnings.push(`Protocol support check failed: ${err.message}`);
    return { methodConfig: {} as Record<string, { requiresAuth: boolean; notes: string }>, evidence: [] as AnalysisEvidence[] };
  });

  allEvidence.push(...protocolResult.evidence);

  const validCategories: VendorCategory[] = ["retail", "office", "hardware", "electronics", "industrial", "specialty"];
  const validCapabilities: VendorCapability[] = [
    "price_lookup", "stock_check", "programmatic_checkout", "business_invoicing",
    "bulk_pricing", "tax_exemption", "account_creation", "order_tracking", "returns", "po_numbers",
  ];

  const llm = llmResult.analysis as Record<string, unknown>;
  const mergedCapabilities = [
    ...new Set([
      ...businessResult.capabilities,
      ...((llm.capabilities as string[]) || []),
      "price_lookup",
    ]),
  ].filter((c): c is VendorCapability => validCapabilities.includes(c as VendorCapability));

  if (apiResult.methods.includes("native_api") || apiResult.methods.includes("acp")) {
    if (!mergedCapabilities.includes("programmatic_checkout")) {
      mergedCapabilities.push("programmatic_checkout");
    }
  }

  const domain = new URL(baseUrl).hostname.replace(/^www\./, "");
  const fallbackSlug = domain.split(".")[0].toLowerCase().replace(/[^a-z0-9]/g, "-");

  const methodConfig: Partial<Record<CheckoutMethod, MethodConfig>> = {};
  for (const [key, value] of Object.entries(protocolResult.methodConfig)) {
    methodConfig[key as CheckoutMethod] = value;
  }

  const draft: Partial<VendorSkill> = {
    slug: (llm.slug as string) || fallbackSlug,
    name: (llm.name as string) || domain,
    category: (validCategories.includes(llm.category as VendorCategory) ? llm.category : "retail") as VendorCategory,
    url: baseUrl,
    checkoutMethods: apiResult.methods,
    capabilities: mergedCapabilities,
    maturity: "draft" as const,
    methodConfig,
    search: {
      pattern: (llm.searchPattern as string) || `Search by product name on ${domain}`,
      urlTemplate: llm.searchUrlTemplate as string | undefined,
      productIdFormat: llm.productIdFormat as string | undefined,
    },
    checkout: {
      guestCheckout: (llm.guestCheckout as boolean) ?? false,
      taxExemptField: (llm.taxExemptField as boolean) ?? false,
      poNumberField: (llm.poNumberField as boolean) ?? false,
    },
    shipping: {
      freeThreshold: (llm.freeShippingThreshold as number) ?? undefined,
      estimatedDays: (llm.estimatedDeliveryDays as string) || "5-10 business days",
      businessShipping: (llm.businessShipping as boolean) ?? false,
    },
    tips: (llm.tips as string[]) || [`Visit ${baseUrl} to browse products`, "Check product availability before purchasing"],
    version: "1.0.0",
    lastVerified: new Date().toISOString().split("T")[0],
    generatedBy: "skill_builder" as const,
  };

  if (!confidence["name"]) confidence["name"] = 0.5;
  if (!confidence["slug"]) confidence["slug"] = 0.5;
  if (!confidence["category"]) confidence["category"] = 0.5;
  if (!confidence["search"]) confidence["search"] = llm.searchUrlTemplate ? 0.7 : 0.4;
  if (!confidence["checkout"]) confidence["checkout"] = llm.guestCheckout !== undefined ? 0.7 : 0.4;
  if (!confidence["shipping"]) confidence["shipping"] = llm.freeShippingThreshold !== undefined ? 0.7 : 0.4;
  if (!confidence["tips"]) confidence["tips"] = llm.tips && (llm.tips as string[]).length > 0 ? 0.7 : 0.3;

  const reviewNeeded = Object.entries(confidence)
    .filter(([_, conf]) => conf < 0.7)
    .map(([field]) => field);

  const autoPublish = reviewNeeded.length === 0 &&
    Object.values(confidence).every(c => c > 0.9);

  return {
    draft,
    confidence,
    evidence: allEvidence,
    warnings: allWarnings,
    reviewNeeded,
    autoPublish,
  };
}
