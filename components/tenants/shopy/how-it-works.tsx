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
  FileText,
  Globe,
  Zap,
  Copy,
  Check,
  ChevronRight,
  ShieldCheck,
  Package,
  TrendingUp,
  BookOpen,
} from "lucide-react";

const TERMINAL_LINES = [
  { prompt: "$ npx shopy add amazon", delay: 0 },
  { output: "  Downloading amazon.md… done", delay: 800 },
  { output: "  Skill installed: Amazon (ASX 82)", delay: 1400 },
  { prompt: "$ npx shopy add walmart staples", delay: 2600 },
  { output: "  Downloading walmart.md… done", delay: 3400 },
  { output: "  Downloading staples.md… done", delay: 4000 },
  { output: "  2 skills installed", delay: 4600 },
  { prompt: '$ npx shopy search "office supplies"', delay: 5800 },
  { output: "  Found 23 vendors in sector: office", delay: 6600 },
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
      timers.push(
        setTimeout(() => {
          if (!cancelled) runCycle();
        }, lastDelay + 3000)
      );

      return timers;
    }

    const timers = runCycle();
    return () => {
      cancelled = true;
      timers?.forEach(clearTimeout);
    };
  }, []);

  return (
    <div className="border border-neutral-800 bg-neutral-950 text-sm font-mono overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-neutral-900 border-b border-neutral-800">
        <div className="w-2.5 h-2.5 rounded-full bg-neutral-700" />
        <div className="w-2.5 h-2.5 rounded-full bg-neutral-700" />
        <div className="w-2.5 h-2.5 rounded-full bg-neutral-700" />
        <span className="ml-2 text-[11px] text-neutral-600 font-medium">terminal</span>
      </div>
      <div ref={containerRef} className="p-5 space-y-1 min-h-[220px] max-h-[260px] overflow-y-auto">
        {TERMINAL_LINES.slice(0, visibleLines).map((line, i) =>
          line.prompt ? (
            <div key={i} className="text-green-400">{line.prompt}</div>
          ) : (
            <div key={i} className="text-neutral-500">{line.output}</div>
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
      className="inline-flex items-center gap-3 px-4 py-2.5 bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition-colors font-mono text-sm text-neutral-300 group cursor-pointer"
      data-testid="button-copy-install"
    >
      <span className="text-neutral-600">$</span>
      <span>{command}</span>
      {copied ? (
        <Check className="w-3.5 h-3.5 text-green-400 ml-2" />
      ) : (
        <Copy className="w-3.5 h-3.5 text-neutral-600 group-hover:text-neutral-400 ml-2 transition-colors" />
      )}
    </button>
  );
}

const STEPS = [
  {
    number: "01",
    icon: Search,
    title: "Scan",
    description: "Enter a domain. The scanner evaluates 11 agent-readiness signals across clarity, discoverability, and reliability.",
  },
  {
    number: "02",
    icon: BarChart3,
    title: "Score",
    description: "Get a 0–100 ASX Score with per-signal breakdown. See exactly what AI agents see when they visit the site.",
  },
  {
    number: "03",
    icon: FileText,
    title: "Generate",
    description: "A SKILL.md is created — machine-readable instructions that teach any AI agent how to search, browse, and buy.",
  },
  {
    number: "04",
    icon: Globe,
    title: "Distribute",
    description: "The skill is published to the catalog. AI agents discover the store and start purchasing autonomously.",
  },
];

const CAPABILITIES = [
  {
    icon: Terminal,
    title: "CLI-first",
    description: "Install shopping skills like npm packages. Search, add, update — all from the terminal.",
    code: "npx shopy add amazon",
  },
  {
    icon: ShieldCheck,
    title: "11 signals scored",
    description: "Structured data, sitemaps, search APIs, guest checkout, bot tolerance. Every signal scored and explained.",
  },
  {
    icon: Package,
    title: "Full checkout flows",
    description: "Step-by-step cart operations, payment methods, shipping options, and error handling — ready for agents.",
  },
  {
    icon: TrendingUp,
    title: "Crowd-sourced ratings",
    description: "AXS Ratings from real agent purchase attempts. Search accuracy, stock reliability, checkout completion.",
  },
];

const FOR_MERCHANTS = [
  "Check your ASX Score — see how AI-ready your store is",
  "Get actionable recommendations to improve agent compatibility",
  "Your skill gets published to the catalog automatically",
  "Agents discover and buy from your store",
];

const FOR_DEVELOPERS = [
  "Install skills for any store with npx shopy add",
  "Search the catalog by sector, score, or capability",
  "Each skill has full checkout instructions and error handling",
  "Update skills when stores change their flows",
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
        {/* Hero */}
        <section className="pt-24 pb-20">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto">
              <div className="mb-12">
                <p className="text-sm font-mono text-neutral-400 mb-4 tracking-wide" data-testid="badge-tagline">
                  THE OPEN STANDARD FOR AGENTIC COMMERCE
                </p>
                <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-neutral-900 leading-[1.05] mb-6" data-testid="text-hero-title">
                  Make your store<br />
                  shoppable by<br />
                  AI agents.
                </h1>
                <p className="text-xl text-neutral-500 max-w-2xl leading-relaxed font-medium mb-8" data-testid="text-hero-subtitle">
                  SEO made you findable by Google.<br />
                  shopy.sh makes you findable by ChatGPT, Claude, and Gemini.
                </p>

                <div className="flex flex-col sm:flex-row gap-3 mb-6">
                  <CopyCommand command="npx shopy add amazon" />
                  <Button
                    variant="outline"
                    className="h-[42px] px-5 border-neutral-200 hover:bg-neutral-50 font-semibold text-sm gap-2"
                    data-testid="link-check-score-hero"
                    asChild
                  >
                    <Link href="/agentic-shopping-score">
                      Check your ASX Score
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </Button>
                </div>
              </div>

              <TerminalDemo />
            </div>
          </div>
        </section>

        {/* How it works — 4 steps */}
        <section className="py-20 border-t border-neutral-200">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto">
              <p className="text-sm font-mono text-neutral-400 mb-3 tracking-wide">HOW IT WORKS</p>
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-neutral-900 mb-12" data-testid="text-how-title">
                From scan to sale in four steps.
              </h2>

              <div className="grid md:grid-cols-2 gap-px bg-neutral-200">
                {STEPS.map((step) => (
                  <div key={step.number} className="bg-white p-8" data-testid={`card-step-${step.number}`}>
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-xs font-mono text-neutral-400">{step.number}</span>
                      <step.icon className="w-5 h-5 text-neutral-900" strokeWidth={1.5} />
                    </div>
                    <h3 className="text-lg font-bold text-neutral-900 mb-2">{step.title}</h3>
                    <p className="text-sm text-neutral-500 leading-relaxed font-medium">{step.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Two audiences */}
        <section className="py-20 border-t border-neutral-200">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto">
              <p className="text-sm font-mono text-neutral-400 mb-3 tracking-wide">WHO IT&apos;S FOR</p>
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-neutral-900 mb-12" data-testid="text-audiences-title">
                Two sides of the same standard.
              </h2>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="border border-neutral-200 p-8" data-testid="card-merchants">
                  <div className="flex items-center gap-2 mb-6">
                    <Globe className="w-5 h-5 text-neutral-900" strokeWidth={1.5} />
                    <h3 className="text-lg font-bold text-neutral-900">For merchants</h3>
                  </div>
                  <ul className="space-y-3">
                    {FOR_MERCHANTS.map((item, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-neutral-600 font-medium">
                        <span className="text-neutral-900 mt-0.5 font-mono text-xs">&rarr;</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-6 pt-6 border-t border-neutral-100">
                    <Link
                      href="/agentic-shopping-score"
                      className="text-sm font-semibold text-neutral-900 hover:underline underline-offset-4 flex items-center gap-1.5"
                      data-testid="link-merchant-cta"
                    >
                      Check your score <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>

                <div className="border border-neutral-900 bg-neutral-950 text-white p-8" data-testid="card-developers">
                  <div className="flex items-center gap-2 mb-6">
                    <Terminal className="w-5 h-5 text-white" strokeWidth={1.5} />
                    <h3 className="text-lg font-bold text-white">For agent developers</h3>
                  </div>
                  <ul className="space-y-3">
                    {FOR_DEVELOPERS.map((item, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-neutral-400 font-medium">
                        <span className="text-green-400 mt-0.5 font-mono text-xs">&rarr;</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-6 pt-6 border-t border-neutral-800">
                    <Link
                      href="/skills"
                      className="text-sm font-semibold text-white hover:underline underline-offset-4 flex items-center gap-1.5"
                      data-testid="link-developer-cta"
                    >
                      Browse the catalog <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Capabilities */}
        <section className="py-20 border-t border-neutral-200">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto">
              <p className="text-sm font-mono text-neutral-400 mb-3 tracking-wide">WHAT&apos;S IN A SKILL</p>
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-neutral-900 mb-12" data-testid="text-capabilities-title">
                Everything agents need to shop.
              </h2>

              <div className="grid md:grid-cols-2 gap-px bg-neutral-200">
                {CAPABILITIES.map((cap, i) => (
                  <div key={i} className="bg-white p-8" data-testid={`card-capability-${i}`}>
                    <cap.icon className="w-5 h-5 text-neutral-900 mb-4" strokeWidth={1.5} />
                    <h3 className="text-base font-bold text-neutral-900 mb-2">{cap.title}</h3>
                    <p className="text-sm text-neutral-500 leading-relaxed font-medium">{cap.description}</p>
                    {cap.code && (
                      <code className="inline-block mt-3 px-3 py-1.5 bg-neutral-100 text-neutral-700 text-xs font-mono">
                        {cap.code}
                      </code>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* SEO comparison */}
        <section className="py-20 border-t border-neutral-200">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto">
              <p className="text-sm font-mono text-neutral-400 mb-3 tracking-wide">THE SHIFT</p>
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-neutral-900 mb-12" data-testid="text-comparison-title">
                SEO optimizes for search engines.<br />
                shopy.sh optimizes for shopping agents.
              </h2>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="border border-neutral-200 p-8">
                  <p className="text-xs font-mono text-neutral-400 mb-5 tracking-wide">TRADITIONAL SEO</p>
                  <ul className="space-y-3 text-sm text-neutral-500 font-medium">
                    <li className="flex items-start gap-3">
                      <span className="text-neutral-300 mt-0.5">—</span>
                      Optimize for Google&apos;s crawler
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-neutral-300 mt-0.5">—</span>
                      Keywords and backlinks
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-neutral-300 mt-0.5">—</span>
                      Rank in search results
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-neutral-300 mt-0.5">—</span>
                      Human clicks through to buy
                    </li>
                  </ul>
                </div>

                <div className="border border-neutral-900 bg-neutral-950 p-8">
                  <p className="text-xs font-mono text-neutral-500 mb-5 tracking-wide">SHOPY.SH</p>
                  <ul className="space-y-3 text-sm text-neutral-400 font-medium">
                    <li className="flex items-start gap-3">
                      <span className="text-green-400 mt-0.5">+</span>
                      Optimize for AI shopping agents
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-green-400 mt-0.5">+</span>
                      Structured data and checkout flows
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-green-400 mt-0.5">+</span>
                      Discoverable in agent skill catalogs
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-green-400 mt-0.5">+</span>
                      Agent buys autonomously
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Non-dev callout */}
        <section className="py-20 border-t border-neutral-200">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto">
              <div className="border border-neutral-200 p-8 flex flex-col md:flex-row items-start gap-6" data-testid="card-non-dev">
                <div className="w-10 h-10 bg-neutral-100 flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-5 h-5 text-neutral-700" strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-neutral-900 mb-2">Not a developer?</h3>
                  <p className="text-sm text-neutral-500 font-medium leading-relaxed mb-4">
                    You don&apos;t need to write code. Enter your domain to check your ASX Score —
                    it tells you exactly how AI-ready your store is, what&apos;s working, and what to improve.
                    Share the results with your developer or hire an agency to handle the implementation.
                  </p>
                  <Link
                    href="/agentic-shopping-score"
                    className="text-sm font-semibold text-neutral-900 hover:underline underline-offset-4 flex items-center gap-1.5"
                    data-testid="link-non-dev-cta"
                  >
                    Check your score now <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24 bg-neutral-950 text-white">
          <div className="container mx-auto px-6">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-6" data-testid="text-cta-title">
                The next wave of commerce is agentic.
              </h2>
              <p className="text-lg text-neutral-500 font-medium mb-10 max-w-xl mx-auto leading-relaxed">
                Your store is either ready for AI agents, or it&apos;s invisible to them.
              </p>

              <form onSubmit={handleScan} className="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto" data-testid="form-scan-domain-footer">
                <Input
                  type="text"
                  placeholder="yourdomain.com"
                  aria-label="Enter your store domain to scan"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  className="h-12 px-5 bg-neutral-900 border-neutral-800 text-white text-sm font-medium placeholder:text-neutral-600 focus-visible:ring-neutral-700 focus-visible:border-neutral-700"
                  data-testid="input-scan-domain-footer"
                />
                <Button
                  type="submit"
                  className="h-12 px-6 bg-white text-neutral-900 hover:bg-neutral-100 font-bold text-sm gap-2"
                  data-testid="button-scan-domain-footer"
                >
                  Scan
                  <ArrowRight className="w-3.5 h-3.5" />
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
