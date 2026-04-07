import { RAIL5_CARD_DELIVERED } from "./rail5-card-delivered";
export { RAIL5_CARD_DELIVERED } from "./rail5-card-delivered";
export { buildRail5TestInstructions } from "./rail5-test-required";

const templates: Record<string, string> = {
  "rail5.card.delivered": RAIL5_CARD_DELIVERED,
};

export function getTemplate(
  eventType: string,
  vars?: Record<string, string>,
): string {
  const raw = templates[eventType];
  if (!raw) {
    throw new Error(`No bot message template found for event type: ${eventType}`);
  }
  if (!vars) return raw;

  return Object.entries(vars).reduce(
    (text, [key, value]) => text.replaceAll(`{{${key}}}`, value),
    raw,
  );
}
