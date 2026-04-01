// Score engine
export { computeASXScore } from "./compute";
export { generateRecommendations } from "./recommendations";

// Data gathering
export { fetchScanInputs, fetchPage, fetchPages, probeUrl, normalizeDomain } from "./fetch";
export { probeForAPIs, detectBusinessFeatures, checkProtocolSupport } from "./probes";
export { analyzeCheckoutFlow } from "./llm";
export { analyzeVendor } from "./analyze";

// Types
export type {
  ScoreInput,
  ASXScoreResult,
  ASXScoreBreakdown,
  PillarScore,
  SignalScore,
  ASXRecommendation,
  ScoreLabel,
  SignalKey,
  PageContent,
  AnalysisEvidence,
  BuilderOutput,
  ProbeResult,
  LLMCheckoutAnalysis,
} from "./types";
