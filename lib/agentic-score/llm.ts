import Anthropic from "@anthropic-ai/sdk";
import type { LLMCheckoutAnalysis, PageContent, AnalysisEvidence } from "./types";

// Using Anthropic integration - claude-sonnet-4-20250514 is the latest model
// <important_do_not_delete>
const DEFAULT_MODEL_STR = "claude-sonnet-4-20250514";
// </important_do_not_delete>

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function analyzeCheckoutFlow(
  pages: PageContent[],
  baseUrl: string
): Promise<{
  analysis: Partial<LLMCheckoutAnalysis>;
  confidence: Record<string, number>;
  evidence: AnalysisEvidence[];
}> {
  if (pages.length === 0) {
    return { analysis: {}, confidence: {}, evidence: [] };
  }

  const pageContent = pages
    .map(p => `--- Page: ${p.url} (HTTP ${p.statusCode}) ---\nTitle: ${p.title || "N/A"}\n\n${p.html.slice(0, 15000)}`)
    .join("\n\n=== NEXT PAGE ===\n\n");

  const systemPrompt = `You are analyzing an e-commerce website for an AI procurement system called CreditClaw.
Given the HTML content of key pages from a vendor website, extract structured data about how an AI agent would shop there.

Return a JSON object with these fields:
- name: string - The vendor/store name
- slug: string - URL-safe lowercase slug (e.g., "home-depot", "bh-photo")
- category: string - One of: "retail", "office", "hardware", "electronics", "industrial", "specialty"
- searchPattern: string - Description of how to search for products
- searchUrlTemplate: string - URL template for search (use {q} as placeholder)
- productIdFormat: string - Format of product identifiers (e.g., "SKU", "ASIN", "Item Number")
- guestCheckout: boolean - Whether guest checkout is available
- taxExemptField: boolean - Whether tax exemption is available at checkout
- poNumberField: boolean - Whether PO number field is available at checkout
- freeShippingThreshold: number|null - Dollar amount for free shipping, or null
- estimatedDeliveryDays: string - Typical delivery timeframe (e.g., "3-7 business days")
- businessShipping: boolean - Whether business/bulk shipping rates are available
- capabilities: string[] - From: ["price_lookup", "stock_check", "programmatic_checkout", "business_invoicing", "bulk_pricing", "tax_exemption", "account_creation", "order_tracking", "returns", "po_numbers"]
- tips: string[] - 3-5 practical tips for an AI agent shopping at this store

Only include fields you can confidently determine from the page content. If uncertain, omit the field.
Return ONLY valid JSON, no markdown formatting.`;

  try {
    const response = await anthropic.messages.create({
      model: DEFAULT_MODEL_STR,
      max_tokens: 2048,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `Analyze this vendor website (${baseUrl}):\n\n${pageContent}`,
        },
      ],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        analysis: {},
        confidence: {},
        evidence: [{
          field: "llm_analysis",
          source: "llm_inference",
          url: baseUrl,
          snippet: "LLM response did not contain valid JSON",
        }],
      };
    }

    const analysis: Partial<LLMCheckoutAnalysis> = JSON.parse(jsonMatch[0]);

    const confidence: Record<string, number> = {};
    const fields = [
      "name", "slug", "category", "searchPattern", "searchUrlTemplate",
      "productIdFormat", "guestCheckout", "taxExemptField", "poNumberField",
      "freeShippingThreshold", "estimatedDeliveryDays", "businessShipping",
      "capabilities", "tips",
    ];

    for (const field of fields) {
      if ((analysis as Record<string, unknown>)[field] !== undefined) {
        confidence[field] = 0.7;
      }
    }

    if (analysis.name) confidence["name"] = 0.9;
    if (analysis.slug) confidence["slug"] = 0.85;

    const evidence: AnalysisEvidence[] = [{
      field: "checkout_flow",
      source: "llm_inference",
      url: baseUrl,
      snippet: `LLM analyzed ${pages.length} pages, extracted ${Object.keys(analysis).length} fields`,
    }];

    return { analysis, confidence, evidence };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      analysis: {},
      confidence: {},
      evidence: [{
        field: "llm_analysis",
        source: "llm_inference",
        url: baseUrl,
        snippet: `LLM analysis failed: ${message}`,
      }],
    };
  }
}
