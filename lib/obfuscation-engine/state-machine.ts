import { storage } from "@/server/storage";
import type { ObfuscationState } from "@/shared/schema";

const WARMUP_DURATION_MS = 48 * 60 * 60 * 1000;
const IDLE_THRESHOLD_MS = 24 * 60 * 60 * 1000;
const OBFUSCATION_RATIO = 3;
const MAX_EVENTS_PER_TICK = 3;
const WARMUP_EVENTS_PER_DAY = 2;

export async function initializeState(cardId: string): Promise<ObfuscationState> {
  const existing = await storage.getObfuscationState(cardId);
  if (existing) return existing;

  return storage.createObfuscationState({
    cardId,
    phase: "warmup",
    active: true,
    activatedAt: new Date(),
    organicCount: 0,
    obfuscationCount: 0,
  });
}

export async function recordOrganicEvent(cardId: string): Promise<void> {
  const state = await storage.getObfuscationState(cardId);
  if (!state) return;

  await storage.updateObfuscationState(cardId, {
    phase: "active",
    lastOrganicAt: new Date(),
    organicCount: state.organicCount + 1,
    updatedAt: new Date(),
  });
}

export async function shouldRunObfuscation(cardId: string): Promise<number> {
  const state = await storage.getObfuscationState(cardId);
  if (!state || !state.active) return 0;

  const now = Date.now();

  if (state.phase === "warmup") {
    const elapsed = now - state.activatedAt.getTime();
    if (elapsed > WARMUP_DURATION_MS) {
      await storage.updateObfuscationState(cardId, {
        phase: "idle",
        updatedAt: new Date(),
      });
      return 0;
    }

    const daysSinceActivation = elapsed / (24 * 60 * 60 * 1000);
    const expectedTotal = Math.floor(daysSinceActivation * WARMUP_EVENTS_PER_DAY) + 1;
    const deficit = expectedTotal - state.obfuscationCount;
    return Math.min(Math.max(deficit, 0), MAX_EVENTS_PER_TICK);
  }

  if (state.phase === "active") {
    if (state.lastOrganicAt) {
      const sinceLastOrganic = now - state.lastOrganicAt.getTime();
      if (sinceLastOrganic > IDLE_THRESHOLD_MS) {
        await storage.updateObfuscationState(cardId, {
          phase: "idle",
          updatedAt: new Date(),
        });
        return 0;
      }
    }

    const targetObfuscation = state.organicCount * OBFUSCATION_RATIO;
    const deficit = targetObfuscation - state.obfuscationCount;
    return Math.min(Math.max(deficit, 0), MAX_EVENTS_PER_TICK);
  }

  return 0;
}

export async function incrementObfuscationCount(cardId: string): Promise<void> {
  const state = await storage.getObfuscationState(cardId);
  if (!state) return;

  await storage.updateObfuscationState(cardId, {
    obfuscationCount: state.obfuscationCount + 1,
    lastObfuscationAt: new Date(),
    updatedAt: new Date(),
  });
}
