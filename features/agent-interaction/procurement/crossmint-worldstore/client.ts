import { CROSSMINT_HOST, CROSSMINT_SERVER_API_KEY } from "@/features/payment-rails/crossmint-env";

const SEARCH_BASE = `${CROSSMINT_HOST}/api/unstable/ws/search`;

export function getServerApiKey(): string {
  if (!CROSSMINT_SERVER_API_KEY) {
    throw new Error("Crossmint server API key is missing — set the env var referenced in features/payment-rails/crossmint-env.ts");
  }
  return CROSSMINT_SERVER_API_KEY;
}

export async function worldstoreSearch(
  productUrl: string
): Promise<Response> {
  return fetch(SEARCH_BASE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": getServerApiKey(),
    },
    body: JSON.stringify({ url: productUrl }),
  });
}
