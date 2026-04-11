import type { VendorSkill, VendorCapability } from "@/features/brand-engine/procurement-skills/types";
import type { VendorSector } from "@/features/brand-engine/procurement-skills/taxonomy/sectors";
import { ASSIGNABLE_SECTORS } from "@/features/brand-engine/procurement-skills/taxonomy/sectors";
import type { SiteAudit } from "./audit-site";

export const VALID_SECTORS: VendorSector[] = [...ASSIGNABLE_SECTORS];

export const VALID_CAPABILITIES: VendorCapability[] = [
  "price_lookup", "stock_check", "programmatic_checkout", "business_invoicing",
  "bulk_pricing", "tax_exemption", "account_creation", "order_tracking", "returns", "po_numbers",
];

export function toValidSector(s: string): VendorSector {
  return VALID_SECTORS.includes(s as VendorSector) ? (s as VendorSector) : "specialty";
}

export function toValidCapabilities(caps: unknown): VendorCapability[] {
  if (!Array.isArray(caps)) return [];
  return caps.filter((c): c is VendorCapability =>
    typeof c === "string" && VALID_CAPABILITIES.includes(c as VendorCapability)
  );
}

export function mergeArrayField(
  existing: string[] | null | undefined,
  incoming: string[] | undefined,
): string[] {
  const base = existing ?? [];
  if (!incoming || incoming.length === 0) return base;
  return [...new Set([...base, ...incoming])];
}

export function domainToLabel(domain: string): string {
  const segment = domain.split(".")[0];
  return segment.charAt(0).toUpperCase() + segment.slice(1);
}

export function buildVendorSkillDraft(
  slug: string,
  domain: string,
  name: string,
  sector: string,
  audit: SiteAudit | null,
  capabilities: VendorCapability[],
): VendorSkill {
  return {
    slug,
    name,
    url: `https://${domain}`,
    sector: toValidSector(sector),
    checkoutMethods: ["browser_automation"],
    capabilities,
    maturity: "draft",
    methodConfig: {
      browser_automation: {
        requiresAuth: !(audit?.hasGuestCheckout ?? false),
        notes: audit?.hasGuestCheckout
          ? "Guest checkout available"
          : "Account may be required",
      },
    },
    search: {
      pattern: audit?.searchUrlPattern
        ? `Search via ${audit.searchUrlPattern}`
        : `Search on ${name}`,
      urlTemplate: audit?.searchUrlPattern ?? undefined,
    },
    checkout: {
      guestCheckout: audit?.hasGuestCheckout ?? false,
      taxExemptField: false,
      poNumberField: false,
    },
    shipping: {
      freeThreshold: (audit?.freeShippingThreshold != null && audit.freeShippingThreshold >= 0)
        ? audit.freeShippingThreshold
        : undefined,
      estimatedDays: audit?.estimatedDeliveryDays ?? "Varies",
      businessShipping: false,
    },
    tips: audit?.tips?.length ? audit.tips : [
      `Visit https://${domain} to browse products`,
      "Use the site search to find specific items",
    ],
    version: "1.0.0",
    lastVerified: new Date().toISOString().split("T")[0],
    generatedBy: "agentic_scanner",
  };
}

export function resolveMaturity(
  currentMaturity: string | null,
  hasScore: boolean,
  hasSkillMd: boolean,
  hasBrandData: boolean,
): string {
  if (currentMaturity && currentMaturity !== "draft") {
    return currentMaturity;
  }
  if (hasScore && hasSkillMd && hasBrandData) {
    return "community";
  }
  return "draft";
}
