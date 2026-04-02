"use client";

import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Search,
  BarChart3,
  Terminal,
  ShoppingCart,
  FileText,
  Globe,
  Zap,
  CheckCircle2,
  Copy,
  Check,
  ChevronRight,
} from "lucide-react";

const TERMINAL_LINES = [
  { prompt: "$ npx shopy add amazon", delay: 0 },
  { output: "  Downloading amazon.md... done", delay: 800 },
  { output: "  Skill installed: Amazon (ASX: 82/100)", delay: 1400 },
  { prompt: "$ npx shopy add walmart staples", delay: 2400 },
  { output: "  Downloading walmart.md... done", delay: 3200 },
  { output: "  Downloading staples.md... done", delay: 3800 },
  { output: "  2 skills installed", delay: 4400 },
  { prompt: "$ npx shopy search \"office supplies\"", delay: 5400 },
  { output: "  Found 23 vendors in sector: office", delay: 6200 },
];

function TerminalDemo() {
  const [visibleLines, setVisibleLines] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    function runCycle() {
      if (cancelled) return;
      setVisibleLines(0);

      const timers: ReturnType<typeof setTimeout>[] = [];
      TERMINAL_LINES.forEach((line, i) => {
        timers.push(
          setTimeout(() => {
            if (cancelled) return;
            setVisibleLines(i + 1);
            if (containerRef.current) {
              containerRef.current.scrollTop = containerRef.current.scrollHeight;
            }
          }, line.delay)
        );
      });

      const lastDelay = TERMINAL_LINES[TERMINAL_LINES.length - 1].delay;
      timers.push(setTimeout(() => {
        if (!cancelled) runCycle();
      }, lastDelay + 3000));

      return timers;
    }

    const timers = runCycle();
    return () => {
      cancelled = true;
      timers?.forEach(clearTimeout);
    };
  }, []);

  return (
    <div className="rounded-xl border border-neutral-200 bg-neutral-950 text-sm font-mono overflow-hidden shadow-2xl shadow-neutral-900/20">
      <div className="flex items-center gap-2 px-4 py-3 bg-neutral-900 border-b border-neutral-800">
        <div className="w-3 h-3 rounded-full bg-neutral-700" />
        <div className="w-3 h-3 rounded-full bg-neutral-700" />
        <div className="w-3 h-3 rounded-full bg-neutral-700" />
        <span className="ml-2 text-xs text-neutral-500">terminal</span>
      </div>
      <div ref={containerRef} className="p-5 space-y-1 min-h-[240px] max-h-[280px] overflow-y-auto">
        {TERMINAL_LINES.slice(0, visibleLines).map((line, i) =>
          line.prompt ? (
            <div key={i} className="text-green-400">{line.prompt}</div>
          ) : (
            <div key={i} className="text-neutral-400">{line.output}</div>
          )
        )}
        {visibleLines > 0 && visibleLines < TERMINAL_LINES.length && (
          <span className="inline-block w-2 h-4 bg-green-400 animate-pulse" />
        )}
      </div>
    </div>
  );
}

function CopyCommand({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-3 px-5 py-3 rounded-lg bg-neutral-100 border border-neutral-200 hover:border-neutral-300 transition-colors font-mono text-sm text-neutral-700 group cursor-pointer"
      data-testid="button-copy-install"
    >
      <span className="text-neutral-400">$</span>
      <span>{command}</span>
      {copied ? (
        <Check className="w-4 h-4 text-green-500 ml-auto" />
      ) : (
        <Copy className="w-4 h-4 text-neutral-400 group-hover:text-neutral-600 ml-auto transition-colors" />
      )}
    </button>
  );
}

const SCORE_EXAMPLES = [
  { name: "Amazon", score: 82, sector: "Retail", change: "+3" },
  { name: "Shopify Store", score: 61, sector: "Fashion", change: "+12" },
  { name: "Grainger", score: 91, sector: "Industrial", change: "+1" },
  { name: "Staples", score: 74, sector: "Office", change: "+8" },
];

function ScoreBoard() {
  return (
    <div className="rounded-xl border border-neutral-200 overflow-hidden bg-white">
      <div className="px-5 py-3 bg-neutral-50 border-b border-neutral-200 flex items-center justify-between">
        <span className="text-sm font-semibold text-neutral-700">ASX Leaderboard</span>
        <span className="text-xs text-neutral-400">Updated live</span>
      </div>
      <div className="divide-y divide-neutral-100">
        {SCORE_EXAMPLES.map((item, i) => (
          <div key={i} className="px-5 py-3.5 flex items-center gap-4 hover:bg-neutral-50 transition-colors" data-testid={`row-score-${i}`}>
            <span className="text-sm font-bold text-neutral-400 w-5">{i + 1}</span>
            <div className="flex-1">
              <span className="text-sm font-semibold text-neutral-900">{item.name}</span>
              <span className="text-xs text-neutral-400 ml-2">{item.sector}</span>
            </div>
            <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded">{item.change}</span>
            <div className="flex items-center gap-2">
              <div className="w-16 h-1.5 rounded-full bg-neutral-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-neutral-900 transition-all duration-1000"
                  style={{ width: `${item.score}%` }}
                />
              </div>
              <span className="text-sm font-bold text-neutral-900 w-8 text-right">{item.score}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const HOW_IT_WORKS_STEPS = [
  {
    icon: Search,
    title: "Scan your store",
    description: "Enter your domain. Our scanner evaluates 11 agent-readiness signals across clarity, discoverability, and reliability.",
  },
  {
    icon: BarChart3,
    title: "Get your ASX Score",
    description: "See your 0–100 score with a per-signal breakdown. Understand exactly what AI agents see when they visit your site.",
  },
  {
    icon: FileText,
    title: "Skill is generated",
    description: "A SKILL.md file is created — machine-readable instructions that teach any AI agent how to search, browse, and buy from your store.",
  },
  {
    icon: Globe,
    title: "Agents find you",
    description: "Your skill is published to the catalog. AI shopping agents discover your store and start purchasing automatically.",
  },
];

const FEATURES = [
  {
    icon: Terminal,
    title: "CLI-first distribution",
    description: "npx shopy add amazon — install shopping skills like npm packages. Search, install, and update from the command line.",
  },
  {
    icon: BarChart3,
    title: "ASX Score — 11 signals",
    description: "Structured data, sitemaps, search APIs, guest checkout, bot tolerance. Every signal scored and explained.",
  },
  {
    icon: ShoppingCart,
    title: "Full checkout instructions",
    description: "Each skill contains step-by-step checkout flows, payment methods, cart operations, and error handling for AI agents.",
  },
  {
    icon: Zap,
    title: "Crowd-sourced reliability",
    description: "AXS Ratings from real agent purchase attempts. Search accuracy, stock reliability, and checkout completion — all measured.",
  },
];

export default function ShopyHowItWorks() {
  const router = useRouter();
  const [domain, setDomain] = useState("");

  const handleScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!domain.trim()) return;
    router.push(`/agentic-shopping-score?domain=${encodeURIComponent(domain.trim())}`);
  };

  return (
    <div className="min-h-screen bg-white text-neutral-900 font-sans">
      <Nav />
      <main>
        <section className="relative pt-24 pb-20 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(0,0,0,0.02)_0%,transparent_50%)]" />

          <div className="container mx-auto px-6 relative z-10">
            <div className="max-w-4xl mx-auto text-center mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-neutral-100 text-neutral-600 font-semibold text-sm mb-8" data-testid="badge-tagline">
                <span className="w-2 h-2 rounded-full bg-neutral-900" />
                The open standard for agentic commerce
              </div>

              <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-neutral-900 leading-[1.05] mb-6" data-testid="text-hero-title">
                Make your store<br />
                <span className="text-neutral-400">shoppable by AI agents.</span>
              </h1>

              <p className="text-xl text-neutral-500 max-w-2xl mx-auto mb-10 leading-relaxed font-medium" data-testid="text-hero-subtitle">
                SEO made you findable by Google. shopy.sh makes you findable by ChatGPT, Claude, and Gemini.
                Check your score, browse the catalog, install skills.
              </p>

              <form onSubmit={handleScan} className="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto mb-6" data-testid="form-scan-domain">
                <Input
                  type="text"
                  placeholder="Enter your domain..."
                  aria-label="Enter your store domain to check ASX Score"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  className="h-14 px-6 rounded-xl bg-neutral-50 border-neutral-200 text-base font-medium placeholder:text-neutral-400 focus-visible:ring-neutral-900 focus-visible:border-neutral-400"
                  data-testid="input-scan-domain"
                />
                <Button
                  type="submit"
                  className="h-14 px-8 rounded-xl bg-neutral-900 text-white hover:bg-neutral-800 font-bold text-base gap-2"
                  data-testid="button-scan-domain"
                >
                  Check ASX Score
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </form>

              <CopyCommand command="npx shopy add amazon" />
            </div>

            <div className="grid lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
              <TerminalDemo />
              <ScoreBoard />
            </div>
          </div>
        </section>

        <section className="py-24 bg-neutral-50 border-y border-neutral-200">
          <div className="container mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-4xl font-extrabold tracking-tight text-neutral-900 mb-4" data-testid="text-how-title">
                How it works
              </h2>
              <p className="text-lg text-neutral-500 font-medium">
                From scan to sale in four steps.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
              {HOW_IT_WORKS_STEPS.map((step, i) => (
                <div key={i} className="relative p-6 rounded-xl bg-white border border-neutral-200 hover:border-neutral-300 transition-colors" data-testid={`card-step-${i}`}>
                  <div className="absolute -top-3 -left-3 w-7 h-7 rounded-full bg-neutral-900 text-white text-xs font-bold flex items-center justify-center">
                    {i + 1}
                  </div>
                  <step.icon className="w-8 h-8 text-neutral-900 mb-4" strokeWidth={1.5} />
                  <h3 className="text-lg font-bold text-neutral-900 mb-2">{step.title}</h3>
                  <p className="text-sm text-neutral-500 leading-relaxed font-medium">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-24">
          <div className="container mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-4xl font-extrabold tracking-tight text-neutral-900 mb-4" data-testid="text-features-title">
                Everything agents need to shop
              </h2>
              <p className="text-lg text-neutral-500 font-medium">
                Structured metadata, actionable instructions, and live reliability data.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {FEATURES.map((feature, i) => (
                <div key={i} className="p-8 rounded-xl border border-neutral-200 hover:border-neutral-300 bg-white transition-all group" data-testid={`card-feature-${i}`}>
                  <div className="w-12 h-12 rounded-lg bg-neutral-100 flex items-center justify-center mb-5 group-hover:bg-neutral-900 group-hover:text-white transition-colors">
                    <feature.icon className="w-6 h-6" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-xl font-bold text-neutral-900 mb-2">{feature.title}</h3>
                  <p className="text-neutral-500 font-medium leading-relaxed">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 bg-neutral-50 border-y border-neutral-200">
          <div className="container mx-auto px-6">
            <div className="max-w-3xl mx-auto">
              <div className="flex items-start gap-4 mb-8 p-5 rounded-xl bg-white border border-neutral-200">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-bold text-neutral-900 mb-1">Not a developer?</p>
                  <p className="text-sm text-neutral-500 font-medium leading-relaxed">
                    You don&apos;t need to write code. Enter your domain above to check your ASX Score —
                    it tells you exactly how AI-ready your store is and what to improve.{" "}
                    <Link href="/agentic-shopping-score" className="text-neutral-900 underline underline-offset-2 hover:no-underline font-semibold" data-testid="link-guide-cta">
                      Check your score now
                    </Link>
                  </p>
                </div>
              </div>

              <div className="text-center">
                <h2 className="text-3xl font-extrabold tracking-tight text-neutral-900 mb-3" data-testid="text-comparison-title">
                  shopy.sh vs traditional SEO
                </h2>
                <p className="text-neutral-500 font-medium mb-10">
                  SEO optimizes for search engines. shopy.sh optimizes for shopping agents.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="p-6 rounded-xl bg-white border border-neutral-200">
                  <div className="text-sm font-bold text-neutral-400 uppercase tracking-wider mb-4">Traditional SEO</div>
                  <ul className="space-y-3 text-sm text-neutral-600 font-medium">
                    <li className="flex items-start gap-2"><span className="text-neutral-300 mt-0.5">—</span> Optimize for Google&apos;s crawler</li>
                    <li className="flex items-start gap-2"><span className="text-neutral-300 mt-0.5">—</span> Keywords and backlinks</li>
                    <li className="flex items-start gap-2"><span className="text-neutral-300 mt-0.5">—</span> Rank in search results</li>
                    <li className="flex items-start gap-2"><span className="text-neutral-300 mt-0.5">—</span> Human clicks through to buy</li>
                  </ul>
                </div>
                <div className="p-6 rounded-xl bg-neutral-900 text-white">
                  <div className="text-sm font-bold text-neutral-400 uppercase tracking-wider mb-4">shopy.sh</div>
                  <ul className="space-y-3 text-sm text-neutral-300 font-medium">
                    <li className="flex items-start gap-2"><span className="text-green-400 mt-0.5">+</span> Optimize for AI shopping agents</li>
                    <li className="flex items-start gap-2"><span className="text-green-400 mt-0.5">+</span> Structured data and checkout flows</li>
                    <li className="flex items-start gap-2"><span className="text-green-400 mt-0.5">+</span> Discoverable in agent skill catalogs</li>
                    <li className="flex items-start gap-2"><span className="text-green-400 mt-0.5">+</span> Agent buys autonomously</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-24">
          <div className="container mx-auto px-6">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-4xl font-extrabold tracking-tight text-neutral-900 mb-4" data-testid="text-explore-title">
                Explore the catalog
              </h2>
              <p className="text-lg text-neutral-500 font-medium mb-10">
                Browse verified shopping skills, compare scores, and find the best vendors for your AI agent.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/skills" data-testid="link-browse-catalog">
                  <Button className="h-14 px-8 rounded-xl bg-neutral-900 text-white hover:bg-neutral-800 font-bold text-base gap-2">
                    Browse Catalog
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </Link>
                <Link href="/agentic-shopping-score" data-testid="link-check-score">
                  <Button variant="outline" className="h-14 px-8 rounded-xl border-neutral-300 hover:bg-neutral-50 font-bold text-base gap-2">
                    Check Your Score
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="py-24 bg-neutral-900 text-white">
          <div className="container mx-auto px-6">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-6" data-testid="text-cta-title">
                The next wave of commerce is agentic.
              </h2>
              <p className="text-xl text-neutral-400 font-medium mb-10 max-w-xl mx-auto">
                Your store is either ready for AI agents, or it&apos;s invisible to them. Find out where you stand.
              </p>

              <form onSubmit={handleScan} className="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto" data-testid="form-scan-domain-footer">
                <Input
                  type="text"
                  placeholder="yourdomain.com"
                  aria-label="Enter your store domain to scan"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  className="h-14 px-6 rounded-xl bg-white text-neutral-900 border-transparent text-base font-medium placeholder:text-neutral-400 focus-visible:ring-white"
                  data-testid="input-scan-domain-footer"
                />
                <Button
                  type="submit"
                  className="h-14 px-8 rounded-xl bg-white text-neutral-900 hover:bg-neutral-100 font-bold text-base gap-2"
                  data-testid="button-scan-domain-footer"
                >
                  Scan Now
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </form>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
