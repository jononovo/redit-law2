import type { ProcurementRules, ProcurementRequest, ProcurementDecision } from "./types";

export function mergeProcurementRules(master: ProcurementRules, rail: ProcurementRules): ProcurementRules {
  return {
    allowlistedDomains: intersectLists(master.allowlistedDomains, rail.allowlistedDomains),
    blocklistedDomains: unionLists(master.blocklistedDomains, rail.blocklistedDomains),
    allowlistedMerchants: intersectLists(master.allowlistedMerchants, rail.allowlistedMerchants),
    blocklistedMerchants: unionLists(master.blocklistedMerchants, rail.blocklistedMerchants),
    allowlistedCategories: intersectLists(master.allowlistedCategories, rail.allowlistedCategories),
    blocklistedCategories: unionLists(master.blocklistedCategories, rail.blocklistedCategories),
  };
}

export function evaluateProcurementControls(
  rules: ProcurementRules,
  request: ProcurementRequest
): ProcurementDecision {
  if (request.domain) {
    const domain = normalizeDomain(request.domain);

    if (rules.blocklistedDomains.length > 0) {
      if (rules.blocklistedDomains.some((d) => normalizeDomain(d) === domain)) {
        return { action: "block", reason: `Domain "${domain}" is blocklisted` };
      }
    }

    if (rules.allowlistedDomains.length > 0) {
      if (!rules.allowlistedDomains.some((d) => normalizeDomain(d) === domain)) {
        return { action: "block", reason: `Domain "${domain}" is not on the allowlist` };
      }
    }
  }

  if (request.merchant) {
    const merchant = request.merchant.toLowerCase().trim();

    if (rules.blocklistedMerchants.length > 0) {
      if (rules.blocklistedMerchants.some((m) => m.toLowerCase().trim() === merchant)) {
        return { action: "block", reason: `Merchant "${request.merchant}" is blocklisted` };
      }
    }

    if (rules.allowlistedMerchants.length > 0) {
      if (!rules.allowlistedMerchants.some((m) => m.toLowerCase().trim() === merchant)) {
        return { action: "block", reason: `Merchant "${request.merchant}" is not on the allowlist` };
      }
    }
  }

  if (request.category) {
    const category = request.category.toLowerCase().trim();

    if (rules.blocklistedCategories.length > 0) {
      if (rules.blocklistedCategories.some((c) => c.toLowerCase().trim() === category)) {
        return { action: "block", reason: `Category "${request.category}" is blocklisted` };
      }
    }

    if (rules.allowlistedCategories.length > 0) {
      if (!rules.allowlistedCategories.some((c) => c.toLowerCase().trim() === category)) {
        return { action: "block", reason: `Category "${request.category}" is not on the allowlist` };
      }
    }
  }

  return { action: "allow" };
}

function normalizeDomain(input: string): string {
  try {
    if (input.includes("://")) {
      return new URL(input).hostname.toLowerCase();
    }
    return input.toLowerCase().trim();
  } catch {
    return input.toLowerCase().trim();
  }
}

function intersectLists(a: string[], b: string[]): string[] {
  if (a.length === 0) return b;
  if (b.length === 0) return a;
  const setB = new Set(b.map((s) => s.toLowerCase().trim()));
  return a.filter((item) => setB.has(item.toLowerCase().trim()));
}

function unionLists(a: string[], b: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of [...a, ...b]) {
    const key = item.toLowerCase().trim();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }
  return result;
}
