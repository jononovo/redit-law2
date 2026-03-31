import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import {
  Search,
  ShoppingCart,
  CreditCard,
  CheckCircle2,
  Zap,
  Globe,
  Star,
  ArrowRight,
  BarChart3,
  Users,
  Bot,
  Shield,
  FileJson,
  Clock,
  Code,
  Layers,
} from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Agentic Experience Score (AXS) | CreditClaw",
  description: "How CreditClaw evaluates brands for AI agent commerce. Two complementary scores: ASX Score (AI-powered analysis of agent shopping readiness) and AXS Rating (crowdsourced performance from real agent interactions).",
  openGraph: {
    title: "Agentic Experience Score (AXS) | CreditClaw",
    description: "The standard for measuring how well brands support AI agent commerce.",
    type: "website",
  },
};

const CLARITY_SIGNALS = [
  { label: "JSON-LD / Structured Data", description: "Product schema markup that AI agents can parse directly from the page without rendering", maxPoints: 20, icon: <FileJson className="w-4 h-4" /> },
  { label: "Product Feed (XML/JSON)", description: "Structured data feed for bulk catalog ingestion by AI agents", maxPoints: 10, icon: <BarChart3 className="w-4 h-4" /> },
  { label: "Clean HTML / Semantic Markup", description: "Well-structured DOM that enables reliable content extraction", maxPoints: 10, icon: <Code className="w-4 h-4" /> },
];

const SPEED_SIGNALS = [
  { label: "Search API / MCP", description: "Programmatic API or MCP endpoint for direct product queries without browser rendering", maxPoints: 15, icon: <Zap className="w-4 h-4" /> },
  { label: "Internal Site Search", description: "On-site search that returns relevant results for product queries", maxPoints: 10, icon: <Search className="w-4 h-4" /> },
  { label: "Page Load Performance", description: "Fast initial load and time-to-interactive for headless browsing", maxPoints: 10, icon: <Clock className="w-4 h-4" /> },
];

const RELIABILITY_SIGNALS = [
  { label: "Guest Checkout", description: "No account registration required — critical for AI agent purchasing", maxPoints: 15, icon: <ShoppingCart className="w-4 h-4" /> },
  { label: "Bot Tolerance", description: "No aggressive CAPTCHAs or bot-blocking that prevents agent interaction", maxPoints: 10, icon: <Shield className="w-4 h-4" /> },
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
                Every brand in our index is evaluated through two complementary lenses: an AI-powered scan of technical agent-readiness, and a dynamic rating crowdsourced from real agent and human interactions.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-20">
              <div className="bg-white rounded-2xl border border-neutral-100 p-8 shadow-sm" data-testid="card-asx-score">
                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mb-4">
                  <BarChart3 className="w-6 h-6 text-blue-600" />
                </div>
                <h2 className="text-xl font-bold mb-2">ASX Score</h2>
                <p className="text-sm text-neutral-500 mb-4">AI-powered analysis &middot; 0&ndash;100 scale</p>
                <p className="text-neutral-600 text-sm leading-relaxed">
                  An AI-powered score computed by scanning a brand's website for 8 key signals across three pillars: Clarity, Speed, and Reliability. This measures how well AI shopping agents can find products, search catalogs, and complete purchases.
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
                The ASX Score is built on three pillars that map to the full AI agent shopping lifecycle — from finding products to completing checkout.
              </p>
            </div>

            <div className="max-w-5xl mx-auto space-y-12">
              <PillarSection
                number="01"
                title="Clarity"
                subtitle="Can the agent understand the product catalog?"
                description="Measures how clearly a brand's products are presented in machine-readable formats. JSON-LD structured data is the highest-value signal — it gives agents direct access to product names, prices, and availability without rendering the page."
                criteria={CLARITY_SIGNALS}
                color="blue"
                icon={<Layers className="w-6 h-6" />}
              />

              <PillarSection
                number="02"
                title="Speed"
                subtitle="Can the agent find products quickly?"
                description="Evaluates how fast an AI agent can locate specific products. Brands with search APIs or MCP endpoints score highest because agents can query directly. Good internal search and fast page loads also contribute."
                criteria={SPEED_SIGNALS}
                color="green"
                icon={<Zap className="w-6 h-6" />}
              />

              <PillarSection
                number="03"
                title="Reliability"
                subtitle="Can the agent complete a purchase?"
                description="Assesses whether an AI agent can reliably complete the buying process. Guest checkout is essential — requiring account creation blocks most agents. Bot tolerance matters too — aggressive CAPTCHAs prevent agents from interacting at all."
                criteria={RELIABILITY_SIGNALS}
                color="purple"
                icon={<Shield className="w-6 h-6" />}
              />
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="container mx-auto px-6">
            <div className="max-w-3xl mx-auto text-center mb-12">
              <h2 className="text-3xl font-extrabold mb-4" data-testid="heading-axs-rating">AXS Rating: Real-World Performance</h2>
              <p className="text-neutral-600">
                While the ASX Score measures capability on paper, the AXS Rating captures what actually happens when agents interact with a brand. It's crowdsourced from both AI agents and human reviewers.
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
  criteria: { label: string; description: string; maxPoints: number; icon: React.ReactNode }[];
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
                <span className={`text-[10px] font-bold ${c.text} ${c.bg} px-1.5 py-0.5 rounded border ${c.border}`}>
                  up to {item.maxPoints} pts
                </span>
              </div>
              <p className="text-xs text-neutral-500 mt-0.5">{item.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
