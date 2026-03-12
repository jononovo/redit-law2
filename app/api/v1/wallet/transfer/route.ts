import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { storage } from "@/server/storage";
import { db } from "@/server/db";
import { sendUsdcTransfer as privySendUsdc } from "@/lib/rail1/wallet/transfer";
import { sendUsdcTransfer as crossmintSendUsdc } from "@/lib/rail2/wallet/transfer";
import { evaluateGuardrails } from "@/lib/guardrails/evaluate";
import { isAddress } from "viem";
import {
  privyWallets,
  crossmintWallets,
  privyTransactions,
  crossmintTransactions,
} from "@/shared/schema";
import { eq, and, gte, sql } from "drizzle-orm";

const transferSchema = z.object({
  source_wallet_id: z.number().int().positive(),
  source_rail: z.enum(["privy", "crossmint"]),
  amount_usdc: z.number().int().positive(),
  destination: z
    .object({
      wallet_id: z.number().int().positive().optional(),
      rail: z.enum(["privy", "crossmint"]).optional(),
      address: z
        .string()
        .regex(/^0x[a-fA-F0-9]{40}$/)
        .optional(),
    })
    .refine(
      (d) => (d.wallet_id && d.rail) || d.address,
      "Either wallet_id+rail or address is required"
    ),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsed = transferSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { source_wallet_id, source_rail, amount_usdc, destination } =
      parsed.data;

    let sourceWallet: any;
    if (source_rail === "privy") {
      sourceWallet = await storage.privyGetWalletById(source_wallet_id);
    } else {
      sourceWallet = await storage.crossmintGetWalletById(source_wallet_id);
    }

    if (!sourceWallet || sourceWallet.ownerUid !== user.uid) {
      return NextResponse.json(
        { error: "Source wallet not found" },
        { status: 404 }
      );
    }

    if (sourceWallet.status !== "active") {
      return NextResponse.json(
        { error: "Source wallet is paused" },
        { status: 403 }
      );
    }

    if (sourceWallet.balanceUsdc < amount_usdc) {
      return NextResponse.json(
        {
          error: "Insufficient balance",
          balance: sourceWallet.balanceUsdc,
          requested: amount_usdc,
        },
        { status: 400 }
      );
    }

    let destinationAddress: string;
    let destinationWallet: any = null;
    let destinationRail: string | null = null;
    let transferTier: "same_rail" | "cross_rail" | "external";

    if (destination.wallet_id && destination.rail) {
      if (destination.rail === "privy") {
        destinationWallet = await storage.privyGetWalletById(
          destination.wallet_id
        );
      } else {
        destinationWallet = await storage.crossmintGetWalletById(
          destination.wallet_id
        );
      }

      if (!destinationWallet || destinationWallet.ownerUid !== user.uid) {
        return NextResponse.json(
          { error: "Destination wallet not found" },
          { status: 404 }
        );
      }

      destinationAddress = destinationWallet.address;
      destinationRail = destination.rail;
      transferTier =
        source_rail === destination.rail ? "same_rail" : "cross_rail";

      if (
        source_rail === destination.rail &&
        source_wallet_id === destination.wallet_id
      ) {
        return NextResponse.json(
          { error: "Cannot transfer to the same wallet" },
          { status: 400 }
        );
      }
    } else if (destination.address) {
      if (!isAddress(destination.address)) {
        return NextResponse.json(
          { error: "Invalid destination address" },
          { status: 400 }
        );
      }
      destinationAddress = destination.address;
      transferTier = "external";
    } else {
      return NextResponse.json(
        { error: "Destination required" },
        { status: 400 }
      );
    }

    let guardrails: any;
    let dailySpend: number;
    let monthlySpend: number;

    if (source_rail === "privy") {
      guardrails = await storage.privyGetGuardrails(source_wallet_id);
      dailySpend = await storage.privyGetDailySpend(source_wallet_id);
      monthlySpend = await storage.privyGetMonthlySpend(source_wallet_id);
    } else {
      guardrails = await storage.crossmintGetGuardrails(source_wallet_id);
      dailySpend = await storage.crossmintGetDailySpend(source_wallet_id);
      monthlySpend = await storage.crossmintGetMonthlySpend(source_wallet_id);
    }

    if (guardrails) {
      const decision = evaluateGuardrails(
        {
          maxPerTxUsdc: guardrails.maxPerTxUsdc,
          dailyBudgetUsdc: guardrails.dailyBudgetUsdc,
          monthlyBudgetUsdc: guardrails.monthlyBudgetUsdc,
          requireApprovalAbove: guardrails.requireApprovalAbove,
          autoPauseOnZero: guardrails.autoPauseOnZero,
        },
        { amountUsdc: amount_usdc },
        { dailyUsdc: dailySpend, monthlyUsdc: monthlySpend }
      );

      if (decision.action === "block") {
        return NextResponse.json(
          { error: "guardrail_violation", reason: decision.reason },
          { status: 403 }
        );
      }

      if (decision.action === "require_approval") {
        return NextResponse.json(
          { error: "approval_required", reason: decision.reason },
          { status: 403 }
        );
      }
    }

    let txHash: string;

    try {
      if (source_rail === "privy") {
        const result = await privySendUsdc(
          sourceWallet.privyWalletId,
          destinationAddress,
          amount_usdc
        );
        txHash = result.hash;
      } else {
        const result = await crossmintSendUsdc(
          sourceWallet.address,
          destinationAddress,
          amount_usdc
        );
        txHash = result.txHash || `pending:${result.transferId}`;
      }
    } catch (sendError: any) {
      console.error("[Transfer] On-chain send failed:", sendError);
      return NextResponse.json(
        {
          error: "Transfer failed",
          details: sendError.message,
        },
        { status: 502 }
      );
    }

    const isPending = txHash.startsWith("pending:");
    const txStatus = isPending ? "pending" : "confirmed";

    const sharedMetadata = {
      transfer_tier: transferTier,
      counterparty_address: destinationAddress,
      counterparty_wallet_id: destinationWallet?.id || null,
      counterparty_rail: destinationRail,
      tx_hash: txHash,
    };

    const result = await db.transaction(async (tx) => {
      let updatedRows: any[];

      if (source_rail === "privy") {
        updatedRows = await tx
          .update(privyWallets)
          .set({
            balanceUsdc: sql`${privyWallets.balanceUsdc} - ${amount_usdc}`,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(privyWallets.id, source_wallet_id),
              gte(privyWallets.balanceUsdc, amount_usdc)
            )
          )
          .returning();
      } else {
        updatedRows = await tx
          .update(crossmintWallets)
          .set({
            balanceUsdc: sql`${crossmintWallets.balanceUsdc} - ${amount_usdc}`,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(crossmintWallets.id, source_wallet_id),
              gte(crossmintWallets.balanceUsdc, amount_usdc)
            )
          )
          .returning();
      }

      if (!updatedRows.length) {
        throw new Error("INSUFFICIENT_BALANCE");
      }

      const newSourceBalance = updatedRows[0].balanceUsdc;
      let newDestBalance: number | null = null;

      if (destinationWallet && destinationRail) {
        let destRows: any[];
        if (destinationRail === "privy") {
          destRows = await tx
            .update(privyWallets)
            .set({
              balanceUsdc: sql`${privyWallets.balanceUsdc} + ${amount_usdc}`,
              updatedAt: new Date(),
            })
            .where(eq(privyWallets.id, destinationWallet.id))
            .returning();
        } else {
          destRows = await tx
            .update(crossmintWallets)
            .set({
              balanceUsdc: sql`${crossmintWallets.balanceUsdc} + ${amount_usdc}`,
              updatedAt: new Date(),
            })
            .where(eq(crossmintWallets.id, destinationWallet.id))
            .returning();
        }
        newDestBalance = destRows[0]?.balanceUsdc ?? null;
      }

      if (source_rail === "privy") {
        await tx.insert(privyTransactions).values({
          walletId: source_wallet_id,
          type: "transfer",
          amountUsdc: amount_usdc,
          recipientAddress: destinationAddress,
          txHash,
          status: txStatus,
          balanceAfter: newSourceBalance,
          metadata: { ...sharedMetadata, direction: "outbound" },
        });
      } else {
        await tx.insert(crossmintTransactions).values({
          walletId: source_wallet_id,
          type: "transfer",
          amountUsdc: amount_usdc,
          quantity: 1,
          status: txStatus,
          balanceAfter: newSourceBalance,
          metadata: {
            ...sharedMetadata,
            direction: "outbound",
            recipientAddress: destinationAddress,
            txHash,
          },
        });
      }

      if (destinationWallet && destinationRail) {
        if (destinationRail === "privy") {
          await tx.insert(privyTransactions).values({
            walletId: destinationWallet.id,
            type: "transfer",
            amountUsdc: amount_usdc,
            recipientAddress: sourceWallet.address,
            txHash,
            status: txStatus,
            balanceAfter: newDestBalance!,
            metadata: { ...sharedMetadata, direction: "inbound" },
          });
        } else {
          await tx.insert(crossmintTransactions).values({
            walletId: destinationWallet.id,
            type: "transfer",
            amountUsdc: amount_usdc,
            quantity: 1,
            status: txStatus,
            balanceAfter: newDestBalance!,
            metadata: {
              ...sharedMetadata,
              direction: "inbound",
              senderAddress: sourceWallet.address,
              txHash,
            },
          });
        }
      }

      return { newSourceBalance, newDestBalance };
    });

    return NextResponse.json({
      success: true,
      tx_hash: txHash,
      status: txStatus,
      transfer_tier: transferTier,
      source: {
        wallet_id: source_wallet_id,
        rail: source_rail,
        new_balance: result.newSourceBalance,
        new_balance_display: `$${(result.newSourceBalance / 1_000_000).toFixed(2)}`,
      },
      destination: {
        wallet_id: destinationWallet?.id || null,
        rail: destinationRail,
        address: destinationAddress,
        new_balance: result.newDestBalance,
      },
    });
  } catch (error: any) {
    if (error?.message === "INSUFFICIENT_BALANCE") {
      return NextResponse.json(
        { error: "Insufficient balance (concurrent modification)" },
        { status: 409 }
      );
    }
    console.error("POST /api/v1/wallet/transfer error:", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
