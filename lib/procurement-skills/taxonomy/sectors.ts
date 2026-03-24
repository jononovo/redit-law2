export type VendorSector =
  | "retail"
  | "office"
  | "fashion"
  | "health"
  | "beauty"
  | "saas"
  | "home"
  | "construction"
  | "automotive"
  | "electronics"
  | "food"
  | "sports"
  | "industrial"
  | "specialty"
  | "luxury"
  | "travel"
  | "entertainment"
  | "education"
  | "pets"
  | "garden";

export const SECTOR_LABELS: Record<VendorSector, string> = {
  retail: "Retail",
  office: "Office",
  fashion: "Fashion",
  health: "Health",
  beauty: "Beauty",
  saas: "SaaS",
  home: "Home",
  construction: "Construction",
  automotive: "Automotive",
  electronics: "Electronics",
  food: "Food & Beverage",
  sports: "Sports & Outdoors",
  industrial: "Industrial",
  specialty: "Specialty",
  luxury: "Luxury",
  travel: "Travel",
  entertainment: "Entertainment",
  education: "Education",
  pets: "Pets",
  garden: "Garden & Outdoor",
};
