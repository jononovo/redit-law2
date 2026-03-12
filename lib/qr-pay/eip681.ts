const USDC_CONTRACT = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const BASE_CHAIN_ID = 8453;

export function buildEip681Uri(recipientAddress: string, amountMicroUsdc: number): string {
  return `ethereum:${USDC_CONTRACT}@${BASE_CHAIN_ID}/transfer?address=${recipientAddress}&uint256=${amountMicroUsdc}`;
}
