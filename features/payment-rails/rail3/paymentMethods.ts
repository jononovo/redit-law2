import "server-only";
import { crossmintCardsFetch, unwrapCrossmint } from "./client";

/**
 * Crossmint Payment Method as returned by `GET /payment-methods`.
 * Note: `expiration.month` / `expiration.year` are STRINGS (not numbers).
 * `agentId` and `verificationStatus` do NOT live on the PM —
 * agent is bound at order-intent creation; verification is a separate `agentic-enrollment` resource.
 */
export interface CrossmintPaymentMethod {
  paymentMethodId: string;
  type: "card";
  default?: boolean;
  display?: { imageUrl?: string };
  card: {
    source: { type: string; id: string };
    brand: string;
    last4: string;
    expiration: { month: string; year: string };
    billing: { name: string };
    fundingType?: string;
    bin?: string;
  };
}

interface ListPaymentMethodsResponse {
  data: CrossmintPaymentMethod[];
  nextCursor?: string | null;
  previousCursor?: string | null;
}

export async function listPaymentMethods(params: {
  userLocator: string;
}): Promise<CrossmintPaymentMethod[]> {
  const res = await crossmintCardsFetch(`/payment-methods`, {
    userLocator: params.userLocator,
  });
  const payload = await unwrapCrossmint<ListPaymentMethodsResponse>(res, "listPaymentMethods");
  return payload.data;
}

// JWT-only on Crossmint's side — server-key + userLocator returns 403.
export async function deletePaymentMethod(params: {
  jwt: string;
  paymentMethodId: string;
}): Promise<void> {
  const res = await crossmintCardsFetch(`/payment-methods/${params.paymentMethodId}`, {
    method: "DELETE",
    jwt: params.jwt,
  });
  if (!res.ok && res.status !== 404) {
    const body = await res.json().catch(() => ({}));
    throw new Error(`deletePaymentMethod failed: ${res.status} ${JSON.stringify(body)}`);
  }
}
