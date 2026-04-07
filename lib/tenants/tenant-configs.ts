import type { TenantConfig } from "./types";

const creditclawConfig: TenantConfig = {
  id: "creditclaw",
  domains: ["creditclaw.com", "www.creditclaw.com"],
  branding: {
    name: "CreditClaw",
    tagline: "Pocket money for your bots!",
    logo: "/assets/images/logo-claw-chip.png",
    logoEmoji: "\u{1F99E}",
    favicon: "/favicon.ico",
    supportEmail: "support@creditclaw.com",
    mascot: "/assets/images/hero-claw.png",
  },
  meta: {
    title: "CreditClaw - Give your bot a card",
    description: "The fun, safe way to give your OpenClaw bot an allowance. Self-hosted cards, wallets, and spending guardrails for AI agents.",
    ogImage: "/assets/og/og-image.png",
    twitterImage: "/assets/og/og-twitter.png",
    url: "https://creditclaw.com",
  },
  theme: {
    primaryColor: "10 85% 55%",
    primaryForeground: "0 0% 100%",
    accentColor: "260 90% 65%",
    secondaryColor: "200 95% 60%",
  },
  routes: { guestLanding: "/creditclaw", authLanding: "/overview" },
  navigation: {
    header: {
      variant: "light",
      showLogo: true,
      links: [
        { label: "How It Works", href: "/how-it-works" },
        { label: "Score Scanner", href: "/agentic-shopping-score" },
        { label: "Shopping Skills", href: "/skills" },
      ],
    },
    footer: {
      columns: [
        {
          title: "Product",
          links: [
            { label: "How It Works", href: "/how-it-works" },
            { label: "Allowance", href: "/allowance" },
            { label: "Safety", href: "/safety" },
            { label: "Vendor Skills", href: "/skills" },
            { label: "Score Scanner", href: "/agentic-shopping-score" },
            { label: "Get Started", href: "/onboarding" },
          ],
        },
        {
          title: "Dashboard",
          links: [
            { label: "Overview", href: "/overview" },
            { label: "Cards", href: "/cards" },
            { label: "Transactions", href: "/transactions" },
            { label: "Settings", href: "/settings" },
          ],
        },
        {
          title: "Resources",
          links: [
            { label: "Documentation", href: "/docs" },
            { label: "Developer", href: "/docs/api/introduction" },
            { label: "Newsroom", href: "/newsroom" },
          ],
        },
      ],
      socials: [
        { label: "Twitter", href: "https://x.com/creditclawapp" },
        { label: "Instagram", href: "#" },
        { label: "TikTok", href: "#" },
      ],
    },
  },
  tracking: { gaId: "G-EGT42NKHLB" },
};

const brandsConfig: TenantConfig = {
  id: "brands",
  domains: ["brands.sh", "www.brands.sh"],
  branding: {
    name: "brands.sh",
    tagline: "The skill registry for AI shopping agents.",
    logo: "/tenants/brands/images/logo.png",
    logoEmoji: "\u{1F4E6}",
    favicon: "",
    supportEmail: "hello@brands.sh",
    mascot: "",
  },
  meta: {
    title: "brands.sh \u2014 Shopping skills for AI agents",
    description: "Find, install, and use brand skills that teach AI agents how to search, browse, and buy from any store. The npm registry for agentic commerce.",
    ogImage: "/tenants/brands/images/og-image.png",
    twitterImage: "/tenants/brands/images/og-twitter.png",
    url: "https://brands.sh",
  },
  theme: {
    primaryColor: "220 15% 15%",
    primaryForeground: "0 0% 100%",
    accentColor: "220 10% 30%",
    secondaryColor: "220 8% 50%",
  },
  routes: { guestLanding: "/brands", authLanding: "/overview" },
  navigation: {
    header: {
      variant: "dark",
      showLogo: false,
      links: [
        { label: "Skills", href: "/skills" },
        { label: "Submit", href: "/skills/submit" },
        { label: "Docs", href: "/docs" },
      ],
    },
    footer: {
      showLogo: false,
      columns: [
        {
          title: "Catalog",
          links: [
            { label: "Browse Skills", href: "/skills" },
            { label: "Sectors", href: "/skills" },
            { label: "How It Works", href: "/how-it-works" },
          ],
        },
        {
          title: "Developers",
          links: [
            { label: "API Reference", href: "/docs/api/introduction" },
            { label: "SKILL.md Standard", href: "/docs" },
            { label: "CLI", href: "/docs" },
          ],
        },
      ],
      socials: [
        { label: "Twitter", href: "https://x.com/brandssh" },
        { label: "GitHub", href: "https://github.com/brandssh" },
      ],
    },
  },
};

const shopyConfig: TenantConfig = {
  id: "shopy",
  domains: ["shopy.sh", "www.shopy.sh"],
  branding: {
    name: "shopy.sh",
    tagline: "Make your store shoppable by AI agents.",
    logo: "/assets/images/logo-claw-chip.png",
    logoEmoji: "\u{1F6D2}",
    favicon: "",
    supportEmail: "hello@shopy.sh",
    mascot: "",
  },
  meta: {
    title: "shopy.sh \u2014 The open standard for agentic commerce",
    description: "Make your store discoverable and shoppable by AI agents. Check your ASX Score, browse the catalog, install shopping skills.",
    ogImage: "/tenants/shopy/images/og-image.png",
    twitterImage: "/tenants/shopy/images/og-twitter.png",
    url: "https://shopy.sh",
  },
  theme: {
    primaryColor: "0 0% 9%",
    primaryForeground: "0 0% 100%",
    accentColor: "0 0% 20%",
    secondaryColor: "0 0% 45%",
  },
  routes: { guestLanding: "/shopy", authLanding: "/overview" },
  navigation: {
    header: {
      variant: "light",
      showLogo: true,
      links: [
        { label: "Standard", href: "/standard" },
        { label: "Guide", href: "/guide" },
        { label: "Score Scanner", href: "/agentic-shopping-score" },
        { label: "Docs", href: "/docs" },
        { label: "AXS", href: "/axs" },
      ],
    },
    footer: {
      columns: [
        {
          title: "Product",
          links: [
            { label: "Score Scanner", href: "/agentic-shopping-score" },
            { label: "How It Works", href: "/how-it-works" },
          ],
        },
        {
          title: "Resources",
          links: [
            { label: "Merchant Guide", href: "/guide" },
            { label: "The Standard", href: "/standard" },
            { label: "AXS Scoring", href: "/axs" },
          ],
        },
        {
          title: "Developers",
          links: [
            { label: "Documentation", href: "/docs" },
            { label: "CLI Reference", href: "/docs/shopy/cli/installation" },
            { label: "Skill Format", href: "/docs/shopy/skill-format/structure" },
          ],
        },
      ],
      socials: [
        { label: "Twitter", href: "https://x.com/shopysh" },
        { label: "GitHub", href: "https://github.com/shopysh" },
      ],
    },
  },
};

const TENANT_CONFIGS: Record<string, TenantConfig> = {
  creditclaw: creditclawConfig,
  brands: brandsConfig,
  shopy: shopyConfig,
};

export function getStaticTenantConfig(tenantId: string): TenantConfig {
  return TENANT_CONFIGS[tenantId] ?? TENANT_CONFIGS.creditclaw;
}

export const TENANT_THEMES: Record<string, { primary: string; primaryForeground: string; accent: string; secondary: string }> = {
  creditclaw: { ...creditclawConfig.theme, primary: creditclawConfig.theme.primaryColor, primaryForeground: creditclawConfig.theme.primaryForeground, accent: creditclawConfig.theme.accentColor, secondary: creditclawConfig.theme.secondaryColor },
  brands: { ...brandsConfig.theme, primary: brandsConfig.theme.primaryColor, primaryForeground: brandsConfig.theme.primaryForeground, accent: brandsConfig.theme.accentColor, secondary: brandsConfig.theme.secondaryColor },
  shopy: { ...shopyConfig.theme, primary: shopyConfig.theme.primaryColor, primaryForeground: shopyConfig.theme.primaryForeground, accent: shopyConfig.theme.accentColor, secondary: shopyConfig.theme.secondaryColor },
};
