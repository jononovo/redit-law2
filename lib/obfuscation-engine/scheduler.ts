import { storage } from "@/server/storage";
import { shouldRunObfuscation } from "./state-machine";
import { createObfuscationEvent } from "./events";

export async function tickCard(cardId: string): Promise<number> {
  const card = await storage.getRail4CardByCardId(cardId);
  if (!card || card.status !== "active") return 0;

  const count = await shouldRunObfuscation(cardId);
  if (count <= 0) return 0;

  let created = 0;
  for (let i = 0; i < count; i++) {
    await createObfuscationEvent(cardId, card.realProfileIndex);
    created++;
  }

  return created;
}

export async function tickAllActiveCards(): Promise<{ processed: number; eventsCreated: number; details: Array<{ cardId: string; events: number }> }> {
  const activeStates = await storage.getActiveObfuscationStates();
  let processed = 0;
  let eventsCreated = 0;
  const details: Array<{ cardId: string; events: number }> = [];

  for (const state of activeStates) {
    const events = await tickCard(state.cardId);
    processed++;
    eventsCreated += events;
    if (events > 0) {
      details.push({ cardId: state.cardId, events });
    }
  }

  return { processed, eventsCreated, details };
}
