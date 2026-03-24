export type VendorTier =
  | "top_luxury"
  | "luxury"
  | "premium"
  | "mid_range"
  | "value"
  | "fast_fashion"
  | "utility"
  | "wholesale"
  | "marketplace";

export const TIER_LABELS: Record<VendorTier, string> = {
  top_luxury: "Top Luxury",
  luxury: "Luxury",
  premium: "Premium",
  mid_range: "Mid-Range",
  value: "Value",
  fast_fashion: "Fast Fashion",
  utility: "Utility",
  wholesale: "Wholesale",
  marketplace: "Marketplace",
};
