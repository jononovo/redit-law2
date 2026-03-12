import { createHmac } from "crypto";
import { storage } from "@/server/storage";
import type { Bot } from "@/shared/schema";

const RETRY_DELAYS_MS = [
  60 * 1000,
  5 * 60 * 1000,
  15 * 60 * 1000,
  60 * 60 * 1000,
  6 * 60 * 60 * 1000,
];

const WEBHOOK_TIMEOUT_MS = 10000;

export type WebhookEventType =
  | "wallet.activated"
  | "wallet.topup.completed"
  | "wallet.spend.authorized"
  | "wallet.spend.declined"
  | "wallet.balance.low"
  | "wallet.payment.received"
  | "purchase.approved"
  | "purchase.rejected"
  | "purchase.expired"
  | "order.shipped"
  | "order.delivered"
  | "order.failed"
  | "rail5.checkout.completed"
  | "rail5.checkout.failed"
  | "rails.updated"
  | "rail5.card.delivered"
  | "wallet.sale.completed";

interface WebhookPayload {
  event: WebhookEventType;
  timestamp: string;
  bot_id: string;
  data: Record<string, unknown>;
}

export function signPayload(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export async function attemptDelivery(
  callbackUrl: string,
  payloadJson: string,
  signature: string,
  eventType: string,
): Promise<{ success: boolean; status?: number; body?: string }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);

    const res = await fetch(callbackUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CreditClaw-Signature": `sha256=${signature}`,
        "X-CreditClaw-Event": eventType,
      },
      body: payloadJson,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const body = await res.text().catch(() => "");
    return {
      success: res.status >= 200 && res.status < 300,
      status: res.status,
      body: body.substring(0, 500),
    };
  } catch (err: any) {
    return {
      success: false,
      body: err?.message?.substring(0, 500) || "Connection failed",
    };
  }
}

function getNextRetryAt(completedAttempts: number): Date | null {
  const idx = completedAttempts - 1;
  if (idx < 0 || idx >= RETRY_DELAYS_MS.length) return null;
  return new Date(Date.now() + RETRY_DELAYS_MS[idx]);
}

export async function fireWebhook(
  bot: Bot,
  eventType: WebhookEventType,
  data: Record<string, unknown>,
): Promise<boolean> {
  if (!bot.callbackUrl || !bot.webhookSecret) return false;

  const payload: WebhookPayload = {
    event: eventType,
    timestamp: new Date().toISOString(),
    bot_id: bot.botId,
    data,
  };

  const payloadJson = JSON.stringify(payload);
  const signature = signPayload(payloadJson, bot.webhookSecret);

  const delivery = await storage.createWebhookDelivery({
    botId: bot.botId,
    eventType,
    callbackUrl: bot.callbackUrl,
    payload: payloadJson,
    status: "pending",
    attempts: 0,
    maxAttempts: 5,
  });

  const result = await attemptDelivery(bot.callbackUrl, payloadJson, signature, eventType);

  if (result.success) {
    await storage.updateWebhookDelivery(delivery.id, {
      status: "success",
      attempts: 1,
      lastAttemptAt: new Date(),
      responseStatus: result.status,
      responseBody: result.body,
    });
    return true;
  } else {
    const nextRetry = getNextRetryAt(1);
    await storage.updateWebhookDelivery(delivery.id, {
      status: nextRetry ? "pending" : "failed",
      attempts: 1,
      lastAttemptAt: new Date(),
      nextRetryAt: nextRetry,
      responseStatus: result.status,
      responseBody: result.body,
    });
    return false;
  }
}

export async function retryWebhookDelivery(
  deliveryId: number,
  callbackUrl: string,
  payloadJson: string,
  webhookSecret: string,
  eventType: string,
  currentAttempts: number,
  maxAttempts: number,
): Promise<void> {
  const signature = signPayload(payloadJson, webhookSecret);
  const result = await attemptDelivery(callbackUrl, payloadJson, signature, eventType);
  const newAttempts = currentAttempts + 1;

  if (result.success) {
    await storage.updateWebhookDelivery(deliveryId, {
      status: "success",
      attempts: newAttempts,
      lastAttemptAt: new Date(),
      responseStatus: result.status,
      responseBody: result.body,
      nextRetryAt: null,
    });
  } else {
    const nextRetry = newAttempts < maxAttempts ? getNextRetryAt(newAttempts) : null;
    await storage.updateWebhookDelivery(deliveryId, {
      status: nextRetry ? "pending" : "failed",
      attempts: newAttempts,
      lastAttemptAt: new Date(),
      nextRetryAt: nextRetry,
      responseStatus: result.status,
      responseBody: result.body,
    });
  }
}

export async function retryPendingWebhooksForBot(botId: string): Promise<number> {
  const bot = await storage.getBotByBotId(botId);
  if (!bot?.webhookSecret) return 0;

  const pending = await storage.getPendingWebhookRetriesForBot(botId, new Date(), 3);
  if (pending.length === 0) return 0;

  let retried = 0;
  for (const delivery of pending) {
    try {
      await retryWebhookDelivery(
        delivery.id,
        delivery.callbackUrl,
        delivery.payload,
        bot.webhookSecret,
        delivery.eventType,
        delivery.attempts,
        delivery.maxAttempts,
      );
      retried++;
    } catch (err) {
      console.error(`Webhook retry failed for delivery ${delivery.id}:`, err);
    }
  }
  return retried;
}

export async function retryAllPendingWebhooks(): Promise<number> {
  const pending = await storage.getPendingWebhookRetries(new Date(), 20);
  if (pending.length === 0) return 0;

  const botCache = new Map<string, Bot | null>();
  let retried = 0;

  for (const delivery of pending) {
    try {
      if (!botCache.has(delivery.botId)) {
        botCache.set(delivery.botId, await storage.getBotByBotId(delivery.botId));
      }
      const bot = botCache.get(delivery.botId);
      if (!bot?.webhookSecret) {
        await storage.updateWebhookDelivery(delivery.id, { status: "failed", responseBody: "Bot missing webhook secret" });
        continue;
      }

      await retryWebhookDelivery(
        delivery.id,
        delivery.callbackUrl,
        delivery.payload,
        bot.webhookSecret,
        delivery.eventType,
        delivery.attempts,
        delivery.maxAttempts,
      );
      retried++;
    } catch (err) {
      console.error(`Webhook retry failed for delivery ${delivery.id}:`, err);
    }
  }
  return retried;
}

export type RailsUpdatedAction =
  | "card_linked"
  | "card_removed"
  | "limits_updated"
  | "card_frozen"
  | "card_unfrozen"
  | "card_created"
  | "card_deleted"
  | "wallet_created"
  | "wallet_linked"
  | "wallet_unlinked"
  | "wallet_frozen"
  | "wallet_unfrozen"
  | "wallet_funded";

export async function fireRailsUpdated(
  bot: Bot,
  action: RailsUpdatedAction,
  rail: string,
  extra?: Record<string, unknown>,
): Promise<void> {
  const data: Record<string, unknown> = {
    action,
    rail,
    bot_id: bot.botId,
    message: `Your payment methods have been updated (${action.replace(/_/g, " ")}). Call GET /bot/status for details.`,
    ...extra,
  };

  await fireWebhook(bot, "rails.updated", data);
}
