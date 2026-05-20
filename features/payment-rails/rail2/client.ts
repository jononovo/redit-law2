import { CROSSMINT_HOST, CROSSMINT_SERVER_API_KEY } from "@/features/payment-rails/crossmint-env";

const API_VERSIONS = {
  wallets: "2025-06-09",
  orders: "2022-06-09",
} as const;

type ApiVersion = keyof typeof API_VERSIONS;

function getBaseUrl(version: ApiVersion = "wallets"): string {
  return `${CROSSMINT_HOST}/api/${API_VERSIONS[version]}`;
}

export function getServerApiKey(): string {
  if (!CROSSMINT_SERVER_API_KEY) {
    throw new Error("Crossmint server API key is missing — set the env var referenced in features/payment-rails/crossmint-env.ts");
  }
  return CROSSMINT_SERVER_API_KEY;
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
