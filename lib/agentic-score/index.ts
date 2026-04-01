export { computeASXScore } from "./compute";
export { fetchScanInputs, normalizeDomain, domainToSlug } from "./fetch";
export { generateRecommendations } from "./recommendations";
export { extractMeta } from "./extract-meta";
export type {
  ScoreInput,
  ASXScoreResult,
  ASXScoreBreakdown,
  PillarScore,
  SignalScore,
  ASXRecommendation,
  ScoreLabel,
  SignalKey,
} from "./types";
