export interface ASXScoreResult {
  overallScore: number;
  breakdown: ASXScoreBreakdown;
  recommendations: ASXRecommendation[];
  label: ScoreLabel;
}

export type ScoreLabel = "Poor" | "Needs Work" | "Fair" | "Good" | "Excellent";

export interface ASXScoreBreakdown {
  clarity: PillarScore;
  discoverability: PillarScore;
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
  | "product_page"
  | "access_auth"
  | "order_management"
  | "checkout_flow"
  | "bot_tolerance";
