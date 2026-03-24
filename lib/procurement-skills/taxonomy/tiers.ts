export type BrandTier =
  | "ultra_luxury"
  | "luxury"
  | "premium"
  | "mid_range"
  | "value"
  | "budget"
  | "commodity";

export const BRAND_TIER_LABELS: Record<BrandTier, string> = {
  ultra_luxury: "Ultra Luxury",
  luxury: "Luxury",
  premium: "Premium",
  mid_range: "Mid-Range",
  value: "Value",
  budget: "Budget",
  commodity: "Commodity / Essentials",
};

/** @deprecated Use BrandTier instead */
export type VendorTier = BrandTier;
/** @deprecated Use BRAND_TIER_LABELS instead */
export const TIER_LABELS: Record<BrandTier, string> = BRAND_TIER_LABELS;
