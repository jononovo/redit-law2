import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/server/storage";
import { fireWebhook } from "@/lib/webhooks";
import {
  verifyCrossMintWebhook,
  extractOrderId,
  buildOrderUpdates,
} from "@/lib/procurement/crossmint-worldstore/webhook";

const WEBHOOK_SECRET = process.env.CROSSMINT_WEBHOOK_SECRET;

export async function POST(request: NextRequest) {
  if (!WEBHOOK_SECRET) {
    console.error("[Card Wallet Webhook] CROSSMINT_WEBHOOK_SECRET is not configured");
    return NextResponse.json({ error: "webhook_not_configured" }, { status: 500 });
  }

  const body = await request.text();
  const headers: Record<string, string> = {};
  for (const key of ["svix-id", "svix-timestamp", "svix-signature"]) {
    const val = request.headers.get(key);
    if (!val) {
      console.warn(`[Card Wallet Webhook] Missing header: ${key}`);
      return NextResponse.json({ error: "missing_signature_headers" }, { status: 400 });
    }
    headers[key] = val;
  }

  let event;
  try {
    event = verifyCrossMintWebhook(body, headers, WEBHOOK_SECRET);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[Card Wallet Webhook] Signature verification failed:", message);
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  const eventType = event.type as string;
  if (!eventType) {
    return NextResponse.json({ error: "missing_event_type" }, { status: 400 });
  }

  console.log(`[Card Wallet Webhook] Received event: ${eventType}`);

  const orderId = extractOrderId(event);
  if (!orderId) {
    console.log(`[Card Wallet Webhook] No order ID in ${eventType}, acknowledging`);
    return NextResponse.json({ received: true });
  }

  try {
    const transaction = await storage.crossmintGetTransactionByOrderId(orderId);
    if (!transaction) {
      console.warn(`[Card Wallet Webhook] No transaction found for order: ${orderId}`);
      return NextResponse.json({ received: true });
    }

    const updates = buildOrderUpdates(
      eventType,
      event,
      (transaction.trackingInfo as Record<string, unknown>) || null,
      (transaction.metadata || {}) as Record<string, unknown>
    );

    if (!updates) {
      console.log(`[Card Wallet Webhook] Unhandled event type: ${eventType}, acknowledging`);
      return NextResponse.json({ received: true });
    }

    const dbUpdates: Record<string, unknown> = {
      orderStatus: updates.orderStatus,
      metadata: updates.metadata,
    };
    if (updates.status) dbUpdates.status = updates.status;
    if (updates.trackingInfo) dbUpdates.trackingInfo = updates.trackingInfo;

    await storage.crossmintUpdateTransaction(transaction.id, dbUpdates);

    try {
      const existingOrder = await storage.getOrderByExternalId(orderId);
      if (existingOrder) {
        const orderUpdates: Record<string, unknown> = {
          status: updates.orderStatus,
        };
        if (updates.trackingInfo) orderUpdates.trackingInfo = updates.trackingInfo;
        if (updates.metadata) orderUpdates.metadata = updates.metadata;
        await storage.updateOrder(existingOrder.id, orderUpdates);
        console.log(`[Card Wallet Webhook] Updated order #${existingOrder.id}: status=${updates.orderStatus}`);
      }
    } catch (orderErr) {
      console.error("[Card Wallet Webhook] Order update failed (non-fatal):", orderErr);
    }

    console.log(`[Card Wallet Webhook] Updated transaction ${transaction.id}: orderStatus=${updates.orderStatus}${updates.status ? `, status=${updates.status}` : ""}`);

    if (updates.botEventType) {
      const wallet = await storage.crossmintGetWalletById(transaction.walletId);
      if (wallet) {
        const bot = await storage.getBotByBotId(wallet.botId);
        if (bot) {
          fireWebhook(bot, updates.botEventType, {
            transaction_id: transaction.id,
            order_id: orderId,
            order_status: updates.orderStatus,
            product_name: transaction.productName,
            tracking: updates.trackingInfo || (transaction.trackingInfo as Record<string, unknown>) || null,
          }).catch(() => {});
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[Card Wallet Webhook] Processing error:", error);
    return NextResponse.json({ error: "processing_error" }, { status: 500 });
  }
}
