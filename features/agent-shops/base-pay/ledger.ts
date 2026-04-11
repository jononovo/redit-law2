import { storage } from "@/server/storage";
import type { PrivyTransaction } from "@/shared/schema";

interface CreditWalletInput {
  walletAddress: string;
  amountUsdc: number;
  txId: string;
  sender: string;
  type: "topup" | "checkout";
  payerEmail?: string;
}

interface CreditWalletResult {
  transaction: PrivyTransaction;
  newBalance: number;
  walletId: number;
}

export async function creditWalletFromBasePay(input: CreditWalletInput): Promise<CreditWalletResult> {
  const { walletAddress, amountUsdc, txId, sender, type, payerEmail } = input;

  try {
    await storage.createBasePayPayment({
      txId,
      sender,
      recipient: walletAddress,
      amountUsdc,
      type,
      payerEmail: payerEmail || null,
      status: "pending",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("unique") || message.includes("duplicate")) {
      throw new Error("Transaction already processed");
    }
    throw err;
  }

  const targetWallet = await storage.privyGetWalletByAddress(walletAddress);
  if (!targetWallet) {
    await storage.updateBasePayPaymentStatus(txId, "failed");
    throw new Error(`No wallet found for address: ${walletAddress}`);
  }

  const newBalance = targetWallet.balanceUsdc + amountUsdc;

  await storage.privyUpdateWalletBalance(targetWallet.id, newBalance);

  const transaction = await storage.privyCreateTransaction({
    walletId: targetWallet.id,
    type: "deposit",
    amountUsdc,
    status: "confirmed",
    balanceAfter: newBalance,
    metadata: { source: "base_pay", tx_id: txId, sender },
  });

  await storage.updateBasePayPaymentStatus(txId, "completed", new Date());

  return { transaction, newBalance, walletId: targetWallet.id };
}
