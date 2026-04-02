import type { ASXScoreResult, ASXScoreBreakdown, SignalScore, ScoreLabel } from "./types";
import type { LLMScanFindings } from "./llm";

function getLabel(score: number): ScoreLabel {
  if (score <= 20) return "Poor";
  if (score <= 40) return "Needs Work";
  if (score <= 60) return "Fair";
  if (score <= 80) return "Good";
  return "Excellent";
}

function boostSignal(signal: SignalScore, newScore: number): SignalScore {
  const clamped = Math.min(newScore, signal.max);
  if (clamped <= signal.score) return signal;
  return { ...signal, score: clamped };
}

function enhanceClaritySignals(signals: SignalScore[], findings: LLMScanFindings): SignalScore[] {
  return signals.map((s) => {
    if (s.key === "clean_html" && findings.name) {
      return boostSignal(s, Math.max(s.score, 6));
    }
    return s;
  });
}

function enhanceSpeedSignals(signals: SignalScore[], findings: LLMScanFindings): SignalScore[] {
  return signals.map((s) => {
    if (s.key === "search_api" && findings.hasApi) {
      return boostSignal(s, Math.max(s.score, 5));
    }
    if (s.key === "site_search" && findings.searchUrlTemplate) {
      return boostSignal(s, Math.max(s.score, 6));
    }
    return s;
  });
}

function enhanceReliabilitySignals(signals: SignalScore[], findings: LLMScanFindings): SignalScore[] {
  return signals.map((s) => {
    if (s.key === "checkout_flow") {
      let boost = s.score;
      if (findings.guestCheckout) boost = Math.max(boost, 5);
      if (findings.taxExemptField) boost = Math.max(boost, boost + 1);
      if (findings.poNumberField) boost = Math.max(boost, boost + 1);
      return boostSignal(s, Math.min(boost, s.max));
    }
    if (s.key === "order_management") {
      const caps = findings.capabilities ?? [];
      let boost = s.score;
      if (caps.includes("order_tracking")) boost = Math.max(boost, 4);
      if (caps.includes("returns")) boost = Math.max(boost, boost + 2);
      return boostSignal(s, Math.min(boost, s.max));
    }
    if (s.key === "access_auth" && findings.guestCheckout) {
      return boostSignal(s, Math.max(s.score, 6));
    }
    return s;
  });
}

function sumSignals(signals: SignalScore[]): number {
  return signals.reduce((sum, s) => sum + s.score, 0);
}

export function enhanceScores(
  baseResult: ASXScoreResult,
  findings: LLMScanFindings,
): ASXScoreResult {
  if (!findings || Object.keys(findings).length === 0) return baseResult;

  const clarity = enhanceClaritySignals(baseResult.breakdown.clarity.signals, findings);
  const speed = enhanceSpeedSignals(baseResult.breakdown.speed.signals, findings);
  const reliability = enhanceReliabilitySignals(baseResult.breakdown.reliability.signals, findings);

  const breakdown: ASXScoreBreakdown = {
    clarity: {
      score: sumSignals(clarity),
      max: baseResult.breakdown.clarity.max,
      signals: clarity,
    },
    speed: {
      score: sumSignals(speed),
      max: baseResult.breakdown.speed.max,
      signals: speed,
    },
    reliability: {
      score: sumSignals(reliability),
      max: baseResult.breakdown.reliability.max,
      signals: reliability,
    },
  };

  const overallScore = breakdown.clarity.score + breakdown.speed.score + breakdown.reliability.score;

  return {
    overallScore,
    breakdown,
    recommendations: baseResult.recommendations,
    label: getLabel(overallScore),
  };
}
