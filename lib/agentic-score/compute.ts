import type { ScoreInput, ASXScoreResult } from "./types";
import { SCORING_RUBRIC } from "./rubric";
import { detectAll } from "./detectors";
import { computeScoreFromRubric } from "./scoring-engine";

export function computeASXScore(input: ScoreInput): ASXScoreResult {
  if (!input) throw new Error("ScoreInput is required");

  const evidence = detectAll(
    input.homepageHtml || "",
    input.sitemapContent ?? null,
    input.robotsTxtContent ?? null,
    input.pageLoadTimeMs ?? null,
  );

  return computeScoreFromRubric(SCORING_RUBRIC, evidence);
}
