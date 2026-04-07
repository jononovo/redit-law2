import { db } from "@/server/db";
import { qrPayments, privyWallets, privyTransactions } from "@/shared/schema";
import type { PrivyTransaction } from "@/shared/schema";
import { eq, and, sql } from "drizzle-orm";

interface CreditWalletFromQrPayInput {
  paymentId: string;
  walletAddress: string;
  creditedUsdc: number;
}

interface CreditWalletFromQrPayResult {
  transaction: PrivyTransaction;
  newBalance: number;
  walletId: number;
}

export async function creditWalletFromQrPay(
  input: CreditWalletFromQrPayInput,
): Promise<CreditWalletFromQrPayResult> {
  const { paymentId, walletAddress, creditedUsdc } = input;

  return db.transaction(async (tx) => {
    const [confirmed] = await tx
      .update(qrPayments)
      .set({ status: "confirmed", creditedUsdc, confirmedAt: new Date() })
      .where(and(eq(qrPayments.paymentId, paymentId), eq(qrPayments.status, "waiting")))
      .returning();

    if (!confirmed) {
      throw new Error("Payment already processed or not found");
    }

    const [targetWallet] = await tx
      .select()
      .from(privyWallets)
      .where(sql`LOWER(${privyWallets.address}) = LOWER(${walletAddress})`)
      .limit(1);

    if (!targetWallet) {
      throw new Error(`No wallet found for address: ${walletAddress}`);
    }

    const newBalance = targetWallet.balanceUsdc + creditedUsdc;

    await tx
      .update(privyWallets)
      .set({ balanceUsdc: newBalance, updatedAt: new Date() })
      .where(eq(privyWallets.id, targetWallet.id));

    const [transaction] = await tx
      .insert(privyTransactions)
      .values({
        walletId: targetWallet.id,
        type: "deposit",
        amountUsdc: creditedUsdc,
        status: "confirmed",
        balanceAfter: newBalance,
        metadata: { source: "qr_pay", payment_id: paymentId },
      })
      .returning();

    return { transaction, newBalance, walletId: targetWallet.id };
  });
}
