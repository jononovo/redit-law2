import { Webhook } from "svix";
import type { WebhookEventType } from "@/lib/webhooks";
import type { CrossMintOrderEvent, OrderStatusMapping, TrackingInfo } from "./types";

const EVENT_STATUS_MAP: Record<string, OrderStatusMapping> = {
  "orders.quote.created": { orderStatus: "quote" },
  "orders.quote.updated": { orderStatus: "quote" },
  "orders.payment.succeeded": { orderStatus: "processing" },
  "orders.payment.failed": { orderStatus: "payment_failed", status: "failed" },
  "orders.delivery.initiated": { orderStatus: "shipped" },
  "orders.delivery.completed": { orderStatus: "delivered" },
  "orders.delivery.failed": { orderStatus: "delivery_failed", status: "failed" },
};

const BOT_WEBHOOK_MAP: Record<string, WebhookEventType> = {
  "orders.delivery.initiated": "order.shipped",
  "orders.delivery.completed": "order.delivered",
  "orders.payment.failed": "order.failed",
  "orders.delivery.failed": "order.failed",
};

export function verifyCrossMintWebhook(
  body: string,
  headers: Record<string, string>,
  secret: string
): CrossMintOrderEvent {
  const wh = new Webhook(secret);
  return wh.verify(body, headers) as CrossMintOrderEvent;
}

export function getOrderStatusMapping(eventType: string): OrderStatusMapping | null {
  return EVENT_STATUS_MAP[eventType] || null;
}

export function getBotWebhookEventType(eventType: string): WebhookEventType | null {
  return BOT_WEBHOOK_MAP[eventType] || null;
}

export function extractOrderId(event: CrossMintOrderEvent): string | undefined {
  return (
    event.payload?.orderIdentifier ||
    event.payload?.orderId ||
    event.orderIdentifier ||
    event.orderId
  ) as string | undefined;
}

export function extractTrackingInfo(event: CrossMintOrderEvent): TrackingInfo | null {
  const lineItems = event.payload?.lineItems;
  if (!Array.isArray(lineItems) || lineItems.length === 0) return null;

  const firstDelivery = lineItems[0]?.delivery;
  if (!firstDelivery) return null;

  const info: TrackingInfo = {};
  if (firstDelivery.carrier) info.carrier = String(firstDelivery.carrier);
  if (firstDelivery.trackingNumber) info.tracking_number = String(firstDelivery.trackingNumber);
  if (firstDelivery.trackingUrl) info.tracking_url = String(firstDelivery.trackingUrl);
  if (firstDelivery.estimatedDelivery) info.estimated_delivery = String(firstDelivery.estimatedDelivery);
  if (firstDelivery.txId) {
    info.tracking_number = info.tracking_number || String(firstDelivery.txId);
  }

  return Object.keys(info).length > 0 ? info : null;
}

export interface OrderWebhookUpdates {
  orderStatus: string;
  status?: string;
  trackingInfo?: Record<string, unknown>;
  metadata: Record<string, unknown>;
  botEventType: WebhookEventType | null;
}

export function buildOrderUpdates(
  eventType: string,
  event: CrossMintOrderEvent,
  existingTrackingInfo: Record<string, unknown> | null,
  existingMetadata: Record<string, unknown>
): OrderWebhookUpdates | null {
  const mapping = getOrderStatusMapping(eventType);
  if (!mapping) return null;

  const updates: OrderWebhookUpdates = {
    orderStatus: mapping.orderStatus,
    metadata: {
      ...existingMetadata,
      [`webhook_${eventType}`]: {
        received_at: new Date().toISOString(),
        raw: event.payload,
      },
    },
    botEventType: getBotWebhookEventType(eventType),
  };

  if (mapping.status) {
    updates.status = mapping.status;
  }

  const tracking = extractTrackingInfo(event);
  if (tracking) {
    updates.trackingInfo = { ...(existingTrackingInfo || {}), ...tracking };
  }

  return updates;
}
