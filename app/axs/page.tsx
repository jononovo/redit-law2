import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import {
  Search,
  ShoppingCart,
  CreditCard,
  CheckCircle2,
  XCircle,
  Zap,
  Globe,
  Monitor,
  Star,
  ArrowRight,
  BarChart3,
  Users,
  Bot,
  Shield,
} from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Agentic Experience Score (AXS) | CreditClaw",
  description: "How CreditClaw evaluates brands for AI agent commerce. Two complementary scores: Agentic Readiness (static capability analysis) and AXS Rating (crowdsourced performance from real agent interactions).",
  openGraph: {
    title: "Agentic Experience Score (AXS) | CreditClaw",
    description: "The standard for measuring how well brands support AI agent commerce.",
    type: "website",
  },
};

const DISCOVERY_CRITERIA = [
  { label: "MCP Protocol Support", description: "Brand exposes a Model Context Protocol server for structured product discovery", points: 25, icon: <Globe className="w-4 h-4" /> },
  { label: "Search API", description: "Programmatic API for querying product catalogs and availability", points: 20, icon: <Zap className="w-4 h-4" /> },
  { label: "Product Feed", description: "Structured data feed (XML/JSON) for bulk catalog ingestion", points: 5, icon: <BarChart3 className="w-4 h-4" /> },
  { label: "Internal Site Search", description: "On-site search functionality accessible via browser automation", points: 0, icon: <Search className="w-4 h-4" /> },
];

const ORDERING_CRITERIA = [
  { label: "Guest Checkout", description: "No account registration required to complete a purchase", points: 15, icon: <ShoppingCart className="w-4 h-4" /> },
  { label: "Programmatic Checkout", description: "API-driven order placement without browser interaction", points: 10, icon: <Zap className="w-4 h-4" /> },
  { label: "Native API", description: "First-party commerce API for end-to-end purchasing", points: 0, icon: <Globe className="w-4 h-4" /> },
  { label: "Browser Automation", description: "Checkout supported via headless browser control", points: 0, icon: <Monitor className="w-4 h-4" /> },
];

const PURCHASING_CRITERIA = [
  { label: "ACP / x402 Support", description: "Native support for Agent Checkout Protocol or HTTP 402 payment flows", points: 0, icon: <CreditCard className="w-4 h-4" /> },
  { label: "Verified Maturity", description: "Skill has been tested and confirmed working by the CreditClaw team", points: 5, icon: <Shield className="w-4 h-4" /> },
  { label: "Active Deals", description: "Current promotions or discount programs available for agents", points: 5, icon: <Star className="w-4 h-4" /> },
  { label: "Tax Exemption", description: "Supports tax-exempt purchasing for qualifying organizations", points: 0, icon: <CheckCircle2 className="w-4 h-4" /> },
  { label: "PO Numbers", description: "Purchase order reference field available at checkout", points: 0, icon: <CheckCircle2 className="w-4 h-4" /> },
];

const FEEDBACK_DIMENSIONS = [
  { label: "Search Accuracy", description: "How accurately the brand's catalog search returns relevant products when queried by an agent.", icon: <Search className="w-5 h-5 text-blue-500" />, color: "blue" },
  { label: "Stock Reliability", description: "Whether items reported as in-stock are actually available for purchase at checkout time.", icon: <ShoppingCart className="w-5 h-5 text-green-500" />, color: "green" },
  { label: "Checkout Completion", description: "How reliably the end-to-end checkout flow completes successfully without errors or interruptions.", icon: <CreditCard className="w-5 h-5 text-purple-500" />, color: "purple" },
];

export default function AXSPage() {
  return (
    <div className="min-h-screen bg-background text-neutral-900 font-sans">
      <Nav />
      <main>
        <section className="relative py-20 overflow-hidden">
          <div className="absolute top-10 left-10 w-[500px] h-[500px] bg-amber-200/15 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-purple-200/15 rounded-full blur-[100px] pointer-events-none" />

          <div className="container mx-auto px-6 relative z-10">
            <div className="max-w-3xl mx-auto text-center mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 rounded-full text-sm font-semibold mb-6 border border-amber-100">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                Agentic Experience Score
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-6" data-testid="heading-axs">
                How We Measure{" "}
                <span className="bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
                  Agent-Ready Commerce
                </span>
              </h1>
              <p className="text-lg text-neutral-600 leading-relaxed max-w-2xl mx-auto">
                Every brand in our index is evaluated through two complementary lenses: a static analysis of technical capabilities, and a dynamic rating crowdsourced from real agent and human interactions.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-20">
              <div className="bg-white rounded-2xl border border-neutral-100 p-8 shadow-sm" data-testid="card-readiness-score">
                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mb-4">
                  <BarChart3 className="w-6 h-6 text-blue-600" />
                </div>
                <h2 className="text-xl font-bold mb-2">Agentic Readiness Score</h2>
                <p className="text-sm text-neutral-500 mb-4">Static analysis &middot; 0&ndash;100 scale</p>
                <p className="text-neutral-600 text-sm leading-relaxed">
                  A deterministic score computed from a brand's technical infrastructure. Evaluates protocol support, API availability, checkout flow complexity, and business features. This tells you what a brand <em>should</em> be capable of on paper.
                </p>
              </div>

              <div className="bg-white rounded-2xl border border-neutral-100 p-8 shadow-sm" data-testid="card-axs-rating">
                <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center mb-4">
                  <Users className="w-6 h-6 text-amber-600" />
                </div>
                <h2 className="text-xl font-bold mb-2">AXS Rating</h2>
                <p className="text-sm text-neutral-500 mb-4">Crowdsourced &middot; 1&ndash;5 scale</p>
                <p className="text-neutral-600 text-sm leading-relaxed">
                  A weighted average from real agent and human feedback. Measures actual search accuracy, stock reliability, and checkout completion rates. This tells you how a brand <em>actually performs</em> in practice.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 bg-neutral-50/50">
          <div className="container mx-auto px-6">
            <div className="max-w-3xl mx-auto text-center mb-12">
              <h2 className="text-3xl font-extrabold mb-4" data-testid="heading-pillars">The Three Pillars</h2>
              <p className="text-neutral-600">
                The Agentic Readiness Score is built on three primary pillars that map to the full agent purchasing lifecycle.
              </p>
            </div>

            <div className="max-w-5xl mx-auto space-y-12">
              <PillarSection
                number="01"
                title="Discovery"
                subtitle="Can the agent find the brand and its products?"
                description="Evaluates how easily an AI agent can reference, locate, and search a brand's product catalog. Brands that expose structured APIs or MCP endpoints score significantly higher than those requiring browser-based navigation."
                criteria={DISCOVERY_CRITERIA}
                color="blue"
                icon={<Search className="w-6 h-6" />}
              />

              <PillarSection
                number="02"
                title="Ordering & Navigation"
                subtitle="Can the agent browse, search, and build a cart?"
                description="Measures the internal navigation experience — whether an agent can query inventory, check pricing, verify stock, and assemble an order through API calls, MCP tools, or browser automation."
                criteria={ORDERING_CRITERIA}
                color="green"
                icon={<ShoppingCart className="w-6 h-6" />}
              />

              <PillarSection
                number="03"
                title="Purchasing"
                subtitle="Can the agent complete checkout and pay?"
                description="Assesses the end-to-end payment and checkout compatibility. Includes support for agentic payment protocols (ACP, x402), guest checkout availability, and business purchasing features like tax exemption and PO numbers."
                criteria={PURCHASING_CRITERIA}
                color="purple"
                icon={<CreditCard className="w-6 h-6" />}
              />
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="container mx-auto px-6">
            <div className="max-w-3xl mx-auto text-center mb-12">
              <h2 className="text-3xl font-extrabold mb-4" data-testid="heading-axs-rating">AXS Rating: Real-World Performance</h2>
              <p className="text-neutral-600">
                While the Readiness Score measures capability on paper, the AXS Rating captures what actually happens when agents interact with a brand. It's crowdsourced from both AI agents and human reviewers.
              </p>
            </div>

            <div className="max-w-4xl mx-auto">
              <div className="grid md:grid-cols-3 gap-6 mb-10">
                {FEEDBACK_DIMENSIONS.map(dim => (
                  <div key={dim.label} className="bg-white rounded-2xl border border-neutral-100 p-6" data-testid={`card-feedback-${dim.color}`}>
                    <div className="mb-4">{dim.icon}</div>
                    <h3 className="font-bold text-neutral-900 mb-2">{dim.label}</h3>
                    <p className="text-sm text-neutral-600 leading-relaxed">{dim.description}</p>
                  </div>
                ))}
              </div>

              <div className="bg-white rounded-2xl border border-neutral-100 p-8">
                <h3 className="font-bold text-neutral-900 mb-6">How the AXS Rating is Computed</h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-sm font-bold text-amber-600">1</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-neutral-900 mb-1">Collect Feedback</h4>
                      <p className="text-sm text-neutral-600">After each purchase attempt, agents and humans submit ratings (1-5) for search accuracy, stock reliability, and checkout completion.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-sm font-bold text-amber-600">2</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-neutral-900 mb-1">Apply Weights</h4>
                      <p className="text-sm text-neutral-600">Recent feedback is weighted more heavily (1.0x within 7 days, decaying to 0.4x after 60 days). Human reviews carry 2x weight compared to anonymous agent feedback.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-sm font-bold text-amber-600">3</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-neutral-900 mb-1">Aggregate</h4>
                      <p className="text-sm text-neutral-600">The AXS Rating is the weighted average of all three dimensions. A minimum feedback threshold must be met before a score is published — brands without enough data show no rating rather than an unreliable one.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 bg-neutral-50/50">
          <div className="container mx-auto px-6">
            <div className="max-w-3xl mx-auto text-center mb-10">
              <h2 className="text-3xl font-extrabold mb-4">Who Contributes?</h2>
              <p className="text-neutral-600">
                The AXS Rating is a community effort. Both AI agents and humans can submit feedback after interacting with a brand.
              </p>
            </div>

            <div className="max-w-3xl mx-auto grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-neutral-100 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                    <Bot className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-bold">AI Agents</h3>
                    <p className="text-xs text-neutral-500">Authenticated: 1.0x weight &middot; Anonymous: 0.5x</p>
                  </div>
                </div>
                <p className="text-sm text-neutral-600">Agents submit structured feedback after purchase attempts via the feedback API. Authenticated agents (using CreditClaw API keys) receive higher weight.</p>
              </div>

              <div className="bg-white rounded-2xl border border-neutral-100 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
                    <Users className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-bold">Humans</h3>
                    <p className="text-xs text-neutral-500">2.0x weight</p>
                  </div>
                </div>
                <p className="text-sm text-neutral-600">Human reviewers provide the highest-weight feedback. Their evaluations anchor the rating system and help calibrate agent-submitted scores.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="container mx-auto px-6 text-center">
            <h2 className="text-3xl font-extrabold mb-4">Explore the Index</h2>
            <p className="text-neutral-600 mb-8 max-w-xl mx-auto">
              Browse our growing catalog of brands evaluated for agent commerce readiness.
            </p>
            <Link
              href="/skills"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-bold rounded-full hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
              data-testid="link-browse-skills"
            >
              Browse Shopping Skills
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function PillarSection({
  number,
  title,
  subtitle,
  description,
  criteria,
  color,
  icon,
}: {
  number: string;
  title: string;
  subtitle: string;
  description: string;
  criteria: { label: string; description: string; points: number; icon: React.ReactNode }[];
  color: "blue" | "green" | "purple";
  icon: React.ReactNode;
}) {
  const colorMap = {
    blue: { bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-100", accent: "bg-blue-500" },
    green: { bg: "bg-green-50", text: "text-green-600", border: "border-green-100", accent: "bg-green-500" },
    purple: { bg: "bg-purple-50", text: "text-purple-600", border: "border-purple-100", accent: "bg-purple-500" },
  };
  const c = colorMap[color];

  return (
    <div className="bg-white rounded-2xl border border-neutral-100 p-8 shadow-sm" data-testid={`pillar-${title.toLowerCase().replace(/\s+/g, "-")}`}>
      <div className="flex items-start gap-4 mb-6">
        <div className={`w-12 h-12 rounded-xl ${c.bg} flex items-center justify-center flex-shrink-0`}>
          <span className={c.text}>{icon}</span>
        </div>
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Pillar {number}</span>
          </div>
          <h3 className="text-xl font-bold text-neutral-900">{title}</h3>
          <p className="text-sm text-neutral-500 mt-0.5">{subtitle}</p>
        </div>
      </div>

      <p className="text-sm text-neutral-600 leading-relaxed mb-6">{description}</p>

      <div className="space-y-3">
        {criteria.map(item => (
          <div key={item.label} className="flex items-start gap-3 py-2">
            <div className={`w-8 h-8 rounded-lg ${c.bg} flex items-center justify-center flex-shrink-0`}>
              <span className={c.text}>{item.icon}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-neutral-900">{item.label}</span>
                {item.points > 0 && (
                  <span className={`text-[10px] font-bold ${c.text} ${c.bg} px-1.5 py-0.5 rounded border ${c.border}`}>
                    +{item.points} pts
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-500 mt-0.5">{item.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
