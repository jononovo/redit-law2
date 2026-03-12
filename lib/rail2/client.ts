const API_VERSIONS = {
  wallets: "2025-06-09",
  orders: "2022-06-09",
} as const;

type ApiVersion = keyof typeof API_VERSIONS;

function getBaseUrl(version: ApiVersion = "wallets"): string {
  const v = API_VERSIONS[version];
  return process.env.CROSSMINT_ENV === "staging"
    ? `https://staging.crossmint.com/api/${v}`
    : `https://www.crossmint.com/api/${v}`;
}

export function getServerApiKey(): string {
  const key = process.env.CROSSMINT_SERVER_API_KEY;
  if (!key) throw new Error("CROSSMINT_SERVER_API_KEY is required for Rail 2");
  return key;
}

export async function crossmintFetch(
  path: string,
  options: RequestInit = {},
  version: ApiVersion = "wallets"
): Promise<Response> {
  const url = `${getBaseUrl(version)}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      "X-API-KEY": getServerApiKey(),
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  return response;
}

export const USDC_CONTRACT_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

export function formatUsdc(microUsdc: number): string {
  return `$${(microUsdc / 1_000_000).toFixed(2)}`;
}

export function usdToMicroUsdc(usd: number): number {
  return Math.round(usd * 1_000_000);
}

export function microUsdcToUsd(microUsdc: number): number {
  return microUsdc / 1_000_000;
}
