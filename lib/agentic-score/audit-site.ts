import { VALID_CAPABILITIES } from "./scan-utils";

const PERPLEXITY_TIMEOUT_MS = 30_000;

export interface SiteAudit {
  hasGuestCheckout: boolean;
  hasSearchBar: boolean;
  searchUrlPattern: string | null;
  hasJsonLd: boolean;
  hasOpenGraph: boolean;
  paymentMethods: string[];
  checkoutProviders: string[];
  hasCartPage: boolean;
  hasCaptcha: boolean;
  hasPromoCodeField: boolean;
  freeShippingThreshold: number | null;
  estimatedDeliveryDays: string | null;
  platformTech: string | null;
  hasProductVariants: boolean;
  hasWishlist: boolean;
  hasStoreLocator: boolean;
  hasApi: boolean;
  hasMcp: boolean;
  tips: string[];
}

const AUDIT_SCHEMA = {
  type: "object" as const,
  properties: {
    hasGuestCheckout: { type: "boolean", description: "Whether the site supports checkout without creating an account" },
    hasSearchBar: { type: "boolean", description: "Whether homepage has a search input" },
    searchUrlPattern: { type: "string", description: "URL pattern for search, e.g. /search?q={query} or /s?searchTerm={query}" },
    hasJsonLd: { type: "boolean", description: "Whether the site uses JSON-LD structured data on product pages" },
    hasOpenGraph: { type: "boolean", description: "Whether the site has Open Graph meta tags" },
    paymentMethods: { type: "array", items: { type: "string" }, description: "Accepted payment methods (visa, mastercard, paypal, apple_pay, google_pay, amex, discover, klarna, afterpay, etc.)" },
    checkoutProviders: { type: "array", items: { type: "string" }, description: "Third-party checkout/payment providers used (Shopify Checkout, Stripe, PayPal, Bolt, etc.)" },
    hasCartPage: { type: "boolean", description: "Whether there is a /cart or /basket page" },
    hasCaptcha: { type: "boolean", description: "Whether the site uses CAPTCHA or bot challenges on checkout" },
    hasPromoCodeField: { type: "boolean", description: "Whether checkout has a promo/coupon/discount code field" },
    freeShippingThreshold: { type: "number", description: "Minimum order in USD for free shipping. 0 if always free. -1 if no free shipping." },
    estimatedDeliveryDays: { type: "string", description: "Typical delivery timeframe, e.g. '3-5 business days'" },
    platformTech: { type: "string", description: "E-commerce platform: Shopify, Magento, WooCommerce, BigCommerce, Salesforce Commerce, custom, etc." },
    hasProductVariants: { type: "boolean", description: "Whether products have size/color/variant selectors" },
    hasWishlist: { type: "boolean", description: "Whether the site has a wishlist or save-for-later feature" },
    hasStoreLocator: { type: "boolean", description: "Whether the site has a physical store locator" },
    hasApi: { type: "boolean", description: "Whether the merchant has a public API for product data or ordering" },
    hasMcp: { type: "boolean", description: "Whether the merchant has an MCP (Model Context Protocol) server or AI agent integration" },
    tips: { type: "array", items: { type: "string" }, description: "3-5 practical tips for an AI shopping agent buying from this site" },
  },
  required: [
    "hasGuestCheckout", "hasSearchBar", "paymentMethods", "hasCartPage",
    "hasCaptcha", "hasPromoCodeField", "platformTech", "hasProductVariants", "tips",
  ],
};

export async function auditSite(domain: string): Promise<SiteAudit | null> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    console.warn(`[audit] skipped for ${domain}: PERPLEXITY_API_KEY not set`);
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
              content: "You are a technical e-commerce analyst. Analyze websites for AI shopping agent compatibility. Return factual, precise structured data based on what you know about the site.",
            },
            {
              role: "user",
              content: `Analyze ${domain} as an e-commerce website. Extract technical details about:\n- Checkout flow (guest checkout? what payment methods? promo code field?)\n- Search capabilities (search bar? URL pattern?)\n- Platform technology\n- Shipping policies (free shipping threshold? delivery times?)\n- Bot-friendliness (CAPTCHA? API? MCP?)\n- Product features (variants? wishlist?)\n- 3-5 practical tips for an AI agent shopping on this site\n\nCapabilities to check for: ${VALID_CAPABILITIES.join(", ")}`,
            },
          ],
          search_domain_filter: [domain],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "site_audit",
              schema: AUDIT_SCHEMA,
            },
          },
        }),
      });
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) {
      console.warn(`[audit] failed for ${domain}: HTTP ${res.status}`);
      return null;
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      console.warn(`[audit] failed for ${domain}: empty response`);
      return null;
    }

    const parsed = JSON.parse(content);

    return {
      hasGuestCheckout: parsed.hasGuestCheckout ?? false,
      hasSearchBar: parsed.hasSearchBar ?? false,
      searchUrlPattern: parsed.searchUrlPattern || null,
      hasJsonLd: parsed.hasJsonLd ?? false,
      hasOpenGraph: parsed.hasOpenGraph ?? false,
      paymentMethods: Array.isArray(parsed.paymentMethods) ? parsed.paymentMethods : [],
      checkoutProviders: Array.isArray(parsed.checkoutProviders) ? parsed.checkoutProviders : [],
      hasCartPage: parsed.hasCartPage ?? true,
      hasCaptcha: parsed.hasCaptcha ?? false,
      hasPromoCodeField: parsed.hasPromoCodeField ?? false,
      freeShippingThreshold: typeof parsed.freeShippingThreshold === "number" ? parsed.freeShippingThreshold : null,
      estimatedDeliveryDays: parsed.estimatedDeliveryDays || null,
      platformTech: parsed.platformTech || null,
      hasProductVariants: parsed.hasProductVariants ?? false,
      hasWishlist: parsed.hasWishlist ?? false,
      hasStoreLocator: parsed.hasStoreLocator ?? false,
      hasApi: parsed.hasApi ?? false,
      hasMcp: parsed.hasMcp ?? false,
      tips: Array.isArray(parsed.tips) ? parsed.tips : [],
    };
  } catch (err) {
    console.warn(`[audit] failed for ${domain}:`, err instanceof Error ? err.message : err);
    return null;
  }
}
