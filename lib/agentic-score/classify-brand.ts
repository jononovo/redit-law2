import type { VendorSector } from "@/lib/procurement-skills/taxonomy/sectors";
import type { BrandTier } from "@/lib/procurement-skills/taxonomy/tiers";
import type { VendorCapability } from "@/lib/procurement-skills/types";
import { VALID_SECTORS, VALID_CAPABILITIES } from "./scan-utils";

const PERPLEXITY_TIMEOUT_MS = 25_000;

const VALID_TIERS: BrandTier[] = [
  "ultra_luxury", "luxury", "premium", "mid_range", "value", "budget", "commodity",
];

export interface BrandClassification {
  name: string;
  sector: VendorSector;
  tier: BrandTier;
  subCategories: string[];
  capabilities: VendorCapability[];
  description: string;
  guestCheckout: boolean;
  hasSearchApi: boolean;
  hasMobileApp: boolean;
}

const CLASSIFICATION_SCHEMA = {
  type: "object" as const,
  properties: {
    name: { type: "string", description: "Official brand/company name (clean, no Inc/LLC/Ltd suffix)" },
    sector: { type: "string", enum: VALID_SECTORS, description: "Primary business sector" },
    tier: { type: "string", enum: VALID_TIERS, description: "Brand pricing tier" },
    subCategories: { type: "array", items: { type: "string" }, description: "Up to 5 product categories they sell" },
    capabilities: { type: "array", items: { type: "string", enum: VALID_CAPABILITIES }, description: "Supported e-commerce capabilities" },
    description: { type: "string", description: "One sentence about what they sell and who they serve" },
    guestCheckout: { type: "boolean", description: "Whether checkout is available without creating an account" },
    hasSearchApi: { type: "boolean", description: "Whether they have a public search or product API" },
    hasMobileApp: { type: "boolean", description: "Whether they have a mobile shopping app" },
  },
  required: ["name", "sector", "tier", "subCategories", "description", "guestCheckout"],
};

export async function classifyBrand(domain: string): Promise<BrandClassification | null> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    console.warn(`[scan] Perplexity classification skipped for ${domain}: PERPLEXITY_API_KEY not set`);
    return null;
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PERPLEXITY_TIMEOUT_MS);

    let res: Response;
    try {
      res = await fetch("https://api.perplexity.ai/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: "sonar",
          messages: [
            {
              role: "system",
              content: "You classify e-commerce merchants. Return precise, factual data about the brand.",
            },
            {
              role: "user",
              content: `Classify the e-commerce website at ${domain}. Identify the brand name, business sector, pricing tier, main product categories (up to 5), and key e-commerce capabilities.`,
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "brand_classification",
              schema: CLASSIFICATION_SCHEMA,
            },
          },
          max_tokens: 500,
          temperature: 0.1,
        }),
      });
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) {
      console.warn(`[scan] Perplexity classification failed for ${domain}: HTTP ${res.status}`);
      return null;
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      console.warn(`[scan] Perplexity classification failed for ${domain}: empty response`);
      return null;
    }

    const parsed = JSON.parse(content);

    const sector = VALID_SECTORS.includes(parsed.sector) ? parsed.sector : "specialty";
    const tier = VALID_TIERS.includes(parsed.tier) ? parsed.tier : "mid_range";
    const capabilities = Array.isArray(parsed.capabilities)
      ? parsed.capabilities.filter((c: string) => VALID_CAPABILITIES.includes(c as VendorCapability))
      : [];

    return {
      name: typeof parsed.name === "string" && parsed.name.length > 0 ? parsed.name : domain.split(".")[0],
      sector,
      tier,
      subCategories: Array.isArray(parsed.subCategories) ? parsed.subCategories.filter((s: unknown) => typeof s === "string") : [],
      capabilities,
      description: typeof parsed.description === "string" ? parsed.description : "",
      guestCheckout: typeof parsed.guestCheckout === "boolean" ? parsed.guestCheckout : false,
      hasSearchApi: typeof parsed.hasSearchApi === "boolean" ? parsed.hasSearchApi : false,
      hasMobileApp: typeof parsed.hasMobileApp === "boolean" ? parsed.hasMobileApp : false,
    };
  } catch (err) {
    console.warn(`[scan] Perplexity classification failed for ${domain}:`, err instanceof Error ? err.message : err);
    return null;
  }
}
