export type BrandType =
  | "brand"
  | "retailer"
  | "marketplace"
  | "chain"
  | "independent"
  | "department_store"
  | "supermarket"
  | "mega_merchant";

export const BRAND_TYPE_LABELS: Record<BrandType, string> = {
  brand: "Brand",
  retailer: "Retailer",
  marketplace: "Marketplace",
  chain: "Chain",
  independent: "Independent",
  department_store: "Department Store",
  supermarket: "Supermarket",
  mega_merchant: "Mega Merchant",
};

export const MULTI_SECTOR_TYPES: BrandType[] = [
  "department_store",
  "supermarket",
  "mega_merchant",
];

export const VALID_BRAND_TYPES: BrandType[] = [
  "brand",
  "retailer",
  "marketplace",
  "chain",
  "independent",
  "department_store",
  "supermarket",
  "mega_merchant",
];
