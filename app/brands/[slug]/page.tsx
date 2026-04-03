import { cache } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { storage } from "@/server/storage";
import { getScoreColor } from "@/app/skills/vendor-card";
import type { ASXScoreBreakdown, ASXRecommendation, PillarScore } from "@/lib/agentic-score";
import {
  Layers,
  Zap,
  Shield,
  FileJson,
  BarChart3,
  Code,
  Search,
  Clock,
  UserCheck,
  ClipboardList,
  Workflow,
  ArrowRight,
  ExternalLink,
  Copy,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Globe,
} from "lucide-react";
import Link from "next/link";
import { BrandScanTrigger } from "./scan-trigger";
import { CopyUrlButton } from "./copy-url-button";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://creditclaw.com";

const getBrand = cache(async (slug: string) => {
  return storage.getBrandBySlug(slug);
});

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const brand = await getBrand(slug);

  if (!brand) {
    return { title: "Brand Not Found | CreditClaw" };
  }

  const scoreText = brand.overallScore !== null ? `Score: ${brand.overallScore}/100` : "Not yet scanned";
  const title = `${brand.name} Agent Shopping Score | CreditClaw`;
  const description = `${brand.name} (${brand.domain}) — ${scoreText}. See how well AI agents can shop this store.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      url: `${BASE_URL}/brands/${brand.slug}`,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    alternates: {
      canonical: `${BASE_URL}/brands/${brand.slug}`,
    },
  };
}

const SIGNAL_META: Record<string, { icon: React.ReactNode; pillar: string }> = {
  json_ld: { icon: <FileJson className="w-4 h-4" />, pillar: "Clarity" },
  product_feed: { icon: <BarChart3 className="w-4 h-4" />, pillar: "Clarity" },
  clean_html: { icon: <Code className="w-4 h-4" />, pillar: "Clarity" },
  search_api: { icon: <Zap className="w-4 h-4" />, pillar: "Speed" },
  site_search: { icon: <Search className="w-4 h-4" />, pillar: "Speed" },
  page_load: { icon: <Clock className="w-4 h-4" />, pillar: "Speed" },
  access_auth: { icon: <UserCheck className="w-4 h-4" />, pillar: "Reliability" },
  order_management: { icon: <ClipboardList className="w-4 h-4" />, pillar: "Reliability" },
  checkout_flow: { icon: <Workflow className="w-4 h-4" />, pillar: "Reliability" },
  bot_tolerance: { icon: <Shield className="w-4 h-4" />, pillar: "Reliability" },
};

const PILLAR_CONFIG = {
  clarity: { label: "Clarity", subtitle: "Can agents understand your catalog?", color: "blue" as const, icon: <Layers className="w-5 h-5" /> },
  speed: { label: "Speed", subtitle: "Can agents find products quickly?", color: "green" as const, icon: <Zap className="w-5 h-5" /> },
  reliability: { label: "Reliability", subtitle: "Can agents complete a purchase?", color: "purple" as const, icon: <Shield className="w-5 h-5" /> },
};

const PILLAR_COLORS = {
  blue: { bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-100", bar: "bg-blue-500" },
  green: { bg: "bg-green-50", text: "text-green-600", border: "border-green-100", bar: "bg-green-500" },
  purple: { bg: "bg-purple-50", text: "text-purple-600", border: "border-purple-100", bar: "bg-purple-500" },
};

function getScoreLabel(score: number): string {
  if (score <= 20) return "Poor";
  if (score <= 40) return "Needs Work";
  if (score <= 60) return "Fair";
  if (score <= 80) return "Good";
  return "Excellent";
}

function getImpactColor(impact: string) {
  if (impact === "high") return { bg: "bg-red-50", text: "text-red-700", border: "border-red-100" };
  if (impact === "medium") return { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-100" };
  return { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-100" };
}

export default async function BrandPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const brand = await getBrand(slug);

  if (!brand) {
    notFound();
  }

  const hasScore = brand.overallScore !== null;
  const score = brand.overallScore ?? 0;
  const label = hasScore ? getScoreLabel(score) : null;
  const scoreColor = getScoreColor(brand.overallScore);
  const breakdown = brand.scoreBreakdown as ASXScoreBreakdown | null;
  const recommendations = (brand.recommendations as ASXRecommendation[] | null) ?? [];
  const lastScanned = brand.lastScannedAt ? new Date(brand.lastScannedAt) : null;

  return (
    <div className="min-h-screen bg-background text-neutral-900 font-sans">
      <Nav />
      <main>
        <section className="relative py-12 md:py-16 overflow-hidden">
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />

          <div className="container mx-auto px-6 relative z-10">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-start gap-4 mb-8" data-testid="brand-header">
                <div className="w-14 h-14 rounded-2xl bg-neutral-100 flex items-center justify-center flex-shrink-0 border border-neutral-200">
                  <span className="text-xl font-extrabold text-neutral-600">
                    {brand.name[0]?.toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0">
                  <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight" data-testid="text-brand-name">
                    {brand.name}
                  </h1>
                  <div className="flex items-center gap-3 mt-1">
                    <a
                      href={`https://${brand.domain}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-neutral-500 hover:text-primary font-medium flex items-center gap-1 transition-colors"
                      data-testid="link-brand-domain"
                    >
                      {brand.domain}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    {brand.sector !== "uncategorized" && (
                      <span className="text-xs font-semibold text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded-full" data-testid="badge-sector">
                        {brand.sector}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {!hasScore ? (
                <div className="bg-white rounded-2xl border border-neutral-100 p-8 md:p-12 text-center shadow-sm" data-testid="card-no-score">
                  <div className="w-16 h-16 rounded-2xl bg-neutral-50 flex items-center justify-center mx-auto mb-6">
                    <Globe className="w-7 h-7 text-neutral-400" />
                  </div>
                  <h2 className="text-xl font-bold mb-3" data-testid="heading-no-score">
                    This brand hasn&apos;t been scanned yet
                  </h2>
                  <p className="text-neutral-600 text-sm mb-8 max-w-md mx-auto">
                    Run a free scan to see how well AI shopping agents can find products, search the catalog, and complete purchases on {brand.name}.
                  </p>
                  <BrandScanTrigger domain={brand.domain} slug={brand.slug} />
                </div>
              ) : (
                <>
                  <div className="grid md:grid-cols-[280px_1fr] gap-6 mb-8">
                    <div className="bg-white rounded-2xl border border-neutral-100 p-6 shadow-sm flex flex-col items-center justify-center text-center" data-testid="card-overall-score">
                      <div className="relative w-36 h-36 mb-4">
                        <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                          <circle cx="60" cy="60" r="52" fill="none" stroke="currentColor" strokeWidth="8" className="text-neutral-100" />
                          <circle
                            cx="60" cy="60" r="52" fill="none" strokeWidth="8"
                            strokeLinecap="round"
                            strokeDasharray={`${(score / 100) * 327} 327`}
                            className={scoreColor.text}
                            stroke="currentColor"
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-4xl font-extrabold" data-testid="text-score-value">{score}</span>
                          <span className="text-xs text-neutral-400 font-medium">/ 100</span>
                        </div>
                      </div>
                      <span className={`inline-block text-sm font-bold px-3 py-1 rounded-full ${scoreColor.bg} ${scoreColor.text} ${scoreColor.border} border`} data-testid="badge-score-label">
                        {label}
                      </span>
                      {lastScanned && (
                        <p className="text-[11px] text-neutral-400 mt-3" data-testid="text-last-scanned">
                          Scanned {lastScanned.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </p>
                      )}
                    </div>

                    {breakdown && (
                      <div className="space-y-3" data-testid="pillar-breakdown">
                        {(Object.entries(PILLAR_CONFIG) as [keyof typeof PILLAR_CONFIG, typeof PILLAR_CONFIG[keyof typeof PILLAR_CONFIG]][]).map(([key, config]) => {
                          const pillar = breakdown[key as keyof ASXScoreBreakdown] as PillarScore | undefined;
                          if (!pillar) return null;
                          const c = PILLAR_COLORS[config.color];
                          const pct = pillar.max > 0 ? (pillar.score / pillar.max) * 100 : 0;

                          return (
                            <div key={key} className="bg-white rounded-2xl border border-neutral-100 p-5 shadow-sm" data-testid={`card-pillar-${key}`}>
                              <div className="flex items-center gap-3 mb-3">
                                <div className={`w-9 h-9 rounded-xl ${c.bg} flex items-center justify-center`}>
                                  <span className={c.text}>{config.icon}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between">
                                    <h3 className="font-bold text-sm">{config.label}</h3>
                                    <span className="text-sm font-extrabold text-neutral-900">{pillar.score}<span className="text-neutral-400 font-medium">/{pillar.max}</span></span>
                                  </div>
                                  <p className="text-xs text-neutral-500">{config.subtitle}</p>
                                </div>
                              </div>
                              <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden">
                                <div className={`h-full ${c.bar} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                              </div>
                              <div className="mt-3 grid grid-cols-2 gap-2">
                                {pillar.signals.map((signal) => (
                                  <div key={signal.key} className="flex items-center gap-2 text-xs" data-testid={`signal-${signal.key}`}>
                                    <span className={`flex-shrink-0 ${c.text}`}>
                                      {SIGNAL_META[signal.key]?.icon ?? <CheckCircle2 className="w-3.5 h-3.5" />}
                                    </span>
                                    <span className="text-neutral-600 truncate">{signal.label}</span>
                                    <span className="ml-auto font-bold text-neutral-900">{signal.score}/{signal.max}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {recommendations.length > 0 && (
                    <div className="bg-white rounded-2xl border border-neutral-100 p-6 md:p-8 shadow-sm mb-8" data-testid="card-recommendations">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
                          <TrendingUp className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                          <h2 className="font-bold text-lg">Recommendations</h2>
                          <p className="text-xs text-neutral-500">Prioritized by potential score improvement</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        {recommendations.map((rec, i) => {
                          const impact = getImpactColor(rec.impact);
                          return (
                            <div key={i} className="flex items-start gap-3 py-3 border-b border-neutral-50 last:border-0" data-testid={`rec-${rec.signal}`}>
                              <div className="flex-shrink-0 mt-0.5">
                                {rec.impact === "high" ? (
                                  <AlertTriangle className="w-4 h-4 text-red-500" />
                                ) : rec.impact === "medium" ? (
                                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                                ) : (
                                  <CheckCircle2 className="w-4 h-4 text-blue-500" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-semibold text-sm text-neutral-900">{rec.title}</span>
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${impact.bg} ${impact.text} border ${impact.border}`}>
                                    +{rec.potentialGain} pts
                                  </span>
                                </div>
                                <p className="text-xs text-neutral-600 leading-relaxed">{rec.description}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-4 mb-8">
                    <CopyUrlButton slug={brand.slug} />
                    <BrandScanTrigger domain={brand.domain} slug={brand.slug} variant="secondary" />
                    <Link
                      href="/axs"
                      className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-xl border border-neutral-200 bg-white text-sm font-semibold text-neutral-600 hover:bg-neutral-50 transition-colors"
                      data-testid="link-how-scoring-works"
                    >
                      How scoring works
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
