import type { Metadata } from "next";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { SCORING_RUBRIC } from "@/lib/agentic-score/rubric";
import type { RubricPillar } from "@/lib/agentic-score/rubric";
import { Layers, Zap, Shield, ArrowLeft } from "lucide-react";
import Link from "next/link";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://creditclaw.com";

export const metadata: Metadata = {
  title: "Scoring Methodology | AI Shopping Score | CreditClaw",
  description:
    "See exactly how we calculate the Agent Shopping Experience Score — 57 criteria across 10 signals in 3 pillars: Clarity, Speed, and Reliability.",
  openGraph: {
    title: "Scoring Methodology | AI Shopping Score | CreditClaw",
    description:
      "See exactly how we calculate the Agent Shopping Experience Score — 57 criteria across Clarity, Speed, and Reliability.",
    type: "website",
    url: `${BASE_URL}/agentic-shopping-score/methodology`,
  },
  twitter: {
    card: "summary_large_image",
    title: "Scoring Methodology | AI Shopping Score | CreditClaw",
    description:
      "See exactly how we calculate the Agent Shopping Experience Score.",
  },
  alternates: {
    canonical: `${BASE_URL}/agentic-shopping-score/methodology`,
  },
};

const PILLAR_CONFIG: Record<
  string,
  { icon: typeof Layers; gradient: string; accent: string; bg: string; border: string; badge: string }
> = {
  clarity: {
    icon: Layers,
    gradient: "from-blue-600 to-cyan-500",
    accent: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
    badge: "bg-blue-100 text-blue-700",
  },
  speed: {
    icon: Zap,
    gradient: "from-amber-500 to-orange-500",
    accent: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-200",
    badge: "bg-amber-100 text-amber-700",
  },
  reliability: {
    icon: Shield,
    gradient: "from-emerald-600 to-teal-500",
    accent: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    badge: "bg-emerald-100 text-emerald-700",
  },
};

function PillarTable({ pillar }: { pillar: RubricPillar }) {
  const config = PILLAR_CONFIG[pillar.id];
  const Icon = config.icon;

  return (
    <div className="mb-16" data-testid={`pillar-section-${pillar.id}`}>
      <div className="flex items-center gap-3 mb-2">
        <div
          className={`w-10 h-10 rounded-xl bg-gradient-to-br ${config.gradient} flex items-center justify-center`}
        >
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-neutral-900">
            {pillar.label}
          </h2>
          <p className="text-sm text-neutral-500">
            {pillar.max} points maximum
          </p>
        </div>
      </div>

      {pillar.signals.map((signal) => (
        <div
          key={signal.id}
          className="mt-8"
          data-testid={`signal-section-${signal.id}`}
        >
          <div className="flex items-baseline gap-2 mb-3">
            <h3 className="text-lg font-semibold text-neutral-800">
              {signal.label}
            </h3>
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${config.badge}`}
            >
              max {signal.max} pts
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-neutral-200 shadow-sm">
            <table className="w-full text-sm" data-testid={`table-${signal.id}`}>
              <thead>
                <tr className={`${config.bg} border-b ${config.border}`}>
                  <th className="text-left py-3 px-4 font-semibold text-neutral-700 w-16">
                    Points
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-neutral-700">
                    What we look for
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-neutral-700 w-28 hidden sm:table-cell">
                    Source
                  </th>
                </tr>
              </thead>
              <tbody>
                {signal.criteria.map((criterion, idx) => {
                  const isNegative = criterion.points < 0;
                  const isOverride = criterion.override;

                  return (
                    <tr
                      key={criterion.id}
                      className={`border-b border-neutral-100 last:border-0 ${
                        idx % 2 === 0 ? "bg-white" : "bg-neutral-50/50"
                      } ${isNegative ? "bg-red-50/40" : ""} ${
                        isOverride ? "bg-green-50/40" : ""
                      }`}
                      data-testid={`row-criterion-${criterion.id}`}
                    >
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center justify-center min-w-[2.5rem] px-2 py-0.5 rounded-md text-xs font-bold ${
                            isNegative
                              ? "bg-red-100 text-red-700"
                              : isOverride
                                ? "bg-green-100 text-green-700"
                                : "bg-neutral-100 text-neutral-700"
                          }`}
                        >
                          {criterion.points > 0 ? "+" : ""}
                          {criterion.points}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-neutral-700">
                        <span>{criterion.condition}</span>
                        {isOverride && (
                          <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-green-600 bg-green-100 px-1.5 py-0.5 rounded">
                            Full marks
                          </span>
                        )}
                        {isNegative && (
                          <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-red-600 bg-red-100 px-1.5 py-0.5 rounded">
                            Penalty
                          </span>
                        )}
                        {criterion.group && !isOverride && (
                          <span className="ml-2 text-[10px] font-medium text-neutral-400">
                            (best of tier)
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 hidden sm:table-cell">
                        <SourceBadge source={criterion.source} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

function SourceBadge({ source }: { source: string }) {
  if (source === "detect") {
    return (
      <span className="inline-flex items-center text-xs font-medium text-violet-700 bg-violet-50 px-2 py-0.5 rounded-full">
        Automated
      </span>
    );
  }
  if (source === "agent") {
    return (
      <span className="inline-flex items-center text-xs font-medium text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full">
        AI Agent
      </span>
    );
  }
  return (
    <span className="inline-flex items-center text-xs font-medium text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-full">
      Both
    </span>
  );
}

export default function MethodologyPage() {
  const totalCriteria = SCORING_RUBRIC.pillars.reduce(
    (sum, p) => sum + p.signals.reduce((s2, sig) => s2 + sig.criteria.length, 0),
    0,
  );
  const totalSignals = SCORING_RUBRIC.pillars.reduce(
    (sum, p) => sum + p.signals.length,
    0,
  );

  return (
    <div className="min-h-screen bg-background text-neutral-900 font-sans">
      <Nav />
      <main>
        <section className="relative py-20 md:py-28 overflow-hidden">
          <div className="absolute top-10 left-10 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-purple-200/15 rounded-full blur-[100px] pointer-events-none" />

          <div className="container mx-auto px-6 relative z-10">
            <Link
              href="/agentic-shopping-score"
              className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-primary transition-colors mb-8"
              data-testid="link-back-scanner"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Scanner
            </Link>

            <div className="max-w-3xl">
              <h1
                className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight mb-4"
                data-testid="heading-methodology"
              >
                Scoring{" "}
                <span className="bg-gradient-to-r from-primary to-orange-400 bg-clip-text text-transparent">
                  Methodology
                </span>
              </h1>
              <p
                className="text-lg text-neutral-600 leading-relaxed mb-6 max-w-2xl"
                data-testid="text-methodology-intro"
              >
                The Agent Shopping Experience (ASX) Score measures how easily AI
                agents can discover products, search catalogs, and complete
                purchases on your site. Here is every criterion we evaluate.
              </p>

              <div className="flex flex-wrap gap-4 text-sm" data-testid="stats-summary">
                <div className="flex items-center gap-2 bg-white border border-neutral-200 rounded-lg px-4 py-2 shadow-sm">
                  <span className="font-bold text-neutral-900">
                    {SCORING_RUBRIC.totalPoints}
                  </span>
                  <span className="text-neutral-500">Total Points</span>
                </div>
                <div className="flex items-center gap-2 bg-white border border-neutral-200 rounded-lg px-4 py-2 shadow-sm">
                  <span className="font-bold text-neutral-900">
                    {SCORING_RUBRIC.pillars.length}
                  </span>
                  <span className="text-neutral-500">Pillars</span>
                </div>
                <div className="flex items-center gap-2 bg-white border border-neutral-200 rounded-lg px-4 py-2 shadow-sm">
                  <span className="font-bold text-neutral-900">
                    {totalSignals}
                  </span>
                  <span className="text-neutral-500">Signals</span>
                </div>
                <div className="flex items-center gap-2 bg-white border border-neutral-200 rounded-lg px-4 py-2 shadow-sm">
                  <span className="font-bold text-neutral-900">
                    {totalCriteria}
                  </span>
                  <span className="text-neutral-500">Criteria</span>
                </div>
              </div>
            </div>

            <div className="mt-12 bg-white/80 backdrop-blur-sm border border-neutral-200 rounded-2xl p-6 md:p-8 shadow-sm mb-4">
              <h2 className="text-lg font-bold text-neutral-800 mb-3" data-testid="heading-how-it-works">
                How it works
              </h2>
              <div className="grid md:grid-cols-3 gap-6 text-sm text-neutral-600">
                <div>
                  <div className="font-semibold text-neutral-800 mb-1">
                    1. We fetch your site
                  </div>
                  <p>
                    We load your homepage, sitemap.xml, and robots.txt using a
                    real browser — exactly how an AI agent would see your store.
                  </p>
                </div>
                <div>
                  <div className="font-semibold text-neutral-800 mb-1">
                    2. We run automated detectors
                  </div>
                  <p>
                    Pattern-matching checks analyze your HTML for structured
                    data, search forms, checkout flows, accessibility, and more.
                  </p>
                </div>
                <div>
                  <div className="font-semibold text-neutral-800 mb-1">
                    3. We apply the rubric
                  </div>
                  <p>
                    Each criterion below maps to a specific evidence check. Your
                    score is the sum of all matched criteria, capped per signal.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 bg-white/60 backdrop-blur-sm border border-neutral-200 rounded-2xl p-6 md:p-8 shadow-sm text-sm text-neutral-600 mb-4">
              <h3 className="font-semibold text-neutral-800 mb-2" data-testid="heading-reading-guide">
                Reading the tables
              </h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="flex items-start gap-2">
                  <span className="inline-flex items-center justify-center min-w-[2.5rem] px-2 py-0.5 rounded-md text-xs font-bold bg-neutral-100 text-neutral-700 shrink-0">
                    +5
                  </span>
                  <span>Points awarded when the criterion is met</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="inline-flex items-center justify-center min-w-[2.5rem] px-2 py-0.5 rounded-md text-xs font-bold bg-red-100 text-red-700 shrink-0">
                    -2
                  </span>
                  <span>Penalty — points subtracted from your score</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[10px] font-medium text-neutral-400 shrink-0 mt-0.5">
                    (best of tier)
                  </span>
                  <span>
                    Tiered criteria — only the highest matching tier counts
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-green-600 bg-green-100 px-1.5 py-0.5 rounded shrink-0">
                    Full marks
                  </span>
                  <span>If detected, the signal gets its maximum score</span>
                </div>
              </div>
            </div>

            <div className="mt-16" data-testid="rubric-tables">
              {SCORING_RUBRIC.pillars.map((pillar) => (
                <PillarTable key={pillar.id} pillar={pillar} />
              ))}
            </div>

            <div className="mt-8 text-center">
              <Link
                href="/agentic-shopping-score"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-colors shadow-sm"
                data-testid="link-scan-cta"
              >
                Scan your store now
                <ArrowLeft className="w-4 h-4 rotate-180" />
              </Link>
              <p className="text-xs text-neutral-400 mt-3">
                Rubric v{SCORING_RUBRIC.version} — {totalCriteria} criteria
                across {totalSignals} signals
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
