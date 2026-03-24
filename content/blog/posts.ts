export interface BlogPost {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  category: string;
  tags: string[];
  ogImage?: string;
}

export const posts: BlogPost[] = [
  {
    slug: "introducing-creditclaw-allowance-platform",
    title: "Introducing CreditClaw: The Allowance Platform for AI Agents",
    date: "2026-03-10",
    excerpt: "Today we're launching CreditClaw — the easiest way to give your AI agent a prepaid card with spending controls, guardrails, and real-time visibility into every transaction.",
    category: "product-updates",
    tags: ["ai-agents", "spending-controls", "guardrails", "card-wallet"],
  },
  {
    slug: "why-agentic-commerce-needs-guardrails",
    title: "Why Agentic Commerce Needs Guardrails",
    date: "2026-03-17",
    excerpt: "As AI agents gain the ability to browse, negotiate, and purchase on behalf of humans, the question isn't whether to let them spend — it's how to keep them safe while doing so.",
    category: "agentic-commerce",
    tags: ["agentic-shopping", "agentic-payments", "guardrails", "bot-economy"],
  },
  {
    slug: "getting-started-with-mcp-and-creditclaw",
    title: "Getting Started with MCP and CreditClaw",
    date: "2026-03-24",
    excerpt: "A step-by-step guide to connecting your Claude or ChatGPT agent to CreditClaw using the Model Context Protocol, so your bot can make purchases with built-in spending controls.",
    category: "guides-tutorials",
    tags: ["mcp", "claude", "chatgpt", "openclaw", "procurement-skills"],
  },
];

export function getAllPosts(): BlogPost[] {
  return [...posts].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getPostBySlug(slug: string): BlogPost | undefined {
  return posts.find((p) => p.slug === slug);
}

export function getPostsByCategory(categorySlug: string): BlogPost[] {
  return getAllPosts().filter((p) => p.category === categorySlug);
}

export function getPostsByTag(tagSlug: string): BlogPost[] {
  return getAllPosts().filter((p) => p.tags.includes(tagSlug));
}

export function getAllCategories(): string[] {
  return [...new Set(posts.map((p) => p.category))];
}

export function getAllTags(): string[] {
  return [...new Set(posts.flatMap((p) => p.tags))];
}
