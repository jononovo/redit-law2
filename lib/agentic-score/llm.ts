import Anthropic from "@anthropic-ai/sdk";
import type { VendorSector } from "@/lib/procurement-skills/taxonomy/sectors";
import type { BrandTier } from "@/lib/procurement-skills/taxonomy/tiers";

const DEFAULT_MODEL_STR = "claude-sonnet-4-6-20260320";

const VALID_SECTORS: VendorSector[] = [
  "retail", "office", "fashion", "health", "beauty", "saas", "home",
  "construction", "automotive", "electronics", "food", "sports",
  "industrial", "specialty", "luxury", "travel", "entertainment",
  "education", "pets", "garden",
];

const VALID_TIERS: BrandTier[] = [
  "ultra_luxury", "luxury", "premium", "mid_range", "value", "budget", "commodity",
];

export interface LLMScanFindings {
  name?: string;
  sector?: VendorSector;
  subSectors?: string[];
  tier?: BrandTier;
  guestCheckout?: boolean;
  taxExemptField?: boolean;
  poNumberField?: boolean;
  searchUrlTemplate?: string;
  searchPattern?: string;
  productIdFormat?: string;
  freeShippingThreshold?: number | null;
  estimatedDeliveryDays?: string;
  businessShipping?: boolean;
  capabilities?: string[];
  tips?: string[];
  checkoutProviders?: string[];
  paymentMethods?: string[];
  hasApi?: boolean;
  hasMcp?: boolean;
}

const SYSTEM_PROMPT = `You are analyzing an e-commerce website for CreditClaw, an AI procurement platform.
Given the HTML content of a vendor's homepage, extract structured data about how an AI agent would shop there.

Return a JSON object with these fields (include only those you can confidently determine):
- name: string - The vendor/store name
- sector: string - One of: ${VALID_SECTORS.join(", ")}
- subSectors: string[] - More specific categories (e.g., "office supplies", "janitorial")
- tier: string - One of: ${VALID_TIERS.join(", ")}
- guestCheckout: boolean - Whether guest checkout is available
- taxExemptField: boolean - Whether tax exemption is available
- poNumberField: boolean - Whether PO number field is available at checkout
- searchUrlTemplate: string - URL template for search (use {q} as placeholder)
- searchPattern: string - Description of how to search for products
- productIdFormat: string - Format of product identifiers (e.g., "SKU", "Item Number")
- freeShippingThreshold: number|null - Dollar amount for free shipping, or null
- estimatedDeliveryDays: string - Typical delivery timeframe
- businessShipping: boolean - Whether business/bulk shipping rates are available
- capabilities: string[] - From: ["price_lookup", "stock_check", "programmatic_checkout", "business_invoicing", "bulk_pricing", "tax_exemption", "account_creation", "order_tracking", "returns", "po_numbers"]
- tips: string[] - 3-5 practical tips for an AI agent shopping at this store
- checkoutProviders: string[] - Payment processors used (e.g., "stripe", "shopify_payments", "paypal")
- paymentMethods: string[] - Accepted payment methods (e.g., "credit_card", "purchase_order", "wire")
- hasApi: boolean - Whether the site exposes a public API
- hasMcp: boolean - Whether the site supports MCP protocol

Only include fields you can confidently determine from the page content.
Return ONLY valid JSON, no markdown formatting.`;

export async function analyzeScanWithClaude(
  homepageHtml: string,
  domain: string,
): Promise<LLMScanFindings> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return {};

  try {
    const anthropic = new Anthropic({ apiKey });

    const strippedHtml = homepageHtml
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<!--[\s\S]*?-->/g, "")
      .slice(0, 30000);

    const response = await anthropic.messages.create({
      model: DEFAULT_MODEL_STR,
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Analyze this vendor website (https://${domain}):\n\n${strippedHtml}`,
        },
      ],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return {};

    const raw = JSON.parse(jsonMatch[0]);
    const findings: LLMScanFindings = {};

    if (typeof raw.name === "string" && raw.name.length > 0) {
      findings.name = raw.name;
    }

    if (typeof raw.sector === "string" && VALID_SECTORS.includes(raw.sector as VendorSector)) {
      findings.sector = raw.sector as VendorSector;
    }

    if (Array.isArray(raw.subSectors)) {
      findings.subSectors = raw.subSectors.filter((s: unknown) => typeof s === "string");
    }

    if (typeof raw.tier === "string" && VALID_TIERS.includes(raw.tier as BrandTier)) {
      findings.tier = raw.tier as BrandTier;
    }

    if (typeof raw.guestCheckout === "boolean") findings.guestCheckout = raw.guestCheckout;
    if (typeof raw.taxExemptField === "boolean") findings.taxExemptField = raw.taxExemptField;
    if (typeof raw.poNumberField === "boolean") findings.poNumberField = raw.poNumberField;
    if (typeof raw.searchUrlTemplate === "string") findings.searchUrlTemplate = raw.searchUrlTemplate;
    if (typeof raw.searchPattern === "string") findings.searchPattern = raw.searchPattern;
    if (typeof raw.productIdFormat === "string") findings.productIdFormat = raw.productIdFormat;
    if (typeof raw.businessShipping === "boolean") findings.businessShipping = raw.businessShipping;
    if (typeof raw.estimatedDeliveryDays === "string") findings.estimatedDeliveryDays = raw.estimatedDeliveryDays;
    if (typeof raw.hasApi === "boolean") findings.hasApi = raw.hasApi;
    if (typeof raw.hasMcp === "boolean") findings.hasMcp = raw.hasMcp;

    if (raw.freeShippingThreshold === null || typeof raw.freeShippingThreshold === "number") {
      findings.freeShippingThreshold = raw.freeShippingThreshold;
    }

    if (Array.isArray(raw.capabilities)) {
      const validCaps = [
        "price_lookup", "stock_check", "programmatic_checkout", "business_invoicing",
        "bulk_pricing", "tax_exemption", "account_creation", "order_tracking", "returns", "po_numbers",
      ];
      findings.capabilities = raw.capabilities.filter((c: unknown) => typeof c === "string" && validCaps.includes(c));
    }

    if (Array.isArray(raw.tips)) {
      findings.tips = raw.tips.filter((t: unknown) => typeof t === "string").slice(0, 5);
    }

    if (Array.isArray(raw.checkoutProviders)) {
      findings.checkoutProviders = raw.checkoutProviders.filter((p: unknown) => typeof p === "string");
    }

    if (Array.isArray(raw.paymentMethods)) {
      findings.paymentMethods = raw.paymentMethods.filter((m: unknown) => typeof m === "string");
    }

    return findings;
  } catch (err) {
    console.warn("Claude scan analysis failed:", err instanceof Error ? err.message : err);
    return {};
  }
}
