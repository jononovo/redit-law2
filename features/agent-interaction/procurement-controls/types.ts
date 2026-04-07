export interface ProcurementRules {
  allowlistedDomains: string[];
  blocklistedDomains: string[];
  allowlistedMerchants: string[];
  blocklistedMerchants: string[];
  allowlistedCategories: string[];
  blocklistedCategories: string[];
}

export interface ProcurementRequest {
  domain?: string;
  merchant?: string;
  category?: string;
}

export type ProcurementDecision =
  | { action: "allow" }
  | { action: "block"; reason: string };
