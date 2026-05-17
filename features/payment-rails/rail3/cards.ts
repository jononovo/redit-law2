import "server-only";
import { randomBytes } from "crypto";
import { crossmintCardsFetch, unwrapCrossmint } from "./client";

export function generateRail3CardId(): string {
  return "r3card_" + randomBytes(8).toString("hex");
}

export function generateRail3TransactionId(): string {
  return "r3tx_" + randomBytes(8).toString("hex");
}

export interface CrossmintPaymentMethod {
  paymentMethodId: string;
  agentId: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  cardholderName?: string;
  verificationStatus: "pending" | "active" | "failed";
}

export async function getPaymentMethod(paymentMethodId: string): Promise<CrossmintPaymentMethod> {
  const res = await crossmintCardsFetch(`/payment-methods/${paymentMethodId}`);
  return unwrapCrossmint<CrossmintPaymentMethod>(res, "getPaymentMethod");
}

export async function getVerificationStatus(paymentMethodId: string): Promise<"pending" | "active" | "failed"> {
  const pm = await getPaymentMethod(paymentMethodId);
  return pm.verificationStatus;
}

export async function deletePaymentMethod(paymentMethodId: string): Promise<void> {
  const res = await crossmintCardsFetch(`/payment-methods/${paymentMethodId}`, { method: "DELETE" });
  if (!res.ok && res.status !== 404) {
    const body = await res.json().catch(() => ({}));
    throw new Error(`deletePaymentMethod failed: ${res.status} ${JSON.stringify(body)}`);
  }
}
