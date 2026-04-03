import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  ShoppingCart,
  Zap,
  Globe,
  CreditCard,
  Monitor,
  Cpu,
  CheckCircle2,
  Package,
  TrendingUp,
  Layers,
  Tag,
  Star,
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
} from "@/lib/procurement-skills/types";
import type { BrandIndex } from "@/shared/schema";

export const MATURITY_CONFIG: Record<SkillMaturity, { label: string; className: string }> = {
  verified: { label: "Verified", className: "bg-green-100 text-green-700 border-green-200" },
  official: { label: "Official", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  beta: { label: "Beta", className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  community: { label: "Community", className: "bg-blue-100 text-blue-700 border-blue-200" },
  draft: { label: "Draft", className: "bg-neutral-100 text-neutral-600 border-neutral-200" },
};

export const SECTOR_ICONS: Partial<Record<VendorSector, React.ReactNode>> = {
  "animals-pet-supplies": <Dog className="w-4 h-4" />,
  "apparel-accessories": <Tag className="w-4 h-4" />,
  "arts-entertainment": <Clapperboard className="w-4 h-4" />,
  "baby-toddler": <Baby className="w-4 h-4" />,
  "business-industrial": <Briefcase className="w-4 h-4" />,
  "cameras-optics": <Camera className="w-4 h-4" />,
  "electronics": <Cpu className="w-4 h-4" />,
  "food-beverages-tobacco": <ShoppingCart className="w-4 h-4" />,
  "furniture": <Armchair className="w-4 h-4" />,
  "hardware": <Wrench className="w-4 h-4" />,
  "health-beauty": <Heart className="w-4 h-4" />,
  "home-garden": <Home className="w-4 h-4" />,
  "luggage-bags": <Briefcase className="w-4 h-4" />,
  "mature": <Star className="w-4 h-4" />,
  "media": <Music className="w-4 h-4" />,
  "office-supplies": <Package className="w-4 h-4" />,
  "religious-ceremonial": <Church className="w-4 h-4" />,
  "software": <Monitor className="w-4 h-4" />,
  "sporting-goods": <TrendingUp className="w-4 h-4" />,
  "toys-games": <Gamepad2 className="w-4 h-4" />,
  "vehicles-parts": <Car className="w-4 h-4" />,
  "food-services": <ShoppingCart className="w-4 h-4" />,
  "travel": <Plane className="w-4 h-4" />,
  "education": <BookOpen className="w-4 h-4" />,
  "events": <Ticket className="w-4 h-4" />,
  "luxury": <Star className="w-4 h-4" />,
  "specialty": <Layers className="w-4 h-4" />,
};

export const CHECKOUT_ICONS: Record<CheckoutMethod, React.ReactNode> = {
  native_api: <Zap className="w-3 h-3" />,
  acp: <CreditCard className="w-3 h-3" />,
  x402: <Globe className="w-3 h-3" />,
  crossmint_world: <Globe className="w-3 h-3" />,
  self_hosted_card: <CreditCard className="w-3 h-3" />,
  browser_automation: <Monitor className="w-3 h-3" />,
};

export function getScoreColor(score: number | null | undefined): { bg: string; text: string; border: string } {
  if (score == null) return { bg: "bg-neutral-50", text: "text-neutral-400", border: "border-neutral-200" };
  if (score >= 86) return { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" };
  if (score >= 71) return { bg: "bg-green-50", text: "text-green-700", border: "border-green-200" };
  if (score >= 51) return { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" };
  if (score >= 31) return { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" };
  return { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" };
}

export function getSuccessRate(brand: any): number | null {
  if ('successRate' in brand && brand.successRate != null) {
    const val = Number(brand.successRate);
    return isNaN(val) ? null : val;
  }
  const vendor = brand.brandData as any;
  return vendor?.feedbackStats?.successRate ?? null;
}

export function VendorCard({ brand }: { brand: BrandIndex }) {
  const successRate = getSuccessRate(brand);
  const maturity = MATURITY_CONFIG[brand.maturity as SkillMaturity] ?? MATURITY_CONFIG.draft;
  const sectorKey = (brand.sector) as VendorSector;
  const checkoutMethods = (brand.checkoutMethods ?? []) as CheckoutMethod[];
  const capabilities = (brand.capabilities ?? []) as VendorCapability[];
  const subSectors = brand.subSectors ?? [];
  const tier = brand.tier as BrandTier | null;
  const scoreColor = getScoreColor(brand.overallScore);

  return (
    <Link
      href={`/skills/${brand.slug}`}
      className="group block p-6 rounded-2xl bg-white border border-neutral-100 hover:border-primary/30 hover:shadow-xl transition-all duration-300"
      data-testid={`card-vendor-${brand.slug}`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-neutral-50 border border-neutral-100 flex items-center justify-center text-lg font-bold text-neutral-400 group-hover:scale-105 transition-transform">
            {brand.name[0]}
          </div>
          <div>
            <h3 className="font-bold text-neutral-900 text-lg group-hover:text-primary transition-colors">
              {brand.name}
            </h3>
            <div className="flex items-center gap-1.5 text-xs text-neutral-500">
              {SECTOR_ICONS[sectorKey] || <Layers className="w-4 h-4" />}
              <span>{SECTOR_LABELS[sectorKey] ?? brand.sector}</span>
              {tier && (
                <>
                  <span className="text-neutral-300 mx-0.5">·</span>
                  <span>{BRAND_TIER_LABELS[tier]}</span>
                </>
              )}
            </div>
          </div>
        </div>
        <Badge className={`text-[10px] border ${maturity.className}`} data-testid={`badge-maturity-${brand.slug}`}>
          {maturity.label}
        </Badge>
      </div>

      {subSectors.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {subSectors.slice(0, 3).map(sub => (
            <span
              key={sub}
              className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-purple-50 text-purple-600 border border-purple-100"
            >
              {sub}
            </span>
          ))}
          {subSectors.length > 3 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-neutral-50 text-neutral-500">
              +{subSectors.length - 3} more
            </span>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-1.5 mb-4">
        {checkoutMethods.slice(0, 3).map(method => (
          <span
            key={method}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${CHECKOUT_METHOD_COLORS[method] ?? ""}`}
          >
            {CHECKOUT_ICONS[method]}
            {CHECKOUT_METHOD_LABELS[method] ?? method}
          </span>
        ))}
      </div>

      <div className="flex flex-wrap gap-1 mb-4">
        {capabilities.slice(0, 4).map(cap => (
          <span
            key={cap}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-neutral-50 text-neutral-600 border border-neutral-100"
          >
            <CheckCircle2 className="w-2.5 h-2.5 text-green-500" />
            {CAPABILITY_LABELS[cap] ?? cap}
          </span>
        ))}
        {capabilities.length > 4 && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-neutral-50 text-neutral-500">
            +{capabilities.length - 4} more
          </span>
        )}
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-neutral-50">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5" data-testid={`score-asx-${brand.slug}`}>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold border ${scoreColor.bg} ${scoreColor.text} ${scoreColor.border}`}>
              {brand.overallScore != null ? brand.overallScore : "—"}
            </span>
            <span className="text-xs text-neutral-500">/ 100</span>
          </div>
          {brand.axsRating && (
            <div className="flex items-center gap-1 text-xs" data-testid={`rating-axs-${brand.slug}`}>
              <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
              <span className="font-semibold text-neutral-700">
                {Number(brand.axsRating).toFixed(1)}
              </span>
              <span className="text-neutral-400">({brand.ratingCount})</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {brand.hasDeals && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100" data-testid={`badge-deals-${brand.slug}`}>
              <Tag className="w-2.5 h-2.5" />
              Deals
            </span>
          )}
          {successRate != null && (
            <div className="flex items-center gap-1 text-xs" data-testid={`stat-success-${brand.slug}`}>
              <TrendingUp className="w-3 h-3 text-green-500" />
              <span className="font-semibold text-green-700">
                {Math.round(successRate * 100)}%
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
