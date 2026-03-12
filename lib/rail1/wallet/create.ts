import { getPrivyClient } from "../client";

export async function createServerWallet(): Promise<{
  id: string;
  address: string;
  chainType: string;
}> {
  const privy = getPrivyClient();
  const wallet = await (privy as any).walletsService.create({ chain_type: "ethereum" });
  return {
    id: wallet.id,
    address: wallet.address,
    chainType: wallet.chainType,
  };
}
