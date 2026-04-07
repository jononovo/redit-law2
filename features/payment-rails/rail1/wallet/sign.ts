import { getPrivyClient } from "../client";

export async function signTypedData(
  walletId: string,
  typedData: object
): Promise<string> {
  const privy = getPrivyClient();
  const ethService = (privy as any).walletsService.ethereum();
  const result = await ethService.signTypedData(walletId, {
    typedData: typedData as any,
  });
  return result.signature;
}
