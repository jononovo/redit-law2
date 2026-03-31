import type { SignalScore } from "../types";

export function scoreJsonLd(html: string): SignalScore {
  const MAX = 20;
  let score = 0;
  const findings: string[] = [];

  const jsonLdBlocks = html.match(/<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];

  if (jsonLdBlocks.length > 0) {
    score += 6;
    findings.push(`${jsonLdBlocks.length} JSON-LD block(s) found`);

    let hasProduct = false;
    let hasOrganization = false;
    let hasBreadcrumb = false;
    let hasOffer = false;
    let hasWebSite = false;

    for (const block of jsonLdBlocks) {
      const content = block.replace(/<\/?script[^>]*>/gi, "");
      try {
        const parsed = JSON.parse(content);
        const items = Array.isArray(parsed) ? parsed : [parsed];

        for (const item of items) {
          const types = extractTypes(item);
          if (types.some(t => /product/i.test(t))) hasProduct = true;
          if (types.some(t => /organization|localbusiness/i.test(t))) hasOrganization = true;
          if (types.some(t => /breadcrumb/i.test(t))) hasBreadcrumb = true;
          if (types.some(t => /offer/i.test(t))) hasOffer = true;
          if (types.some(t => /website/i.test(t))) hasWebSite = true;
        }
      } catch {
        findings.push("JSON-LD block present but contains invalid JSON");
      }
    }

    if (hasProduct) { score += 5; findings.push("Product schema detected"); }
    if (hasOffer) { score += 3; findings.push("Offer/pricing data in schema"); }
    if (hasOrganization) { score += 2; findings.push("Organization schema detected"); }
    if (hasBreadcrumb) { score += 1; findings.push("BreadcrumbList schema detected"); }
    if (hasWebSite) { score += 1; findings.push("WebSite schema detected"); }
  }

  const ogTags = html.match(/<meta[^>]*property\s*=\s*["']og:(product|type|price)[^"']*["'][^>]*>/gi) || [];
  if (ogTags.length > 0) {
    score += 2;
    findings.push(`${ogTags.length} Open Graph commerce tag(s) found`);
  }

  if (findings.length === 0) {
    findings.push("No JSON-LD structured data or Open Graph commerce tags found");
  }

  return {
    key: "json_ld",
    label: "JSON-LD / Structured Data",
    score: Math.min(score, MAX),
    max: MAX,
    detail: findings.join(". "),
  };
}

function extractTypes(obj: unknown): string[] {
  if (!obj || typeof obj !== "object") return [];
  const record = obj as Record<string, unknown>;
  const types: string[] = [];

  if (typeof record["@type"] === "string") types.push(record["@type"]);
  if (Array.isArray(record["@type"])) types.push(...(record["@type"] as string[]));

  if (Array.isArray(record["@graph"])) {
    for (const item of record["@graph"] as unknown[]) {
      types.push(...extractTypes(item));
    }
  }

  return types;
}

export function scoreProductFeed(sitemapContent: string | null, robotsTxtContent: string | null): SignalScore {
  const MAX = 10;
  let score = 0;
  const findings: string[] = [];

  if (sitemapContent) {
    score += 3;
    findings.push("sitemap.xml found");

    const isValidXml = sitemapContent.includes("<urlset") || sitemapContent.includes("<sitemapindex");
    if (isValidXml) {
      score += 2;
      findings.push("Valid XML sitemap structure");
    }

    const urlCount = (sitemapContent.match(/<loc>/gi) || []).length;
    if (urlCount > 0) {
      findings.push(`${urlCount} URL(s) in sitemap`);
    }

    const hasProductUrls = /\/product[s]?\//i.test(sitemapContent) ||
      /\/p\//i.test(sitemapContent) ||
      /\/item[s]?\//i.test(sitemapContent) ||
      /\/shop\//i.test(sitemapContent) ||
      /\/catalog/i.test(sitemapContent);
    if (hasProductUrls) {
      score += 3;
      findings.push("Product URLs detected in sitemap");
    }

    if (sitemapContent.includes("<sitemapindex")) {
      score += 1;
      findings.push("Sitemap index found (multi-sitemap)");
    }
  } else {
    findings.push("No sitemap.xml found");
  }

  if (robotsTxtContent && /sitemap\s*:/i.test(robotsTxtContent)) {
    score += 1;
    findings.push("Sitemap referenced in robots.txt");
  }

  return {
    key: "product_feed",
    label: "Product Feed / Sitemap",
    score: Math.min(score, MAX),
    max: MAX,
    detail: findings.join(". "),
  };
}

export function scoreCleanHtml(html: string): SignalScore {
  const MAX = 10;
  let score = 0;
  const findings: string[] = [];

  const semanticTags = ["<header", "<nav", "<main", "<article", "<section", "<aside", "<footer"];
  const foundSemantic = semanticTags.filter(tag => html.toLowerCase().includes(tag));
  if (foundSemantic.length >= 4) {
    score += 4;
    findings.push(`Strong semantic structure (${foundSemantic.length}/7 landmark elements)`);
  } else if (foundSemantic.length >= 2) {
    score += 2;
    findings.push(`Partial semantic structure (${foundSemantic.length}/7 landmark elements)`);
  } else {
    findings.push("Few semantic HTML5 elements found");
  }

  const headingPattern = /<h[1-6][^>]*>/gi;
  const headings = html.match(headingPattern) || [];
  const hasH1 = /<h1[^>]*>/i.test(html);
  if (hasH1 && headings.length >= 3) {
    score += 2;
    findings.push(`Good heading hierarchy (${headings.length} headings, H1 present)`);
  } else if (headings.length > 0) {
    score += 1;
    findings.push(`${headings.length} heading(s) found${hasH1 ? ", H1 present" : ", missing H1"}`);
  }

  const ariaRoles = (html.match(/role\s*=\s*["'][^"']+["']/gi) || []).length;
  const ariaLabels = (html.match(/aria-label\s*=\s*["'][^"']+["']/gi) || []).length;
  if (ariaRoles + ariaLabels >= 5) {
    score += 2;
    findings.push(`Good accessibility markup (${ariaRoles} roles, ${ariaLabels} aria-labels)`);
  } else if (ariaRoles + ariaLabels > 0) {
    score += 1;
    findings.push(`Some accessibility markup (${ariaRoles + ariaLabels} ARIA attributes)`);
  }

  const imgTags = (html.match(/<img[^>]*>/gi) || []);
  const imgWithAlt = imgTags.filter(img => /alt\s*=\s*["'][^"']+["']/i.test(img));
  if (imgTags.length > 0) {
    const altRatio = imgWithAlt.length / imgTags.length;
    if (altRatio >= 0.8) {
      score += 2;
      findings.push(`${Math.round(altRatio * 100)}% of images have alt text`);
    } else if (altRatio >= 0.5) {
      score += 1;
      findings.push(`${Math.round(altRatio * 100)}% of images have alt text`);
    }
  }

  if (findings.length === 0) {
    findings.push("HTML structure could not be analyzed");
  }

  return {
    key: "clean_html",
    label: "Clean HTML / Semantic Markup",
    score: Math.min(score, MAX),
    max: MAX,
    detail: findings.join(". "),
  };
}
