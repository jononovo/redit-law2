"use client";

import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useState, useEffect } from "react";
import { Search, ExternalLink, ArrowRight } from "lucide-react";

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
  if (score === null) return <span className="text-xs text-neutral-600">—</span>;
  let color = "bg-neutral-800 text-neutral-300";
  if (score >= 80) color = "bg-emerald-900/60 text-emerald-400";
  else if (score >= 60) color = "bg-amber-900/60 text-amber-400";
  else if (score >= 40) color = "bg-orange-900/60 text-orange-400";
  else color = "bg-red-900/60 text-red-400";
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-none text-xs font-bold tabular-nums ${color}`}>
      {score}
    </span>
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

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans">
      <Nav />
      <main>
        <section className="pt-20 pb-8">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto text-center mb-8">
              <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white leading-[1.1] mb-3" data-testid="text-hero-title">
                Find the shopping skill for any brand.
              </h1>
              <p className="text-lg text-neutral-400 font-medium" data-testid="text-hero-subtitle">
                Every skill an AI agent needs to shop at a real store.
              </p>
            </div>

            <div className="max-w-2xl mx-auto mb-6">
              <div className="relative">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                <Input
                  type="text"
                  placeholder='Search brands, sectors, domains...'
                  aria-label="Search the brand skill catalog"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-14 pl-14 pr-6 rounded-none bg-neutral-900 border-neutral-800 text-base font-medium text-white placeholder:text-neutral-500 focus-visible:ring-white/20 focus-visible:border-neutral-600"
                  data-testid="input-search-brands"
                />
              </div>
            </div>

            <div className="max-w-2xl mx-auto text-center mb-10">
              <Link
                href="/agentic-shopping-score"
                className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-400 hover:text-white transition-colors"
                data-testid="link-create-skill"
              >
                Create a shopping skill for your brand with a single click
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </section>

        <section className="pb-24">
          <div className="container mx-auto px-6">
            <div className="max-w-5xl mx-auto">
              <div className="border border-neutral-800 overflow-hidden bg-neutral-900/50">
                <div className="hidden md:grid grid-cols-[1fr_120px_120px_100px_60px] gap-4 px-5 py-3 bg-neutral-900 border-b border-neutral-800 text-xs font-bold text-neutral-500 uppercase tracking-wider">
                  <span>Brand</span>
                  <span>Sector</span>
                  <span>Tier</span>
                  <span>Score</span>
                  <span></span>
                </div>

                {loading ? (
                  <div className="px-5 py-20 text-center">
                    <div className="inline-block w-5 h-5 border-2 border-neutral-700 border-t-white rounded-full animate-spin" />
                    <p className="text-sm text-neutral-500 mt-3 font-medium">Loading skills...</p>
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="px-5 py-20 text-center">
                    <p className="text-sm text-neutral-500 font-medium">
                      {search.trim() ? `No brands match "${search}"` : "No skills in the registry yet."}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-neutral-800/60">
                    {filtered.map((brand) => (
                      <Link
                        key={brand.slug}
                        href={`/skills/${brand.slug}`}
                        className="grid grid-cols-1 md:grid-cols-[1fr_120px_120px_100px_60px] gap-2 md:gap-4 px-5 py-4 hover:bg-neutral-800/40 transition-colors items-center group"
                        data-testid={`row-brand-${brand.slug}`}
                      >
                        <div className="flex items-center gap-3">
                          {brand.logoUrl ? (
                            <img src={brand.logoUrl} alt="" className="w-6 h-6 rounded-none object-contain bg-neutral-800 p-0.5" />
                          ) : (
                            <div className="w-6 h-6 rounded-none bg-neutral-800 flex items-center justify-center text-xs font-bold text-neutral-500">
                              {brand.name.charAt(0)}
                            </div>
                          )}
                          <div>
                            <span className="text-sm font-semibold text-white group-hover:underline">{brand.name}</span>
                            <span className="text-xs text-neutral-500 ml-2 hidden sm:inline">{brand.domain}</span>
                          </div>
                        </div>
                        <span className="text-xs font-medium text-neutral-400 capitalize">{brand.sector}</span>
                        <span className="text-xs font-medium text-neutral-400 capitalize">{brand.tier?.replace(/_/g, " ") || "—"}</span>
                        <ScoreBadge score={brand.overallScore} />
                        <ExternalLink className="w-4 h-4 text-neutral-600 group-hover:text-neutral-400 transition-colors hidden md:block" />
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
