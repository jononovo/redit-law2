import "server-only";
import { crossmintCardsFetch, unwrapCrossmint } from "./client";

export type CrossmintMandate =
  | { type: "maxAmount"; value: string; details: { currency: string; period: "weekly" | "monthly" | "yearly" } }
  | { type: "description"; value: string };

export type PermissionInput =
  | { mode: "limited"; maxAmountUsd: number; period: "weekly" | "monthly" | "yearly"; description?: string }
  | { mode: "open" };

const OPEN_MODE_YEARLY_CEILING_USD = "100000.00";

export function buildMandates(input: PermissionInput): CrossmintMandate[] {
  if (input.mode === "open") {
    return [
      { type: "maxAmount", value: OPEN_MODE_YEARLY_CEILING_USD, details: { currency: "usd", period: "yearly" } },
      { type: "description", value: "General-purpose card permission — no merchant restriction" },
    ];
  }
  const mandates: CrossmintMandate[] = [
    { type: "maxAmount", value: input.maxAmountUsd.toFixed(2), details: { currency: "usd", period: input.period } },
  ];
  if (input.description) mandates.push({ type: "description", value: input.description });
  return mandates;
}

export interface OrderIntent {
  orderIntentId: string;
  phase: "requires-verification" | "active" | "expired";
  agentId: string;
  paymentMethodId: string;
  mandates: CrossmintMandate[];
}

export async function createOrderIntent(params: {
  agentId: string;
  paymentMethodId: string;
  mandates: CrossmintMandate[];
}): Promise<OrderIntent> {
  const res = await crossmintCardsFetch(`/order-intents`, {
    method: "POST",
    body: JSON.stringify({
      agentId: params.agentId,
      paymentMethodId: params.paymentMethodId,
      mandates: params.mandates,
    }),
  });
  return unwrapCrossmint<OrderIntent>(res, "createOrderIntent");
}

export async function getOrderIntent(orderIntentId: string): Promise<OrderIntent> {
  const res = await crossmintCardsFetch(`/order-intents/${orderIntentId}`);
  return unwrapCrossmint<OrderIntent>(res, "getOrderIntent");
}

export async function revokeOrderIntent(orderIntentId: string): Promise<void> {
  const res = await crossmintCardsFetch(`/order-intents/${orderIntentId}`, { method: "DELETE" });
  if (!res.ok && res.status !== 404) {
    const body = await res.json().catch(() => ({}));
    throw new Error(`revokeOrderIntent failed: ${res.status} ${JSON.stringify(body)}`);
  }
}
