"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import {
  CHECKOUT_METHOD_LABELS,
  CHECKOUT_METHOD_COLORS,
  CAPABILITY_LABELS,
  SECTOR_LABELS,
  BRAND_TIER_LABELS,
  ORDERING_PERMISSION_LABELS,
  PAYMENT_METHOD_LABELS,
  CHECKOUT_PROVIDER_LABELS,
  CheckoutMethod,
  VendorCapability,
  VendorSector,
  SkillMaturity,
  VendorSkill,
} from "@/lib/procurement-skills/types";
import {
  ArrowLeft,
  Star,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Shield,
  TrendingUp,
  Clock,
  Globe,
  Zap,
  CreditCard,
  Monitor,
  Package,
  ShoppingCart,
  Cpu,
  Info,
  Layers,
  Tag,
  Search as SearchIcon,
  Truck,
  Wallet,
  Baby,
  Camera,
  Armchair,
  Briefcase,
  Wrench,
  Heart,
  Home,
  Music,
  BookOpen,
  Ticket,
  Plane,
  Gamepad2,
  Car,
  Church,
  Clapperboard,
  Dog,
} from "lucide-react";
import { BrandClaimButton } from "./brand-claim-button";
import { SkillPreviewPanel, SkillJsonPanel } from "./skill-preview-panel";
import { CopySkillUrl } from "./copy-skill-url";
import { getScoreColor } from "@/app/skills/vendor-card";
import { useTenant } from "@/lib/tenants/tenant-context";

const MATURITY_CONFIG: Record<string, { label: string; className: string; classNameDark: string; description: string }> = {
  verified: { label: "Verified", className: "bg-green-100 text-green-700 border-green-200", classNameDark: "bg-green-900/40 text-green-400 border-green-800", description: "Tested and confirmed working" },
  official: { label: "Official", className: "bg-emerald-100 text-emerald-700 border-emerald-200", classNameDark: "bg-emerald-900/40 text-emerald-400 border-emerald-800", description: "Brand-claimed and verified" },
  beta: { label: "Beta", className: "bg-yellow-100 text-yellow-700 border-yellow-200", classNameDark: "bg-amber-900/40 text-amber-400 border-amber-800", description: "Functional but may have edge cases" },
  community: { label: "Community", className: "bg-blue-100 text-blue-700 border-blue-200", classNameDark: "bg-blue-900/40 text-blue-400 border-blue-800", description: "Submitted by a community member" },
  draft: { label: "Draft", className: "bg-neutral-100 text-neutral-600 border-neutral-200", classNameDark: "bg-neutral-800 text-neutral-400 border-neutral-700", description: "Initial version, not yet fully tested" },
};

const SECTOR_ICONS: Partial<Record<VendorSector, React.ReactNode>> = {
  "animals-pet-supplies": <Dog className="w-5 h-5" />,
  "apparel-accessories": <Tag className="w-5 h-5" />,
  "arts-entertainment": <Clapperboard className="w-5 h-5" />,
  "baby-toddler": <Baby className="w-5 h-5" />,
  "business-industrial": <Briefcase className="w-5 h-5" />,
  "cameras-optics": <Camera className="w-5 h-5" />,
  "electronics": <Cpu className="w-5 h-5" />,
  "food-beverages-tobacco": <ShoppingCart className="w-5 h-5" />,
  "furniture": <Armchair className="w-5 h-5" />,
  "hardware": <Wrench className="w-5 h-5" />,
  "health-beauty": <Heart className="w-5 h-5" />,
  "home-garden": <Home className="w-5 h-5" />,
  "luggage-bags": <Briefcase className="w-5 h-5" />,
  "mature": <Star className="w-5 h-5" />,
  "media": <Music className="w-5 h-5" />,
  "office-supplies": <Package className="w-5 h-5" />,
  "religious-ceremonial": <Church className="w-5 h-5" />,
  "software": <Monitor className="w-5 h-5" />,
  "sporting-goods": <TrendingUp className="w-5 h-5" />,
  "toys-games": <Gamepad2 className="w-5 h-5" />,
  "vehicles-parts": <Car className="w-5 h-5" />,
  "food-services": <ShoppingCart className="w-5 h-5" />,
  "travel": <Plane className="w-5 h-5" />,
  "education": <BookOpen className="w-5 h-5" />,
  "events": <Ticket className="w-5 h-5" />,
  "luxury": <Star className="w-5 h-5" />,
  "specialty": <Layers className="w-5 h-5" />,
};

const CHECKOUT_ICONS: Partial<Record<CheckoutMethod, React.ReactNode>> = {
  native_api: <Zap className="w-4 h-4" />,
  acp: <CreditCard className="w-4 h-4" />,
  x402: <Globe className="w-4 h-4" />,
  crossmint_world: <Globe className="w-4 h-4" />,
  browser_automation: <Monitor className="w-4 h-4" />,
};

const ALL_CAPABILITIES: VendorCapability[] = [
  "price_lookup", "stock_check", "programmatic_checkout", "business_invoicing",
  "bulk_pricing", "tax_exemption", "account_creation", "order_tracking", "returns", "po_numbers",
];

export interface SkillDetailProps {
  vendorName: string;
  vendorUrl: string;
  vendorSector: VendorSector;
  score: number | null;
  maturityKey: SkillMaturity;
  skillMd: string | null;
  skillUrl: string;
  slug: string;
  vendor: VendorSkill | null;
  brand: {
    slug: string;
    name: string;
    domain: string;
    sector: string;
    maturity: string;
    overallScore: number | null;
    checkoutMethods: string[] | null;
    capabilities: string[] | null;
    axsRating: string | null;
    ratingCount: number | null;
    ratingSearchAccuracy: string | null;
    ratingStockReliability: string | null;
    ratingCheckoutCompletion: string | null;
    lastScannedAt: Date | string | null;
    description: string | null;
  };
  jsonLd: object;
}

export function SkillDetailContent({
  vendorName,
  vendorUrl,
  vendorSector,
  score,
  maturityKey,
  skillMd,
  skillUrl,
  slug,
  vendor,
  brand,
  jsonLd,
}: SkillDetailProps) {
  const tenant = useTenant();
  const isDark = (tenant.navigation?.header?.variant ?? "light") === "dark";
  const maturity = MATURITY_CONFIG[maturityKey] ?? MATURITY_CONFIG.draft;

  const card = isDark
    ? "bg-neutral-900 rounded-none border border-neutral-800 p-6"
    : "bg-white rounded-2xl border border-neutral-100 p-6 shadow-sm";

  const cardFlat = isDark
    ? "bg-neutral-900 rounded-none border border-neutral-800 p-6"
    : "bg-white rounded-2xl border border-neutral-100 p-6";

  const cardSmall = isDark
    ? "bg-neutral-900 rounded-none border border-neutral-800 p-5"
    : "bg-white rounded-2xl border border-neutral-100 p-5";

  const heading = isDark ? "text-neutral-100" : "text-neutral-900";
  const body = isDark ? "text-neutral-300" : "text-neutral-700";
  const muted = "text-neutral-500";
  const codeBg = isDark ? "bg-neutral-800" : "bg-neutral-100";
  const accentBadge = isDark
    ? "bg-neutral-800 text-neutral-300 border-neutral-700"
    : "bg-purple-50 text-purple-700 border-purple-100";
  const tagBadge = isDark
    ? "bg-neutral-800 text-neutral-400 border-neutral-700"
    : "bg-neutral-50 text-neutral-600 border-neutral-100";

  return (
    <div className={`min-h-screen font-sans ${isDark ? "bg-neutral-950 text-neutral-100" : "bg-background text-neutral-900"}`}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Nav />
      <main>
        <section className="relative py-12 overflow-hidden">
          {!isDark && (
            <div className="absolute top-10 right-10 w-[400px] h-[400px] bg-purple-200/20 rounded-full blur-[100px] pointer-events-none mix-blend-multiply" />
          )}

          <div className="container mx-auto px-6 relative z-10">
            {!isDark && (
              <Link
                href="/skills"
                className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-500 hover:text-primary transition-colors mb-8"
                data-testid="link-back-catalog"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Vendor Catalog
              </Link>
            )}

            <div className="flex flex-col lg:flex-row gap-8">
              <div className="flex-1">
                <div className="flex items-start gap-4 mb-6">
                  <div className={`w-16 h-16 flex items-center justify-center text-2xl font-bold ${
                    isDark
                      ? "rounded-none bg-neutral-800 border border-neutral-700 text-neutral-400"
                      : "rounded-2xl bg-white border border-neutral-100 shadow-sm text-neutral-400"
                  }`}>
                    {vendorName[0]}
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h1 className={`text-3xl md:text-4xl font-extrabold ${heading}`}>
                        {vendorName}
                      </h1>
                      <Badge className={`text-xs border ${isDark ? maturity.classNameDark : maturity.className}`} data-testid="badge-maturity">
                        {maturity.label}
                      </Badge>
                      <BrandClaimButton slug={brand.slug} />
                    </div>
                    <div className={`flex items-center gap-4 text-sm ${muted}`}>
                      <div className="flex items-center gap-1.5">
                        {SECTOR_ICONS[vendorSector] || <Layers className="w-5 h-5" />}
                        <span className="font-medium">{SECTOR_LABELS[vendorSector] || vendorSector}</span>
                      </div>
                      {vendor?.taxonomy && (
                        <>
                          <span className={isDark ? "text-neutral-600" : "text-neutral-300"}>·</span>
                          <span className="font-medium">{BRAND_TIER_LABELS[vendor.taxonomy.tier]}</span>
                        </>
                      )}
                      <a
                        href={vendorUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex items-center gap-1 font-semibold hover:underline ${isDark ? "text-blue-400" : "text-primary"}`}
                        data-testid="link-vendor-url"
                      >
                        {vendorUrl} <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>

                {vendor?.taxonomy && vendor.taxonomy.subSectors.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {vendor.taxonomy.subSectors.map(sub => (
                      <span
                        key={sub}
                        className={`inline-flex items-center px-2.5 py-1 text-xs font-medium border ${isDark ? "rounded-none" : "rounded-lg"} ${accentBadge}`}
                      >
                        {sub}
                      </span>
                    ))}
                    {vendor.taxonomy.tags && vendor.taxonomy.tags.map(tag => (
                      <span
                        key={tag}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium border ${isDark ? "rounded-none" : "rounded-lg"} ${tagBadge}`}
                      >
                        <Tag className="w-3 h-3" />
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-6 mb-8">
                  {(() => {
                    const sc = getScoreColor(score);
                    return (
                      <div className="flex items-center gap-2" data-testid="score-asx">
                        <span className={`inline-flex items-center px-3 py-1 text-lg font-bold border ${isDark ? "rounded-none" : "rounded-lg"} ${sc.bg} ${sc.text} ${sc.border}`}>
                          {score != null ? score : "—"}
                        </span>
                        <span className={`text-sm font-semibold ${muted}`}>/ 100 ASX Score</span>
                      </div>
                    );
                  })()}
                  {vendor?.feedbackStats?.successRate != null && (
                    <div className="flex items-center gap-1.5" data-testid="stat-success-rate">
                      <TrendingUp className="w-4 h-4 text-green-500" />
                      <span className={`text-sm font-bold ${isDark ? "text-green-400" : "text-green-700"}`}>
                        {Math.round(vendor.feedbackStats.successRate * 100)}% success rate
                      </span>
                    </div>
                  )}
                  {vendor?.deals?.currentDeals && (
                    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 border ${
                      isDark
                        ? "rounded-none text-emerald-400 bg-emerald-900/40 border-emerald-800"
                        : "rounded-lg text-emerald-600 bg-emerald-50 border-emerald-100"
                    }`}>
                      <Tag className="w-3 h-3" />
                      Active Deals
                    </span>
                  )}
                </div>

                <div className="grid sm:grid-cols-2 gap-6 mb-8">
                  <div className={cardFlat}>
                    <h3 className={`font-bold ${heading} mb-4 flex items-center gap-2`}>
                      <Zap className={`w-4 h-4 ${isDark ? "text-blue-400" : "text-primary"}`} />
                      Checkout Methods
                    </h3>
                    <div className="space-y-3">
                      {(vendor?.checkoutMethods ?? brand.checkoutMethods ?? []).map((m, i) => {
                        const method = m as CheckoutMethod;
                        const config = vendor?.methodConfig?.[method];
                        return (
                          <div key={method} className="flex items-start gap-3">
                            <div className={`w-8 h-8 flex items-center justify-center flex-shrink-0 ${isDark ? "rounded-none" : "rounded-lg"} ${CHECKOUT_METHOD_COLORS[method]}`}>
                              {CHECKOUT_ICONS[method]}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className={`font-semibold text-sm ${heading}`}>
                                  {CHECKOUT_METHOD_LABELS[method]}
                                </span>
                                {i === 0 && (
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 ${
                                    isDark
                                      ? "rounded-none text-blue-400 bg-blue-900/30"
                                      : "rounded text-primary bg-primary/10"
                                  }`}>
                                    PREFERRED
                                  </span>
                                )}
                              </div>
                              {config?.notes && (
                                <p className={`text-xs ${muted} mt-0.5`}>{config.notes}</p>
                              )}
                              {config?.locatorFormat && (
                                <code className={`text-[10px] font-mono px-1.5 py-0.5 mt-1 inline-block ${isDark ? "rounded-none bg-neutral-800" : "rounded bg-neutral-100"}`}>
                                  {config.locatorFormat}
                                </code>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className={cardFlat}>
                    <h3 className={`font-bold ${heading} mb-4 flex items-center gap-2`}>
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      Capabilities
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      {ALL_CAPABILITIES.map(cap => {
                        const has = (vendor?.capabilities ?? brand.capabilities ?? []).includes(cap);
                        return (
                          <div key={cap} className="flex items-center gap-2">
                            {has ? (
                              <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                            ) : (
                              <XCircle className={`w-4 h-4 flex-shrink-0 ${isDark ? "text-neutral-600" : "text-neutral-300"}`} />
                            )}
                            <span className={`text-xs font-medium ${has ? heading : (isDark ? "text-neutral-500" : "text-neutral-400")}`}>
                              {CAPABILITY_LABELS[cap]}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {vendor?.searchDiscovery && (
                  <div className={`${cardFlat} mb-8`}>
                    <h3 className={`font-bold ${heading} mb-4 flex items-center gap-2`}>
                      <SearchIcon className="w-4 h-4 text-blue-500" />
                      Search Discovery
                    </h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="flex items-center gap-2">
                        {vendor.searchDiscovery.searchApi ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        ) : (
                          <XCircle className={`w-4 h-4 ${isDark ? "text-neutral-600" : "text-neutral-300"}`} />
                        )}
                        <span className={`text-sm font-medium ${body}`}>Search API</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {vendor.searchDiscovery.mcp ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        ) : (
                          <XCircle className={`w-4 h-4 ${isDark ? "text-neutral-600" : "text-neutral-300"}`} />
                        )}
                        <span className={`text-sm font-medium ${body}`}>MCP Support</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {vendor.searchDiscovery.searchInternal ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        ) : (
                          <XCircle className={`w-4 h-4 ${isDark ? "text-neutral-600" : "text-neutral-300"}`} />
                        )}
                        <span className={`text-sm font-medium ${body}`}>Internal Search</span>
                      </div>
                    </div>
                  </div>
                )}

                {vendor?.buying && (
                  <div className={`${cardFlat} mb-8`}>
                    <h3 className={`font-bold ${heading} mb-4 flex items-center gap-2`}>
                      <Wallet className={`w-4 h-4 ${isDark ? "text-indigo-400" : "text-indigo-500"}`} />
                      Buying Configuration
                    </h3>
                    <div className="grid sm:grid-cols-2 gap-6">
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">Ordering</h4>
                        <Badge className={`text-xs ${isDark ? "bg-indigo-900/30 text-indigo-400 border-indigo-800" : "bg-indigo-50 text-indigo-700 border-indigo-100"}`}>
                          {ORDERING_PERMISSION_LABELS[vendor.buying.orderingPermission]}
                        </Badge>
                      </div>
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">Checkout Providers</h4>
                        <div className="flex flex-wrap gap-1">
                          {vendor.buying.checkoutProviders.map(p => (
                            <Badge key={p} className={`text-[10px] ${isDark ? "bg-neutral-800 text-neutral-300 border-neutral-700" : "bg-neutral-50 text-neutral-600 border-neutral-200"}`}>
                              {CHECKOUT_PROVIDER_LABELS[p]}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">Payment Methods</h4>
                        <div className="flex flex-wrap gap-1">
                          {vendor.buying.paymentMethods.map(m => (
                            <Badge key={m} className={`text-[10px] ${isDark ? "bg-blue-900/30 text-blue-400 border-blue-800" : "bg-blue-50 text-blue-600 border-blue-100"}`}>
                              {PAYMENT_METHOD_LABELS[m]}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">Delivery</h4>
                        <p className={`text-sm font-medium ${body}`}>{vendor.buying.deliveryOptions}</p>
                        {vendor.buying.freeDelivery && (
                          <p className={`text-xs font-medium mt-1 ${isDark ? "text-green-400" : "text-green-600"}`}>
                            <Truck className="w-3 h-3 inline mr-1" />
                            Free: {vendor.buying.freeDelivery}
                          </p>
                        )}
                      </div>
                      {vendor.buying.returnsPolicy && (
                        <div className="sm:col-span-2">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">Returns</h4>
                          <p className={`text-sm font-medium ${body}`}>{vendor.buying.returnsPolicy}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {vendor?.search && (
                <div className="grid sm:grid-cols-3 gap-4 mb-8">
                  <div className={cardSmall}>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">Search</h4>
                    <p className={`text-sm font-medium ${body}`}>{vendor.search.pattern}</p>
                    {vendor.search.productIdFormat && (
                      <p className={`text-xs ${muted} mt-2`}>
                        ID format: <code className={`px-1 ${isDark ? "rounded-none bg-neutral-800" : "rounded bg-neutral-100"}`}>{vendor.search.productIdFormat}</code>
                      </p>
                    )}
                  </div>
                  {vendor.checkout && (
                  <div className={cardSmall}>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">Checkout</h4>
                    <div className="space-y-1.5 text-sm">
                      <div className="flex items-center gap-2">
                        {vendor.checkout.guestCheckout ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                        ) : (
                          <XCircle className={`w-3.5 h-3.5 ${isDark ? "text-red-500" : "text-red-400"}`} />
                        )}
                        <span className={`font-medium ${body}`}>Guest checkout</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {vendor.checkout.taxExemptField ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                        ) : (
                          <XCircle className={`w-3.5 h-3.5 ${isDark ? "text-neutral-600" : "text-neutral-300"}`} />
                        )}
                        <span className={`font-medium ${body}`}>Tax exemption</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {vendor.checkout.poNumberField ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                        ) : (
                          <XCircle className={`w-3.5 h-3.5 ${isDark ? "text-neutral-600" : "text-neutral-300"}`} />
                        )}
                        <span className={`font-medium ${body}`}>PO numbers</span>
                      </div>
                    </div>
                  </div>
                  )}
                  {vendor.shipping && (
                  <div className={cardSmall}>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">Shipping</h4>
                    <div className={`space-y-1.5 text-sm font-medium ${body}`}>
                      {vendor.shipping.freeThreshold && (
                        <p>Free over ${vendor.shipping.freeThreshold}</p>
                      )}
                      <p>{vendor.shipping.estimatedDays}</p>
                      {vendor.shipping.businessShipping && (
                        <div className={`flex items-center gap-1.5 ${isDark ? "text-green-400" : "text-green-700"}`}>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Business shipping</span>
                        </div>
                      )}
                    </div>
                  </div>
                  )}
                </div>
                )}

                {vendor?.deals && (vendor.deals.currentDeals || vendor.deals.loyaltyProgram) && (
                  <div className={`${isDark ? "bg-emerald-900/20 rounded-none border border-emerald-900/40" : "bg-emerald-50 rounded-2xl border border-emerald-100"} p-6 mb-8`}>
                    <h3 className={`font-bold ${heading} mb-3 flex items-center gap-2`}>
                      <Tag className="w-4 h-4 text-emerald-500" />
                      Deals & Promotions
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        {vendor.deals.currentDeals ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <XCircle className={`w-4 h-4 ${isDark ? "text-neutral-600" : "text-neutral-300"}`} />
                        )}
                        <span className={`font-medium ${body}`}>Active deals available</span>
                        {vendor.deals.dealsUrl && (
                          <a
                            href={vendor.deals.dealsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`text-xs font-semibold hover:underline inline-flex items-center gap-1 ${isDark ? "text-blue-400" : "text-primary"}`}
                          >
                            View <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                      {vendor.deals.loyaltyProgram && (
                        <div className="flex items-center gap-2">
                          <Star className="w-4 h-4 text-amber-500" />
                          <span className={`font-medium ${body}`}>
                            Loyalty: {vendor.deals.loyaltyProgram}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {(vendor?.tips?.length ?? 0) > 0 && (
                  <div className={`${isDark ? "bg-amber-900/20 rounded-none border border-amber-900/40" : "bg-amber-50 rounded-2xl border border-amber-100"} p-6 mb-8`}>
                    <h3 className={`font-bold ${heading} mb-3 flex items-center gap-2`}>
                      <Info className="w-4 h-4 text-amber-500" />
                      Tips & Notes
                    </h3>
                    <ul className="space-y-2">
                      {(vendor?.tips ?? []).map((tip, i) => (
                        <li key={i} className={`flex items-start gap-2 text-sm font-medium ${body}`}>
                          <span className="text-amber-500 mt-0.5">-</span>
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {brand.axsRating && (
                  <div className={`${cardFlat} mb-8`} data-testid="panel-axs-ratings">
                    <h3 className={`font-bold ${heading} mb-4 flex items-center gap-2`}>
                      <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                      AXS Rating
                    </h3>
                    <div className="grid grid-cols-3 gap-4">
                      {[
                        { label: "Search Accuracy", value: brand.ratingSearchAccuracy },
                        { label: "Stock Reliability", value: brand.ratingStockReliability },
                        { label: "Checkout Completion", value: brand.ratingCheckoutCompletion },
                      ].map(({ label, value }) => (
                        <div key={label} className="text-center">
                          <div className={`text-2xl font-bold ${heading}`}>
                            {value ? Number(value).toFixed(1) : "—"}
                          </div>
                          <div className={`text-xs font-medium mt-1 ${muted}`}>{label}</div>
                          <div className={`w-full h-1.5 mt-2 ${isDark ? "bg-neutral-800 rounded-none" : "bg-neutral-100 rounded-full"}`}>
                            <div
                              className={`bg-amber-400 h-1.5 ${isDark ? "rounded-none" : "rounded-full"}`}
                              style={{ width: `${value ? (Number(value) / 5) * 100 : 0}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className={`text-xs ${muted} mt-4`}>
                      Based on {brand.ratingCount ?? 0} feedback events from agents and humans.
                    </p>
                  </div>
                )}

                {skillMd && <SkillPreviewPanel skillMd={skillMd} slug={brand.slug} />}
                {brand.overallScore !== null && <SkillJsonPanel slug={brand.slug} />}
              </div>

              <aside className="lg:w-72 flex-shrink-0">
                <div className="sticky top-24 space-y-4">
                  <CopySkillUrl url={skillUrl} />

                  {vendor?.taxonomy && (
                    <div className={card}>
                      <h3 className={`font-bold text-sm ${heading} mb-4 flex items-center gap-2`}>
                        <Layers className={`w-4 h-4 ${isDark ? "text-blue-400" : "text-purple-500"}`} />
                        Taxonomy
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className={`font-medium ${muted}`}>Sector</span>
                          <span className={`font-semibold ${heading}`}>{SECTOR_LABELS[vendor.taxonomy.sector]}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className={`font-medium ${muted}`}>Tier</span>
                          <span className={`font-semibold ${heading}`}>{BRAND_TIER_LABELS[vendor.taxonomy.tier]}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className={card}>
                    <h3 className={`font-bold text-sm ${heading} mb-4 flex items-center gap-2`}>
                      <Shield className="w-4 h-4 text-green-500" />
                      Security Report
                    </h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        <span className={`font-medium ${body}`}>URLs verified</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        <span className={`font-medium ${body}`}>No executable code</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        <span className={`font-medium ${body}`}>No credential harvesting</span>
                      </div>
                      <div className={`flex items-center gap-2 ${muted}`}>
                        <Shield className="w-4 h-4" />
                        <span className="font-medium">CreditClaw authored</span>
                      </div>
                    </div>
                  </div>

                  <div className={card}>
                    <h3 className={`font-bold text-sm ${heading} mb-4 flex items-center gap-2`}>
                      <Clock className={`w-4 h-4 ${muted}`} />
                      Metadata
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className={`font-medium ${muted}`}>Version</span>
                        <span className={`font-semibold ${heading}`}>{vendor?.version ?? "1.0.0"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className={`font-medium ${muted}`}>Last verified</span>
                        <span className={`font-semibold ${heading}`}>{vendor?.lastVerified ?? (brand.lastScannedAt ? new Date(typeof brand.lastScannedAt === 'string' ? brand.lastScannedAt : brand.lastScannedAt).toISOString().split("T")[0] : "—")}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className={`font-medium ${muted}`}>Generated by</span>
                        <span className={`font-semibold ${heading} capitalize`}>{vendor?.generatedBy ?? "scanner"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className={`font-medium ${muted}`}>Maturity</span>
                        <Badge className={`text-[10px] border ${isDark ? maturity.classNameDark : maturity.className}`}>{maturity.label}</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
