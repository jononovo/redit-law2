export type BrandType =
  | "brand"
  | "retailer"
  | "marketplace"
  | "chain"
  | "independent";

export const BRAND_TYPE_LABELS: Record<BrandType, string> = {
  brand: "Brand",
  retailer: "Retailer",
  marketplace: "Marketplace",
  chain: "Chain",
  independent: "Independent",
};
