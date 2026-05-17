import "server-only";
import { crossmintCardsFetch, unwrapCrossmint } from "./client";

export interface OneTimeCardCredentials {
  cardNumber: string;
  expMonth: number;
  expYear: number;
  cvc: string;
  merchantName: string;
  merchantUrl?: string;
  expiresAt: string;
}

export async function fetchOneTimeCredentials(params: {
  orderIntentId: string;
  merchant: { name: string; url?: string; countryCode?: string };
}): Promise<OneTimeCardCredentials> {
  const res = await crossmintCardsFetch(
    `/order-intents/${params.orderIntentId}/credentials`,
    {
      method: "POST",
      body: JSON.stringify({
        merchant: {
          name: params.merchant.name,
          url: params.merchant.url,
          countryCode: params.merchant.countryCode,
        },
      }),
    },
  );
  return unwrapCrossmint<OneTimeCardCredentials>(res, "fetchOneTimeCredentials");
}
