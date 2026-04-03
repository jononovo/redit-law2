"use client";

import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ExternalLink } from "lucide-react";

type BrandRow = {
  slug: string;
  name: string;
  domain: string;
  sector: string;
  overallScore: number | null;
  tier: string | null;
  maturity: string;
  logoUrl: string | null;
};

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-xs text-neutral-400">—</span>;
  let color = "bg-neutral-100 text-neutral-600";
  if (score >= 80) color = "bg-green-50 text-green-700";
  else if (score >= 60) color = "bg-yellow-50 text-yellow-700";
  else if (score >= 40) color = "bg-orange-50 text-orange-700";
  else color = "bg-red-50 text-red-700";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${color}`}>
      {score}
    </span>
  );
}

export default function ShopyLanding() {
  const router = useRouter();
  const [domain, setDomain] = useState("");
  const [brands, setBrands] = useState<BrandRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v1/brands?limit=50&lite=true")
      .then((r) => r.json())
      .then((data) => {
        setBrands(data.brands || data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!domain.trim()) return;
    router.push(`/agentic-shopping-score?domain=${encodeURIComponent(domain.trim())}`);
  };

  return (
    <div className="min-h-screen bg-white text-neutral-900 font-sans">
      <Nav />
      <main>
        <section className="pt-28 pb-16">
          <div className="container mx-auto px-6">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-neutral-900 leading-[1.1] mb-4" data-testid="text-hero-title">
                Is your brand agent-friendly?
              </h1>
              <p className="text-lg md:text-xl text-neutral-500 font-medium mb-10" data-testid="text-hero-subtitle">
                Check your{" "}
                <Link href="/agentic-shopping-score" className="text-neutral-900 underline underline-offset-4 decoration-neutral-300 hover:decoration-neutral-900 transition-colors font-semibold">
                  agentic-shopping-score
                </Link>
              </p>

              <form onSubmit={handleScan} className="flex flex-col sm:flex-row gap-3 max-w-xl mx-auto" data-testid="form-scan-domain">
                <Input
                  type="text"
                  placeholder="yourdomain.com"
                  aria-label="Enter your store domain to check ASX Score"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  className="h-16 px-6 rounded-xl bg-neutral-50 border-neutral-200 text-lg font-medium placeholder:text-neutral-400 focus-visible:ring-neutral-900 focus-visible:border-neutral-400"
                  data-testid="input-scan-domain"
                />
                <Button
                  type="submit"
                  className="h-16 px-6 rounded-xl bg-neutral-900 text-white hover:bg-neutral-800 font-bold text-base gap-2 shrink-0"
                  data-testid="button-scan-domain"
                >
                  Scan
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </form>
            </div>
          </div>
        </section>

        <section className="pb-24">
          <div className="container mx-auto px-6">
            <div className="max-w-5xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-sm font-bold text-neutral-400 uppercase tracking-wider" data-testid="text-catalog-title">
                  Skill Catalog
                </h2>
                <Link href="/skills" className="text-sm font-semibold text-neutral-500 hover:text-neutral-900 transition-colors flex items-center gap-1" data-testid="link-view-all-skills">
                  View all <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              <div className="rounded-xl border border-neutral-200 overflow-hidden bg-white">
                <div className="hidden md:grid grid-cols-[1fr_120px_120px_100px_80px] gap-4 px-5 py-3 bg-neutral-50 border-b border-neutral-200 text-xs font-bold text-neutral-400 uppercase tracking-wider">
                  <span>Brand</span>
                  <span>Sector</span>
                  <span>Tier</span>
                  <span>ASX Score</span>
                  <span></span>
                </div>

                {loading ? (
                  <div className="px-5 py-16 text-center">
                    <div className="inline-block w-5 h-5 border-2 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
                    <p className="text-sm text-neutral-400 mt-3 font-medium">Loading catalog...</p>
                  </div>
                ) : brands.length === 0 ? (
                  <div className="px-5 py-16 text-center">
                    <p className="text-sm text-neutral-400 font-medium">No skills in catalog yet. Scan a domain to add the first one.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-neutral-100">
                    {brands.map((brand) => (
                      <Link
                        key={brand.slug}
                        href={`/skills/${brand.slug}`}
                        className="grid grid-cols-1 md:grid-cols-[1fr_120px_120px_100px_80px] gap-2 md:gap-4 px-5 py-4 hover:bg-neutral-50 transition-colors items-center group"
                        data-testid={`row-brand-${brand.slug}`}
                      >
                        <div className="flex items-center gap-3">
                          {brand.logoUrl ? (
                            <img src={brand.logoUrl} alt="" className="w-6 h-6 rounded object-contain bg-neutral-100" />
                          ) : (
                            <div className="w-6 h-6 rounded bg-neutral-100 flex items-center justify-center text-xs font-bold text-neutral-400">
                              {brand.name.charAt(0)}
                            </div>
                          )}
                          <div>
                            <span className="text-sm font-semibold text-neutral-900 group-hover:underline">{brand.name}</span>
                            <span className="text-xs text-neutral-400 ml-2 hidden sm:inline">{brand.domain}</span>
                          </div>
                        </div>
                        <span className="text-xs font-medium text-neutral-500 capitalize">{brand.sector}</span>
                        <span className="text-xs font-medium text-neutral-500 capitalize">{brand.tier?.replace(/_/g, " ") || "—"}</span>
                        <ScoreBadge score={brand.overallScore} />
                        <ExternalLink className="w-4 h-4 text-neutral-300 group-hover:text-neutral-500 transition-colors hidden md:block" />
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
