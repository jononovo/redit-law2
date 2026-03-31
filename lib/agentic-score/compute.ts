import type { ScoreInput, ASXScoreResult, ASXScoreBreakdown, ScoreLabel, SignalScore } from "./types";
import { scoreJsonLd, scoreProductFeed, scoreCleanHtml } from "./signals/clarity";
import { scoreSearchApi, scoreSiteSearch, scorePageLoad } from "./signals/speed";
import { scoreAccessAuth, scoreOrderManagement, scoreCheckoutFlow, scoreBotTolerance } from "./signals/reliability";
import { generateRecommendations } from "./recommendations";

function getLabel(score: number): ScoreLabel {
  if (score <= 20) return "Poor";
  if (score <= 40) return "Needs Work";
  if (score <= 60) return "Fair";
  if (score <= 80) return "Good";
  return "Excellent";
}

function sumSignals(signals: SignalScore[]): number {
  return signals.reduce((sum, s) => sum + s.score, 0);
}

export function computeASXScore(input: ScoreInput): ASXScoreResult {
  if (!input) throw new Error("ScoreInput is required");
  const homepageHtml = input.homepageHtml || "";
  const sitemapContent = input.sitemapContent ?? null;
  const robotsTxtContent = input.robotsTxtContent ?? null;
  const pageLoadTimeMs = input.pageLoadTimeMs ?? null;

  const claritySignals: SignalScore[] = [
    scoreJsonLd(homepageHtml),
    scoreProductFeed(sitemapContent, robotsTxtContent),
    scoreCleanHtml(homepageHtml),
  ];

  const speedSignals: SignalScore[] = [
    scoreSearchApi(homepageHtml),
    scoreSiteSearch(homepageHtml),
    scorePageLoad(pageLoadTimeMs),
  ];

  const reliabilitySignals: SignalScore[] = [
    scoreAccessAuth(homepageHtml),
    scoreOrderManagement(homepageHtml),
    scoreCheckoutFlow(homepageHtml),
    scoreBotTolerance(robotsTxtContent, homepageHtml),
  ];

  const breakdown: ASXScoreBreakdown = {
    clarity: {
      score: sumSignals(claritySignals),
      max: 40,
      signals: claritySignals,
    },
    speed: {
      score: sumSignals(speedSignals),
      max: 25,
      signals: speedSignals,
    },
    reliability: {
      score: sumSignals(reliabilitySignals),
      max: 35,
      signals: reliabilitySignals,
    },
  };

  const overallScore = breakdown.clarity.score + breakdown.speed.score + breakdown.reliability.score;

  const allSignals = [...claritySignals, ...speedSignals, ...reliabilitySignals];
  const recommendations = generateRecommendations(allSignals);

  return {
    overallScore,
    breakdown,
    recommendations,
    label: getLabel(overallScore),
  };
}
