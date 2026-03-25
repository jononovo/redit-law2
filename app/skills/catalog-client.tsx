"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Link from "next/link";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search,
  ExternalLink,
  Zap,
  Filter,
  X,
  Layers,
  Loader2,
  LayoutGrid,
  Table2,
  Star,
  Tag,
  TrendingUp,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  CHECKOUT_METHOD_LABELS,
  CHECKOUT_METHOD_COLORS,
  CAPABILITY_LABELS,
  SECTOR_LABELS,
  BRAND_TIER_LABELS,
  CheckoutMethod,
  VendorCapability,
  VendorSector,
  BrandTier,
  SkillMaturity,
  VendorSkill,
} from "@/lib/procurement-skills/types";
import type { BrandIndex } from "@/shared/schema";
import { VendorCard, MATURITY_CONFIG, SECTOR_ICONS, CHECKOUT_ICONS } from "@/app/skills/vendor-card";

type FilterState = {
  search: string;
  checkoutMethods: CheckoutMethod[];
  capabilities: VendorCapability[];
  maturity: SkillMaturity[];
  sectors: VendorSector[];
  tiers: BrandTier[];
};

function FilterCheckbox({
  label,
  checked,
  onChange,
  icon,
  testId,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
  icon?: React.ReactNode;
  testId?: string;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer group text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="rounded border-neutral-300 text-primary focus:ring-primary/30 w-4 h-4"
        data-testid={testId}
      />
      {icon}
      <span className={`font-medium ${checked ? "text-neutral-900" : "text-neutral-600"} group-hover:text-neutral-900 transition-colors`}>
        {label}
      </span>
    </label>
  );
}

const PAGE_SIZE = 50;

function SectorNav({ sectors, activeFilters }: { sectors: string[]; activeFilters: VendorSector[] }) {
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
    return () => { el.removeEventListener("scroll", checkScroll); ro.disconnect(); };
  }, [checkScroll, sectors]);

  const scroll = (dir: "left" | "right") => {
    scrollRef.current?.scrollBy({ left: dir === "left" ? -150 : 150, behavior: "smooth" });
  };

  return (
    <div className="relative mt-2 group">
      {canScrollLeft && (
        <button
          onClick={() => scroll("left")}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-white/90 shadow-md border border-neutral-200 flex items-center justify-center text-neutral-500 hover:text-neutral-800 transition-colors"
          data-testid="button-sector-scroll-left"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      )}
      <div
        ref={scrollRef}
        className="flex items-center justify-center gap-2 overflow-x-auto scrollbar-hide px-1 py-1"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {sectors.map(sector => (
          <Link
            key={sector}
            href={`/c/${sector}`}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              activeFilters.includes(sector as VendorSector)
                ? "text-primary"
                : "text-neutral-600 hover:text-neutral-900"
            }`}
            data-testid={`sector-link-${sector}`}
          >
            <span className="w-4 h-4 flex items-center justify-center">
              {SECTOR_ICONS[sector as VendorSector] || <Layers className="w-3.5 h-3.5" />}
            </span>
            {SECTOR_LABELS[sector as VendorSector] ?? sector}
          </Link>
        ))}
      </div>
      {canScrollRight && (
        <button
          onClick={() => scroll("right")}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-white/90 shadow-md border border-neutral-200 flex items-center justify-center text-neutral-500 hover:text-neutral-800 transition-colors"
          data-testid="button-sector-scroll-right"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export interface CatalogClientProps {
  initialBrands: BrandIndex[];
  initialFacets: { sectors: string[]; tiers: string[] };
  initialTotal: number;
}

export default function CatalogClient({
  initialBrands,
  initialFacets,
  initialTotal,
}: CatalogClientProps) {
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    checkoutMethods: [],
    capabilities: [],
    maturity: [],
    sectors: [],
    tiers: [],
  });
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [tableSort, setTableSort] = useState<{ col: string; dir: "asc" | "desc" }>({ col: "name", dir: "asc" });

  const [brands, setBrands] = useState<BrandIndex[]>(initialBrands);
  const [facets, setFacets] = useState<{ sectors: string[]; tiers: string[] }>(initialFacets);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(0);
  const searchTimer = useRef<NodeJS.Timeout | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setDebouncedSearch(filters.search);
      setPage(0);
    }, 300);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [filters.search]);

  const fetchBrands = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("q", debouncedSearch);
    if (filters.sectors.length) params.set("sector", filters.sectors.join(","));
    if (filters.tiers.length) params.set("tier", filters.tiers.join(","));
    if (filters.checkoutMethods.length) params.set("checkout", filters.checkoutMethods.join(","));
    if (filters.capabilities.length) params.set("capability", filters.capabilities.join(","));
    if (filters.maturity.length) params.set("maturity", filters.maturity.join(","));
    params.set("limit", String(PAGE_SIZE));
    params.set("offset", String(page * PAGE_SIZE));

    try {
      const res = await fetch(`/api/internal/brands/search?${params}`);
      if (res.ok) {
        const data = await res.json();
        if (page === 0) {
          setBrands(data.brands ?? []);
        } else {
          setBrands(prev => [...prev, ...(data.brands ?? [])]);
        }
        setFacets(data.facets ?? { sectors: [], tiers: [] });
        setTotal(data.total ?? 0);
      }
    } catch {}
    setLoading(false);
  }, [debouncedSearch, filters.sectors, filters.tiers, filters.checkoutMethods, filters.capabilities, filters.maturity, page]);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    fetchBrands();
  }, [fetchBrands]);

  useEffect(() => {
    setPage(0);
  }, [filters.sectors, filters.tiers, filters.checkoutMethods, filters.capabilities, filters.maturity]);

  const activeFilterCount =
    filters.checkoutMethods.length +
    filters.capabilities.length +
    filters.maturity.length +
    filters.sectors.length +
    filters.tiers.length;

  const toggleFilter = <K extends keyof FilterState>(
    key: K,
    value: FilterState[K] extends (infer T)[] ? T : never
  ) => {
    setFilters(prev => {
      const arr = prev[key] as unknown[];
      const next = arr.includes(value)
        ? arr.filter(v => v !== value)
        : [...arr, value];
      return { ...prev, [key]: next };
    });
  };

  const clearFilters = () => {
    setFilters({ search: "", checkoutMethods: [], capabilities: [], maturity: [], sectors: [], tiers: [] });
    setPage(0);
  };

  const groupedBrands = useMemo(() => {
    const groups: Record<string, BrandIndex[]> = {};
    for (const b of brands) {
      const key = b.sector;
      if (!groups[key]) groups[key] = [];
      groups[key].push(b);
    }
    return groups;
  }, [brands]);

  const verifiedCount = useMemo(() => brands.filter(b => b.maturity === "verified").length, [brands]);

  const sortedBrands = useMemo(() => {
    const sorted = [...brands];
    sorted.sort((a, b) => {
      let cmp = 0;
      switch (tableSort.col) {
        case "name":
          cmp = a.name.localeCompare(b.name);
          break;
        case "sector":
          cmp = (a.sector ?? "").localeCompare(b.sector ?? "");
          break;
        case "tier":
          cmp = (a.tier ?? "").localeCompare(b.tier ?? "");
          break;
        case "maturity":
          cmp = (a.maturity ?? "").localeCompare(b.maturity ?? "");
          break;
        case "readiness":
          cmp = (a.agentReadiness ?? 0) - (b.agentReadiness ?? 0);
          break;
        case "deals":
          cmp = (a.hasDeals ? 1 : 0) - (b.hasDeals ? 1 : 0);
          break;
        default:
          cmp = 0;
      }
      return tableSort.dir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [brands, tableSort]);

  const toggleTableSort = (col: string) => {
    setTableSort(prev =>
      prev.col === col
        ? { col, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { col, dir: "asc" }
    );
  };

  const SortHeader = ({ col, children }: { col: string; children: React.ReactNode }) => (
    <button
      onClick={() => toggleTableSort(col)}
      className="inline-flex items-center gap-1 font-bold text-xs uppercase tracking-wider text-neutral-500 hover:text-neutral-900 transition-colors"
      data-testid={`sort-${col}`}
    >
      {children}
      {tableSort.col === col ? (
        tableSort.dir === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
      ) : (
        <ArrowUpDown className="w-3 h-3 opacity-40" />
      )}
    </button>
  );

  const filterSidebar = (
    <div className="space-y-6">
      <div>
        <h4 className="font-bold text-sm uppercase tracking-wider text-neutral-400 mb-3">Tier</h4>
        <div className="space-y-2">
          {facets.tiers.map(tier => (
            <FilterCheckbox
              key={tier}
              label={BRAND_TIER_LABELS[tier as BrandTier] ?? tier}
              checked={filters.tiers.includes(tier as BrandTier)}
              onChange={() => toggleFilter("tiers", tier as BrandTier)}
              testId={`filter-tier-${tier}`}
            />
          ))}
        </div>
      </div>

      <div>
        <h4 className="font-bold text-sm uppercase tracking-wider text-neutral-400 mb-3">Checkout Method</h4>
        <div className="space-y-2">
          {(Object.keys(CHECKOUT_METHOD_LABELS) as CheckoutMethod[]).map(method => (
            <FilterCheckbox
              key={method}
              label={CHECKOUT_METHOD_LABELS[method]}
              checked={filters.checkoutMethods.includes(method)}
              onChange={() => toggleFilter("checkoutMethods", method)}
              icon={CHECKOUT_ICONS[method]}
              testId={`filter-checkout-${method}`}
            />
          ))}
        </div>
      </div>

      <div>
        <h4 className="font-bold text-sm uppercase tracking-wider text-neutral-400 mb-3">Capabilities</h4>
        <div className="space-y-2">
          {(Object.keys(CAPABILITY_LABELS) as VendorCapability[]).map(cap => (
            <FilterCheckbox
              key={cap}
              label={CAPABILITY_LABELS[cap]}
              checked={filters.capabilities.includes(cap)}
              onChange={() => toggleFilter("capabilities", cap)}
              testId={`filter-capability-${cap}`}
            />
          ))}
        </div>
      </div>

      <div>
        <h4 className="font-bold text-sm uppercase tracking-wider text-neutral-400 mb-3">Maturity</h4>
        <div className="space-y-2">
          {(Object.keys(MATURITY_CONFIG) as SkillMaturity[]).map(mat => (
            <FilterCheckbox
              key={mat}
              label={MATURITY_CONFIG[mat].label}
              checked={filters.maturity.includes(mat)}
              onChange={() => toggleFilter("maturity", mat)}
              testId={`filter-maturity-${mat}`}
            />
          ))}
        </div>
      </div>

      {activeFilterCount > 0 && (
        <button
          onClick={clearFilters}
          className="w-full py-2 px-4 rounded-xl text-sm font-semibold text-primary hover:bg-primary/5 transition-colors"
          data-testid="button-clear-filters"
        >
          Clear all filters ({activeFilterCount})
        </button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-neutral-900 font-sans">
      <Nav />
      <main>
        <section className="relative py-20 overflow-hidden">
          <div className="absolute top-10 right-10 w-[500px] h-[500px] bg-purple-200/30 rounded-full blur-[100px] pointer-events-none mix-blend-multiply" />
          <div className="absolute bottom-10 left-10 w-[400px] h-[400px] bg-orange-200/30 rounded-full blur-[80px] pointer-events-none mix-blend-multiply" />

          <div className="container mx-auto px-6 relative z-10">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-100 text-purple-700 font-bold text-sm mb-6">
                <Zap size={14} />
                <span>Procurement Intelligence</span>
              </div>
              <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-neutral-900 leading-[1.1] mb-6">
                Vendor <span className="text-primary">Skills</span> Library
              </h1>
              <p className="text-xl text-neutral-500 font-medium leading-relaxed">
                Curated procurement skills that teach your AI agent how to shop at {total}+ vendors.
                Search by sector, tier, payment method, or capability.
              </p>
            </div>

            <div className="max-w-2xl mx-auto mb-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                <Input
                  type="text"
                  placeholder="Search by vendor, sector, sub-sector, or tag..."
                  className="h-14 pl-12 pr-6 rounded-2xl bg-white border-2 border-neutral-100 shadow-lg shadow-neutral-900/5 text-base placeholder:text-neutral-400 focus-visible:ring-primary focus-visible:border-primary"
                  value={filters.search}
                  onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  data-testid="input-vendor-search"
                />
              </div>
            </div>

            <SectorNav sectors={facets.sectors} activeFilters={filters.sectors} />
          </div>
        </section>

        <section className="pb-24">
          <div className="container mx-auto px-6">
            <div className="flex gap-8">
              <aside className="hidden lg:block w-64 flex-shrink-0">
                <div className="sticky top-24 bg-white rounded-2xl border border-neutral-100 p-6 shadow-sm max-h-[calc(100vh-8rem)] overflow-y-auto">
                  <div className="flex items-center gap-2 mb-6">
                    <Filter className="w-4 h-4 text-neutral-500" />
                    <h3 className="font-bold text-neutral-900">Filters</h3>
                  </div>
                  {filterSidebar}
                </div>
              </aside>

              <div className="flex items-center justify-between mb-4 lg:hidden">
                <button
                  onClick={() => setShowMobileFilters(!showMobileFilters)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-neutral-200 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors"
                  data-testid="button-mobile-filters"
                >
                  <Filter className="w-4 h-4" />
                  Filters
                  {activeFilterCount > 0 && (
                    <span className="bg-primary text-white text-xs px-1.5 py-0.5 rounded-full">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setViewMode("cards")}
                    className={`p-2 rounded-lg transition-colors ${viewMode === "cards" ? "bg-primary/10 text-primary" : "text-neutral-400 hover:text-neutral-600 hover:bg-neutral-50"}`}
                    data-testid="button-view-cards-mobile"
                    title="Card view"
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode("table")}
                    className={`p-2 rounded-lg transition-colors ${viewMode === "table" ? "bg-primary/10 text-primary" : "text-neutral-400 hover:text-neutral-600 hover:bg-neutral-50"}`}
                    data-testid="button-view-table-mobile"
                    title="Table view"
                  >
                    <Table2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {showMobileFilters && (
                <div className="fixed inset-0 z-50 lg:hidden">
                  <div className="absolute inset-0 bg-black/50" onClick={() => setShowMobileFilters(false)} />
                  <div className="absolute right-0 top-0 h-full w-80 bg-white p-6 overflow-y-auto">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="font-bold text-neutral-900">Filters</h3>
                      <button onClick={() => setShowMobileFilters(false)}>
                        <X className="w-5 h-5 text-neutral-500" />
                      </button>
                    </div>
                    {filterSidebar}
                  </div>
                </div>
              )}

              <div className="flex-1 min-w-0">
                {loading && page === 0 ? (
                  <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="p-6 rounded-2xl bg-white border border-neutral-100 animate-pulse">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-12 h-12 rounded-xl bg-neutral-100" />
                          <div className="flex-1">
                            <div className="h-5 bg-neutral-100 rounded w-3/4 mb-2" />
                            <div className="h-3 bg-neutral-100 rounded w-1/2" />
                          </div>
                        </div>
                        <div className="flex gap-1.5 mb-4">
                          <div className="h-5 bg-neutral-100 rounded w-20" />
                          <div className="h-5 bg-neutral-100 rounded w-24" />
                        </div>
                        <div className="flex gap-1 mb-4">
                          <div className="h-5 bg-neutral-100 rounded w-16" />
                          <div className="h-5 bg-neutral-100 rounded w-20" />
                          <div className="h-5 bg-neutral-100 rounded w-14" />
                        </div>
                        <div className="h-4 bg-neutral-100 rounded w-full mt-3 pt-3 border-t border-neutral-50" />
                      </div>
                    ))}
                  </div>
                ) : brands.length === 0 ? (
                  <div className="text-center py-20">
                    <div className="w-20 h-20 rounded-full bg-neutral-100 flex items-center justify-center mx-auto mb-6">
                      <Search className="w-8 h-8 text-neutral-400" />
                    </div>
                    <h3 className="text-xl font-bold text-neutral-900 mb-2">No vendors found</h3>
                    <p className="text-neutral-500 font-medium mb-4">
                      Try adjusting your search or filters.
                    </p>
                    <button
                      onClick={clearFilters}
                      className="text-primary font-semibold hover:underline"
                      data-testid="button-clear-search"
                    >
                      Clear all filters
                    </button>
                  </div>
                ) : brands.length > 0 && viewMode === "table" ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-end gap-1 mb-2">
                      <button
                        onClick={() => setViewMode("cards")}
                        className="p-2 rounded-lg transition-colors text-neutral-400 hover:text-neutral-600 hover:bg-neutral-50"
                        data-testid="button-view-cards"
                        title="Card view"
                      >
                        <LayoutGrid className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setViewMode("table")}
                        className="p-2 rounded-lg transition-colors bg-primary/10 text-primary"
                        data-testid="button-view-table"
                        title="Table view"
                      >
                        <Table2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm" data-testid="table-vendors">
                          <thead>
                            <tr className="border-b border-neutral-100 bg-neutral-50/50">
                              <th className="text-left px-4 py-3"><SortHeader col="name">Vendor</SortHeader></th>
                              <th className="text-left px-4 py-3"><SortHeader col="sector">Sector</SortHeader></th>
                              <th className="text-left px-4 py-3"><SortHeader col="tier">Tier</SortHeader></th>
                              <th className="text-left px-4 py-3"><SortHeader col="maturity">Maturity</SortHeader></th>
                              <th className="text-left px-4 py-3"><SortHeader col="readiness">Agent Score</SortHeader></th>
                              <th className="text-left px-4 py-3 hidden md:table-cell">Checkout</th>
                              <th className="text-center px-4 py-3"><SortHeader col="deals">Deals</SortHeader></th>
                            </tr>
                          </thead>
                          <tbody>
                            {sortedBrands.map((brand) => {
                              const maturity = MATURITY_CONFIG[brand.maturity as SkillMaturity] ?? MATURITY_CONFIG.draft;
                              const friendliness = Math.min(Math.floor((brand.agentReadiness ?? 0) / 20) + 1, 5);
                              const checkoutMethods = (brand.checkoutMethods ?? []) as CheckoutMethod[];
                              const vendor = brand.brandData as unknown as VendorSkill | null;
                              return (
                                <tr
                                  key={brand.id}
                                  className="border-b border-neutral-50 hover:bg-neutral-50/50 transition-colors"
                                  data-testid={`row-vendor-${brand.slug}`}
                                >
                                  <td className="px-4 py-3">
                                    <Link
                                      href={`/skills/${brand.slug}`}
                                      className="flex items-center gap-2.5 group"
                                    >
                                      <div className="w-8 h-8 rounded-lg bg-neutral-50 border border-neutral-100 flex items-center justify-center text-sm font-bold text-neutral-400 flex-shrink-0">
                                        {brand.name[0]}
                                      </div>
                                      <span className="font-semibold text-neutral-900 group-hover:text-primary transition-colors truncate">
                                        {brand.name}
                                      </span>
                                    </Link>
                                  </td>
                                  <td className="px-4 py-3">
                                    <span className="inline-flex items-center gap-1 text-xs text-neutral-600">
                                      {SECTOR_ICONS[brand.sector as VendorSector] || <Layers className="w-3.5 h-3.5" />}
                                      {SECTOR_LABELS[brand.sector as VendorSector] ?? brand.sector}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3">
                                    <span className="text-xs text-neutral-600">
                                      {BRAND_TIER_LABELS[brand.tier as BrandTier] ?? brand.tier ?? "—"}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border ${maturity.className}`}>
                                      {maturity.label}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="flex items-center gap-0.5">
                                      {Array.from({ length: 5 }).map((_, i) => (
                                        <Star
                                          key={i}
                                          className={`w-3 h-3 ${i < friendliness ? "text-amber-400 fill-amber-400" : "text-neutral-200"}`}
                                        />
                                      ))}
                                      {vendor?.feedbackStats?.successRate != null && (
                                        <span className="ml-1.5 text-[10px] font-semibold text-green-700 flex items-center gap-0.5">
                                          <TrendingUp className="w-2.5 h-2.5 text-green-500" />
                                          {Math.round(vendor.feedbackStats.successRate * 100)}%
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 hidden md:table-cell">
                                    <div className="flex flex-wrap gap-1">
                                      {checkoutMethods.slice(0, 2).map(method => (
                                        <span
                                          key={method}
                                          className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold border ${CHECKOUT_METHOD_COLORS[method] ?? ""}`}
                                        >
                                          {CHECKOUT_ICONS[method]}
                                          {CHECKOUT_METHOD_LABELS[method] ?? method}
                                        </span>
                                      ))}
                                      {checkoutMethods.length > 2 && (
                                        <span className="text-[10px] text-neutral-400">+{checkoutMethods.length - 2}</span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    {brand.hasDeals ? (
                                      <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                                        <Tag className="w-2.5 h-2.5" />
                                        Yes
                                      </span>
                                    ) : (
                                      <span className="text-neutral-300 text-xs">—</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {total > brands.length && (
                      <div className="flex justify-center mt-8">
                        <Button
                          variant="outline"
                          onClick={() => setPage(p => p + 1)}
                          disabled={loading}
                          className="rounded-2xl px-8 font-semibold"
                          data-testid="button-load-more"
                        >
                          {loading ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Loading...
                            </>
                          ) : (
                            `Load more vendors (${brands.length} of ${total})`
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-10">
                    {Object.entries(groupedBrands).map(
                      ([groupKey, groupBrands], groupIdx) => (
                        <div key={groupKey}>
                          <div className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center">
                              {SECTOR_ICONS[groupKey as VendorSector] || <Layers className="w-4 h-4 text-purple-500" />}
                            </div>
                            <Link href={`/c/${groupKey}`} className="group flex items-center gap-2">
                              <h2 className="text-lg font-bold text-neutral-900 group-hover:text-primary transition-colors">
                                {SECTOR_LABELS[groupKey as VendorSector] || groupKey}
                              </h2>
                              <span className="text-sm text-neutral-400 font-medium">
                                ({groupBrands.length})
                              </span>
                            </Link>
                            {groupIdx === 0 && (
                              <div className="ml-auto flex items-center gap-1">
                                <button
                                  onClick={() => setViewMode("cards")}
                                  className={`p-2 rounded-lg transition-colors ${viewMode === "cards" ? "bg-primary/10 text-primary" : "text-neutral-400 hover:text-neutral-600 hover:bg-neutral-50"}`}
                                  data-testid="button-view-cards"
                                  title="Card view"
                                >
                                  <LayoutGrid className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setViewMode("table")}
                                  className={`p-2 rounded-lg transition-colors ${viewMode === "table" ? "bg-primary/10 text-primary" : "text-neutral-400 hover:text-neutral-600 hover:bg-neutral-50"}`}
                                  data-testid="button-view-table"
                                  title="Table view"
                                >
                                  <Table2 className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </div>
                          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                            {groupBrands.map(brand => (
                              <VendorCard key={brand.slug} brand={brand} />
                            ))}
                          </div>
                        </div>
                      )
                    )}

                    {total > brands.length && (
                      <div className="flex justify-center mt-8">
                        <Button
                          variant="outline"
                          onClick={() => setPage(p => p + 1)}
                          disabled={loading}
                          className="rounded-2xl px-8 font-semibold"
                          data-testid="button-load-more"
                        >
                          {loading ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Loading...
                            </>
                          ) : (
                            `Load more vendors (${brands.length} of ${total})`
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-20 text-center">
              <div className="max-w-2xl mx-auto p-8 rounded-3xl bg-neutral-50 border border-neutral-100">
                <h3 className="text-2xl font-extrabold text-neutral-900 mb-3">
                  Bot Discovery API
                </h3>
                <p className="text-neutral-500 font-medium mb-6">
                  Your agent can discover and load vendor skills programmatically — filter by sector, tier, payment method, and more.
                </p>
                <div className="bg-neutral-900 rounded-xl p-4 text-left space-y-2">
                  <code className="text-sm text-green-400 font-mono block">
                    GET /api/v1/bot/skills?sector=office&tier=mid_range
                  </code>
                  <code className="text-sm text-green-400 font-mono block">
                    GET /api/v1/bot/skills?payment_method=card&ordering_permission=guest
                  </code>
                  <code className="text-sm text-green-400 font-mono block">
                    GET /api/v1/bot/skills?has_deals=true&capability=bulk_pricing
                  </code>
                </div>
                <div className="flex items-center justify-center gap-6 mt-6 text-sm">
                  <a
                    href="/api/v1/bot/skills"
                    target="_blank"
                    className="inline-flex items-center gap-1 text-primary font-semibold hover:underline"
                    data-testid="link-api-explorer"
                  >
                    Try the API <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
