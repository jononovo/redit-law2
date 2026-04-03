import type { VendorSkill, VendorCapability } from "@/lib/procurement-skills/types";
import type { VendorSector } from "@/lib/procurement-skills/taxonomy/sectors";
import type { EvidenceMap } from "./rubric";

export const VALID_SECTORS: VendorSector[] = [
  "retail", "office", "fashion", "health", "beauty", "saas", "home",
  "construction", "automotive", "electronics", "food", "sports",
  "industrial", "specialty", "luxury", "travel", "entertainment",
  "education", "pets", "garden",
];

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

export function mergeEvidence(detectorEvidence: EvidenceMap, agentEvidence: EvidenceMap): EvidenceMap {
  const merged = { ...detectorEvidence };
  for (const [key, value] of Object.entries(agentEvidence)) {
    if (value === null || value === undefined) continue;
    const existing = merged[key];
    if (existing === null || existing === undefined || existing === false) {
      merged[key] = value;
    } else if (typeof value === "boolean" && value === true) {
      merged[key] = true;
    }
  }
  return merged;
}

export function buildVendorSkillDraft(
  slug: string,
  domain: string,
  name: string,
  sector: string,
  findings: Record<string, unknown>,
): VendorSkill {
  return {
    slug,
    name,
    url: `https://${domain}`,
    sector: toValidSector(sector),
    checkoutMethods: ["browser_automation"],
    capabilities: toValidCapabilities(findings.capabilities),
    maturity: "draft",
    methodConfig: {
      browser_automation: {
        requiresAuth: !(findings.guestCheckout ?? false),
        notes: findings.guestCheckout
          ? "Guest checkout available"
          : "Account may be required",
      },
    },
    search: {
      pattern: (findings.searchPattern as string) ?? `Search on ${name}`,
      urlTemplate: findings.searchUrlTemplate as string | undefined,
      productIdFormat: findings.productIdFormat as string | undefined,
    },
    checkout: {
      guestCheckout: (findings.guestCheckout as boolean) ?? false,
      taxExemptField: (findings.taxExemptField as boolean) ?? false,
      poNumberField: (findings.poNumberField as boolean) ?? false,
    },
    shipping: {
      freeThreshold: (findings.freeShippingThreshold as number | undefined) ?? undefined,
      estimatedDays: (findings.estimatedDeliveryDays as string) ?? "Varies",
      businessShipping: (findings.businessShipping as boolean) ?? false,
    },
    tips: Array.isArray(findings.tips) ? findings.tips as string[] : [
      `Visit https://${domain} to browse products`,
      "Use the site search to find specific items",
    ],
    version: "1.0.0",
    lastVerified: new Date().toISOString().split("T")[0],
    generatedBy: "agentic_scanner",
  };
}

export function domainToLabel(domain: string): string {
  const segment = domain.split(".")[0];
  return segment.charAt(0).toUpperCase() + segment.slice(1);
}
