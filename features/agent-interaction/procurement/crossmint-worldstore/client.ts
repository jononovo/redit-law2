const SEARCH_BASE = "https://www.crossmint.com/api/unstable/ws/search";

export function getServerApiKey(): string {
  const key = process.env.CROSSMINT_SERVER_API_KEY;
  if (!key) throw new Error("CROSSMINT_SERVER_API_KEY is required");
  return key;
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
