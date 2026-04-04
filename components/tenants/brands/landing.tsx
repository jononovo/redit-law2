"use client";

import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef, useCallback } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { CAPABILITY_LABELS } from "@/lib/procurement-skills/taxonomy/capabilities";
import { CHECKOUT_METHOD_LABELS } from "@/lib/procurement-skills/taxonomy/checkout-methods";
import { ASSIGNABLE_SECTORS } from "@/lib/procurement-skills/taxonomy/sectors";
import type { VendorSector } from "@/lib/procurement-skills/taxonomy/sectors";
import { ScanProgress } from "@/components/scan-progress";
import { useDomainScan } from "@/hooks/use-domain-scan";

const SECTOR_SHORT_LABELS: Record<string, string> = {
  "animals-pet-supplies": "Pets",
  "apparel-accessories": "Apparel",
  "arts-entertainment": "Arts",
  "baby-toddler": "Baby",
  "business-industrial": "B2B",
  "cameras-optics": "Cameras",
  "electronics": "Electronics",
  "food-beverages-tobacco": "Food",
  "furniture": "Furniture",
  "hardware": "Hardware",
  "health-beauty": "Beauty",
  "home-garden": "Home",
  "luggage-bags": "Bags",
  "mature": "Adult",
  "media": "Media",
  "office-supplies": "Office",
  "religious-ceremonial": "Religious",
  "software": "Software",
  "sporting-goods": "Sports",
  "toys-games": "Toys",
  "vehicles-parts": "Vehicles",
  "food-services": "Dining",
  "travel": "Travel",
  "education": "Education",
  "events": "Events",
  "specialty": "Specialty",
  "luxury": "Luxury",
  "multi-sector": "General",
};

const ALL_FILTER_SECTORS: string[] = ["luxury", ...ASSIGNABLE_SECTORS, "multi-sector"];

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

function SectorButton({
  label,
  active,
  onClick,
  testId,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  testId: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center rounded-none px-3 py-1.5 text-xs font-mono font-medium whitespace-nowrap transition-colors border ${
        active
          ? "bg-white text-neutral-950 border-white"
          : "bg-transparent text-neutral-500 border-neutral-800 hover:text-white hover:border-neutral-600"
      }`}
      data-testid={testId}
    >
      {label}
    </button>
  );
}

function SectorFilterBar({
  activeSector,
  onSelect,
}: {
  activeSector: string | null;
  onSelect: (sector: string | null) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", checkScroll, { passive: true });
    const ro = new ResizeObserver(checkScroll);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      ro.disconnect();
    };
  }, [checkScroll]);

  const scroll = (dir: "left" | "right") => {
    scrollRef.current?.scrollBy({
      left: dir === "left" ? -200 : 200,
      behavior: "smooth",
    });
  };

  const buttons = (
    <>
      <SectorButton
        label="All"
        active={activeSector === null}
        onClick={() => onSelect(null)}
        testId="filter-sector-all"
      />
      {ALL_FILTER_SECTORS.map((sector) => (
        <SectorButton
          key={sector}
          label={SECTOR_SHORT_LABELS[sector] ?? sector}
          active={activeSector === sector}
          onClick={() => onSelect(sector)}
          testId={`filter-sector-${sector}`}
        />
      ))}
    </>
  );

  return (
    <div data-testid="sector-filter-bar">
      <div className="hidden md:flex flex-wrap items-center justify-center gap-1.5 py-1">
        {buttons}
      </div>

      <div className="relative md:hidden">
        {canScrollLeft && (
          <button
            onClick={() => scroll("left")}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-none bg-neutral-900 border border-neutral-700 flex items-center justify-center text-neutral-400 hover:text-white transition-colors"
            data-testid="button-sector-scroll-left"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
        <div
          ref={scrollRef}
          className="flex items-center gap-1.5 overflow-x-auto px-1 py-1 [&::-webkit-scrollbar]:hidden"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {buttons}
        </div>
        {canScrollRight && (
          <button
            onClick={() => scroll("right")}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-none bg-neutral-900 border border-neutral-700 flex items-center justify-center text-neutral-400 hover:text-white transition-colors"
            data-testid="button-sector-scroll-right"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

export default function BrandsLanding() {
  const router = useRouter();
  const scan = useDomainScan();
  const [brands, setBrands] = useState<BrandRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSector, setActiveSector] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const base = "/api/v1/brands?limit=100&lite=true&maturity=verified,official,beta,community,draft";
    let url = base;
    if (activeSector === "luxury") {
      url += "&tier=luxury,ultra_luxury";
    } else if (activeSector) {
      url += `&sector=${activeSector}`;
    }
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        setBrands(data.brands || data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [activeSector]);

  useEffect(() => {
    if (scan.status === "done" && scan.result) {
      router.push(`/skills/${scan.result.slug}`);
    }
  }, [scan.status, scan.result, router]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && scan.status !== "scanning") {
      scan.triggerScan();
    }
  }

  const isScanning = scan.status === "scanning";

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans">
      <Nav />
      <main>
        <section className="pt-20 pb-8">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto text-center mb-8">
              <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white leading-[1.1] mb-3" data-testid="text-hero-title">
                The skill registry for agentic shopping
              </h1>
              <p className="text-lg text-neutral-400 font-medium" data-testid="text-hero-subtitle">
                Create a shopping skill for your brand with a single click
              </p>
            </div>

            <div className="max-w-2xl mx-auto mb-10">
              <div className="flex">
                <Input
                  type="text"
                  placeholder="Enter a domain (e.g. allbirds.com)"
                  aria-label="Enter a domain to create a shopping skill"
                  value={scan.domain}
                  onChange={(e) => {
                    scan.setDomain(e.target.value);
                    if (scan.status === "error") scan.reset();
                  }}
                  onKeyDown={handleKeyDown}
                  disabled={isScanning}
                  className="h-14 px-6 rounded-none bg-neutral-900 border-neutral-800 border-r-0 text-base font-medium text-white placeholder:text-neutral-500 focus-visible:ring-white/20 focus-visible:border-neutral-600 flex-1"
                  data-testid="input-create-skill"
                />
                <button
                  onClick={() => scan.triggerScan()}
                  disabled={isScanning}
                  className="h-14 px-6 bg-white text-neutral-950 font-bold text-sm tracking-wide uppercase border border-white hover:bg-neutral-200 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
                  data-testid="button-create-skill"
                >
                  {isScanning ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Scanning...
                    </>
                  ) : (
                    <>
                      Create Skill
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
              <ScanProgress
                status={scan.status}
                currentStage={scan.currentStage}
                errorMessage={scan.errorMsg}
              />
            </div>

          </div>
        </section>

        <section className="pb-24">
          <div className="container mx-auto px-6">
            <div className="max-w-7xl mx-auto">
              <div className="mb-4">
                <SectorFilterBar
                  activeSector={activeSector}
                  onSelect={setActiveSector}
                />
              </div>
              <div className="border border-neutral-800 overflow-hidden bg-neutral-900/50">
                <div className="hidden md:grid grid-cols-[1fr_240px_120px_100px_40px] gap-4 px-5 py-3 bg-neutral-900 border-b border-neutral-800">
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
                ) : brands.length === 0 ? (
                  <div className="px-5 py-20 text-center">
                    <p className="text-sm text-neutral-500 font-medium">
                      {activeSector
                        ? `No skills found in ${SECTOR_SHORT_LABELS[activeSector] ?? activeSector}.`
                        : "No skills in the registry yet."}
                    </p>
                    {activeSector && (
                      <button
                        onClick={() => setActiveSector(null)}
                        className="mt-3 text-xs font-mono text-neutral-400 hover:text-white transition-colors underline"
                        data-testid="button-clear-filter"
                      >
                        Clear filter
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="divide-y divide-neutral-800/60">
                    {brands.map((brand) => (
                      <Link
                        key={brand.slug}
                        href={`/skills/${brand.slug}`}
                        className="grid grid-cols-1 md:grid-cols-[1fr_240px_120px_100px_40px] gap-2 md:gap-4 px-5 py-4 hover:bg-neutral-800/40 transition-colors items-center group"
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
