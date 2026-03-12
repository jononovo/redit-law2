import { storage } from "@/server/storage";
import { generatePurchaseOrder, pickFakeProfileIndex } from "@/lib/obfuscation-merchants/generator";
import { incrementObfuscationCount } from "./state-machine";
import type { ObfuscationEvent } from "@/shared/schema";
import { randomBytes } from "crypto";

export async function createObfuscationEvent(
  cardId: string,
  realProfileIndex: number,
): Promise<ObfuscationEvent> {
  const profileIndex = pickFakeProfileIndex(realProfileIndex);
  const order = generatePurchaseOrder();

  return storage.createObfuscationEvent({
    cardId,
    profileIndex,
    merchantName: order.merchantName,
    merchantSlug: order.merchantSlug,
    itemName: order.itemName,
    amountCents: order.amountCents,
    status: "pending",
  });
}

export async function completeObfuscationEvent(
  eventId: number,
): Promise<ObfuscationEvent | null> {
  const confirmationId = "chk_" + randomBytes(6).toString("hex");

  const updated = await storage.completeObfuscationEvent(eventId, new Date());
  if (!updated) return null;

  await storage.updateObfuscationEventConfirmation(eventId, confirmationId);
  await incrementObfuscationCount(updated.cardId);

  return updated;
}

export async function getPendingEventsForBot(
  botId: string,
): Promise<ObfuscationEvent[]> {
  return storage.getPendingObfuscationEvents(botId);
}
