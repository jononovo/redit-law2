import "server-only";
import { crossmintCardsFetch, unwrapCrossmint } from "./client";
import type { InsertRail3PaymentMethod } from "@/shared/schema";

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
    source: { type: string; id: string; networkTokenId?: string };
    brand: string;
    last4: string;
    expiration: { month: string; year: string };
    billing: {
      name?: string;
      phone?: string;
      address?: {
        line1?: string;
        line2?: string;
        city?: string;
        stateOrRegion?: string;
        postalCode?: string;
        country?: string;
      };
    };
    fundingType?: string;
    bin?: string;
  };
}

/**
 * Map a Crossmint payment-method response into our DB column shape.
 * Only fields Crossmint returns are included — caller spreads this into an
 * insert (with `ownerUid` + `paymentMethodId` + `status`) or an update.
 */
export function mapCrossmintPmToDbColumns(
  pm: CrossmintPaymentMethod,
): Partial<InsertRail3PaymentMethod> {
  const expMonth = pm.card.expiration?.month ? parseInt(pm.card.expiration.month, 10) : undefined;
  const expYear = pm.card.expiration?.year ? parseInt(pm.card.expiration.year, 10) : undefined;
  return {
    cardholderName: pm.card.billing?.name || undefined,
    cardLast4: pm.card.last4,
    cardBrand: pm.card.brand,
    cardFirst6: pm.card.bin || "",
    expMonth: Number.isFinite(expMonth) ? expMonth : undefined,
    expYear: Number.isFinite(expYear) ? expYear : undefined,
    fundingType: pm.card.fundingType,
    isDefault: pm.default ?? false,
    displayImageUrl: pm.display?.imageUrl,
    billingAddress: pm.card.billing?.address ?? undefined,
    billingPhone: pm.card.billing?.phone,
    sourceTokenId: pm.card.source?.id,
    networkTokenId: pm.card.source?.networkTokenId,
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
