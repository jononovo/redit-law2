export type VendorCategory =
  | "retail"
  | "office"
  | "hardware"
  | "electronics"
  | "industrial"
  | "specialty";

export const CATEGORY_LABELS: Record<VendorCategory, string> = {
  retail: "Retail",
  office: "Office Supplies",
  hardware: "Hardware & Tools",
  electronics: "Electronics",
  industrial: "Industrial",
  specialty: "Specialty",
};
