import { cache } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { Badge } from "@/components/ui/badge";
import { storage } from "@/server/storage";
import { generateVendorSkill } from "@/lib/procurement-skills/generator";
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
import type { Metadata } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://creditclaw.com";

export const revalidate = 3600;

export async function generateStaticParams() {
  try {
    const brands = await storage.searchBrands({
      maturities: ["verified", "official"],
      limit: 1000,
      lite: true,
    });
    return brands.map(b => ({ vendor: b.slug }));
  } catch {
    return [];
  }
}

const getBrand = cache(async (slug: string) => {
  return storage.getBrandBySlug(slug);
});

const MATURITY_CONFIG: Record<SkillMaturity, { label: string; className: string; description: string }> = {
  verified: { label: "Verified", className: "bg-green-100 text-green-700 border-green-200", description: "Tested and confirmed working by the CreditClaw team" },
  official: { label: "Official", className: "bg-emerald-100 text-emerald-700 border-emerald-200", description: "Brand-claimed and verified by the brand owner" },
  beta: { label: "Beta", className: "bg-yellow-100 text-yellow-700 border-yellow-200", description: "Functional but may have edge cases not yet covered" },
  community: { label: "Community", className: "bg-blue-100 text-blue-700 border-blue-200", description: "Submitted by a community member" },
  draft: { label: "Draft", className: "bg-neutral-100 text-neutral-600 border-neutral-200", description: "Initial version, not yet fully tested" },
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

const CHECKOUT_ICONS: Record<CheckoutMethod, React.ReactNode> = {
  native_api: <Zap className="w-4 h-4" />,
  acp: <CreditCard className="w-4 h-4" />,
  x402: <Globe className="w-4 h-4" />,
  crossmint_world: <Globe className="w-4 h-4" />,
  self_hosted_card: <CreditCard className="w-4 h-4" />,
  browser_automation: <Monitor className="w-4 h-4" />,
};

const ALL_CAPABILITIES: VendorCapability[] = [
  "price_lookup", "stock_check", "programmatic_checkout", "business_invoicing",
  "bulk_pricing", "tax_exemption", "account_creation", "order_tracking", "returns", "po_numbers",
];

interface Props {
  params: Promise<{ vendor: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { vendor: slug } = await params;
  const brand = await getBrand(slug);
  if (!brand) return {};

  const score = brand.overallScore;
  const capabilities = (brand.capabilities ?? []).slice(0, 5).join(", ");

  return {
    title: `${brand.name} — Agent Procurement Skill | CreditClaw`,
    description: `${brand.name} ASX Score: ${score ?? "unscored"}. Checkout methods: ${(brand.checkoutMethods ?? []).join(", ")}. Capabilities: ${capabilities}. ${brand.description || ""}`.slice(0, 160),
    openGraph: {
      title: `${brand.name} — Procurement Skill for AI Agents`,
      description: `Agent-ready procurement skill for ${brand.name}. Sector: ${brand.sector}. Maturity: ${brand.maturity}.`,
      type: "website",
      url: `${BASE_URL}/skills/${brand.slug}`,
    },
    twitter: {
      card: "summary",
      title: `${brand.name} — CreditClaw Procurement Skill`,
      description: `ASX Score: ${score ?? "unscored"}/100. ${(brand.checkoutMethods ?? []).length} checkout methods available.`,
    },
    alternates: {
      canonical: `${BASE_URL}/skills/${brand.slug}`,
    },
  };
}

export default async function VendorDetailPage({ params }: Props) {
  const { vendor: slug } = await params;
  const brand = await getBrand(slug);
  if (!brand) notFound();

  const rawVendor = brand.brandData as unknown as VendorSkill | null;
  const hasVendorData = rawVendor && typeof rawVendor === "object" && "name" in rawVendor;
  const vendor = hasVendorData ? rawVendor : null;
  const vendorName = vendor?.name ?? brand.name;
  const vendorUrl = vendor?.url ?? `https://${brand.domain}`;
  const vendorSector = vendor?.sector ?? (brand.sector as VendorSector);
  const score = brand.overallScore;
  const maturity = MATURITY_CONFIG[brand.maturity as SkillMaturity] ?? MATURITY_CONFIG.draft;
  const skillMd = brand.skillMd || (vendor ? generateVendorSkill(vendor) : null);
  const skillUrl = `https://creditclaw.com/api/v1/bot/skills/${brand.slug}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: `${vendorName} — AI Procurement Skill`,
    description: brand.description || `Agent-ready procurement skill for ${vendorName}.`,
    url: `${BASE_URL}/skills/${brand.slug}`,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Cloud",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
    aggregateRating: brand.axsRating ? {
      "@type": "AggregateRating",
      ratingValue: Number(brand.axsRating).toFixed(1),
      bestRating: "5",
      worstRating: "1",
      ratingCount: brand.ratingCount ?? 0,
    } : undefined,
    additionalProperty: [
      {
        "@type": "PropertyValue",
        name: "asxScore",
        value: score,
      },
      {
        "@type": "PropertyValue",
        name: "sector",
        value: brand.sector,
      },
      {
        "@type": "PropertyValue",
        name: "maturity",
        value: brand.maturity,
      },
      ...(brand.checkoutMethods ?? []).map(method => ({
        "@type": "PropertyValue",
        name: "checkoutMethod",
        value: method,
      })),
    ],
  };

  return (
    <div className="min-h-screen bg-background text-neutral-900 font-sans">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Nav />
      <main>
        <section className="relative py-12 overflow-hidden">
          <div className="absolute top-10 right-10 w-[400px] h-[400px] bg-purple-200/20 rounded-full blur-[100px] pointer-events-none mix-blend-multiply" />

          <div className="container mx-auto px-6 relative z-10">
            <Link
              href="/skills"
              className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-500 hover:text-primary transition-colors mb-8"
              data-testid="link-back-catalog"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Vendor Catalog
            </Link>

            <div className="flex flex-col lg:flex-row gap-8">
              <div className="flex-1">
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-white border border-neutral-100 shadow-sm flex items-center justify-center text-2xl font-bold text-neutral-400">
                    {vendorName[0]}
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h1 className="text-3xl md:text-4xl font-extrabold text-neutral-900">
                        {vendorName}
                      </h1>
                      <Badge className={`text-xs border ${maturity.className}`} data-testid="badge-maturity">
                        {maturity.label}
                      </Badge>
                      <BrandClaimButton slug={brand.slug} />
                    </div>
                    <div className="flex items-center gap-4 text-sm text-neutral-500">
                      <div className="flex items-center gap-1.5">
                        {SECTOR_ICONS[vendorSector] || <Layers className="w-5 h-5" />}
                        <span className="font-medium">{SECTOR_LABELS[vendorSector] || vendorSector}</span>
                      </div>
                      {vendor?.taxonomy && (
                        <>
                          <span className="text-neutral-300">·</span>
                          <div className="flex items-center gap-1.5">
                            <Layers className="w-4 h-4 text-purple-500" />
                            <span className="font-medium">{SECTOR_LABELS[vendor.taxonomy.sector]}</span>
                          </div>
                          <span className="text-neutral-300">·</span>
                          <span className="font-medium">{BRAND_TIER_LABELS[vendor.taxonomy.tier]}</span>
                        </>
                      )}
                      <a
                        href={vendorUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-primary font-semibold hover:underline"
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
                        className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-purple-50 text-purple-700 border border-purple-100"
                      >
                        {sub}
                      </span>
                    ))}
                    {vendor.taxonomy.tags && vendor.taxonomy.tags.map(tag => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-neutral-50 text-neutral-600 border border-neutral-100"
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
                        <span className={`inline-flex items-center px-3 py-1 rounded-lg text-lg font-bold border ${sc.bg} ${sc.text} ${sc.border}`}>
                          {score != null ? score : "—"}
                        </span>
                        <span className="text-sm font-semibold text-neutral-500">/ 100 ASX Score</span>
                      </div>
                    );
                  })()}
                  {vendor?.feedbackStats?.successRate != null && (
                    <div className="flex items-center gap-1.5" data-testid="stat-success-rate">
                      <TrendingUp className="w-4 h-4 text-green-500" />
                      <span className="text-sm font-bold text-green-700">
                        {Math.round(vendor.feedbackStats.successRate * 100)}% success rate
                      </span>
                    </div>
                  )}
                  {vendor?.deals?.currentDeals && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">
                      <Tag className="w-3 h-3" />
                      Active Deals
                    </span>
                  )}
                </div>

                <div className="grid sm:grid-cols-2 gap-6 mb-8">
                  <div className="bg-white rounded-2xl border border-neutral-100 p-6">
                    <h3 className="font-bold text-neutral-900 mb-4 flex items-center gap-2">
                      <Zap className="w-4 h-4 text-primary" />
                      Checkout Methods
                    </h3>
                    <div className="space-y-3">
                      {(vendor?.checkoutMethods ?? brand.checkoutMethods ?? []).map((m, i) => {
                        const method = m as CheckoutMethod;
                        const config = vendor?.methodConfig?.[method];
                        return (
                          <div key={method} className="flex items-start gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${CHECKOUT_METHOD_COLORS[method]}`}>
                              {CHECKOUT_ICONS[method]}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm text-neutral-900">
                                  {CHECKOUT_METHOD_LABELS[method]}
                                </span>
                                {i === 0 && (
                                  <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                                    PREFERRED
                                  </span>
                                )}
                              </div>
                              {config?.notes && (
                                <p className="text-xs text-neutral-500 mt-0.5">{config.notes}</p>
                              )}
                              {config?.locatorFormat && (
                                <code className="text-[10px] font-mono bg-neutral-100 px-1.5 py-0.5 rounded mt-1 inline-block">
                                  {config.locatorFormat}
                                </code>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-neutral-100 p-6">
                    <h3 className="font-bold text-neutral-900 mb-4 flex items-center gap-2">
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
                              <XCircle className="w-4 h-4 text-neutral-300 flex-shrink-0" />
                            )}
                            <span className={`text-xs font-medium ${has ? "text-neutral-900" : "text-neutral-400"}`}>
                              {CAPABILITY_LABELS[cap]}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {vendor?.searchDiscovery && (
                  <div className="bg-white rounded-2xl border border-neutral-100 p-6 mb-8">
                    <h3 className="font-bold text-neutral-900 mb-4 flex items-center gap-2">
                      <SearchIcon className="w-4 h-4 text-blue-500" />
                      Search Discovery
                    </h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="flex items-center gap-2">
                        {vendor.searchDiscovery.searchApi ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-neutral-300" />
                        )}
                        <span className="text-sm font-medium text-neutral-700">Search API</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {vendor.searchDiscovery.mcp ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-neutral-300" />
                        )}
                        <span className="text-sm font-medium text-neutral-700">MCP Support</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {vendor.searchDiscovery.searchInternal ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-neutral-300" />
                        )}
                        <span className="text-sm font-medium text-neutral-700">Internal Search</span>
                      </div>
                    </div>
                  </div>
                )}

                {vendor?.buying && (
                  <div className="bg-white rounded-2xl border border-neutral-100 p-6 mb-8">
                    <h3 className="font-bold text-neutral-900 mb-4 flex items-center gap-2">
                      <Wallet className="w-4 h-4 text-indigo-500" />
                      Buying Configuration
                    </h3>
                    <div className="grid sm:grid-cols-2 gap-6">
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">Ordering</h4>
                        <Badge className="text-xs bg-indigo-50 text-indigo-700 border-indigo-100">
                          {ORDERING_PERMISSION_LABELS[vendor.buying.orderingPermission]}
                        </Badge>
                      </div>
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">Checkout Providers</h4>
                        <div className="flex flex-wrap gap-1">
                          {vendor.buying.checkoutProviders.map(p => (
                            <Badge key={p} className="text-[10px] bg-neutral-50 text-neutral-600 border-neutral-200">
                              {CHECKOUT_PROVIDER_LABELS[p]}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">Payment Methods</h4>
                        <div className="flex flex-wrap gap-1">
                          {vendor.buying.paymentMethods.map(m => (
                            <Badge key={m} className="text-[10px] bg-blue-50 text-blue-600 border-blue-100">
                              {PAYMENT_METHOD_LABELS[m]}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">Delivery</h4>
                        <p className="text-sm text-neutral-700 font-medium">{vendor.buying.deliveryOptions}</p>
                        {vendor.buying.freeDelivery && (
                          <p className="text-xs text-green-600 font-medium mt-1">
                            <Truck className="w-3 h-3 inline mr-1" />
                            Free: {vendor.buying.freeDelivery}
                          </p>
                        )}
                      </div>
                      {vendor.buying.returnsPolicy && (
                        <div className="sm:col-span-2">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">Returns</h4>
                          <p className="text-sm text-neutral-700 font-medium">{vendor.buying.returnsPolicy}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {vendor?.search && (
                <div className="grid sm:grid-cols-3 gap-4 mb-8">
                  <div className="bg-white rounded-2xl border border-neutral-100 p-5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">Search</h4>
                    <p className="text-sm text-neutral-700 font-medium">{vendor.search.pattern}</p>
                    {vendor.search.productIdFormat && (
                      <p className="text-xs text-neutral-500 mt-2">
                        ID format: <code className="bg-neutral-100 px-1 rounded">{vendor.search.productIdFormat}</code>
                      </p>
                    )}
                  </div>
                  {vendor.checkout && (
                  <div className="bg-white rounded-2xl border border-neutral-100 p-5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">Checkout</h4>
                    <div className="space-y-1.5 text-sm">
                      <div className="flex items-center gap-2">
                        {vendor.checkout.guestCheckout ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-red-400" />
                        )}
                        <span className="font-medium text-neutral-700">Guest checkout</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {vendor.checkout.taxExemptField ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-neutral-300" />
                        )}
                        <span className="font-medium text-neutral-700">Tax exemption</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {vendor.checkout.poNumberField ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-neutral-300" />
                        )}
                        <span className="font-medium text-neutral-700">PO numbers</span>
                      </div>
                    </div>
                  </div>
                  )}
                  {vendor.shipping && (
                  <div className="bg-white rounded-2xl border border-neutral-100 p-5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">Shipping</h4>
                    <div className="space-y-1.5 text-sm text-neutral-700 font-medium">
                      {vendor.shipping.freeThreshold && (
                        <p>Free over ${vendor.shipping.freeThreshold}</p>
                      )}
                      <p>{vendor.shipping.estimatedDays}</p>
                      {vendor.shipping.businessShipping && (
                        <div className="flex items-center gap-1.5 text-green-700">
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
                  <div className="bg-emerald-50 rounded-2xl border border-emerald-100 p-6 mb-8">
                    <h3 className="font-bold text-neutral-900 mb-3 flex items-center gap-2">
                      <Tag className="w-4 h-4 text-emerald-500" />
                      Deals & Promotions
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        {vendor.deals.currentDeals ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-neutral-300" />
                        )}
                        <span className="font-medium text-neutral-700">Active deals available</span>
                        {vendor.deals.dealsUrl && (
                          <a
                            href={vendor.deals.dealsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary text-xs font-semibold hover:underline inline-flex items-center gap-1"
                          >
                            View <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                      {vendor.deals.loyaltyProgram && (
                        <div className="flex items-center gap-2">
                          <Star className="w-4 h-4 text-amber-500" />
                          <span className="font-medium text-neutral-700">
                            Loyalty: {vendor.deals.loyaltyProgram}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {(vendor?.tips?.length ?? 0) > 0 && (
                  <div className="bg-amber-50 rounded-2xl border border-amber-100 p-6 mb-8">
                    <h3 className="font-bold text-neutral-900 mb-3 flex items-center gap-2">
                      <Info className="w-4 h-4 text-amber-500" />
                      Tips & Notes
                    </h3>
                    <ul className="space-y-2">
                      {(vendor?.tips ?? []).map((tip, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-neutral-700 font-medium">
                          <span className="text-amber-500 mt-0.5">-</span>
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {brand.axsRating && (
                  <div className="bg-white rounded-2xl border border-neutral-100 p-6 mb-8" data-testid="panel-axs-ratings">
                    <h3 className="font-bold text-neutral-900 mb-4 flex items-center gap-2">
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
                          <div className="text-2xl font-bold text-neutral-900">
                            {value ? Number(value).toFixed(1) : "—"}
                          </div>
                          <div className="text-xs text-neutral-500 font-medium mt-1">{label}</div>
                          <div className="w-full bg-neutral-100 rounded-full h-1.5 mt-2">
                            <div
                              className="bg-amber-400 h-1.5 rounded-full"
                              style={{ width: `${value ? (Number(value) / 5) * 100 : 0}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-neutral-500 mt-4">
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
                    <div className="bg-white rounded-2xl border border-neutral-100 p-6 shadow-sm">
                      <h3 className="font-bold text-sm text-neutral-900 mb-4 flex items-center gap-2">
                        <Layers className="w-4 h-4 text-purple-500" />
                        Taxonomy
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-neutral-500 font-medium">Sector</span>
                          <span className="font-semibold text-neutral-900">{SECTOR_LABELS[vendor.taxonomy.sector]}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-500 font-medium">Tier</span>
                          <span className="font-semibold text-neutral-900">{BRAND_TIER_LABELS[vendor.taxonomy.tier]}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="bg-white rounded-2xl border border-neutral-100 p-6 shadow-sm">
                    <h3 className="font-bold text-sm text-neutral-900 mb-4 flex items-center gap-2">
                      <Shield className="w-4 h-4 text-green-500" />
                      Security Report
                    </h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        <span className="font-medium text-neutral-700">URLs verified</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        <span className="font-medium text-neutral-700">No executable code</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        <span className="font-medium text-neutral-700">No credential harvesting</span>
                      </div>
                      <div className="flex items-center gap-2 text-neutral-500">
                        <Shield className="w-4 h-4" />
                        <span className="font-medium">CreditClaw authored</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-neutral-100 p-6 shadow-sm">
                    <h3 className="font-bold text-sm text-neutral-900 mb-4 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-neutral-500" />
                      Metadata
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-neutral-500 font-medium">Version</span>
                        <span className="font-semibold text-neutral-900">{vendor?.version ?? "1.0.0"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-500 font-medium">Last verified</span>
                        <span className="font-semibold text-neutral-900">{vendor?.lastVerified ?? (brand.lastScannedAt ? new Date(brand.lastScannedAt).toISOString().split("T")[0] : "—")}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-500 font-medium">Generated by</span>
                        <span className="font-semibold text-neutral-900 capitalize">{vendor?.generatedBy ?? "scanner"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-500 font-medium">Maturity</span>
                        <Badge className={`text-[10px] border ${maturity.className}`}>{maturity.label}</Badge>
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
