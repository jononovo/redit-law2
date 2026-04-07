export interface DocPage {
  title: string;
  slug: string;
}

export interface DocSection {
  title: string;
  slug: string;
  tag?: string;
  pages: DocPage[];
}

export const sections: DocSection[] = [
  {
    title: "Getting Started",
    slug: "getting-started",
    pages: [
      { title: "What is CreditClaw", slug: "what-is-creditclaw" },
      { title: "Creating an Account", slug: "creating-an-account" },
      { title: "Dashboard Overview", slug: "dashboard-overview" },
      { title: "API Introduction", slug: "api-introduction" },
      { title: "Authentication", slug: "authentication" },
    ],
  },
  {
    title: "Bots & Onboarding",
    slug: "bots",
    pages: [
      { title: "Onboarding Wizard", slug: "onboarding-wizard" },
      { title: "Claiming a Bot", slug: "claiming-a-bot" },
      { title: "Managing Your Bots", slug: "managing-bots" },
      { title: "Webhook Health", slug: "webhook-health" },
      { title: "Webhook Health: Technical Details", slug: "webhook-health-technical" },
      { title: "Webhook Setup & Signing", slug: "webhook-setup" },
      { title: "Webhook Events", slug: "webhook-events" },
      { title: "Webhook Tunnels", slug: "webhook-tunnels" },
      { title: "Bot API Reference", slug: "api-reference" },
    ],
  },
  {
    title: "Wallets & Funding",
    slug: "wallets",
    pages: [
      { title: "Wallet Types", slug: "wallet-types" },
      { title: "Creating a Wallet", slug: "creating-a-wallet" },
      { title: "Funding Your Wallet", slug: "funding-your-wallet" },
      { title: "Encrypted Cards", slug: "encrypted-cards" },
      { title: "Freezing & Controls", slug: "freezing-and-controls" },
      { title: "Wallet API Reference", slug: "api-reference" },
    ],
  },
  {
    title: "Spending Controls",
    slug: "guardrails",
    pages: [
      { title: "Spending Limits", slug: "spending-limits" },
      { title: "Approval Modes", slug: "approval-modes" },
      { title: "Category Controls", slug: "category-controls" },
    ],
  },
  {
    title: "Selling",
    slug: "selling",
    pages: [
      { title: "Shop & Storefront", slug: "shop" },
      { title: "Checkout Pages", slug: "checkout-pages" },
      { title: "Payment Methods", slug: "payment-methods" },
      { title: "Invoices", slug: "invoices" },
      { title: "Sales Tracking", slug: "sales-tracking" },
      { title: "Checkout API Reference", slug: "checkout-api-reference" },
      { title: "Invoice API Reference", slug: "invoice-api-reference" },
      { title: "Sales API Reference", slug: "sales-api-reference" },
    ],
  },
  {
    title: "Transactions & Orders",
    slug: "transactions",
    pages: [
      { title: "Viewing Transactions", slug: "viewing-transactions" },
      { title: "Orders & Shipping", slug: "orders" },
    ],
  },
  {
    title: "Procurement Skills",
    slug: "skills",
    pages: [
      { title: "What Are Skills", slug: "what-are-skills" },
      { title: "Agentic Shopping (ASX) Score", slug: "asx-score" },
      { title: "Browsing the Supplier Hub", slug: "browsing-skills" },
      { title: "Submitting a Supplier", slug: "submitting-a-supplier" },
      { title: "Skills API Reference", slug: "api-reference" },
      { title: "Scan API Reference", slug: "scan-api-reference" },
    ],
  },
  {
    title: "Agent Integration",
    slug: "agent-integration",
    pages: [
      { title: "Quick Start", slug: "quick-start" },
      { title: "x402 Protocol", slug: "x402-protocol" },
      { title: "MCP Integration", slug: "mcp" },
    ],
  },
  {
    title: "Settings",
    slug: "settings",
    pages: [
      { title: "Seller Identity", slug: "seller-profile" },
      { title: "Account Settings", slug: "account-settings" },
    ],
  },
  {
    title: "Agentic Shopping (ASX) Scoring",
    slug: "asx-scoring",
    tag: "shopy",
    pages: [
      { title: "What is shopy.sh", slug: "what-is-shopy" },
      { title: "ASX Score Explained", slug: "asx-score-explained" },
    ],
  },
  {
    title: "Skill Publishing",
    slug: "skill-publishing",
    tag: "shopy",
    pages: [
      { title: "SKILL.md Structure", slug: "structure" },
      { title: "Commerce Frontmatter", slug: "frontmatter" },
      { title: "Taxonomy & Sectors", slug: "sectors" },
      { title: "Reading Skills", slug: "reading-skills" },
      { title: "Feedback Protocol", slug: "feedback-protocol" },
    ],
  },
  {
    title: "CLI Tools",
    slug: "cli-tools",
    tag: "shopy",
    pages: [
      { title: "Installation", slug: "installation" },
      { title: "Commands", slug: "commands" },
    ],
  },
];

export function findPage(slugParts: string[]): { section: DocSection; page: DocPage; pageIndex: number } | null {
  if (slugParts.length < 2) return null;

  for (const section of sections) {
    const sectionSlugParts = section.slug.split("/");
    const matchLen = sectionSlugParts.length;

    if (slugParts.length !== matchLen + 1) continue;

    const sectionMatch = sectionSlugParts.every((part, i) => slugParts[i] === part);
    if (!sectionMatch) continue;

    const pageSlug = slugParts[matchLen];
    const pageIndex = section.pages.findIndex((p) => p.slug === pageSlug);
    if (pageIndex !== -1) {
      return { section, page: section.pages[pageIndex], pageIndex };
    }
  }
  return null;
}

export function getAllPagesFlat(): { section: DocSection; page: DocPage; path: string }[] {
  const result: { section: DocSection; page: DocPage; path: string }[] = [];
  for (const section of sections) {
    for (const page of section.pages) {
      result.push({ section, page, path: `/docs/${section.slug}/${page.slug}` });
    }
  }
  return result;
}

export const sitePages: { title: string; slug: string; file: string; url: string }[] = [
  { title: "Homepage", slug: "homepage", file: "site/homepage.md", url: "/" },
  { title: "How It Works", slug: "how-it-works", file: "site/how-it-works.md", url: "/how-it-works" },
  { title: "Safety & Security", slug: "safety", file: "site/safety.md", url: "/safety" },
  { title: "Procurement Skills", slug: "skills", file: "site/skills.md", url: "/skills" },
];
