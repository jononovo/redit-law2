import "server-only";
import { crossmintCardsFetch, unwrapCrossmint } from "./client";
import type { VerificationConfig } from "./agenticEnrollment";

export type CrossmintMandate =
  | { type: "maxAmount"; value: string; details: { currency: string; period: "weekly" | "monthly" | "yearly" } }
  | { type: "description"; value: string }
  | { type: "prompt"; value: string };

export type PermissionInput =
  | { mode: "limited"; maxAmountUsd: number; period: "weekly" | "monthly" | "yearly"; description?: string; prompt?: string }
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
  if (input.prompt) mandates.push({ type: "prompt", value: input.prompt });
  return mandates;
}

/**
 * Order intent shape as returned by Crossmint.
 * - `payment.paymentMethodId` is nested (not flat).
 * - `phase` enum is `requires-verification | active | expired`.
 * - `verificationConfig` is present only when `phase === "requires-verification"`;
 *   it's passed straight into `<OrderIntentVerification>` in the browser.
 */
export interface OrderIntent {
  orderIntentId: string;
  phase: "requires-verification" | "active" | "expired";
  agentId: string;
  payment: { paymentMethodId: string };
  mandates: CrossmintMandate[];
  verificationConfig?: VerificationConfig & { agentId?: string; instructionId?: string };
}

// JWT-only on Crossmint's side — server-key + userLocator returns 403
// ("requires a 'client'-side API key"). See features/payment-rails/rail3/client.ts.
export async function createOrderIntent(params: {
  jwt: string;
  agentId: string;
  paymentMethodId: string;
  mandates: CrossmintMandate[];
}): Promise<OrderIntent> {
  const res = await crossmintCardsFetch(`/order-intents`, {
    method: "POST",
    jwt: params.jwt,
    body: {
      agentId: params.agentId,
      payment: { paymentMethodId: params.paymentMethodId },
      mandates: params.mandates,
    },
  });
  return unwrapCrossmint<OrderIntent>(res, "createOrderIntent");
}

export async function revokeOrderIntent(params: {
  jwt: string;
  orderIntentId: string;
}): Promise<void> {
  const res = await crossmintCardsFetch(`/order-intents/${params.orderIntentId}`, {
    method: "DELETE",
    jwt: params.jwt,
  });
  if (!res.ok && res.status !== 404) {
    const body = await res.json().catch(() => ({}));
    throw new Error(`revokeOrderIntent failed: ${res.status} ${JSON.stringify(body)}`);
  }
}
