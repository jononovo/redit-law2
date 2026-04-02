"use client";

import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useState, useEffect } from "react";
import { Search, ArrowRight, ExternalLink, Package, Download, Terminal } from "lucide-react";

type BrandRow = {
  slug: string;
  name: string;
  domain: string;
  sector: string;
  overallScore: number | null;
  tier: string | null;
  maturity: string;
  logoUrl: string | null;
  checkoutMethods?: string[];
};

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-xs text-neutral-400">—</span>;
  let color = "bg-neutral-100 text-neutral-600";
  if (score >= 80) color = "bg-emerald-50 text-emerald-700";
  else if (score >= 60) color = "bg-amber-50 text-amber-700";
  else if (score >= 40) color = "bg-orange-50 text-orange-700";
  else color = "bg-red-50 text-red-700";
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold tabular-nums ${color}`}>
      {score}
    </span>
  );
}

function StatCard({ icon: Icon, value, label }: { icon: React.ElementType; value: string; label: string }) {
  return (
    <div className="flex items-center gap-4 p-5 rounded-xl bg-neutral-50 border border-neutral-200">
      <div className="w-10 h-10 rounded-lg bg-neutral-900 text-white flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5" strokeWidth={1.5} />
      </div>
      <div>
        <div className="text-2xl font-extrabold text-neutral-900 tabular-nums">{value}</div>
        <div className="text-xs font-medium text-neutral-500">{label}</div>
      </div>
    </div>
  );
}

export default function BrandsLanding() {
  const [search, setSearch] = useState("");
  const [brands, setBrands] = useState<BrandRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v1/brands?limit=100&lite=true")
      .then((r) => r.json())
      .then((data) => {
        setBrands(data.brands || data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = search.trim()
    ? brands.filter(
        (b) =>
          b.name.toLowerCase().includes(search.toLowerCase()) ||
          b.domain.toLowerCase().includes(search.toLowerCase()) ||
          b.sector.toLowerCase().includes(search.toLowerCase())
      )
    : brands;

  const sectors = [...new Set(brands.map((b) => b.sector))].sort();

  return (
    <div className="min-h-screen bg-white text-neutral-900 font-sans">
      <Nav />
      <main>
        <section className="pt-24 pb-12">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto text-center mb-12">
              <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-neutral-900 leading-[1.1] mb-4" data-testid="text-hero-title">
                Find a skill for any brand.
              </h1>
              <p className="text-lg md:text-xl text-neutral-500 font-medium max-w-2xl mx-auto" data-testid="text-hero-subtitle">
                Shopping skills teach AI agents how to search, browse, and buy from real stores.
                Find the right brand, download the skill, start purchasing.
              </p>
            </div>

            <div className="max-w-2xl mx-auto mb-10">
              <div className="relative">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                <Input
                  type="text"
                  placeholder='Search brands — try "office supplies" or "amazon"'
                  aria-label="Search the brand skill catalog"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-16 pl-14 pr-6 rounded-xl bg-neutral-50 border-neutral-200 text-lg font-medium placeholder:text-neutral-400 focus-visible:ring-neutral-900 focus-visible:border-neutral-400"
                  data-testid="input-search-brands"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto">
              <StatCard icon={Package} value={String(brands.length)} label="Brand skills" />
              <StatCard icon={Download} value={String(sectors.length)} label="Sectors" />
              <StatCard icon={Terminal} value="CLI" label="npx brands add" />
            </div>
          </div>
        </section>

        {sectors.length > 0 && !search.trim() && (
          <section className="pb-6">
            <div className="container mx-auto px-6">
              <div className="max-w-5xl mx-auto flex flex-wrap gap-2 justify-center">
                {sectors.map((sector) => (
                  <Link
                    key={sector}
                    href={`/skills?sector=${encodeURIComponent(sector)}`}
                    className="px-3 py-1.5 rounded-lg bg-neutral-100 text-xs font-semibold text-neutral-600 hover:bg-neutral-200 hover:text-neutral-900 transition-colors capitalize"
                    data-testid={`chip-sector-${sector}`}
                  >
                    {sector}
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="pb-24">
          <div className="container mx-auto px-6">
            <div className="max-w-5xl mx-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-neutral-400 uppercase tracking-wider" data-testid="text-catalog-title">
                  {search.trim() ? `${filtered.length} result${filtered.length !== 1 ? "s" : ""}` : "All brands"}
                </h2>
                <Link href="/skills" className="text-sm font-semibold text-neutral-500 hover:text-neutral-900 transition-colors flex items-center gap-1" data-testid="link-full-catalog">
                  Full catalog <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              <div className="rounded-xl border border-neutral-200 overflow-hidden bg-white">
                <div className="hidden md:grid grid-cols-[1fr_120px_120px_100px_60px] gap-4 px-5 py-3 bg-neutral-50 border-b border-neutral-200 text-xs font-bold text-neutral-400 uppercase tracking-wider">
                  <span>Brand</span>
                  <span>Sector</span>
                  <span>Tier</span>
                  <span>Score</span>
                  <span></span>
                </div>

                {loading ? (
                  <div className="px-5 py-20 text-center">
                    <div className="inline-block w-5 h-5 border-2 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
                    <p className="text-sm text-neutral-400 mt-3 font-medium">Loading skills...</p>
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="px-5 py-20 text-center">
                    <p className="text-sm text-neutral-500 font-medium">
                      {search.trim() ? `No brands match "${search}"` : "No skills in the registry yet."}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-neutral-100">
                    {filtered.map((brand) => (
                      <Link
                        key={brand.slug}
                        href={`/skills/${brand.slug}`}
                        className="grid grid-cols-1 md:grid-cols-[1fr_120px_120px_100px_60px] gap-2 md:gap-4 px-5 py-4 hover:bg-neutral-50 transition-colors items-center group"
                        data-testid={`row-brand-${brand.slug}`}
                      >
                        <div className="flex items-center gap-3">
                          {brand.logoUrl ? (
                            <img src={brand.logoUrl} alt="" className="w-7 h-7 rounded-md object-contain bg-neutral-100 p-0.5" />
                          ) : (
                            <div className="w-7 h-7 rounded-md bg-neutral-100 flex items-center justify-center text-xs font-bold text-neutral-400">
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
