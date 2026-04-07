"use client";

import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef, useCallback } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, Terminal, Loader2, Search } from "lucide-react";
import { CAPABILITY_LABELS } from "@/lib/brand-engine/procurement-skills/taxonomy/capabilities";
import { BRAND_TIER_LABELS } from "@/lib/brand-engine/procurement-skills/taxonomy/tiers";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ASSIGNABLE_SECTORS } from "@/lib/brand-engine/procurement-skills/taxonomy/sectors";
import { ScanProgress } from "@/components/scan-progress";
import { useDomainScan } from "@/hooks/use-domain-scan";

const ROTATING_BRANDS = [
  "nike", "gucci", "apple", "sephora", "walmart", "patagonia",
  "lululemon", "dyson", "allbirds", "glossier", "tesla", "airbnb",
  "spotify", "adidas", "zara", "asos",
];

function RotatingSlug() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      const swap = setTimeout(() => {
        setIndex((i) => (i + 1) % ROTATING_BRANDS.length);
        setVisible(true);
      }, 150);
      return () => clearTimeout(swap);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <span
      className="inline-block min-w-[5ch] text-neutral-300"
      style={{ opacity: visible ? 1 : 0, transition: "opacity 150ms" }}
    >
      {ROTATING_BRANDS[index]}
    </span>
  );
}

function CliHint() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const delay = setTimeout(() => setShow(true), 4000);
    return () => clearTimeout(delay);
  }, []);

  return (
    <div
      className="flex justify-center mb-5"
      style={{ opacity: show ? 1 : 0, transition: "opacity 600ms ease-in" }}
    >
      <div className="inline-flex items-center gap-2 px-3 py-1.5 border border-neutral-800 bg-neutral-900 text-xs font-mono text-neutral-400" data-testid="dev-cli-hint">
        <Terminal className="w-3.5 h-3.5" />
        <span>npx shopy add <RotatingSlug /></span>
      </div>
    </div>
  );
}

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
  tier: string | null;
  logoUrl: string | null;
  capabilities: string[] | null;
};

function TierLabel({ tier }: { tier: string | null }) {
  if (!tier) return <span className="text-xs text-neutral-600">—</span>;
  const label = (BRAND_TIER_LABELS as Record<string, string>)[tier] ?? tier;
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className="text-xs font-medium text-neutral-400 cursor-help"
            data-testid={`text-tier-${tier}`}
          >
            {label}
          </span>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="max-w-[240px] text-xs leading-relaxed bg-neutral-900 text-neutral-300 border border-neutral-700"
        >
          Tier reflects the brand's typical price positioning, from Budget to Ultra Luxury.
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function SectorLabel({ sector }: { sector: string }) {
  const label = SECTOR_SHORT_LABELS[sector] ?? sector;
  return (
    <span className="text-xs font-medium text-neutral-400" data-testid="text-sector">
      {label}
    </span>
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

const PAGE_SIZE = 50;

export default function BrandsLanding() {
  const router = useRouter();
  const scan = useDomainScan();
  const [brands, setBrands] = useState<BrandRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeSector, setActiveSector] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isDomain = inputValue.includes(".");
  const searchQuery = isDomain ? "" : inputValue.trim();

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!searchQuery || searchQuery.length < 2) {
      setDebouncedQuery("");
      return;
    }
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery]);

  const fetchBrands = useCallback((offset: number, append: boolean) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    const params = new URLSearchParams({
      limit: String(PAGE_SIZE),
      offset: String(offset),
      lite: "true",
      maturity: "verified,official,beta,community,draft",
    });
    if (debouncedQuery) {
      params.set("q", debouncedQuery);
    }
    if (activeSector === "luxury") {
      params.set("tier", "luxury,ultra_luxury");
    } else if (activeSector) {
      params.set("sector", activeSector);
    }
    fetch(`/api/v1/brands?${params}`)
      .then((r) => r.json())
      .then((data) => {
        const incoming = data.brands || data || [];
        setBrands((prev) => append ? [...prev, ...incoming] : incoming);
        setTotal(data.total ?? incoming.length);
        setLoading(false);
        setLoadingMore(false);
      })
      .catch(() => {
        setLoading(false);
        setLoadingMore(false);
      });
  }, [activeSector, debouncedQuery]);

  useEffect(() => {
    fetchBrands(0, false);
  }, [fetchBrands]);

  useEffect(() => {
    if (scan.status === "done" && scan.result) {
      router.push(`/skills/${scan.result.slug}`);
    }
  }, [scan.status, scan.result, router]);

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setInputValue(val);
    if (val.includes(".")) {
      scan.setDomain(val);
    }
    if (scan.status === "error") scan.reset();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && isDomain && scan.status !== "scanning") {
      scan.setDomain(inputValue);
      scan.triggerScan(inputValue);
    }
  }

  function handleLoadMore() {
    fetchBrands(brands.length, true);
  }

  const hasMore = brands.length < total;
  const isScanning = scan.status === "scanning";

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans">
      <Nav />
      <main>
        <section className="pt-10 pb-8">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto text-center mb-8">
              <CliHint />
              <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white leading-[1.1] mb-3" data-testid="text-hero-title">
                The skill registry for agentic shopping
              </h1>
              <p className="text-lg text-neutral-400 font-medium" data-testid="text-hero-subtitle">
                Create a shopping skill for your brand with a single click
              </p>
            </div>

            <div className="max-w-2xl mx-auto mb-10">
              <div className="flex">
                <div className="relative flex-1">
                  {!isDomain && inputValue.length === 0 && (
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 pointer-events-none" />
                  )}
                  <Input
                    type="text"
                    placeholder="Search brands or enter a domain to create a skill"
                    aria-label="Search brands or enter a domain to create a shopping skill"
                    value={inputValue}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    disabled={isScanning}
                    className={`h-14 rounded-none bg-neutral-900 border-neutral-800 border-r-0 text-base font-medium text-white placeholder:text-neutral-500 focus-visible:ring-white/20 focus-visible:border-neutral-600 w-full ${
                      !isDomain && inputValue.length === 0 ? "pl-12 pr-6" : "px-6"
                    }`}
                    data-testid="input-create-skill"
                  />
                </div>
                <button
                  onClick={() => {
                    if (isDomain) {
                      scan.setDomain(inputValue);
                      scan.triggerScan(inputValue);
                    }
                  }}
                  disabled={isScanning || !isDomain}
                  className={`h-14 px-6 font-bold text-sm tracking-wide uppercase border transition-colors flex items-center gap-2 whitespace-nowrap ${
                    isDomain
                      ? "bg-white text-neutral-950 border-white hover:bg-neutral-200"
                      : "bg-neutral-800 text-neutral-500 border-neutral-700 cursor-default"
                  } disabled:opacity-60 disabled:cursor-not-allowed`}
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
                <div className="hidden md:grid grid-cols-[1fr_90px_90px_220px_28px] gap-3 px-4 py-3 bg-neutral-900 border-b border-neutral-800">
                  <span className="text-sm font-mono text-neutral-400 tracking-wide uppercase">Skill</span>
                  <span className="text-sm font-mono text-neutral-400 tracking-wide uppercase">Sector</span>
                  <span className="text-sm font-mono text-neutral-400 tracking-wide uppercase">Tier</span>
                  <span className="text-sm font-mono text-neutral-400 tracking-wide uppercase">Capabilities</span>
                  <span />
                </div>

                {loading ? (
                  <div className="px-5 py-20 text-center">
                    <div className="inline-block w-5 h-5 border-2 border-neutral-700 border-t-white rounded-full animate-spin" />
                    <p className="text-sm text-neutral-500 mt-3 font-medium">Loading skills...</p>
                  </div>
                ) : brands.length === 0 ? (
                  <div className="px-5 py-20 text-center">
                    <p className="text-sm text-neutral-500 font-medium">
                      {debouncedQuery
                        ? `No skills matching "${inputValue.trim()}".`
                        : activeSector
                          ? `No skills found in ${SECTOR_SHORT_LABELS[activeSector] ?? activeSector}.`
                          : "No skills in the registry yet."}
                    </p>
                    {(activeSector || debouncedQuery) && (
                      <button
                        onClick={() => {
                          setActiveSector(null);
                          setInputValue("");
                        }}
                        className="mt-3 text-xs font-mono text-neutral-400 hover:text-white transition-colors underline"
                        data-testid="button-clear-filter"
                      >
                        Clear filter
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="divide-y divide-neutral-800/60">
                      {brands.map((brand) => (
                        <Link
                          key={brand.slug}
                          href={`/skills/${brand.slug}`}
                          className="grid grid-cols-1 md:grid-cols-[1fr_90px_90px_220px_28px] gap-2 md:gap-3 px-4 py-3 hover:bg-neutral-800/40 transition-colors items-center group"
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
                          <div className="hidden md:block"><SectorLabel sector={brand.sector} /></div>
                          <div className="hidden md:block"><TierLabel tier={brand.tier} /></div>
                          <div className="flex items-center gap-2 md:hidden">
                            <SectorLabel sector={brand.sector} />
                            <span className="text-neutral-700">·</span>
                            <TierLabel tier={brand.tier} />
                          </div>
                          <CapabilityPills capabilities={brand.capabilities} />
                          <ChevronRight className="w-4 h-4 text-neutral-600 group-hover:text-neutral-400 transition-colors hidden md:block" />
                        </Link>
                      ))}
                    </div>
                    <div className="px-4 py-3 border-t border-neutral-800 flex items-center justify-between">
                      <p className="text-xs text-neutral-500 font-mono" data-testid="text-pagination-count">
                        Showing {brands.length} of {total} skills
                      </p>
                      {hasMore && (
                        <button
                          onClick={handleLoadMore}
                          disabled={loadingMore}
                          className="inline-flex items-center gap-2 px-4 py-1.5 text-xs font-mono font-medium text-neutral-300 bg-neutral-800 border border-neutral-700 hover:text-white hover:border-neutral-500 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                          data-testid="button-load-more"
                        >
                          {loadingMore ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              Loading...
                            </>
                          ) : (
                            "Load more"
                          )}
                        </button>
                      )}
                    </div>
                  </>
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
