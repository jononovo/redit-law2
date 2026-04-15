import type { FullShopFieldEvent } from "../types";
import { EVENT_TYPES } from "../constants";

const BACKTRACK_PENALTY = 15;
const WRONG_PRODUCT_PENALTY = 10;
const COLOR_SIZE_CHANGE_PENALTY = 5;
const FIELD_CLEAR_PENALTY = 3;
const EXCESSIVE_EVENTS_PENALTY = 5;
const EXCESSIVE_EVENTS_THRESHOLD = 15;

export function calculateNavigationEfficiencyScore(
  events: FullShopFieldEvent[]
): { score: number; backtracks: number; wrongClicks: number; corrections: number } {
  let score = 100;
  let backtracks = 0;
  let wrongClicks = 0;
  let corrections = 0;

  for (const event of events) {
    if (event.event_type === EVENT_TYPES.PAGE_BACK) {
      backtracks++;
      score -= BACKTRACK_PENALTY;
    }
  }

  const productClicks = events.filter(
    (e) => e.event_type === EVENT_TYPES.PRODUCT_CLICK
  );
  if (productClicks.length > 1) {
    wrongClicks += productClicks.length - 1;
    score -= wrongClicks * WRONG_PRODUCT_PENALTY;
  }

  const colorSelects = events.filter(
    (e) => e.event_type === EVENT_TYPES.COLOR_SELECT
  );
  if (colorSelects.length > 1) {
    corrections += colorSelects.length - 1;
    score -= (colorSelects.length - 1) * COLOR_SIZE_CHANGE_PENALTY;
  }

  const sizeSelects = events.filter(
    (e) => e.event_type === EVENT_TYPES.SIZE_SELECT
  );
  if (sizeSelects.length > 1) {
    corrections += sizeSelects.length - 1;
    score -= (sizeSelects.length - 1) * COLOR_SIZE_CHANGE_PENALTY;
  }

  const fieldClears = events.filter(
    (e) =>
      e.event_type === EVENT_TYPES.ADDRESS_FIELD_CLEAR ||
      e.event_type === EVENT_TYPES.CARD_FIELD_CLEAR ||
      e.event_type === EVENT_TYPES.SEARCH_CLEAR
  );
  corrections += fieldClears.length;
  score -= fieldClears.length * FIELD_CLEAR_PENALTY;

  const eventsByStage = new Map<string, number>();
  for (const event of events) {
    eventsByStage.set(event.stage, (eventsByStage.get(event.stage) ?? 0) + 1);
  }
  eventsByStage.forEach((count) => {
    if (count > EXCESSIVE_EVENTS_THRESHOLD) {
      score -= EXCESSIVE_EVENTS_PENALTY;
    }
  });

  score = Math.max(0, score);

  return { score, backtracks, wrongClicks, corrections };
}
