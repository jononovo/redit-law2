"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Star,
  ExternalLink,
  ShoppingCart,
  Zap,
  Globe,
  CreditCard,
  Monitor,
  Cpu,
  Filter,
  X,
  CheckCircle2,
  Package,
  TrendingUp,
  Layers,
  Tag,
} from "lucide-react";
import { VENDOR_REGISTRY } from "@/lib/procurement-skills/registry";
import {
  computeAgentFriendliness,
  CHECKOUT_METHOD_LABELS,
  CHECKOUT_METHOD_COLORS,
  CAPABILITY_LABELS,
  CATEGORY_LABELS,
  SECTOR_LABELS,
  TIER_LABELS,
  CheckoutMethod,
  VendorCapability,
  VendorCategory,
  VendorSector,
  VendorTier,
  SkillMaturity,
  VendorSkill,
} from "@/lib/procurement-skills/types";

const MATURITY_CONFIG: Record<SkillMaturity, { label: string; className: string }> = {
  verified: { label: "Verified", className: "bg-green-100 text-green-700 border-green-200" },
  official: { label: "Official", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  beta: { label: "Beta", className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  community: { label: "Community", className: "bg-blue-100 text-blue-700 border-blue-200" },
  draft: { label: "Draft", className: "bg-neutral-100 text-neutral-600 border-neutral-200" },
};

const CATEGORY_ICONS: Record<VendorCategory, React.ReactNode> = {
  retail: <ShoppingCart className="w-4 h-4" />,
  office: <Package className="w-4 h-4" />,
  hardware: <Zap className="w-4 h-4" />,
  electronics: <Cpu className="w-4 h-4" />,
  industrial: <Globe className="w-4 h-4" />,
  specialty: <Star className="w-4 h-4" />,
};

const CHECKOUT_ICONS: Record<CheckoutMethod, React.ReactNode> = {
  native_api: <Zap className="w-3 h-3" />,
  acp: <CreditCard className="w-3 h-3" />,
  x402: <Globe className="w-3 h-3" />,
  crossmint_world: <Globe className="w-3 h-3" />,
  self_hosted_card: <CreditCard className="w-3 h-3" />,
  browser_automation: <Monitor className="w-3 h-3" />,
};

function VendorCard({ vendor }: { vendor: VendorSkill }) {
  const friendliness = computeAgentFriendliness(vendor);
  const maturity = MATURITY_CONFIG[vendor.maturity];

  return (
    <Link
      href={`/skills/${vendor.slug}`}
      className="group block p-6 rounded-2xl bg-white border border-neutral-100 hover:border-primary/30 hover:shadow-xl transition-all duration-300"
      data-testid={`card-vendor-${vendor.slug}`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-neutral-50 border border-neutral-100 flex items-center justify-center text-lg font-bold text-neutral-400 group-hover:scale-105 transition-transform">
            {vendor.name[0]}
          </div>
          <div>
            <h3 className="font-bold text-neutral-900 text-lg group-hover:text-primary transition-colors">
              {vendor.name}
            </h3>
            <div className="flex items-center gap-1.5 text-xs text-neutral-500">
              {CATEGORY_ICONS[vendor.category]}
              <span>{CATEGORY_LABELS[vendor.category]}</span>
              {vendor.taxonomy && (
                <>
                  <span className="text-neutral-300 mx-0.5">·</span>
                  <span>{TIER_LABELS[vendor.taxonomy.tier]}</span>
                </>
              )}
            </div>
          </div>
        </div>
        <Badge className={`text-[10px] border ${maturity.className}`} data-testid={`badge-maturity-${vendor.slug}`}>
          {maturity.label}
        </Badge>
      </div>

      {vendor.taxonomy && vendor.taxonomy.subSectors.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {vendor.taxonomy.subSectors.slice(0, 3).map(sub => (
            <span
              key={sub}
              className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-purple-50 text-purple-600 border border-purple-100"
            >
              {sub}
            </span>
          ))}
          {vendor.taxonomy.subSectors.length > 3 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-neutral-50 text-neutral-500">
              +{vendor.taxonomy.subSectors.length - 3} more
            </span>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-1.5 mb-4">
        {vendor.checkoutMethods.slice(0, 3).map(method => (
          <span
            key={method}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${CHECKOUT_METHOD_COLORS[method]}`}
          >
            {CHECKOUT_ICONS[method]}
            {CHECKOUT_METHOD_LABELS[method]}
          </span>
        ))}
      </div>

      <div className="flex flex-wrap gap-1 mb-4">
        {vendor.capabilities.slice(0, 4).map(cap => (
          <span
            key={cap}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-neutral-50 text-neutral-600 border border-neutral-100"
          >
            <CheckCircle2 className="w-2.5 h-2.5 text-green-500" />
            {CAPABILITY_LABELS[cap]}
          </span>
        ))}
        {vendor.capabilities.length > 4 && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-neutral-50 text-neutral-500">
            +{vendor.capabilities.length - 4} more
          </span>
        )}
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-neutral-50">
        <div className="flex items-center gap-1" data-testid={`score-friendliness-${vendor.slug}`}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={`w-3.5 h-3.5 ${
                i < friendliness ? "text-amber-400 fill-amber-400" : "text-neutral-200"
              }`}
            />
          ))}
          <span className="text-xs text-neutral-500 ml-1">Agent Score</span>
        </div>
        <div className="flex items-center gap-2">
          {vendor.deals?.currentDeals && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100" data-testid={`badge-deals-${vendor.slug}`}>
              <Tag className="w-2.5 h-2.5" />
              Deals
            </span>
          )}
          {vendor.feedbackStats?.successRate != null && (
            <div className="flex items-center gap-1 text-xs" data-testid={`stat-success-${vendor.slug}`}>
              <TrendingUp className="w-3 h-3 text-green-500" />
              <span className="font-semibold text-green-700">
                {Math.round(vendor.feedbackStats.successRate * 100)}%
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

type FilterState = {
  search: string;
  categories: VendorCategory[];
  checkoutMethods: CheckoutMethod[];
  capabilities: VendorCapability[];
  maturity: SkillMaturity[];
  sectors: VendorSector[];
  tiers: VendorTier[];
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

export default function SkillsCatalogPage() {
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    categories: [],
    checkoutMethods: [],
    capabilities: [],
    maturity: [],
    sectors: [],
    tiers: [],
  });
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const availableSectors = useMemo(() => {
    const sectors = new Set<VendorSector>();
    for (const v of VENDOR_REGISTRY) {
      if (v.taxonomy) sectors.add(v.taxonomy.sector);
    }
    return [...sectors];
  }, []);

  const availableTiers = useMemo(() => {
    const tiers = new Set<VendorTier>();
    for (const v of VENDOR_REGISTRY) {
      if (v.taxonomy) tiers.add(v.taxonomy.tier);
    }
    return [...tiers];
  }, []);

  const filteredVendors = useMemo(() => {
    let results = VENDOR_REGISTRY;

    if (filters.search) {
      const q = filters.search.toLowerCase();
      results = results.filter(
        v =>
          v.name.toLowerCase().includes(q) ||
          v.slug.includes(q) ||
          v.taxonomy?.sector.includes(q) ||
          v.taxonomy?.subSectors.some(s => s.toLowerCase().includes(q)) ||
          v.taxonomy?.tags?.some(t => t.toLowerCase().includes(q))
      );
    }

    if (filters.categories.length > 0) {
      results = results.filter(v => filters.categories.includes(v.category));
    }

    if (filters.checkoutMethods.length > 0) {
      results = results.filter(v =>
        filters.checkoutMethods.some(cm => v.checkoutMethods.includes(cm))
      );
    }

    if (filters.capabilities.length > 0) {
      results = results.filter(v =>
        filters.capabilities.every(cap => v.capabilities.includes(cap))
      );
    }

    if (filters.maturity.length > 0) {
      results = results.filter(v => filters.maturity.includes(v.maturity));
    }

    if (filters.sectors.length > 0) {
      results = results.filter(v =>
        v.taxonomy && filters.sectors.includes(v.taxonomy.sector)
      );
    }

    if (filters.tiers.length > 0) {
      results = results.filter(v =>
        v.taxonomy && filters.tiers.includes(v.taxonomy.tier)
      );
    }

    return results;
  }, [filters]);

  const activeFilterCount =
    filters.categories.length +
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

  const clearFilters = () =>
    setFilters({ search: "", categories: [], checkoutMethods: [], capabilities: [], maturity: [], sectors: [], tiers: [] });

  const groupedVendors = useMemo(() => {
    const groups: Record<string, VendorSkill[]> = {};
    for (const v of filteredVendors) {
      const key = v.taxonomy?.sector || v.category;
      if (!groups[key]) groups[key] = [];
      groups[key].push(v);
    }
    return groups;
  }, [filteredVendors]);

  const filterSidebar = (
    <div className="space-y-6">
      <div>
        <h4 className="font-bold text-sm uppercase tracking-wider text-neutral-400 mb-3">Sector</h4>
        <div className="space-y-2">
          {availableSectors.map(sector => (
            <FilterCheckbox
              key={sector}
              label={SECTOR_LABELS[sector]}
              checked={filters.sectors.includes(sector)}
              onChange={() => toggleFilter("sectors", sector)}
              icon={<Layers className="w-4 h-4 text-purple-500" />}
              testId={`filter-sector-${sector}`}
            />
          ))}
        </div>
      </div>

      <div>
        <h4 className="font-bold text-sm uppercase tracking-wider text-neutral-400 mb-3">Tier</h4>
        <div className="space-y-2">
          {availableTiers.map(tier => (
            <FilterCheckbox
              key={tier}
              label={TIER_LABELS[tier]}
              checked={filters.tiers.includes(tier)}
              onChange={() => toggleFilter("tiers", tier)}
              testId={`filter-tier-${tier}`}
            />
          ))}
        </div>
      </div>

      <div>
        <h4 className="font-bold text-sm uppercase tracking-wider text-neutral-400 mb-3">Category</h4>
        <div className="space-y-2">
          {(Object.keys(CATEGORY_LABELS) as VendorCategory[]).map(cat => (
            <FilterCheckbox
              key={cat}
              label={CATEGORY_LABELS[cat]}
              checked={filters.categories.includes(cat)}
              onChange={() => toggleFilter("categories", cat)}
              icon={CATEGORY_ICONS[cat]}
              testId={`filter-category-${cat}`}
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
                Curated procurement skills that teach your AI agent how to shop at {VENDOR_REGISTRY.length}+ vendors.
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

            <div className="flex items-center justify-center gap-4 text-sm text-neutral-500 font-medium">
              <span>{filteredVendors.length} vendor{filteredVendors.length !== 1 ? "s" : ""}</span>
              <span className="text-neutral-300">|</span>
              <span>{VENDOR_REGISTRY.filter(v => v.maturity === "verified").length} verified</span>
              <span className="text-neutral-300">|</span>
              <span>{availableSectors.length} sectors</span>
              <span className="text-neutral-300">|</span>
              <span>{availableTiers.length} tiers</span>
            </div>
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

              <div className="lg:hidden mb-4">
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
                {Object.keys(groupedVendors).length === 0 ? (
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
                ) : (
                  <div className="space-y-10">
                    {Object.entries(groupedVendors).map(
                      ([groupKey, vendors]) => (
                        <div key={groupKey}>
                          <div className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center">
                              {CATEGORY_ICONS[groupKey as VendorCategory] || <Layers className="w-4 h-4 text-purple-500" />}
                            </div>
                            <h2 className="text-lg font-bold text-neutral-900">
                              {SECTOR_LABELS[groupKey as VendorSector] || CATEGORY_LABELS[groupKey as VendorCategory] || groupKey}
                            </h2>
                            <span className="text-sm text-neutral-400 font-medium">
                              ({vendors.length})
                            </span>
                          </div>
                          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                            {vendors.map(vendor => (
                              <VendorCard key={vendor.slug} vendor={vendor} />
                            ))}
                          </div>
                        </div>
                      )
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
