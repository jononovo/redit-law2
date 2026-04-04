import Link from "next/link";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import {
  ArrowRight,
  Bot,
  ShoppingCart,
  Store,
  BarChart3,
  CheckCircle2,
  Search,
  FileText,
  Globe,
  Zap,
  Shield,
  TrendingUp,
  BookOpen,
} from "lucide-react";
import { cookies } from "next/headers";
import { getTenantConfig } from "@/lib/tenants/config";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const tenantId = cookieStore.get("tenant-id")?.value || "creditclaw";
  const tenant = getTenantConfig(tenantId);
  const brandName = tenant.branding.name;

  return {
    title: `Merchant Guide | ${brandName}`,
    description:
      "A plain-language guide to agentic commerce. Understand what AI shopping agents are, why your ASX Score matters, and how to make your store agent-ready — no code required.",
    openGraph: {
      title: `Merchant Guide — Agentic Commerce for Your Brand | ${brandName}`,
      description:
        "Everything you need to know about AI shopping agents and your store. No technical background required.",
      type: "website",
    },
  };
}

const IMPROVEMENT_ITEMS = [
  {
    icon: FileText,
    title: "Add structured product data",
    description:
      "Make sure each product page has machine-readable information — name, price, availability, images. Your developer can add this as JSON-LD markup.",
  },
  {
    icon: Search,
    title: "Make your site search work well",
    description:
      "AI agents use your site's search bar to find products. If it returns irrelevant results or doesn't work reliably, agents will leave.",
  },
  {
    icon: Globe,
    title: "Keep your sitemap updated",
    description:
      "A sitemap tells agents where all your products are. Make sure it includes every product URL and stays up to date.",
  },
  {
    icon: ShoppingCart,
    title: "Support guest checkout",
    description:
      "Agents can't create accounts or verify phone numbers. If your checkout requires registration, agents can't buy from you.",
  },
  {
    icon: Shield,
    title: "Don't block bots aggressively",
    description:
      "CAPTCHAs and bot-detection that blocks all automated traffic will also block AI shopping agents. Consider allowing agent traffic.",
  },
  {
    icon: Zap,
    title: "Make your pages load fast",
    description:
      "Slow pages mean slow agents. Heavy JavaScript that takes seconds to render makes it harder for agents to read your product data.",
  },
];

export default async function GuidePage() {
  const cookieStore = await cookies();
  const tenantId = cookieStore.get("tenant-id")?.value || "creditclaw";
  const tenant = getTenantConfig(tenantId);

  return (
    <div className="min-h-screen bg-white text-neutral-900 font-sans">
      <Nav />
      <main>
        <section className="pt-24 pb-20">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto">
              <p className="text-sm font-mono text-neutral-400 mb-4 tracking-wide" data-testid="badge-section-label">
                MERCHANT GUIDE
              </p>
              <h1
                className="text-4xl md:text-6xl font-extrabold tracking-tight text-neutral-900 leading-[1.05] mb-6"
                data-testid="text-guide-title"
              >
                What AI shopping agents<br />
                mean for your brand.
              </h1>
              <p
                className="text-xl text-neutral-500 max-w-2xl leading-relaxed font-medium"
                data-testid="text-guide-subtitle"
              >
                A plain-language guide to agentic commerce. No code, no jargon — just what you need to know as a brand owner, marketer, or e-commerce leader.
              </p>
            </div>
          </div>
        </section>

        <section className="py-20 border-t border-neutral-200" data-testid="section-what-is">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto">
              <p className="text-sm font-mono text-neutral-400 mb-3 tracking-wide">01</p>
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-neutral-900 mb-6">
                What is agentic commerce?
              </h2>
              <p className="text-sm text-neutral-500 leading-relaxed font-medium mb-10 max-w-2xl">
                Instead of customers browsing your website themselves, their AI assistant does the shopping for them. The customer tells the agent what they need, and the agent finds products, compares prices, and completes the purchase — all without a human touching a browser.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto_1fr] gap-4 items-center" data-testid="diagram-flow">
                <div className="border border-neutral-200 p-6 text-center" data-testid="diagram-customer">
                  <div className="w-10 h-10 mx-auto mb-3 bg-neutral-100 flex items-center justify-center">
                    <Store className="w-5 h-5 text-neutral-700" strokeWidth={1.5} />
                  </div>
                  <p className="text-sm font-bold text-neutral-900">Your Customer</p>
                  <p className="text-xs text-neutral-500 font-medium mt-1">&ldquo;Find me new running shoes under $150&rdquo;</p>
                </div>

                <div className="hidden md:flex items-center justify-center">
                  <ArrowRight className="w-5 h-5 text-neutral-300" />
                </div>
                <div className="flex md:hidden items-center justify-center py-2">
                  <svg className="w-5 h-5 text-neutral-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12l7 7 7-7" /></svg>
                </div>

                <div className="border border-neutral-900 bg-neutral-950 p-6 text-center" data-testid="diagram-agent">
                  <div className="w-10 h-10 mx-auto mb-3 bg-neutral-800 flex items-center justify-center">
                    <Bot className="w-5 h-5 text-green-400" strokeWidth={1.5} />
                  </div>
                  <p className="text-sm font-bold text-white">AI Shopping Agent</p>
                  <p className="text-xs text-neutral-500 font-medium mt-1">Searches, compares, adds to cart, checks out</p>
                </div>

                <div className="hidden md:flex items-center justify-center">
                  <ArrowRight className="w-5 h-5 text-neutral-300" />
                </div>
                <div className="flex md:hidden items-center justify-center py-2">
                  <svg className="w-5 h-5 text-neutral-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12l7 7 7-7" /></svg>
                </div>

                <div className="border border-neutral-200 p-6 text-center" data-testid="diagram-store">
                  <div className="w-10 h-10 mx-auto mb-3 bg-neutral-100 flex items-center justify-center">
                    <ShoppingCart className="w-5 h-5 text-neutral-700" strokeWidth={1.5} />
                  </div>
                  <p className="text-sm font-bold text-neutral-900">Your Store</p>
                  <p className="text-xs text-neutral-500 font-medium mt-1">Order placed, payment processed, item shipped</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 border-t border-neutral-200" data-testid="section-why-matters">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto">
              <p className="text-sm font-mono text-neutral-400 mb-3 tracking-wide">02</p>
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-neutral-900 mb-6">
                Why does this matter for your brand?
              </h2>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="border border-neutral-200 p-8" data-testid="card-old-world">
                  <p className="text-xs font-mono text-neutral-400 mb-5 tracking-wide">THE OLD WAY</p>
                  <ul className="space-y-3 text-sm text-neutral-500 font-medium">
                    <li className="flex items-start gap-3">
                      <span className="text-neutral-300 mt-0.5">&mdash;</span>
                      Customers Google your products
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-neutral-300 mt-0.5">&mdash;</span>
                      SEO determines who gets found
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-neutral-300 mt-0.5">&mdash;</span>
                      Humans browse, compare, and buy
                    </li>
                  </ul>
                </div>

                <div className="border border-neutral-900 bg-neutral-950 p-8" data-testid="card-new-world">
                  <p className="text-xs font-mono text-neutral-500 mb-5 tracking-wide">THE NEW WAY</p>
                  <ul className="space-y-3 text-sm text-neutral-400 font-medium">
                    <li className="flex items-start gap-3">
                      <span className="text-green-400 mt-0.5">+</span>
                      AI agents search for products on behalf of customers
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-green-400 mt-0.5">+</span>
                      Agent-readiness determines who gets found
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-green-400 mt-0.5">+</span>
                      Agents browse, compare, and buy — automatically
                    </li>
                  </ul>
                </div>
              </div>

              <p className="text-sm text-neutral-500 leading-relaxed font-medium mt-8 max-w-2xl">
                If AI agents can&apos;t find or understand your products, they&apos;ll shop somewhere else. This is like not showing up in Google search results — except it&apos;s happening right now with AI assistants like ChatGPT, Claude, and Gemini.
              </p>
            </div>
          </div>
        </section>

        <section className="py-20 border-t border-neutral-200" data-testid="section-asx-score">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto">
              <p className="text-sm font-mono text-neutral-400 mb-3 tracking-wide">03</p>
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-neutral-900 mb-6">
                What is an ASX Score?
              </h2>
              <p className="text-sm text-neutral-500 leading-relaxed font-medium mb-10 max-w-2xl">
                Your ASX Score is a number from 0 to 100 that tells you how easy it is for AI agents to shop at your store. Higher score means more AI-driven sales. It&apos;s measured across three areas:
              </p>

              <div className="grid md:grid-cols-3 gap-px bg-neutral-200" data-testid="grid-pillars">
                <div className="bg-white p-8" data-testid="pillar-clarity">
                  <p className="text-xs font-mono text-neutral-400 mb-3">CLARITY</p>
                  <p className="text-base font-bold text-neutral-900 mb-2">Can agents read your catalog?</p>
                  <p className="text-sm text-neutral-500 font-medium leading-relaxed">
                    Do your product pages have structured data that machines can parse? Is your sitemap complete?
                  </p>
                </div>
                <div className="bg-white p-8" data-testid="pillar-discoverability">
                  <p className="text-xs font-mono text-neutral-400 mb-3">DISCOVERABILITY</p>
                  <p className="text-base font-bold text-neutral-900 mb-2">Can agents find products?</p>
                  <p className="text-sm text-neutral-500 font-medium leading-relaxed">
                    Does your site search return relevant results? Do pages load fast enough for automated browsing?
                  </p>
                </div>
                <div className="bg-white p-8" data-testid="pillar-reliability">
                  <p className="text-xs font-mono text-neutral-400 mb-3">RELIABILITY</p>
                  <p className="text-base font-bold text-neutral-900 mb-2">Can agents complete a purchase?</p>
                  <p className="text-sm text-neutral-500 font-medium leading-relaxed">
                    Is guest checkout available? Can agents select variants, manage a cart, and enter payment details?
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 border-t border-neutral-200" data-testid="section-check-score">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto">
              <p className="text-sm font-mono text-neutral-400 mb-3 tracking-wide">04</p>
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-neutral-900 mb-6">
                How do I check my score?
              </h2>
              <p className="text-sm text-neutral-500 leading-relaxed font-medium mb-8 max-w-2xl">
                Enter your store&apos;s domain in the scanner. An AI agent will visit your site, evaluate all 11 signals, and generate your ASX Score with a detailed breakdown of what&apos;s working and what needs attention.
              </p>

              <div className="border border-neutral-200 p-8" data-testid="card-scanner-cta">
                <div className="flex items-center gap-3 mb-4">
                  <BarChart3 className="w-5 h-5 text-neutral-900" strokeWidth={1.5} />
                  <p className="text-base font-bold text-neutral-900">Score Scanner</p>
                </div>
                <p className="text-sm text-neutral-500 font-medium mb-6">
                  Free scan. Results in under a minute. No account required.
                </p>
                <Link
                  href="/agentic-shopping-score"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-neutral-900 text-white text-sm font-bold hover:bg-neutral-800 transition-colors"
                  data-testid="link-scan-cta"
                >
                  Check your ASX Score
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 border-t border-neutral-200" data-testid="section-improve">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto">
              <p className="text-sm font-mono text-neutral-400 mb-3 tracking-wide">05</p>
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-neutral-900 mb-6">
                How do I improve my score?
              </h2>
              <p className="text-sm text-neutral-500 leading-relaxed font-medium mb-10 max-w-2xl">
                These are the most impactful things you can do. Share this list with your developer or agency — they&apos;ll know how to implement each one.
              </p>

              <div className="grid md:grid-cols-2 gap-px bg-neutral-200" data-testid="grid-improvements">
                {IMPROVEMENT_ITEMS.map((item, i) => (
                  <div key={i} className="bg-white p-8" data-testid={`card-improvement-${i}`}>
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-xs font-mono text-neutral-400">{String(i + 1).padStart(2, "0")}</span>
                      <item.icon className="w-5 h-5 text-neutral-900" strokeWidth={1.5} />
                    </div>
                    <h3 className="text-base font-bold text-neutral-900 mb-2">{item.title}</h3>
                    <p className="text-sm text-neutral-500 leading-relaxed font-medium">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 border-t border-neutral-200" data-testid="section-what-next">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto">
              <p className="text-sm font-mono text-neutral-400 mb-3 tracking-wide">06</p>
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-neutral-900 mb-6">
                What happens next?
              </h2>
              <p className="text-sm text-neutral-500 leading-relaxed font-medium mb-10 max-w-2xl">
                Once your store is agent-ready, the process works automatically:
              </p>

              <div className="space-y-0 border border-neutral-200 divide-y divide-neutral-100" data-testid="list-next-steps">
                {[
                  { step: "01", text: "Your store gets scanned and scored" },
                  { step: "02", text: "A skill file is generated — machine-readable instructions for agents" },
                  { step: "03", text: "The skill is published to the catalog" },
                  { step: "04", text: "AI agents discover your store through the catalog" },
                  { step: "05", text: "Agents shop at your store and complete purchases" },
                  { step: "06", text: "Agent feedback improves your rating over time" },
                ].map((item) => (
                  <div key={item.step} className="flex items-center gap-4 px-6 py-4">
                    <span className="text-xs font-mono text-neutral-400 shrink-0">{item.step}</span>
                    <p className="text-sm text-neutral-600 font-medium">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-neutral-200 py-20" data-testid="section-resources">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto">
              <div className="border border-neutral-200 p-8 flex flex-col md:flex-row items-start gap-6" data-testid="card-technical-callout">
                <div className="w-10 h-10 bg-neutral-100 flex items-center justify-center shrink-0">
                  <BookOpen className="w-5 h-5 text-neutral-700" strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-neutral-900 mb-1">Are you a developer?</h3>
                  <p className="text-sm text-neutral-500 font-medium leading-relaxed mb-4">
                    Read the full technical specification — frontmatter fields, body structure, validation rules, and the complete scoring methodology.
                  </p>
                  <Link
                    href="/standard"
                    className="text-sm font-semibold text-neutral-900 hover:underline underline-offset-4 flex items-center gap-1.5"
                    data-testid="link-standard-callout"
                  >
                    Read the agentic commerce standard <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-24 bg-neutral-950 text-white">
          <div className="container mx-auto px-6">
            <div className="max-w-3xl mx-auto text-center">
              <h2
                className="text-4xl md:text-5xl font-extrabold tracking-tight mb-6"
                data-testid="text-cta-title"
              >
                Is your store ready?
              </h2>
              <p className="text-lg text-neutral-500 font-medium mb-10 max-w-xl mx-auto leading-relaxed">
                Check your ASX Score and find out what AI agents see when they visit your store.
              </p>
              <Link
                href="/agentic-shopping-score"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white text-neutral-900 text-sm font-bold hover:bg-neutral-100 transition-colors"
                data-testid="link-scan-cta-footer"
              >
                Check your ASX Score
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
