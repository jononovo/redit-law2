import type { ProcurementRules } from "./types";

export const DEFAULT_PROCUREMENT_RULES: ProcurementRules = {
  allowlistedDomains: [],
  blocklistedDomains: [],
  allowlistedMerchants: [],
  blocklistedMerchants: [],
  allowlistedCategories: [],
  blocklistedCategories: ["gambling", "adult_content", "cryptocurrency", "cash_advances"],
};
