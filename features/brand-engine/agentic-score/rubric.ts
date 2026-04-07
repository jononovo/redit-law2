import type { SignalKey } from "./types";

export const RUBRIC_VERSION = "2.0.0";

export type EvidenceSource = "detect" | "agent" | "either" | "audit";

export interface RubricCriterion {
  id: string;
  points: number;
  evidence: string;
  source: EvidenceSource;
  condition: string;
  group?: string;
  override?: boolean;
  excludedBy?: string;
}

export interface RubricSignal {
  id: SignalKey;
  label: string;
  max: number;
  criteria: RubricCriterion[];
}

export interface RubricPillar {
  id: "clarity" | "discoverability" | "reliability";
  label: string;
  max: number;
  signals: RubricSignal[];
}

export interface ScoringRubric {
  version: string;
  totalPoints: number;
  pillars: RubricPillar[];
}

export type EvidenceMap = Record<string, boolean | number | string | null>;

export const SCORING_RUBRIC: ScoringRubric = {
  version: RUBRIC_VERSION,
  totalPoints: 100,
  pillars: [
    {
      id: "clarity",
      label: "Clarity",
      max: 35,
      signals: [
        {
          id: "json_ld",
          label: "JSON-LD / Structured Data",
          max: 15,
          criteria: [
            { id: "jld_present",      points: 4, evidence: "jsonLdPresent",       source: "audit", condition: "JSON-LD structured data present on the site" },
            { id: "jld_product",      points: 4, evidence: "jsonLdHasProduct",    source: "audit", condition: "Product schema type used in JSON-LD" },
            { id: "jld_offer",        points: 2, evidence: "jsonLdHasOffer",      source: "audit", condition: "Offer / pricing data in JSON-LD" },
            { id: "jld_organization", points: 1, evidence: "jsonLdHasOrg",        source: "audit", condition: "Organization or LocalBusiness schema present" },
            { id: "jld_breadcrumb",   points: 1, evidence: "jsonLdHasBreadcrumb", source: "audit", condition: "BreadcrumbList schema present" },
            { id: "jld_website",      points: 1, evidence: "jsonLdHasWebSite",    source: "audit", condition: "WebSite schema present" },
            { id: "jld_og_commerce",  points: 2, evidence: "ogCommerceTags",      source: "audit", condition: "Open Graph commerce meta tags (og:product, og:price) present" },
          ],
        },
        {
          id: "product_feed",
          label: "Product Feed / Sitemap",
          max: 10,
          criteria: [
            { id: "pf_sitemap_present",  points: 3, evidence: "sitemapPresent",     source: "audit", condition: "sitemap.xml is available" },
            { id: "pf_valid_xml",        points: 2, evidence: "sitemapValidXml",    source: "audit", condition: "Sitemap has valid XML structure" },
            { id: "pf_product_urls",     points: 3, evidence: "sitemapHasProducts", source: "audit", condition: "Product page URLs present in sitemap" },
            { id: "pf_sitemap_index",    points: 1, evidence: "sitemapIsIndex",     source: "audit", condition: "Multi-sitemap index found" },
            { id: "pf_robots_reference", points: 1, evidence: "robotsHasSitemap",  source: "audit", condition: "Sitemap URL referenced in robots.txt" },
          ],
        },
        {
          id: "clean_html",
          label: "Agent Metadata",
          max: 10,
          criteria: [
            { id: "am_llm_txt",       points: 3, evidence: "hasLlmTxt",        source: "audit", condition: "llms.txt or llms-full.txt file available for AI agent instructions" },
            { id: "am_ai_plugin",     points: 3, evidence: "hasAiPlugin",      source: "audit", condition: "AI plugin manifest (.well-known/ai-plugin.json) published" },
            { id: "am_openapi_docs",  points: 2, evidence: "hasOpenApiDocs",   source: "audit", condition: "OpenAPI/Swagger API documentation available" },
            { id: "am_agent_meta",    points: 2, evidence: "hasAgentMeta",     source: "audit", condition: "Agent-specific metadata (robots meta tags for AI, structured agent instructions)" },
          ],
        },
      ],
    },

    {
      id: "discoverability",
      label: "Discoverability",
      max: 30,
      signals: [
        {
          id: "search_api",
          label: "Search API / MCP",
          max: 10,
          criteria: [
            { id: "sa_mcp",      points: 4, evidence: "mcpEndpoint",      source: "audit", condition: "MCP endpoint or .well-known/mcp.json available" },
            { id: "sa_api",      points: 3, evidence: "publicApi",        source: "audit", condition: "Public API for product data or ordering available" },
            { id: "sa_protocol", points: 3, evidence: "agenticProtocol",  source: "audit", condition: "Agentic commerce protocol detected (x402, ACP, A2A)" },
          ],
        },
        {
          id: "site_search",
          label: "Internal Site Search",
          max: 10,
          criteria: [
            { id: "ss_search_present",   points: 4, evidence: "searchPresent",       source: "audit", condition: "Site search functionality available" },
            { id: "ss_search_url",       points: 3, evidence: "searchUrlPattern",    source: "audit", condition: "Predictable search URL pattern (e.g. /search?q={query})" },
            { id: "ss_autocomplete",     points: 3, evidence: "searchAutocomplete",  source: "audit", condition: "Search autocomplete or typeahead available" },
          ],
        },
        {
          id: "page_load",
          label: "Page Load Performance",
          max: 5,
          criteria: [
            { id: "pl_fast",     points: 5, evidence: "pageLoadFast",     source: "audit", condition: "Site known for fast page loads (under 2 seconds)", group: "pl_speed" },
            { id: "pl_moderate", points: 3, evidence: "pageLoadModerate", source: "audit", condition: "Site has moderate page load times (2-4 seconds)", group: "pl_speed" },
            { id: "pl_slow",     points: 1, evidence: "pageLoadSlow",     source: "audit", condition: "Site known for slow page loads (over 4 seconds)", group: "pl_speed" },
          ],
        },
        {
          id: "product_page",
          label: "Product Page Quality",
          max: 5,
          criteria: [
            { id: "pp_structured_pricing", points: 2, evidence: "productPricingStructured", source: "audit", condition: "Machine-readable pricing on product pages" },
            { id: "pp_variant_selectors",  points: 1, evidence: "productVariantStandard",   source: "audit", condition: "Product variants use standard selectors (size, color, options)" },
            { id: "pp_add_to_cart",        points: 1, evidence: "productAddToCartClear",    source: "audit", condition: "Clear, single-action add-to-cart button" },
            { id: "pp_product_url_id",     points: 1, evidence: "productIdInUrl",           source: "audit", condition: "Product identifier visible in URL for direct navigation" },
          ],
        },
      ],
    },

    {
      id: "reliability",
      label: "Reliability",
      max: 35,
      signals: [
        {
          id: "access_auth",
          label: "Access & Authentication",
          max: 10,
          criteria: [
            { id: "aa_guest_checkout",   points: 5, evidence: "guestCheckout",    source: "audit", condition: "Guest checkout available (no account required)" },
            { id: "aa_checkout_links",   points: 2, evidence: "checkoutAccessible", source: "audit", condition: "Checkout flow accessible without login walls" },
            { id: "aa_shopping_actions", points: 2, evidence: "shoppingActions",  source: "audit", condition: "Add-to-cart or buy-now actions available without account", excludedBy: "guestCheckout" },
            { id: "aa_account_optional", points: 1, evidence: "accountOptional",  source: "audit", condition: "Account creation is optional during checkout", excludedBy: "guestCheckout" },
          ],
        },
        {
          id: "order_management",
          label: "Order Management",
          max: 10,
          criteria: [
            { id: "om_programmatic", points: 10, evidence: "programmaticCheckout", source: "audit", condition: "MCP or agentic protocol enables programmatic ordering", override: true },
            { id: "om_variants",     points: 3,  evidence: "variantSelectors",     source: "audit", condition: "Product variant selection available (size, color, options)" },
            { id: "om_cart_action",  points: 2,  evidence: "addToCartAction",      source: "audit", condition: "Add-to-cart or buy-now action available" },
            { id: "om_cart_url",     points: 2,  evidence: "predictableCartUrl",   source: "audit", condition: "Predictable cart URL structure (/cart or /basket)" },
            { id: "om_quantity",     points: 1,  evidence: "quantityInput",        source: "audit", condition: "Quantity selection available on product or cart page" },
            { id: "om_address",      points: 2,  evidence: "addressSection",       source: "audit", condition: "Shipping/delivery address form available at checkout" },
          ],
        },
        {
          id: "checkout_flow",
          label: "Checkout Flow",
          max: 10,
          criteria: [
            { id: "cf_programmatic",     points: 10, evidence: "programmaticCheckout", source: "audit", condition: "MCP or agentic protocol enables programmatic checkout", override: true },
            { id: "cf_discount",         points: 2,  evidence: "discountField",        source: "audit", condition: "Promo code, coupon, or discount field available" },
            { id: "cf_payment_methods",  points: 3,  evidence: "paymentMethodsKnown",  source: "audit", condition: "Payment methods clearly documented (Visa, PayPal, Apple Pay, etc.)" },
            { id: "cf_shipping",         points: 3,  evidence: "shippingOptions",       source: "audit", condition: "Shipping options available with estimated timeframes" },
            { id: "cf_loyalty",          points: 2,  evidence: "loyaltyProgram",        source: "audit", condition: "Loyalty, rewards, or membership program available" },
          ],
        },
        {
          id: "bot_tolerance",
          label: "Bot Tolerance",
          max: 5,
          criteria: [
            { id: "bt_allows_crawling", points: 3, evidence: "robotsAllowsCrawl",  source: "audit", condition: "robots.txt allows general crawling", group: "bt_robots" },
            { id: "bt_selective",       points: 2, evidence: "robotsSelective",    source: "audit", condition: "robots.txt present with selective rules (not fully open, not fully blocked)", group: "bt_robots" },
            { id: "bt_blocks_ai",       points: 0, evidence: "robotsBlocksAi",     source: "audit", condition: "AI/bot-specific blocks in robots.txt", group: "bt_robots" },
            { id: "bt_blocks_all",      points: 0, evidence: "robotsBlocksAll",    source: "audit", condition: "robots.txt disallows all crawling", group: "bt_robots" },
            { id: "bt_no_captcha",      points: 2, evidence: "noCaptchaBarrier",   source: "audit", condition: "No aggressive CAPTCHA or bot challenge on main pages" },
          ],
        },
      ],
    },
  ],
};
