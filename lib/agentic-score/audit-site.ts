import type { EvidenceMap } from "./rubric";

const PERPLEXITY_TIMEOUT_MS = 30_000;

export interface SiteAudit {
  jsonLdPresent: boolean;
  jsonLdTypes: string[];
  hasOpenGraph: boolean;
  sitemapPresent: boolean;
  sitemapValidXml: boolean;
  sitemapHasProducts: boolean;
  sitemapIsIndex: boolean;
  robotsAllowsCrawl: boolean | null;
  robotsBlocksAi: boolean;
  robotsHasSitemap: boolean;
  hasLlmTxt: boolean;
  hasAiPlugin: boolean;
  hasOpenApiDocs: boolean;
  hasMcpEndpoint: boolean;
  hasPublicApi: boolean;
  hasAgenticProtocol: boolean;
  hasSearchBar: boolean;
  searchUrlPattern: string | null;
  hasSearchAutocomplete: boolean;
  pageLoadSpeed: "fast" | "moderate" | "slow" | "unknown";
  hasGuestCheckout: boolean;
  checkoutAccessible: boolean;
  hasPromoCodeField: boolean;
  paymentMethods: string[];
  checkoutProviders: string[];
  hasCartPage: boolean;
  hasCaptchaBarrier: boolean;
  hasProductVariants: boolean;
  hasStructuredPricing: boolean;
  hasClearAddToCart: boolean;
  hasProductIdInUrl: boolean;
  hasQuantitySelector: boolean;
  hasAddressForm: boolean;
  freeShippingThreshold: number | null;
  estimatedDeliveryDays: string | null;
  hasShippingOptions: boolean;
  hasLoyaltyProgram: boolean;
  platformTech: string | null;
  hasWishlist: boolean;
  hasStoreLocator: boolean;
  hasApi: boolean;
  hasMcp: boolean;
  tips: string[];
}

const AUDIT_SCHEMA = {
  type: "object" as const,
  properties: {
    jsonLdPresent: { type: "boolean", description: "Whether the site uses JSON-LD structured data (application/ld+json) on its pages" },
    jsonLdTypes: { type: "array", items: { type: "string" }, description: "JSON-LD schema types used (e.g. Product, Offer, Organization, BreadcrumbList, WebSite)" },
    hasOpenGraph: { type: "boolean", description: "Whether the site uses Open Graph meta tags for commerce (og:product, og:price)" },
    sitemapPresent: { type: "boolean", description: "Whether sitemap.xml is available" },
    sitemapValidXml: { type: "boolean", description: "Whether the sitemap is well-formed valid XML (not an error page or empty)" },
    sitemapHasProducts: { type: "boolean", description: "Whether the sitemap contains product page URLs" },
    sitemapIsIndex: { type: "boolean", description: "Whether the sitemap is a multi-sitemap index (sitemapindex)" },
    robotsAllowsCrawl: { type: "boolean", description: "Whether robots.txt allows general crawling (User-agent: * without Disallow: /). null if no robots.txt" },
    robotsBlocksAi: { type: "boolean", description: "Whether robots.txt specifically blocks AI bots (GPTBot, ClaudeBot, etc.)" },
    robotsHasSitemap: { type: "boolean", description: "Whether robots.txt references the sitemap URL" },
    hasLlmTxt: { type: "boolean", description: "Whether the site publishes an llms.txt or llms-full.txt file with AI instructions" },
    hasAiPlugin: { type: "boolean", description: "Whether the site has .well-known/ai-plugin.json (OpenAI plugin manifest)" },
    hasOpenApiDocs: { type: "boolean", description: "Whether the site publishes OpenAPI/Swagger API documentation" },
    hasMcpEndpoint: { type: "boolean", description: "Whether the site has an MCP (Model Context Protocol) server or .well-known/mcp.json" },
    hasPublicApi: { type: "boolean", description: "Whether the merchant has a public API for product data, search, or ordering" },
    hasAgenticProtocol: { type: "boolean", description: "Whether the site supports agentic commerce protocols (x402, ACP, Agent-to-Agent)" },
    hasSearchBar: { type: "boolean", description: "Whether the site has a search functionality" },
    searchUrlPattern: { type: "string", description: "URL pattern for search, e.g. /search?q={query} or /s?k={query}. Empty string if unknown" },
    hasSearchAutocomplete: { type: "boolean", description: "Whether search has autocomplete/typeahead/instant results" },
    pageLoadSpeed: { type: "string", enum: ["fast", "moderate", "slow", "unknown"], description: "General page load speed reputation: fast (<2s), moderate (2-4s), slow (>4s)" },
    hasGuestCheckout: { type: "boolean", description: "Whether checkout is available without creating an account" },
    checkoutAccessible: { type: "boolean", description: "Whether the checkout flow is accessible without login walls or mandatory registration" },
    hasPromoCodeField: { type: "boolean", description: "Whether checkout has a promo/coupon/discount code field" },
    paymentMethods: { type: "array", items: { type: "string" }, description: "Accepted payment methods (visa, mastercard, paypal, apple_pay, google_pay, amex, klarna, afterpay, etc.)" },
    checkoutProviders: { type: "array", items: { type: "string" }, description: "Checkout/payment providers used (Shopify Checkout, Stripe, PayPal, Bolt, etc.)" },
    hasCartPage: { type: "boolean", description: "Whether there is a predictable cart/basket page URL" },
    hasCaptchaBarrier: { type: "boolean", description: "Whether the site uses aggressive CAPTCHA or bot challenges on main shopping/checkout pages" },
    hasProductVariants: { type: "boolean", description: "Whether products have standard variant selectors (size, color, options)" },
    hasStructuredPricing: { type: "boolean", description: "Whether product pages have machine-readable pricing (JSON-LD Offer, microdata, clearly tagged price)" },
    hasClearAddToCart: { type: "boolean", description: "Whether there is a clear single-action add-to-cart button (not hidden behind modals)" },
    hasProductIdInUrl: { type: "boolean", description: "Whether product URLs contain identifiable product IDs or SKUs" },
    hasQuantitySelector: { type: "boolean", description: "Whether products/cart have quantity selection" },
    hasAddressForm: { type: "boolean", description: "Whether checkout has a shipping/delivery address form" },
    freeShippingThreshold: { type: "number", description: "Minimum order in USD for free shipping. 0 if always free. -1 if no free shipping" },
    estimatedDeliveryDays: { type: "string", description: "Typical delivery timeframe, e.g. '3-5 business days'" },
    hasShippingOptions: { type: "boolean", description: "Whether multiple shipping options are available (standard, express, etc.)" },
    hasLoyaltyProgram: { type: "boolean", description: "Whether the site has a loyalty, rewards, or membership program" },
    platformTech: { type: "string", description: "E-commerce platform: Shopify, Magento, WooCommerce, BigCommerce, Salesforce Commerce, custom, etc." },
    hasWishlist: { type: "boolean", description: "Whether the site has a wishlist or save-for-later feature" },
    hasStoreLocator: { type: "boolean", description: "Whether the site has a physical store locator" },
    hasApi: { type: "boolean", description: "Whether the merchant has any public API" },
    hasMcp: { type: "boolean", description: "Whether the merchant has MCP or AI agent integration" },
    tips: { type: "array", items: { type: "string" }, description: "3-5 practical tips for an AI shopping agent buying from this site" },
  },
  required: [
    "jsonLdPresent", "jsonLdTypes", "sitemapPresent", "sitemapValidXml", "robotsAllowsCrawl",
    "hasSearchBar", "hasGuestCheckout", "paymentMethods", "hasCartPage",
    "hasCaptchaBarrier", "hasProductVariants", "platformTech", "tips",
    "hasStructuredPricing", "hasClearAddToCart", "hasProductIdInUrl",
    "pageLoadSpeed", "hasLlmTxt", "hasAiPlugin", "hasMcpEndpoint",
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
              content: "You are a technical e-commerce analyst specializing in AI agent compatibility. Analyze websites and return precise, factual structured data about their technical capabilities for AI shopping agents. Focus on what you can verify from your knowledge of the site.",
            },
            {
              role: "user",
              content: `Analyze the e-commerce website at ${domain} for AI shopping agent compatibility. Evaluate:\n\n1. STRUCTURED DATA: JSON-LD schema types used, Open Graph commerce tags\n2. SITEMAP & CRAWLING: sitemap.xml availability, robots.txt policy, AI bot blocking\n3. AGENT METADATA: llms.txt, .well-known/ai-plugin.json, MCP endpoint, OpenAPI docs\n4. SEARCH: search functionality, URL pattern, autocomplete\n5. CHECKOUT: guest checkout, payment methods, promo codes, shipping options\n6. PRODUCT PAGES: variant selectors, structured pricing, add-to-cart clarity, product IDs in URLs\n7. BOT FRIENDLINESS: CAPTCHA barriers, API availability\n8. PLATFORM: e-commerce platform technology\n9. 3-5 practical tips for an AI agent shopping on this site`,
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

    const p = JSON.parse(content);

    return {
      jsonLdPresent: p.jsonLdPresent ?? false,
      jsonLdTypes: Array.isArray(p.jsonLdTypes) ? p.jsonLdTypes : [],
      hasOpenGraph: p.hasOpenGraph ?? false,
      sitemapPresent: p.sitemapPresent ?? false,
      sitemapHasProducts: p.sitemapHasProducts ?? false,
      sitemapIsIndex: p.sitemapIsIndex ?? false,
      robotsAllowsCrawl: p.robotsAllowsCrawl ?? null,
      robotsBlocksAi: p.robotsBlocksAi ?? false,
      robotsHasSitemap: p.robotsHasSitemap ?? false,
      hasLlmTxt: p.hasLlmTxt ?? false,
      hasAiPlugin: p.hasAiPlugin ?? false,
      hasOpenApiDocs: p.hasOpenApiDocs ?? false,
      hasMcpEndpoint: p.hasMcpEndpoint ?? false,
      hasPublicApi: p.hasPublicApi ?? false,
      hasAgenticProtocol: p.hasAgenticProtocol ?? false,
      hasSearchBar: p.hasSearchBar ?? false,
      searchUrlPattern: p.searchUrlPattern || null,
      hasSearchAutocomplete: p.hasSearchAutocomplete ?? false,
      pageLoadSpeed: ["fast", "moderate", "slow"].includes(p.pageLoadSpeed) ? p.pageLoadSpeed : "unknown",
      hasGuestCheckout: p.hasGuestCheckout ?? false,
      checkoutAccessible: p.checkoutAccessible ?? false,
      hasPromoCodeField: p.hasPromoCodeField ?? false,
      paymentMethods: Array.isArray(p.paymentMethods) ? p.paymentMethods : [],
      checkoutProviders: Array.isArray(p.checkoutProviders) ? p.checkoutProviders : [],
      hasCartPage: p.hasCartPage ?? true,
      hasCaptchaBarrier: p.hasCaptchaBarrier ?? false,
      hasProductVariants: p.hasProductVariants ?? false,
      hasStructuredPricing: p.hasStructuredPricing ?? false,
      hasClearAddToCart: p.hasClearAddToCart ?? false,
      hasProductIdInUrl: p.hasProductIdInUrl ?? false,
      hasQuantitySelector: p.hasQuantitySelector ?? false,
      hasAddressForm: p.hasAddressForm ?? false,
      freeShippingThreshold: typeof p.freeShippingThreshold === "number" ? p.freeShippingThreshold : null,
      estimatedDeliveryDays: p.estimatedDeliveryDays || null,
      hasShippingOptions: p.hasShippingOptions ?? false,
      hasLoyaltyProgram: p.hasLoyaltyProgram ?? false,
      platformTech: p.platformTech || null,
      hasWishlist: p.hasWishlist ?? false,
      hasStoreLocator: p.hasStoreLocator ?? false,
      hasApi: p.hasApi ?? false,
      hasMcp: p.hasMcp ?? false,
      tips: Array.isArray(p.tips) ? p.tips : [],
    };
  } catch (err) {
    console.warn(`[audit] failed for ${domain}:`, err instanceof Error ? err.message : err);
    return null;
  }
}

export function auditToEvidence(audit: SiteAudit): EvidenceMap {
  const types = audit.jsonLdTypes.map(t => t.toLowerCase());

  const evidence: EvidenceMap = {
    jsonLdPresent: audit.jsonLdPresent,
    jsonLdHasProduct: types.some(t => t.includes("product")),
    jsonLdHasOffer: types.some(t => t.includes("offer")),
    jsonLdHasOrg: types.some(t => t.includes("organization") || t.includes("localbusiness")),
    jsonLdHasBreadcrumb: types.some(t => t.includes("breadcrumb")),
    jsonLdHasWebSite: types.some(t => t.includes("website")),
    ogCommerceTags: audit.hasOpenGraph,

    sitemapPresent: audit.sitemapPresent,
    sitemapValidXml: audit.sitemapValidXml,
    sitemapHasProducts: audit.sitemapHasProducts,
    sitemapIsIndex: audit.sitemapIsIndex,
    robotsHasSitemap: audit.robotsHasSitemap,

    hasLlmTxt: audit.hasLlmTxt,
    hasAiPlugin: audit.hasAiPlugin,
    hasOpenApiDocs: audit.hasOpenApiDocs,
    hasAgentMeta: audit.hasLlmTxt || audit.hasAiPlugin,

    mcpEndpoint: audit.hasMcpEndpoint,
    publicApi: audit.hasPublicApi,
    agenticProtocol: audit.hasAgenticProtocol,

    searchPresent: audit.hasSearchBar,
    searchUrlPattern: audit.searchUrlPattern ? true : false,
    searchAutocomplete: audit.hasSearchAutocomplete,

    pageLoadFast: audit.pageLoadSpeed === "fast",
    pageLoadModerate: audit.pageLoadSpeed === "moderate",
    pageLoadSlow: audit.pageLoadSpeed === "slow",

    productPricingStructured: audit.hasStructuredPricing,
    productVariantStandard: audit.hasProductVariants,
    productAddToCartClear: audit.hasClearAddToCart,
    productIdInUrl: audit.hasProductIdInUrl,

    guestCheckout: audit.hasGuestCheckout,
    checkoutAccessible: audit.checkoutAccessible,
    shoppingActions: audit.hasClearAddToCart,
    accountOptional: audit.hasGuestCheckout,

    programmaticCheckout: audit.hasMcpEndpoint || audit.hasAgenticProtocol,
    variantSelectors: audit.hasProductVariants,
    addToCartAction: audit.hasClearAddToCart,
    predictableCartUrl: audit.hasCartPage,
    quantityInput: audit.hasQuantitySelector,
    addressSection: audit.hasAddressForm,

    discountField: audit.hasPromoCodeField,
    paymentMethodsKnown: audit.paymentMethods.length > 0,
    shippingOptions: audit.hasShippingOptions,
    loyaltyProgram: audit.hasLoyaltyProgram,

    robotsAllowsCrawl: audit.robotsAllowsCrawl === true,
    robotsSelective: audit.robotsAllowsCrawl === null ? false : !audit.robotsAllowsCrawl && !audit.robotsBlocksAi,
    robotsBlocksAi: audit.robotsBlocksAi,
    robotsBlocksAll: audit.robotsAllowsCrawl === false && !audit.robotsBlocksAi,
    noCaptchaBarrier: !audit.hasCaptchaBarrier,
  };

  return evidence;
}
