import { getPaymentStatus } from "@base-org/account";
import { storage } from "@/server/storage";
import type { BasePayVerifyInput, BasePayVerifyResult } from "./types";

export async function verifyBasePayPayment(input: BasePayVerifyInput): Promise<BasePayVerifyResult> {
  const { txId, expectedAmount, expectedRecipient } = input;

  const existing = await storage.getBasePayPaymentByTxId(txId);
  if (existing) {
    throw new Error("Transaction already processed");
  }

  const paymentStatus = await getPaymentStatus({ id: txId });

  if (paymentStatus.status !== "completed") {
    throw new Error(`Payment not completed: ${paymentStatus.status} — ${paymentStatus.message}`);
  }

  if (!paymentStatus.sender) {
    throw new Error("Payment status missing sender address");
  }

  if (!paymentStatus.amount) {
    throw new Error("Payment status missing amount");
  }

  if (!paymentStatus.recipient) {
    throw new Error("Payment status missing recipient address");
  }

  if (expectedAmount && paymentStatus.amount !== expectedAmount) {
    console.warn(`[Base Pay] Amount differs: expected ${expectedAmount}, got ${paymentStatus.amount}. Using actual amount.`);
  }

  if (paymentStatus.recipient.toLowerCase() !== expectedRecipient.toLowerCase()) {
    throw new Error(`Recipient mismatch: expected ${expectedRecipient}, got ${paymentStatus.recipient}`);
  }

  return {
    status: paymentStatus.status,
    sender: paymentStatus.sender,
    amount: paymentStatus.amount,
    recipient: paymentStatus.recipient,
  };
}
