import { crossmintFetch } from "@/lib/rail2/client";

export async function getWalletBalance(walletAddress: string): Promise<number> {
  const locator = `evm-smart-wallet:${walletAddress}`;
  const response = await crossmintFetch(
    `/wallets/${encodeURIComponent(locator)}/balances?tokens=usdc&chains=base`
  );

  const data = await response.json();

  if (!response.ok) {
    console.error("[CrossMint] Balance query failed:", data);
    throw new Error(data.message || "Failed to query wallet balance");
  }

  const balances = Array.isArray(data) ? data : data?.balances || [];

  const usdcEntry = balances.find(
    (b: { symbol?: string; token?: string }) =>
      (b.symbol && b.symbol.toUpperCase() === "USDC") ||
      (b.token && b.token === "usdc")
  );

  if (!usdcEntry) return 0;

  const baseChain = usdcEntry.chains?.base;
  if (baseChain?.rawAmount) {
    return Number(baseChain.rawAmount);
  }

  const amount = baseChain?.amount || usdcEntry.amount || usdcEntry.balance;
  return amount ? Math.round(parseFloat(String(amount)) * 1_000_000) : 0;
}
