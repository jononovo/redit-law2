import type { SignalScore, ASXRecommendation, SignalKey } from "./types";

interface RecommendationTemplate {
  signal: SignalKey;
  impact: "high" | "medium" | "low";
  title: string;
  description: string;
}

const TEMPLATES: Record<SignalKey, RecommendationTemplate> = {
  json_ld: {
    signal: "json_ld",
    impact: "high",
    title: "Add JSON-LD structured data",
    description: "Implement Schema.org Product markup using JSON-LD on your product pages. This is the single highest-impact improvement — it lets AI agents read product names, prices, and availability directly without rendering the page.",
  },
  product_feed: {
    signal: "product_feed",
    impact: "medium",
    title: "Publish a sitemap with product URLs",
    description: "Create or improve your sitemap.xml to include product page URLs. Reference it in robots.txt. This helps AI agents discover your full catalog efficiently.",
  },
  clean_html: {
    signal: "clean_html",
    impact: "medium",
    title: "Improve HTML semantic structure",
    description: "Use semantic HTML5 elements (header, nav, main, article, footer) and proper heading hierarchy. Add alt text to images and ARIA labels to interactive elements. This makes your site parseable even without structured data.",
  },
  search_api: {
    signal: "search_api",
    impact: "high",
    title: "Expose a search API or MCP endpoint",
    description: "Provide a programmatic search endpoint that AI agents can query directly. Consider implementing MCP (Model Context Protocol) to let agents interact with your catalog natively. This eliminates the need for browser-based navigation entirely.",
  },
  site_search: {
    signal: "site_search",
    impact: "medium",
    title: "Make site search discoverable",
    description: "Ensure your site search form is accessible on the homepage with a clear action URL. Add an OpenSearch description file so agents can discover your search template automatically.",
  },
  page_load: {
    signal: "page_load",
    impact: "low",
    title: "Improve page load performance",
    description: "Optimize your homepage load time to under 2 seconds. Faster pages mean agents can interact with your site more efficiently, reducing timeout failures and retry costs.",
  },
  access_auth: {
    signal: "access_auth",
    impact: "high",
    title: "Enable guest checkout",
    description: "Allow purchases without mandatory account creation. Guest checkout is critical for AI agents — most cannot complete registration flows, verify email addresses, or handle phone verification steps.",
  },
  order_management: {
    signal: "order_management",
    impact: "high",
    title: "Simplify product selection and cart management",
    description: "Use clear, predictable URL patterns for cart and product pages. Make variant selectors (size, color, quantity) easily identifiable with standard HTML form elements. Ensure add-to-cart actions are straightforward.",
  },
  checkout_flow: {
    signal: "checkout_flow",
    impact: "medium",
    title: "Clarify checkout options",
    description: "Clearly label payment methods, shipping options, and discount/promo code fields. Use descriptive text that an AI agent can parse to understand the differences between options (e.g., 'Standard Shipping - 5-7 business days - $5.99').",
  },
  bot_tolerance: {
    signal: "bot_tolerance",
    impact: "medium",
    title: "Reduce bot-blocking measures",
    description: "Review your robots.txt to allow AI agent crawling. Avoid aggressive CAPTCHAs on landing and product pages. Consider whitelisting known AI agent user-agents to enable automated shopping.",
  },
};

export function generateRecommendations(signals: SignalScore[]): ASXRecommendation[] {
  const recommendations: ASXRecommendation[] = [];

  const sorted = [...signals].sort((a, b) => {
    const gapA = a.max - a.score;
    const gapB = b.max - b.score;
    return gapB - gapA;
  });

  for (const signal of sorted) {
    const gap = signal.max - signal.score;
    if (gap <= 0) continue;

    const template = TEMPLATES[signal.key];
    if (!template) continue;

    recommendations.push({
      ...template,
      potentialGain: gap,
    });
  }

  return recommendations;
}
