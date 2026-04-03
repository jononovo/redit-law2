import type { EvidenceMap } from "./rubric";

export function detectAll(
  homepageHtml: string,
  sitemapContent: string | null,
  robotsTxtContent: string | null,
  pageLoadTimeMs: number | null,
): EvidenceMap {
  return {
    ...detectJsonLd(homepageHtml),
    ...detectProductFeed(sitemapContent, robotsTxtContent),
    ...detectCleanHtml(homepageHtml),
    ...detectSearchApi(homepageHtml),
    ...detectSiteSearch(homepageHtml),
    ...detectPageLoad(pageLoadTimeMs),
    ...detectAccessAuth(homepageHtml),
    ...detectOrderManagement(homepageHtml),
    ...detectCheckoutFlow(homepageHtml),
    ...detectBotTolerance(robotsTxtContent, homepageHtml),
  };
}

function detectJsonLd(html: string): EvidenceMap {
  const evidence: EvidenceMap = {};
  const jsonLdBlocks = html.match(/<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];

  if (jsonLdBlocks.length > 0) {
    evidence.jsonLdPresent = true;

    const allTypes: string[] = [];
    for (const block of jsonLdBlocks) {
      const content = block.replace(/<\/?script[^>]*>/gi, "");
      try {
        const parsed = JSON.parse(content);
        const items = Array.isArray(parsed) ? parsed : [parsed];
        for (const item of items) {
          allTypes.push(...extractJsonLdTypes(item));
        }
      } catch {
        // invalid JSON in block
      }
    }

    evidence.jsonLdHasProduct = allTypes.some(t => /product/i.test(t));
    evidence.jsonLdHasOffer = allTypes.some(t => /offer/i.test(t));
    evidence.jsonLdHasOrg = allTypes.some(t => /organization|localbusiness/i.test(t));
    evidence.jsonLdHasBreadcrumb = allTypes.some(t => /breadcrumb/i.test(t));
    evidence.jsonLdHasWebSite = allTypes.some(t => /website/i.test(t));
  }

  const ogTags = html.match(/<meta[^>]*property\s*=\s*["']og:(product|type|price)[^"']*["'][^>]*>/gi) || [];
  evidence.ogCommerceTags = ogTags.length > 0;

  return evidence;
}

function extractJsonLdTypes(obj: unknown): string[] {
  if (!obj || typeof obj !== "object") return [];
  const record = obj as Record<string, unknown>;
  const types: string[] = [];

  if (typeof record["@type"] === "string") types.push(record["@type"]);
  if (Array.isArray(record["@type"])) types.push(...(record["@type"] as string[]));
  if (Array.isArray(record["@graph"])) {
    for (const item of record["@graph"] as unknown[]) {
      types.push(...extractJsonLdTypes(item));
    }
  }

  return types;
}

function detectProductFeed(sitemapContent: string | null, robotsTxtContent: string | null): EvidenceMap {
  const evidence: EvidenceMap = {};

  if (sitemapContent) {
    evidence.sitemapPresent = true;
    evidence.sitemapValidXml = sitemapContent.includes("<urlset") || sitemapContent.includes("<sitemapindex");
    evidence.sitemapHasProducts =
      /\/product[s]?\//i.test(sitemapContent) ||
      /\/p\//i.test(sitemapContent) ||
      /\/item[s]?\//i.test(sitemapContent) ||
      /\/shop\//i.test(sitemapContent) ||
      /\/catalog/i.test(sitemapContent);
    evidence.sitemapIsIndex = sitemapContent.includes("<sitemapindex");
  }

  if (robotsTxtContent) {
    evidence.robotsHasSitemap = /sitemap\s*:/i.test(robotsTxtContent);
  }

  return evidence;
}

function detectCleanHtml(html: string): EvidenceMap {
  const evidence: EvidenceMap = {};
  const lower = html.toLowerCase();

  const semanticTags = ["<header", "<nav", "<main", "<article", "<section", "<aside", "<footer"];
  const semanticCount = semanticTags.filter(tag => lower.includes(tag)).length;
  evidence.semanticTagsStrong = semanticCount >= 4;
  evidence.semanticTagsPartial = semanticCount >= 2 && semanticCount < 4;

  const headings = html.match(/<h[1-6][^>]*>/gi) || [];
  const hasH1 = /<h1[^>]*>/i.test(html);
  evidence.headingHierarchy = hasH1 && headings.length >= 3;
  evidence.headingsPresent = headings.length > 0 && !(hasH1 && headings.length >= 3);

  const ariaRoles = (html.match(/role\s*=\s*["'][^"']+["']/gi) || []).length;
  const ariaLabels = (html.match(/aria-label\s*=\s*["'][^"']+["']/gi) || []).length;
  const ariaTotal = ariaRoles + ariaLabels;
  evidence.ariaMarkupStrong = ariaTotal >= 5;
  evidence.ariaMarkupPartial = ariaTotal > 0 && ariaTotal < 5;

  const imgTags = html.match(/<img[^>]*>/gi) || [];
  if (imgTags.length > 0) {
    const imgWithAlt = imgTags.filter(img => /alt\s*=\s*["'][^"']+["']/i.test(img));
    const altRatio = imgWithAlt.length / imgTags.length;
    evidence.imgAltTextStrong = altRatio >= 0.8;
    evidence.imgAltTextPartial = altRatio >= 0.5 && altRatio < 0.8;
  }

  return evidence;
}

function detectSearchApi(html: string): EvidenceMap {
  const evidence: EvidenceMap = {};

  const mcpPatterns = [
    /\.well-known\/mcp\.json/i,
    /\.well-known\/ai-plugin\.json/i,
    /mcp[_-]?server|mcp[_-]?endpoint/i,
  ];
  evidence.mcpEndpoint = mcpPatterns.some(p => p.test(html));

  const apiPatterns = [
    /\/api\/v[0-9]/i,
    /openapi|swagger/i,
    /graphql/i,
    /developer[s]?\.[\w]+\.com|api\.[\w]+\.com/i,
  ];
  evidence.publicApi = apiPatterns.some(p => p.test(html));

  const protocolPatterns = [
    /x-?402|payment-?required/i,
    /agentic[_-]?commerce[_-]?protocol|\.well-known\/acp/i,
    /a2a[_-]?protocol|agent[_-]?to[_-]?agent/i,
  ];
  evidence.agenticProtocol = protocolPatterns.some(p => p.test(html));

  return evidence;
}

function detectSiteSearch(html: string): EvidenceMap {
  const evidence: EvidenceMap = {};

  const searchForms = html.match(/<form[^>]*(?:search|query|q=)[^>]*>/gi) || [];
  const searchInputs = html.match(/<input[^>]*(?:type\s*=\s*["']search["']|name\s*=\s*["'](?:q|query|search|s|keyword)["'])[^>]*>/gi) || [];
  evidence.searchFormPresent = searchForms.length > 0 || searchInputs.length > 0;

  evidence.searchActionUrl = !!html.match(/<form[^>]*action\s*=\s*["']([^"']*(?:search|query|find)[^"']*)["'][^>]*>/i);

  const opensearch = /<link[^>]*type\s*=\s*["']application\/opensearchdescription\+xml["'][^>]*>/i;
  evidence.opensearchPresent = opensearch.test(html);

  const searchLink = /<link[^>]*rel\s*=\s*["']search["'][^>]*>/i;
  evidence.searchLinkRel = searchLink.test(html) && !opensearch.test(html);

  evidence.searchAutocomplete = /autocomplete|autosuggest|typeahead|instant[_-]?search/i.test(html);

  return evidence;
}

function detectPageLoad(pageLoadTimeMs: number | null): EvidenceMap {
  const evidence: EvidenceMap = {};

  if (pageLoadTimeMs !== null) {
    evidence.pageLoadExcellent = pageLoadTimeMs <= 1000;
    evidence.pageLoadGood = pageLoadTimeMs > 1000 && pageLoadTimeMs <= 1500;
    evidence.pageLoadOk = pageLoadTimeMs > 1500 && pageLoadTimeMs <= 2000;
    evidence.pageLoadSlow = pageLoadTimeMs > 2000 && pageLoadTimeMs <= 3000;
    evidence.pageLoadVerySlow = pageLoadTimeMs > 3000 && pageLoadTimeMs <= 5000;
  }

  return evidence;
}

function detectAccessAuth(html: string): EvidenceMap {
  const evidence: EvidenceMap = {};

  const guestCheckoutIndicators = [
    /guest[_\s-]*checkout/i,
    /checkout[_\s-]*as[_\s-]*guest/i,
    /no[_\s-]*account[_\s-]*(?:needed|required)/i,
    /continue[_\s-]*(?:as[_\s-]*)?guest/i,
    /shop[_\s-]*without[_\s-]*(?:an[_\s-]*)?account/i,
  ];
  evidence.guestCheckout = guestCheckoutIndicators.some(p => p.test(html));

  const checkoutLinks = html.match(/<a[^>]*href\s*=\s*["'][^"']*(?:checkout|cart|basket)[^"']*["'][^>]*>/gi) || [];
  evidence.checkoutLinks = checkoutLinks.length > 0;

  const loginWallIndicators = [
    /(?:must|need\s+to|required\s+to)\s+(?:sign\s+in|log\s+in|create\s+an?\s+account)/i,
    /sign\s+in\s+to\s+(?:continue|proceed|checkout)/i,
  ];
  const hasLoginWall = loginWallIndicators.some(p => p.test(html));

  if (!hasLoginWall && !evidence.guestCheckout && !evidence.checkoutLinks) {
    const hasCart = /add[\s_-]*to[\s_-]*cart|buy[\s_-]*now|shop[\s_-]*now/i.test(html);
    const hasSignIn = /sign[\s_-]*in|log[\s_-]*in|create[\s_-]*account|register/i.test(html);
    evidence.shoppingActions = hasCart;
    evidence.guestInferred = hasSignIn && hasCart;
  }

  return evidence;
}

function detectOrderManagement(html: string): EvidenceMap {
  const evidence: EvidenceMap = {};

  evidence.programmaticCheckout = /mcp|\.well-known\/mcp|agentic[_-]?commerce|programmatic[_-]?checkout/i.test(html);

  const variantPatterns = [
    /select[^>]*(?:size|variant|color|colour|quantity)/i,
    /data-(?:variant|option|size|color)/i,
    /(?:choose|select)\s+(?:a\s+)?(?:size|color|colour|variant|option)/i,
  ];
  evidence.variantSelectors = variantPatterns.some(p => p.test(html));

  evidence.addToCartAction =
    /add[\s_-]*to[\s_-]*cart|add[\s_-]*to[\s_-]*bag|add[\s_-]*to[\s_-]*basket/i.test(html) ||
    /buy[\s_-]*now|buy[\s_-]*it[\s_-]*now/i.test(html);

  const cartUrls = html.match(/href\s*=\s*["'][^"']*\/cart[^"']*["']/gi) || [];
  const basketUrls = html.match(/href\s*=\s*["'][^"']*\/basket[^"']*["']/gi) || [];
  evidence.predictableCartUrl = cartUrls.length > 0 || basketUrls.length > 0;

  evidence.quantityInput = /(?:type\s*=\s*["']number["'][^>]*(?:quantity|qty))|(?:(?:quantity|qty)[^>]*type\s*=\s*["']number["'])/i.test(html);

  evidence.addressSection = /(?:shipping|delivery)\s*(?:address|info)/i.test(html);

  return evidence;
}

function detectCheckoutFlow(html: string): EvidenceMap {
  const evidence: EvidenceMap = {};

  evidence.discountField =
    /(?:promo|coupon|discount|voucher)\s*(?:code|field)?/i.test(html) ||
    /apply[\s_-]*(?:code|coupon|promo|discount)/i.test(html) ||
    /gift[\s_-]*card/i.test(html);

  evidence.paymentMethodsLabeled =
    /(?:visa|mastercard|amex|american\s*express|discover|paypal|apple\s*pay|google\s*pay|shop\s*pay)/i.test(html) ||
    /(?:credit|debit)\s*card/i.test(html) ||
    /payment[\s_-]*(?:method|option)s?/i.test(html);

  const paymentIcons = html.match(/<img[^>]*(?:visa|mastercard|paypal|amex|apple.?pay|google.?pay|shop.?pay)[^>]*>/gi) || [];
  evidence.paymentIcons = paymentIcons.length > 0;

  evidence.shippingOptions =
    /(?:free|flat[\s_-]*rate|standard|express|overnight|next[\s_-]*day)\s*(?:shipping|delivery)/i.test(html) ||
    /shipping[\s_-]*(?:method|option|rate)s?/i.test(html) ||
    /delivery[\s_-]*(?:option|method|time)s?/i.test(html) ||
    /estimated[\s_-]*delivery/i.test(html);

  evidence.loyaltyProgram = /(?:loyalty|reward|member)\s*(?:point|program|benefit)s?/i.test(html);

  return evidence;
}

function detectBotTolerance(robotsTxtContent: string | null, html: string): EvidenceMap {
  const evidence: EvidenceMap = {};

  if (robotsTxtContent === null) {
    evidence.noRobotsTxt = true;
  } else {
    const lines = robotsTxtContent.split("\n").map(l => l.trim().toLowerCase());
    const hasDisallowAll = lines.some(l => l === "disallow: /");
    const userAgentAll = lines.some(l => l === "user-agent: *");

    const botBlockPatterns = /(?:ai|bot|crawler|spider|scraper|gpt|claude|anthropic|openai|chatgpt)/i;
    const hasAgentSpecificBlocks = lines.some(l =>
      l.startsWith("user-agent:") && botBlockPatterns.test(l)
    );

    if (hasAgentSpecificBlocks) {
      evidence.robotsBlocksAi = true;
    } else if (userAgentAll && hasDisallowAll) {
      evidence.robotsBlocksAll = true;
    } else if (userAgentAll && !hasDisallowAll) {
      evidence.robotsAllowsCrawl = true;
    } else {
      evidence.robotsSelective = true;
    }

    const crawlDelay = robotsTxtContent.match(/crawl-delay\s*:\s*(\d+)/i);
    if (crawlDelay) {
      evidence.reasonableCrawlDelay = parseInt(crawlDelay[1]) <= 2;
    }
  }

  const captchaIndicators = [
    /recaptcha|hcaptcha|captcha|cloudflare[\s_-]*challenge/i,
    /cf-challenge|challenge-platform/i,
    /g-recaptcha|h-captcha/i,
  ];
  const hasCaptcha = captchaIndicators.some(p => p.test(html));

  if (hasCaptcha) {
    evidence.captchaDetected = true;
  } else {
    evidence.noCaptcha = true;
  }

  return evidence;
}
