export interface Category {
  name: string;
  slug: string;
  description: string;
}

export interface Tag {
  name: string;
  slug: string;
}

export const categories: Category[] = [
  { name: "Product Updates", slug: "product-updates", description: "New features, improvements, and releases from CreditClaw." },
  { name: "Agentic Commerce", slug: "agentic-commerce", description: "Insights on how AI agents are transforming commerce and payments." },
  { name: "Engineering", slug: "engineering", description: "Technical deep dives and engineering behind CreditClaw." },
  { name: "Industry News", slug: "industry-news", description: "News and trends in AI, fintech, and the bot economy." },
  { name: "Guides & Tutorials", slug: "guides-tutorials", description: "Step-by-step guides for getting the most out of CreditClaw." },
];

export const tags: Tag[] = [
  { name: "Agentic Shopping", slug: "agentic-shopping" },
  { name: "Agentic Procurement", slug: "agentic-procurement" },
  { name: "Agentic Payments", slug: "agentic-payments" },
  { name: "OpenClaw", slug: "openclaw" },
  { name: "Claude", slug: "claude" },
  { name: "ChatGPT", slug: "chatgpt" },
  { name: "MCP", slug: "mcp" },
  { name: "x402", slug: "x402" },
  { name: "Spending Controls", slug: "spending-controls" },
  { name: "Guardrails", slug: "guardrails" },
  { name: "Card Wallet", slug: "card-wallet" },
  { name: "Crypto Wallet", slug: "stripe-wallet" },
  { name: "Procurement Skills", slug: "procurement-skills" },
  { name: "Security", slug: "security" },
  { name: "Plugins", slug: "plugins" },
  { name: "AI Agents", slug: "ai-agents" },
  { name: "Bot Economy", slug: "bot-economy" },
];

export function getCategoryBySlug(slug: string): Category | undefined {
  return categories.find((c) => c.slug === slug);
}

export function getTagBySlug(slug: string): Tag | undefined {
  return tags.find((t) => t.slug === slug);
}

export function getTagsBySlug(slugs: string[]): Tag[] {
  return slugs.map((s) => tags.find((t) => t.slug === s)).filter(Boolean) as Tag[];
}
