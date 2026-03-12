import { crossmintFetch } from "@/lib/rail2/client";

export async function sendUsdcTransfer(
  walletAddress: string,
  recipientAddress: string,
  amountMicroUsdc: number
): Promise<{ transferId: string; txHash: string | null; status: string }> {
  const locator = `evm-smart-wallet:${walletAddress}`;
  const humanAmount = (amountMicroUsdc / 1_000_000).toFixed(6);

  const response = await crossmintFetch(
    `/wallets/${encodeURIComponent(locator)}/tokens/base:usdc/transfers`,
    {
      method: "POST",
      body: JSON.stringify({
        to: recipientAddress,
        amount: humanAmount,
      }),
    },
    "wallets"
  );

  const data = await response.json();

  if (!response.ok) {
    console.error("[CrossMint] Transfer failed:", data);
    throw new Error(data.message || data.error || "CrossMint transfer failed");
  }

  console.log("[CrossMint] Transfer initiated:", {
    id: data.id,
    status: data.status,
    txHash: data.onChain?.txId || null,
  });

  return {
    transferId: data.id || data.actionId || "unknown",
    txHash: data.onChain?.txId || data.txHash || null,
    status: data.status || "pending",
  };
}
