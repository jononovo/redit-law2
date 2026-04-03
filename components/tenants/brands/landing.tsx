"use client";

import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { useState, useEffect, useMemo } from "react";
import { Search, ArrowRight, ChevronRight, Terminal } from "lucide-react";
import { CAPABILITY_LABELS } from "@/lib/procurement-skills/taxonomy/capabilities";
import { CHECKOUT_METHOD_LABELS } from "@/lib/procurement-skills/taxonomy/checkout-methods";

type BrandRow = {
  slug: string;
  name: string;
  domain: string;
  sector: string;
  maturity: string;
  logoUrl: string | null;
  capabilities: string[] | null;
  checkoutMethods: string[] | null;
};

const MATURITY_STYLES: Record<string, string> = {
  verified: "bg-emerald-900/40 text-emerald-400 border-emerald-800",
  official: "bg-blue-900/40 text-blue-400 border-blue-800",
  beta: "bg-amber-900/40 text-amber-400 border-amber-800",
  community: "bg-purple-900/40 text-purple-400 border-purple-800",
  draft: "bg-neutral-800 text-neutral-400 border-neutral-700",
};

function MaturityBadge({ maturity }: { maturity: string }) {
  const style = MATURITY_STYLES[maturity] ?? MATURITY_STYLES.draft;
  return (
    <Badge className={`text-[10px] font-bold uppercase tracking-wider border rounded-none px-2 py-0.5 ${style}`} data-testid={`badge-maturity-${maturity}`}>
      {maturity}
    </Badge>
  );
}

function CapabilityPills({ capabilities }: { capabilities: string[] | null }) {
  const caps = capabilities ?? [];
  if (caps.length === 0) return <span className="text-xs text-neutral-600">—</span>;
  const shown = caps.slice(0, 3);
  const remaining = caps.length - shown.length;
  return (
    <div className="flex flex-wrap gap-1" data-testid="pills-capabilities">
      {shown.map((cap) => (
        <span key={cap} className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium text-neutral-300 bg-neutral-800 border border-neutral-700 rounded-none">
          {(CAPABILITY_LABELS as Record<string, string>)[cap] ?? cap}
        </span>
      ))}
      {remaining > 0 && (
        <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium text-neutral-500 bg-neutral-900 border border-neutral-800 rounded-none">
          +{remaining}
        </span>
      )}
    </div>
  );
}

function CheckoutLabel({ methods }: { methods: string[] | null }) {
  const m = methods ?? [];
  if (m.length === 0) return <span className="text-xs text-neutral-600">—</span>;
  return (
    <span className="text-xs font-medium text-neutral-300" data-testid="text-checkout-method">
      {(CHECKOUT_METHOD_LABELS as Record<string, string>)[m[0]] ?? m[0]}
      {m.length > 1 && <span className="text-neutral-500 ml-1">+{m.length - 1}</span>}
    </span>
  );
}

export default function BrandsLanding() {
  const [search, setSearch] = useState("");
  const [brands, setBrands] = useState<BrandRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v1/brands?limit=100&lite=true&maturity=verified,official,beta,community,draft")
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

  const sectorCount = useMemo(() => new Set(brands.map((b) => b.sector)).size, [brands]);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans">
      <Nav />
      <main>
        <section className="pt-20 pb-8">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto text-center mb-8">
              <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white leading-[1.1] mb-3" data-testid="text-hero-title">
                The skill registry for agentic shopping.
              </h1>
              <p className="text-lg text-neutral-400 font-medium" data-testid="text-hero-subtitle">
                SKILL.md files that teach AI agents how to search, browse, and buy from real stores.
              </p>
            </div>

            <div className="max-w-2xl mx-auto mb-4">
              <div className="relative">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                <Input
                  type="text"
                  placeholder="Search brands, sectors, domains..."
                  aria-label="Search the brand skill catalog"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-14 pl-14 pr-6 rounded-none bg-neutral-900 border-neutral-800 text-base font-medium text-white placeholder:text-neutral-500 focus-visible:ring-white/20 focus-visible:border-neutral-600"
                  data-testid="input-search-brands"
                />
              </div>
            </div>

            {!loading && (
              <div className="max-w-2xl mx-auto flex items-center justify-center gap-4 text-sm font-mono text-neutral-500 tracking-wide mb-4" data-testid="stats-bar">
                <span>{brands.length} skills indexed</span>
                <span className="text-neutral-700">·</span>
                <span>{sectorCount} sectors</span>
                <span className="text-neutral-700">·</span>
                <span className="inline-flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5" />
                  npx shopy add &lt;slug&gt;
                </span>
              </div>
            )}

            <div className="max-w-2xl mx-auto text-center mb-10">
              <Link
                href="/agentic-shopping-score"
                className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-400 hover:text-white transition-colors"
                data-testid="link-create-skill"
              >
                Submit a new skill
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </section>

        <section className="pb-24">
          <div className="container mx-auto px-6">
            <div className="max-w-5xl mx-auto">
              <div className="border border-neutral-800 overflow-hidden bg-neutral-900/50">
                <div className="hidden md:grid grid-cols-[1fr_180px_100px_100px_40px] gap-4 px-5 py-3 bg-neutral-900 border-b border-neutral-800">
                  <span className="text-sm font-mono text-neutral-400 tracking-wide uppercase">Skill</span>
                  <span className="text-sm font-mono text-neutral-400 tracking-wide uppercase">Capabilities</span>
                  <span className="text-sm font-mono text-neutral-400 tracking-wide uppercase">Checkout</span>
                  <span className="text-sm font-mono text-neutral-400 tracking-wide uppercase">Maturity</span>
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
                      {search.trim() ? `No skills match "${search}"` : "No skills in the registry yet."}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-neutral-800/60">
                    {filtered.map((brand) => (
                      <Link
                        key={brand.slug}
                        href={`/skills/${brand.slug}`}
                        className="grid grid-cols-1 md:grid-cols-[1fr_180px_100px_100px_40px] gap-2 md:gap-4 px-5 py-4 hover:bg-neutral-800/40 transition-colors items-center group"
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
                        <CapabilityPills capabilities={brand.capabilities} />
                        <CheckoutLabel methods={brand.checkoutMethods} />
                        <MaturityBadge maturity={brand.maturity} />
                        <ChevronRight className="w-4 h-4 text-neutral-600 group-hover:text-neutral-400 transition-colors hidden md:block" />
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
