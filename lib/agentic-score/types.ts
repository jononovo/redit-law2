import type { CheckoutMethod } from "@/lib/procurement-skills/types";

// ---------------------------------------------------------------------------
// Score types
// ---------------------------------------------------------------------------

export interface ScoreInput {
  domain: string;
  homepageHtml: string;
  sitemapContent: string | null;
  robotsTxtContent: string | null;
  pageLoadTimeMs: number | null;
}

export interface ASXScoreResult {
  overallScore: number;
  breakdown: ASXScoreBreakdown;
  recommendations: ASXRecommendation[];
  label: ScoreLabel;
}

export type ScoreLabel = "Poor" | "Needs Work" | "Fair" | "Good" | "Excellent";

export interface ASXScoreBreakdown {
  clarity: PillarScore;
  speed: PillarScore;
  reliability: PillarScore;
}

export interface PillarScore {
  score: number;
  max: number;
  signals: SignalScore[];
}

export interface SignalScore {
  key: SignalKey;
  label: string;
  score: number;
  max: number;
  detail: string;
}

export interface ASXRecommendation {
  signal: SignalKey;
  impact: "high" | "medium" | "low";
  title: string;
  description: string;
  potentialGain: number;
}

export type SignalKey =
  | "json_ld"
  | "product_feed"
  | "clean_html"
  | "search_api"
  | "site_search"
  | "page_load"
  | "access_auth"
  | "order_management"
  | "checkout_flow"
  | "bot_tolerance";

// ---------------------------------------------------------------------------
// Fetch / page types
// ---------------------------------------------------------------------------

export interface PageContent {
  url: string;
  html: string;
  title?: string;
  statusCode: number;
}

// ---------------------------------------------------------------------------
// Analysis / builder types
// ---------------------------------------------------------------------------

export interface AnalysisEvidence {
  field: string;
  source: "robots_txt" | "meta_tags" | "structured_data" | "page_crawl" | "api_probe" | "llm_inference";
  url: string;
  snippet: string;
}

export interface BuilderOutput {
  draft: Partial<import("@/lib/procurement-skills/types").VendorSkill>;
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
  sector?: string;
  subSectors?: string[];
  tier?: string;
  tags?: string[];
  searchApi?: boolean;
  mcp?: boolean;
  orderingPermission?: string;
  checkoutProviders?: string[];
  paymentMethods?: string[];
  deliveryOptions?: string;
  freeDelivery?: string;
  returnsPolicy?: string;
  currentDeals?: boolean;
  dealsUrl?: string;
  loyaltyProgram?: string;
}
