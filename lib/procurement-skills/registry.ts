import { VendorSkill } from "./types";
import {
  amazon,
  shopify,
  amazon_business,
  walmart,
  walmart_business,
  staples,
  home_depot,
  lowes,
  office_depot,
  uline,
  grainger,
  newegg,
  bh_photo,
  mcmaster_carr,
} from "./vendors";

export const VENDOR_REGISTRY: VendorSkill[] = [
  amazon,
  shopify,
  amazon_business,
  walmart,
  walmart_business,
  staples,
  home_depot,
  lowes,
  office_depot,
  uline,
  grainger,
  newegg,
  bh_photo,
  mcmaster_carr,
];

export function getVendorBySlug(slug: string): VendorSkill | undefined {
  return VENDOR_REGISTRY.find(v => v.slug === slug);
}

export function getVendorsByCategory(category: string): VendorSkill[] {
  return VENDOR_REGISTRY.filter(v => v.category === category);
}

export function getVendorsBySector(sector: string): VendorSkill[] {
  return VENDOR_REGISTRY.filter(v => v.taxonomy?.sector === sector);
}

export function getVendorsByTier(tier: string): VendorSkill[] {
  return VENDOR_REGISTRY.filter(v => v.taxonomy?.tier === tier);
}

export function searchVendors(query: string): VendorSkill[] {
  const q = query.toLowerCase();
  return VENDOR_REGISTRY.filter(
    v =>
      v.name.toLowerCase().includes(q) ||
      v.slug.includes(q) ||
      v.category.includes(q) ||
      v.taxonomy?.sector.includes(q) ||
      v.taxonomy?.subSectors.some(s => s.toLowerCase().includes(q)) ||
      v.taxonomy?.tags?.some(t => t.toLowerCase().includes(q))
  );
}
