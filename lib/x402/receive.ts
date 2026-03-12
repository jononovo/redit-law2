import { createPublicClient, encodeFunctionData, http } from "viem";
import { base } from "viem/chains";
import { getPrivyAppId, getPrivyAppSecret, getAuthorizationSignature } from "../rail1/client";

const BASE_USDC_CONTRACT = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const BASE_CAIP2 = "eip155:8453";

const TRANSFER_WITH_AUTH_ABI = [{
  name: "transferWithAuthorization",
  type: "function",
  stateMutability: "nonpayable",
  inputs: [
    { name: "from", type: "address" },
    { name: "to", type: "address" },
    { name: "value", type: "uint256" },
    { name: "validAfter", type: "uint256" },
    { name: "validBefore", type: "uint256" },
    { name: "nonce", type: "bytes32" },
    { name: "v", type: "uint8" },
    { name: "r", type: "bytes32" },
    { name: "s", type: "bytes32" },
  ],
  outputs: [],
}] as const;

export interface X402PaymentParams {
  from: string;
  to: string;
  value: string;
  validAfter: number;
  validBefore: number;
  nonce: string;
  signature: string;
  chainId: number;
  token: string;
}

export function parseXPaymentHeader(headerValue: string): X402PaymentParams {
  const json = Buffer.from(headerValue, "base64").toString("utf-8");
  const parsed = JSON.parse(json);

  if (!parsed.from || !parsed.to || !parsed.value || !parsed.signature || !parsed.nonce) {
    throw new Error("Invalid X-PAYMENT header: missing required fields");
  }

  if (parsed.validBefore === undefined || parsed.validBefore === null) {
    throw new Error("Invalid X-PAYMENT header: validBefore is required");
  }

  const validBefore = Number(parsed.validBefore);
  const validAfter = Number(parsed.validAfter ?? 0);
  const value = String(parsed.value);

  if (isNaN(validBefore) || isNaN(validAfter)) {
    throw new Error("Invalid X-PAYMENT header: validBefore/validAfter must be numbers");
  }

  if (Number(value) <= 0 || isNaN(Number(value))) {
    throw new Error("Invalid X-PAYMENT header: value must be a positive number");
  }

  return {
    from: parsed.from,
    to: parsed.to,
    value,
    validAfter,
    validBefore,
    nonce: parsed.nonce,
    signature: parsed.signature,
    chainId: Number(parsed.chainId ?? 8453),
    token: parsed.token ?? BASE_USDC_CONTRACT,
  };
}

function splitSignature(sig: string): { v: number; r: `0x${string}`; s: `0x${string}` } {
  const cleanSig = sig.startsWith("0x") ? sig.slice(2) : sig;
  if (cleanSig.length !== 130) {
    throw new Error(`Invalid signature length: expected 130 hex chars, got ${cleanSig.length}`);
  }
  const r = `0x${cleanSig.slice(0, 64)}` as `0x${string}`;
  const s = `0x${cleanSig.slice(64, 128)}` as `0x${string}`;
  let v = parseInt(cleanSig.slice(128, 130), 16);
  if (v < 27) v += 27;
  return { v, r, s };
}

export function validateX402Payment(
  payment: X402PaymentParams,
  expectedRecipient: string,
  expectedAmountUsdc: number | null
): { valid: boolean; error?: string } {
  if (payment.chainId !== 8453) {
    return { valid: false, error: `Unsupported chain: ${payment.chainId}. Only Base (8453) is supported.` };
  }

  if (payment.token.toLowerCase() !== BASE_USDC_CONTRACT.toLowerCase()) {
    return { valid: false, error: "Unsupported token. Only USDC is accepted." };
  }

  if (payment.to.toLowerCase() !== expectedRecipient.toLowerCase()) {
    return { valid: false, error: `Recipient mismatch: expected ${expectedRecipient}, got ${payment.to}` };
  }

  const now = Math.floor(Date.now() / 1000);

  if (payment.validBefore < now) {
    return { valid: false, error: "Payment signature has expired" };
  }

  if (payment.validAfter > now) {
    return { valid: false, error: "Payment signature is not yet valid" };
  }

  if (expectedAmountUsdc !== null) {
    const paymentAmount = Number(payment.value);
    const lowerBound = expectedAmountUsdc * 0.99;
    const upperBound = expectedAmountUsdc * 1.01;
    if (paymentAmount < lowerBound || paymentAmount > upperBound) {
      return { valid: false, error: `Amount mismatch: expected ~${expectedAmountUsdc}, got ${paymentAmount}` };
    }
  }

  return { valid: true };
}

export function buildX402DedupeKey(payment: X402PaymentParams): string {
  return `x402:${payment.from.toLowerCase()}:${payment.to.toLowerCase()}:${payment.nonce}`;
}

export async function settleX402Payment(
  privyWalletId: string,
  payment: X402PaymentParams
): Promise<{ hash: string }> {
  const { v, r, s } = splitSignature(payment.signature);

  const calldata = encodeFunctionData({
    abi: TRANSFER_WITH_AUTH_ABI,
    functionName: "transferWithAuthorization",
    args: [
      payment.from as `0x${string}`,
      payment.to as `0x${string}`,
      BigInt(payment.value),
      BigInt(payment.validAfter),
      BigInt(payment.validBefore),
      payment.nonce as `0x${string}`,
      v,
      r as `0x${string}`,
      s as `0x${string}`,
    ],
  });

  const url = `https://api.privy.io/v1/wallets/${privyWalletId}/rpc`;
  const body = {
    method: "eth_sendTransaction",
    caip2: BASE_CAIP2,
    params: {
      transaction: {
        to: BASE_USDC_CONTRACT,
        data: calldata,
        value: "0x0",
      },
    },
  };

  const appId = getPrivyAppId();
  const appSecret = getPrivyAppSecret();
  const authSignature = getAuthorizationSignature(url, body);
  const basicAuth = Buffer.from(`${appId}:${appSecret}`).toString("base64");

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "privy-app-id": appId,
      Authorization: `Basic ${basicAuth}`,
      "privy-authorization-signature": authSignature,
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("[x402] Settlement failed:", data);
    throw new Error(data.message || data.error || "x402 settlement transaction failed");
  }

  const hash = data.data?.hash || data.hash;
  if (!hash) {
    throw new Error("Settlement response missing transaction hash");
  }

  console.log("[x402] Settlement tx sent, waiting for confirmation:", { hash });

  return { hash };
}

export async function waitForReceipt(
  txHash: string,
  timeoutMs: number = 60_000
): Promise<{ status: "success" | "reverted"; blockNumber: bigint }> {
  const client = createPublicClient({
    chain: base,
    transport: http(process.env.BASE_RPC_URL || "https://mainnet.base.org"),
  });

  const receipt = await client.waitForTransactionReceipt({
    hash: txHash as `0x${string}`,
    timeout: timeoutMs,
  });

  return {
    status: receipt.status === "success" ? "success" : "reverted",
    blockNumber: receipt.blockNumber,
  };
}
