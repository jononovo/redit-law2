import { crossmintFetch } from "@/lib/rail2/client";

export async function createSmartWallet(ownerUid: string): Promise<{
  walletId: string;
  address: string;
  type: string;
}> {
  const response = await crossmintFetch("/wallets", {
    method: "POST",
    body: JSON.stringify({
      chainType: "evm",
      type: "smart",
      config: {
        adminSigner: { type: "evm-fireblocks-custodial" },
      },
      owner: `userId:${ownerUid}`,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("[CrossMint] Wallet creation failed:", data);
    throw new Error(data.message || data.error || "Failed to create CrossMint wallet");
  }

  console.log("[CrossMint] Wallet created:", { type: data.type, address: data.address, chainType: data.chainType });

  return {
    walletId: data.config?.adminSigner?.locator || data.locator || data.id || data.address,
    address: data.address,
    type: data.type,
  };
}
