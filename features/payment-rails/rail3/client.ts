import "server-only";

const API_VERSION = "2025-06-09";

export function getRail3BaseUrl(): string {
  return process.env.CROSSMINT_ENV === "staging"
    ? `https://staging.crossmint.com/api/${API_VERSION}`
    : `https://www.crossmint.com/api/${API_VERSION}`;
}

export function getRail3ServerApiKey(): string {
  const key = process.env.CROSSMINT_SERVER_API_KEY;
  if (!key) throw new Error("CROSSMINT_SERVER_API_KEY is required for Rail 3 (Card Permissions)");
  return key;
}

export async function crossmintCardsFetch(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const url = `${getRail3BaseUrl()}${path}`;
  return fetch(url, {
    ...options,
    headers: {
      "X-API-KEY": getRail3ServerApiKey(),
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
}

export class CrossmintApiError extends Error {
  constructor(public status: number, public body: unknown, message: string) {
    super(message);
    this.name = "CrossmintApiError";
  }
}

export async function unwrapCrossmint<T>(res: Response, label: string): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new CrossmintApiError(res.status, body, `${label} failed: ${res.status} ${JSON.stringify(body)}`);
  }
  return res.json() as Promise<T>;
}
