const USDC_CONTRACT_ADDRESS = process.env.USDC_CONTRACT_ADDRESS || "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const BASE_CHAIN_ID = 8453;

export function buildTransferWithAuthorizationTypedData(params: {
  from: string;
  to: string;
  value: bigint;
  validAfter: number;
  validBefore: number;
  nonce: string;
}) {
  return {
    domain: {
      name: "USD Coin",
      version: "2",
      chainId: BASE_CHAIN_ID,
      verifyingContract: USDC_CONTRACT_ADDRESS as `0x${string}`,
    },
    types: {
      TransferWithAuthorization: [
        { name: "from", type: "address" },
        { name: "to", type: "address" },
        { name: "value", type: "uint256" },
        { name: "validAfter", type: "uint256" },
        { name: "validBefore", type: "uint256" },
        { name: "nonce", type: "bytes32" },
      ],
    },
    primaryType: "TransferWithAuthorization" as const,
    message: {
      from: params.from as `0x${string}`,
      to: params.to as `0x${string}`,
      value: params.value,
      validAfter: BigInt(params.validAfter),
      validBefore: BigInt(params.validBefore),
      nonce: params.nonce as `0x${string}`,
    },
  };
}

export function generateNonce(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return "0x" + Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}

export function buildXPaymentHeader(params: {
  signature: string;
  from: string;
  to: string;
  value: string;
  validAfter: number;
  validBefore: number;
  nonce: string;
  chainId: number;
}): string {
  const payload = {
    ...params,
    chainId: BASE_CHAIN_ID,
    token: USDC_CONTRACT_ADDRESS,
  };
  return Buffer.from(JSON.stringify(payload)).toString("base64");
}

export function formatUsdc(microUsdc: number): string {
  return `$${(microUsdc / 1_000_000).toFixed(2)}`;
}

export function usdToMicroUsdc(usd: number): number {
  return Math.round(usd * 1_000_000);
}

export function microUsdcToUsd(microUsdc: number): number {
  return microUsdc / 1_000_000;
}
