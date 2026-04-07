export type Audience = "user" | "developer";
export type DocTenant = "creditclaw" | "shopy" | "brands" | "shared";

export interface DocPage {
  title: string;
  slug: string;
}

export interface DocSection {
  title: string;
  slug: string;
  audience: Audience;
  tenant: DocTenant;
  pages: DocPage[];
}

export const sections: DocSection[] = [
  {
    title: "Getting Started",
    slug: "getting-started",
    audience: "user",
    tenant: "creditclaw",
    pages: [
      { title: "What is CreditClaw", slug: "what-is-creditclaw" },
      { title: "Creating an Account", slug: "creating-an-account" },
      { title: "Dashboard Overview", slug: "dashboard-overview" },
    ],
  },
  {
    title: "Bots & Onboarding",
    slug: "bots",
    audience: "user",
    tenant: "creditclaw",
    pages: [
      { title: "Onboarding Wizard", slug: "onboarding-wizard" },
      { title: "Claiming a Bot", slug: "claiming-a-bot" },
      { title: "Managing Your Bots", slug: "managing-bots" },
      { title: "Webhook Health", slug: "webhook-health" },
    ],
  },
  {
    title: "Wallets & Funding",
    slug: "wallets",
    audience: "user",
    tenant: "creditclaw",
    pages: [
      { title: "Wallet Types", slug: "wallet-types" },
      { title: "Creating a Wallet", slug: "creating-a-wallet" },
      { title: "Funding Your Wallet", slug: "funding-your-wallet" },
      { title: "Encrypted Cards", slug: "encrypted-cards" },
      { title: "Freezing & Controls", slug: "freezing-and-controls" },
    ],
  },
  {
    title: "Spending Controls",
    slug: "guardrails",
    audience: "user",
    tenant: "creditclaw",
    pages: [
      { title: "Spending Limits", slug: "spending-limits" },
      { title: "Approval Modes", slug: "approval-modes" },
      { title: "Category Controls", slug: "category-controls" },
    ],
  },
  {
    title: "Selling",
    slug: "selling",
    audience: "user",
    tenant: "creditclaw",
    pages: [
      { title: "Checkout Pages", slug: "checkout-pages" },
      { title: "Payment Methods", slug: "payment-methods" },
      { title: "Invoices", slug: "invoices" },
      { title: "Sales Tracking", slug: "sales-tracking" },
      { title: "Shop & Storefront", slug: "shop" },
    ],
  },
  {
    title: "Settings",
    slug: "settings",
    audience: "user",
    tenant: "creditclaw",
    pages: [
      { title: "Seller Identity", slug: "seller-profile" },
      { title: "Account Settings", slug: "account-settings" },
    ],
  },
  {
    title: "Transactions & Orders",
    slug: "transactions",
    audience: "user",
    tenant: "creditclaw",
    pages: [
      { title: "Viewing Transactions", slug: "viewing-transactions" },
      { title: "Orders & Shipping", slug: "orders" },
    ],
  },
  {
    title: "Procurement Skills",
    slug: "skills",
    audience: "user",
    tenant: "creditclaw",
    pages: [
      { title: "What Are Skills", slug: "what-are-skills" },
      { title: "ASX Score", slug: "asx-score" },
      { title: "Browsing the Supplier Hub", slug: "browsing-skills" },
      { title: "Submitting a Supplier", slug: "submitting-a-supplier" },
    ],
  },
  {
    title: "API Overview",
    slug: "api",
    audience: "developer",
    tenant: "creditclaw",
    pages: [
      { title: "Introduction", slug: "introduction" },
      { title: "Authentication", slug: "authentication" },
    ],
  },
  {
    title: "API Endpoints",
    slug: "api/endpoints",
    audience: "developer",
    tenant: "creditclaw",
    pages: [
      { title: "Wallets", slug: "wallets" },
      { title: "Bots", slug: "bots" },
      { title: "Checkout Pages", slug: "checkout-pages" },
      { title: "Invoices", slug: "invoices" },
      { title: "Sales", slug: "sales" },
      { title: "Scan", slug: "scan" },
      { title: "Skills", slug: "skills" },
    ],
  },
  {
    title: "Webhooks",
    slug: "api/webhooks",
    audience: "developer",
    tenant: "creditclaw",
    pages: [
      { title: "Setup & Signing", slug: "setup" },
      { title: "Event Types", slug: "events" },
      { title: "Health & Reliability", slug: "health" },
      { title: "Managed Tunnels", slug: "tunnels" },
    ],
  },
  {
    title: "Agent Integration",
    slug: "api/agent-integration",
    audience: "developer",
    tenant: "creditclaw",
    pages: [
      { title: "Quick Start", slug: "quick-start" },
      { title: "x402 Protocol", slug: "x402-protocol" },
      { title: "MCP Integration", slug: "mcp" },
    ],
  },
  {
    title: "Getting Started",
    slug: "shopy/getting-started",
    audience: "user",
    tenant: "shopy",
    pages: [
      { title: "What is shopy.sh", slug: "what-is-shopy" },
      { title: "ASX Score Explained", slug: "asx-score-explained" },
    ],
  },
  {
    title: "CLI",
    slug: "shopy/cli",
    audience: "developer",
    tenant: "shopy",
    pages: [
      { title: "Installation", slug: "installation" },
      { title: "Commands", slug: "commands" },
    ],
  },
  {
    title: "Skill Format",
    slug: "shopy/skill-format",
    audience: "developer",
    tenant: "shopy",
    pages: [
      { title: "SKILL.md Structure", slug: "structure" },
      { title: "Commerce Frontmatter", slug: "frontmatter" },
    ],
  },
  {
    title: "Taxonomy",
    slug: "shopy/taxonomy",
    audience: "developer",
    tenant: "shopy",
    pages: [
      { title: "Taxonomy & Sectors", slug: "sectors" },
    ],
  },
  {
    title: "Agent Integration",
    slug: "shopy/agent-integration",
    audience: "developer",
    tenant: "shopy",
    pages: [
      { title: "Reading Skills", slug: "reading-skills" },
      { title: "Feedback Protocol", slug: "feedback-protocol" },
    ],
  },
];

export function getSectionsByAudience(audience: Audience, tenant?: DocTenant): DocSection[] {
  if (!tenant) {
    return sections.filter((s) => s.audience === audience);
  }
  return sections.filter(
    (s) => s.audience === audience && (s.tenant === tenant || s.tenant === "shared")
  );
}

export function getAudienceFromSlug(slugParts: string[]): Audience {
  if (slugParts[0] === "api") return "developer";
  if (slugParts[0] === "shopy") {
    const sub = slugParts[1];
    if (sub === "cli" || sub === "skill-format" || sub === "agent-integration") return "developer";
    return "user";
  }
  return "user";
}

const VALID_TENANTS: DocTenant[] = ["creditclaw", "shopy", "brands", "shared"];

export function normalizeTenantId(value: string | undefined): DocTenant {
  if (value && VALID_TENANTS.includes(value as DocTenant)) return value as DocTenant;
  return "creditclaw";
}

export function getTenantFromSlug(slugParts: string[]): DocTenant {
  if (slugParts[0] === "shopy") return "shopy";
  return "creditclaw";
}

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

export const sitePages: { title: string; slug: string; file: string; url: string }[] = [
  { title: "Homepage", slug: "homepage", file: "site/homepage.md", url: "/" },
  { title: "How It Works", slug: "how-it-works", file: "site/how-it-works.md", url: "/how-it-works" },
  { title: "Safety & Security", slug: "safety", file: "site/safety.md", url: "/safety" },
  { title: "Procurement Skills", slug: "skills", file: "site/skills.md", url: "/skills" },
];

export function getAllPagesFlat(audience: Audience, tenant?: DocTenant): { section: DocSection; page: DocPage; path: string }[] {
  const result: { section: DocSection; page: DocPage; path: string }[] = [];
  const filtered = tenant
    ? sections.filter((s) => s.audience === audience && (s.tenant === tenant || s.tenant === "shared"))
    : sections.filter((s) => s.audience === audience);
  for (const section of filtered) {
    for (const page of section.pages) {
      result.push({ section, page, path: `/docs/${section.slug}/${page.slug}` });
    }
  }
  return result;
}
