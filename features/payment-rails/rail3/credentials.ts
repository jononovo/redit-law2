import "server-only";
import { crossmintCardsFetch, unwrapCrossmint } from "./client";

/**
 * One-time card credentials as returned by `POST /order-intents/:id/credentials`.
 * Note: `expirationMonth` / `expirationYear` are STRINGS (per Crossmint API).
 * Merchant fields are inputs only, not echoed back.
 */
export interface OneTimeCardCredentials {
  card: {
    number: string;
    expirationMonth: string;
    expirationYear: string;
    cvc: string;
  };
  expiresAt: string;
}

export async function fetchOneTimeCredentials(params: {
  jwt: string;
  orderIntentId: string;
  merchant: { name: string; url: string; countryCode: string };
}): Promise<OneTimeCardCredentials> {
  const res = await crossmintCardsFetch(
    `/order-intents/${params.orderIntentId}/credentials`,
    {
      method: "POST",
      jwt: params.jwt,
      body: {
        merchant: {
          name: params.merchant.name,
          url: params.merchant.url,
          countryCode: params.merchant.countryCode,
        },
      },
    },
  );
  return unwrapCrossmint<OneTimeCardCredentials>(res, "fetchOneTimeCredentials");
}
