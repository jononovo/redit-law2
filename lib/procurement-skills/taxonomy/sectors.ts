export type VendorSector =
  | "animals-pet-supplies"
  | "apparel-accessories"
  | "arts-entertainment"
  | "baby-toddler"
  | "business-industrial"
  | "cameras-optics"
  | "electronics"
  | "food-beverages-tobacco"
  | "furniture"
  | "hardware"
  | "health-beauty"
  | "home-garden"
  | "luggage-bags"
  | "mature"
  | "media"
  | "office-supplies"
  | "religious-ceremonial"
  | "software"
  | "sporting-goods"
  | "toys-games"
  | "vehicles-parts"
  | "food-services"
  | "travel"
  | "education"
  | "events"
  | "luxury"
  | "specialty";

export const SECTOR_LABELS: Record<VendorSector, string> = {
  "animals-pet-supplies": "Animals & Pet Supplies",
  "apparel-accessories": "Apparel & Accessories",
  "arts-entertainment": "Arts & Entertainment",
  "baby-toddler": "Baby & Toddler",
  "business-industrial": "Business & Industrial",
  "cameras-optics": "Cameras & Optics",
  "electronics": "Electronics",
  "food-beverages-tobacco": "Food, Beverages & Tobacco",
  "furniture": "Furniture",
  "hardware": "Hardware",
  "health-beauty": "Health & Beauty",
  "home-garden": "Home & Garden",
  "luggage-bags": "Luggage & Bags",
  "mature": "Mature",
  "media": "Media",
  "office-supplies": "Office Supplies",
  "religious-ceremonial": "Religious & Ceremonial",
  "software": "Software",
  "sporting-goods": "Sporting Goods",
  "toys-games": "Toys & Games",
  "vehicles-parts": "Vehicles & Parts",
  "food-services": "Food Services",
  "travel": "Travel",
  "education": "Education",
  "events": "Events",
  "luxury": "Luxury",
  "specialty": "Specialty",
};

export const GOOGLE_ROOT_IDS: Partial<Record<VendorSector, number>> = {
  "animals-pet-supplies": 1,
  "apparel-accessories": 166,
  "arts-entertainment": 8,
  "baby-toddler": 537,
  "business-industrial": 111,
  "cameras-optics": 141,
  "electronics": 222,
  "food-beverages-tobacco": 422,
  "furniture": 436,
  "hardware": 632,
  "health-beauty": 469,
  "home-garden": 536,
  "luggage-bags": 110,
  "mature": 772,
  "media": 783,
  "office-supplies": 922,
  "religious-ceremonial": 988,
  "software": 313,
  "sporting-goods": 990,
  "toys-games": 1239,
  "vehicles-parts": 888,
};

export const ASSIGNABLE_SECTORS: VendorSector[] = [
  "animals-pet-supplies",
  "apparel-accessories",
  "arts-entertainment",
  "baby-toddler",
  "business-industrial",
  "cameras-optics",
  "electronics",
  "food-beverages-tobacco",
  "furniture",
  "hardware",
  "health-beauty",
  "home-garden",
  "luggage-bags",
  "mature",
  "media",
  "office-supplies",
  "religious-ceremonial",
  "software",
  "sporting-goods",
  "toys-games",
  "vehicles-parts",
  "food-services",
  "travel",
  "education",
  "events",
  "specialty",
];

export const LUXURY_TIERS = ["ultra_luxury", "luxury"] as const;

export function isSectorLuxuryFilter(sector: string): boolean {
  return sector === "luxury";
}

export function hasGoogleRoot(sector: VendorSector): boolean {
  return sector in GOOGLE_ROOT_IDS;
}
