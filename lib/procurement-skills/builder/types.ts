import type { VendorSkill, CheckoutMethod } from "../types";

export interface AnalysisEvidence {
  field: string;
  source: "robots_txt" | "meta_tags" | "structured_data" | "page_crawl" | "api_probe" | "llm_inference";
  url: string;
  snippet: string;
}

export interface AnalysisResult {
  vendor: Partial<VendorSkill>;
  confidence: Record<string, number>;
  evidence: AnalysisEvidence[];
  warnings: string[];
}

export interface BuilderOutput {
  draft: Partial<VendorSkill>;
  confidence: Record<string, number>;
  evidence: AnalysisEvidence[];
  warnings: string[];
  reviewNeeded: string[];
  autoPublish: boolean;
}

export interface ProbeResult {
  protocol: CheckoutMethod;
  found: boolean;
  url?: string;
  details?: string;
}

export interface PageContent {
  url: string;
  html: string;
  title?: string;
  statusCode: number;
}

export interface LLMCheckoutAnalysis {
  name: string;
  slug: string;
  category: string;
  searchPattern: string;
  searchUrlTemplate: string;
  productIdFormat: string;
  guestCheckout: boolean;
  taxExemptField: boolean;
  poNumberField: boolean;
  freeShippingThreshold: number | null;
  estimatedDeliveryDays: string;
  businessShipping: boolean;
  capabilities: string[];
  tips: string[];
}
