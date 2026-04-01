// Re-export all types from the canonical source in lib/agentic-score/
export type {
  AnalysisEvidence,
  BuilderOutput,
  ProbeResult,
  PageContent,
  LLMCheckoutAnalysis,
} from "@/lib/agentic-score/types";

// Keep AnalysisResult for backwards compatibility
export type { BuilderOutput as AnalysisResult } from "@/lib/agentic-score/types";
