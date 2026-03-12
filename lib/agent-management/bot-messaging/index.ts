import { storage } from "@/server/storage";
import { fireWebhook, type WebhookEventType } from "@/lib/webhooks";
import { getExpiryForEvent } from "./expiry";

export interface SendToBotResult {
  delivered: boolean;
  method: "webhook" | "pending_message";
  messageId?: number;
  expiresAt?: Date;
}

export interface SendToBotOptions {
  expiresInHours?: number;
}

export async function sendToBot(
  botId: string,
  eventType: string,
  payload: Record<string, unknown>,
  options?: SendToBotOptions,
): Promise<SendToBotResult> {
  const bot = await storage.getBotByBotId(botId);

  if (bot?.callbackUrl && bot?.webhookSecret) {
    const status = bot.webhookStatus || "none";

    if (status === "active" || status === "degraded") {
      try {
        const success = await fireWebhook(bot, eventType as WebhookEventType, payload);
        if (success) {
          if (status === "degraded" || (bot.webhookFailCount || 0) > 0) {
            storage.updateBotWebhookHealth(botId, "active", 0).catch((err) =>
              console.error(`[sendToBot] Failed to reset webhook health for ${botId}:`, err)
            );
          }
          return { delivered: true, method: "webhook" };
        }
      } catch (err) {
        console.error(`[sendToBot] Webhook delivery failed for bot ${botId}:`, err);
      }

      storage.updateBotWebhookHealth(botId, "failure", 0).catch((err) =>
        console.error(`[sendToBot] Failed to update webhook health for ${botId}:`, err)
      );
    }
  }

  const expiresAt = getExpiryForEvent(eventType, options?.expiresInHours);
  const msg = await storage.createPendingMessage(botId, eventType, payload, expiresAt);

  return {
    delivered: false,
    method: "pending_message",
    messageId: msg.id,
    expiresAt,
  };
}
