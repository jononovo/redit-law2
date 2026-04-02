import type { SignalKey } from "./types";

export const RUBRIC_VERSION = "1.0.0";

export type EvidenceSource = "detect" | "agent" | "either";

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
  id: "clarity" | "speed" | "reliability";
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
      max: 40,
      signals: [
        {
          id: "json_ld",
          label: "JSON-LD / Structured Data",
          max: 20,
          criteria: [
            { id: "jld_present",      points: 6, evidence: "jsonLdPresent",       source: "detect",  condition: "JSON-LD script blocks found on page" },
            { id: "jld_product",      points: 5, evidence: "jsonLdHasProduct",    source: "detect",  condition: "Product schema type detected in JSON-LD" },
            { id: "jld_offer",        points: 3, evidence: "jsonLdHasOffer",      source: "detect",  condition: "Offer / pricing data in JSON-LD" },
            { id: "jld_organization", points: 2, evidence: "jsonLdHasOrg",        source: "detect",  condition: "Organization or LocalBusiness schema detected" },
            { id: "jld_breadcrumb",   points: 1, evidence: "jsonLdHasBreadcrumb", source: "detect",  condition: "BreadcrumbList schema detected" },
            { id: "jld_website",      points: 1, evidence: "jsonLdHasWebSite",    source: "detect",  condition: "WebSite schema detected" },
            { id: "jld_og_commerce",  points: 2, evidence: "ogCommerceTags",      source: "detect",  condition: "Open Graph commerce meta tags (og:product, og:price) found" },
          ],
        },
        {
          id: "product_feed",
          label: "Product Feed / Sitemap",
          max: 10,
          criteria: [
            { id: "pf_sitemap_present",  points: 3, evidence: "sitemapPresent",      source: "detect", condition: "sitemap.xml found and accessible" },
            { id: "pf_valid_xml",        points: 2, evidence: "sitemapValidXml",     source: "detect", condition: "Sitemap has valid XML structure (urlset or sitemapindex)" },
            { id: "pf_product_urls",     points: 3, evidence: "sitemapHasProducts", source: "detect", condition: "Product page URLs detected in sitemap (/products/, /p/, /shop/, /catalog)" },
            { id: "pf_sitemap_index",    points: 1, evidence: "sitemapIsIndex",      source: "detect", condition: "Multi-sitemap index found (sitemapindex element)" },
            { id: "pf_robots_reference", points: 1, evidence: "robotsHasSitemap",   source: "detect", condition: "Sitemap URL referenced in robots.txt" },
          ],
        },
        {
          id: "clean_html",
          label: "Clean HTML / Semantic Markup",
          max: 10,
          criteria: [
            { id: "ch_semantic_strong",  points: 4, evidence: "semanticTagsStrong",  source: "detect", condition: "4+ semantic HTML5 landmark elements (header, nav, main, article, section, aside, footer)", group: "ch_semantic" },
            { id: "ch_semantic_partial", points: 2, evidence: "semanticTagsPartial", source: "detect", condition: "2-3 semantic HTML5 landmark elements", group: "ch_semantic" },
            { id: "ch_headings_good",    points: 2, evidence: "headingHierarchy",    source: "detect", condition: "H1 present with 3+ total headings (good hierarchy)", group: "ch_headings" },
            { id: "ch_headings_partial", points: 1, evidence: "headingsPresent",     source: "detect", condition: "At least one heading tag present", group: "ch_headings" },
            { id: "ch_aria_good",        points: 2, evidence: "ariaMarkupStrong",    source: "detect", condition: "5+ ARIA attributes (roles + aria-labels)", group: "ch_aria" },
            { id: "ch_aria_partial",     points: 1, evidence: "ariaMarkupPartial",   source: "detect", condition: "1-4 ARIA attributes present", group: "ch_aria" },
            { id: "ch_alt_good",         points: 2, evidence: "imgAltTextStrong",    source: "detect", condition: "80%+ of images have meaningful alt text", group: "ch_alt" },
            { id: "ch_alt_partial",      points: 1, evidence: "imgAltTextPartial",   source: "detect", condition: "50-79% of images have alt text", group: "ch_alt" },
          ],
        },
      ],
    },

    {
      id: "speed",
      label: "Speed",
      max: 25,
      signals: [
        {
          id: "search_api",
          label: "Search API / MCP",
          max: 10,
          criteria: [
            { id: "sa_mcp",      points: 4, evidence: "mcpEndpoint",      source: "either", condition: "MCP endpoint, .well-known/mcp.json, or AI plugin manifest detected" },
            { id: "sa_api",      points: 3, evidence: "publicApi",        source: "either", condition: "Versioned API (/api/v*), OpenAPI/Swagger docs, or GraphQL endpoint detected" },
            { id: "sa_protocol", points: 3, evidence: "agenticProtocol",  source: "either", condition: "Agentic commerce protocol detected (x402, ACP, A2A)" },
          ],
        },
        {
          id: "site_search",
          label: "Internal Site Search",
          max: 10,
          criteria: [
            { id: "ss_search_form",   points: 4, evidence: "searchFormPresent",    source: "detect",  condition: "Search form or search input field detected on homepage" },
            { id: "ss_search_action",  points: 2, evidence: "searchActionUrl",     source: "detect",  condition: "Search form has a parseable action URL (e.g. /search?q=)" },
            { id: "ss_opensearch",     points: 2, evidence: "opensearchPresent",   source: "detect",  condition: "OpenSearch description XML linked", group: "ss_search_meta" },
            { id: "ss_search_link",    points: 1, evidence: "searchLinkRel",       source: "detect",  condition: "Search link relation (rel=search) present", group: "ss_search_meta" },
            { id: "ss_autocomplete",   points: 2, evidence: "searchAutocomplete",  source: "detect",  condition: "Autocomplete, autosuggest, or typeahead capability detected" },
          ],
        },
        {
          id: "page_load",
          label: "Page Load Performance",
          max: 5,
          criteria: [
            { id: "pl_excellent", points: 5, evidence: "pageLoadExcellent", source: "detect", condition: "Page load time ≤ 1,000ms",  group: "pl_time" },
            { id: "pl_good",      points: 4, evidence: "pageLoadGood",      source: "detect", condition: "Page load time 1,001–1,500ms", group: "pl_time" },
            { id: "pl_ok",        points: 3, evidence: "pageLoadOk",        source: "detect", condition: "Page load time 1,501–2,000ms", group: "pl_time" },
            { id: "pl_slow",      points: 2, evidence: "pageLoadSlow",      source: "detect", condition: "Page load time 2,001–3,000ms", group: "pl_time" },
            { id: "pl_very_slow", points: 1, evidence: "pageLoadVerySlow",  source: "detect", condition: "Page load time 3,001–5,000ms", group: "pl_time" },
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
            { id: "aa_guest_checkout",   points: 5, evidence: "guestCheckout",    source: "either", condition: "Guest checkout available (no account required to purchase)" },
            { id: "aa_checkout_links",   points: 2, evidence: "checkoutLinks",    source: "detect",  condition: "Direct checkout or cart links found on homepage" },
            { id: "aa_shopping_actions", points: 2, evidence: "shoppingActions",  source: "detect",  condition: "Add-to-cart or buy-now actions visible on homepage", excludedBy: "guestCheckout" },
            { id: "aa_guest_inferred",   points: 1, evidence: "guestInferred",    source: "detect",  condition: "Both sign-in and cart options present (guest checkout likely)", excludedBy: "guestCheckout" },
          ],
        },
        {
          id: "order_management",
          label: "Order Management",
          max: 10,
          criteria: [
            { id: "om_programmatic", points: 10, evidence: "programmaticCheckout", source: "either",  condition: "MCP or agentic commerce protocol enables programmatic ordering", override: true },
            { id: "om_variants",     points: 3,  evidence: "variantSelectors",     source: "either",  condition: "Product variant selectors found (size, color, options)" },
            { id: "om_cart_action",  points: 2,  evidence: "addToCartAction",      source: "either",  condition: "Add-to-cart or buy-now button/action detected" },
            { id: "om_cart_url",     points: 2,  evidence: "predictableCartUrl",   source: "detect",  condition: "Predictable cart/basket URL structure (/cart or /basket)" },
            { id: "om_quantity",     points: 1,  evidence: "quantityInput",        source: "either",  condition: "Quantity input field detected on product or cart page" },
            { id: "om_address",      points: 2,  evidence: "addressSection",       source: "either",  condition: "Shipping/delivery address form section found" },
          ],
        },
        {
          id: "checkout_flow",
          label: "Checkout Flow",
          max: 10,
          criteria: [
            { id: "cf_programmatic",     points: 10, evidence: "programmaticCheckout", source: "either",  condition: "MCP or agentic commerce protocol enables programmatic checkout", override: true },
            { id: "cf_discount",         points: 2,  evidence: "discountField",        source: "either",  condition: "Promo code, coupon, or discount field available" },
            { id: "cf_payment_methods",  points: 3,  evidence: "paymentMethodsLabeled", source: "either", condition: "Payment methods clearly labeled (Visa, PayPal, Apple Pay, etc.)", group: "cf_payment" },
            { id: "cf_payment_icons",    points: 2,  evidence: "paymentIcons",          source: "detect", condition: "Payment method icons/images present", group: "cf_payment" },
            { id: "cf_shipping",         points: 3,  evidence: "shippingOptions",       source: "either",  condition: "Shipping or delivery options described with methods/timeframes" },
            { id: "cf_loyalty",          points: 2,  evidence: "loyaltyProgram",        source: "either",  condition: "Loyalty, rewards, or membership program mentioned" },
          ],
        },
        {
          id: "bot_tolerance",
          label: "Bot Tolerance",
          max: 5,
          criteria: [
            { id: "bt_no_robots",       points: 2, evidence: "noRobotsTxt",        source: "detect", condition: "No robots.txt found (no explicit blocking)",       group: "bt_robots" },
            { id: "bt_allows_crawling", points: 3, evidence: "robotsAllowsCrawl",  source: "detect", condition: "robots.txt allows general crawling (User-agent: * without Disallow: /)", group: "bt_robots" },
            { id: "bt_selective",       points: 2, evidence: "robotsSelective",    source: "detect", condition: "robots.txt present with selective (partial) rules",  group: "bt_robots" },
            { id: "bt_blocks_ai",       points: 0, evidence: "robotsBlocksAi",     source: "detect", condition: "AI/bot-specific user-agent blocks in robots.txt",   group: "bt_robots" },
            { id: "bt_blocks_all",      points: 0, evidence: "robotsBlocksAll",    source: "detect", condition: "robots.txt disallows all crawling (Disallow: /)",   group: "bt_robots" },
            { id: "bt_crawl_delay",     points: 1, evidence: "reasonableCrawlDelay", source: "detect", condition: "Crawl-delay ≤ 2 seconds" },
            { id: "bt_no_captcha",      points: 1, evidence: "noCaptcha",          source: "detect", condition: "No CAPTCHA or bot challenge detected on homepage" },
            { id: "bt_captcha_penalty", points: -2, evidence: "captchaDetected",   source: "detect", condition: "CAPTCHA or bot challenge (reCAPTCHA, hCaptcha, Cloudflare) detected" },
          ],
        },
      ],
    },
  ],
};
