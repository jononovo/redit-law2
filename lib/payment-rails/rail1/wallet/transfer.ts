import { encodeFunctionData, erc20Abi } from "viem";
import { getPrivyAppId, getPrivyAppSecret, getAuthorizationSignature } from "../client";

const BASE_USDC_CONTRACT = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const BASE_CAIP2 = "eip155:8453";

export async function sendUsdcTransfer(
  privyWalletId: string,
  recipientAddress: string,
  amountMicroUsdc: number
): Promise<{ hash: string }> {
  const calldata = encodeFunctionData({
    abi: erc20Abi,
    functionName: "transfer",
    args: [recipientAddress as `0x${string}`, BigInt(amountMicroUsdc)],
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
    console.error("[Privy] Transfer failed:", data);
    throw new Error(data.message || data.error || "Privy transfer failed");
  }

  console.log("[Privy] Transfer sent:", { hash: data.data?.hash || data.hash });

  return { hash: data.data?.hash || data.hash };
}
