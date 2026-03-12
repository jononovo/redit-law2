import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/server/storage";
import { privyBotSignSchema } from "@/shared/schema";
import { signTypedData } from "@/lib/rail1/wallet/sign";
import { buildTransferWithAuthorizationTypedData, generateNonce, buildXPaymentHeader, usdToMicroUsdc, microUsdcToUsd } from "@/lib/rail1/x402";
import { authenticateBot } from "@/lib/agent-management/auth";
import { evaluateGuardrails } from "@/lib/guardrails/evaluate";
import { evaluateProcurementControls } from "@/lib/procurement-controls/evaluate";
import { evaluateMasterGuardrails } from "@/lib/guardrails/master";
import { createApproval } from "@/lib/approvals/service";
import { recordOrder } from "@/lib/orders/create";

async function handler(request: NextRequest, botId: string) {
  try {
    const body = await request.json();
    const parsed = privyBotSignSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
    }

    const { resource_url, amount_usdc, recipient_address, valid_before } = parsed.data;

    const wallet = await storage.privyGetWalletByBotId(botId);
    if (!wallet) {
      return NextResponse.json({ error: "No Stripe Wallet found for this bot" }, { status: 404 });
    }

    if (wallet.status !== "active") {
      return NextResponse.json({ error: "Wallet is not active", status: wallet.status }, { status: 403 });
    }

    const masterDecision = await evaluateMasterGuardrails(wallet.ownerUid, amount_usdc);
    if (masterDecision.action === "block") {
      return NextResponse.json({ error: masterDecision.reason }, { status: 403 });
    }

    const guardrailsForApproval = await storage.privyGetGuardrails(wallet.id);

    if (guardrailsForApproval) {
      const approvalMode = guardrailsForApproval.approvalMode ?? "ask_for_everything";

      if (approvalMode === "ask_for_everything") {
        return NextResponse.json({
          error: "requires_owner_approval",
          approval_mode: "ask_for_everything",
          message: "Your owner requires approval for all transactions. This setting can be changed from the dashboard."
        }, { status: 403 });
      }

      if (approvalMode === "auto_approve_under_threshold") {
        const thresholdUsdc = guardrailsForApproval.requireApprovalAbove ?? 5;
        const thresholdMicro = usdToMicroUsdc(thresholdUsdc);
        if (amount_usdc > thresholdMicro) {
          const tx = await storage.privyCreateTransaction({
            walletId: wallet.id,
            type: "x402_payment",
            amountUsdc: amount_usdc,
            recipientAddress: recipient_address,
            resourceUrl: resource_url,
            status: "requires_approval",
            balanceAfter: wallet.balanceUsdc,
          });

          const bot = await storage.getBotByBotId(botId);
          const owner = await storage.getOwnerByUid(wallet.ownerUid);
          if (owner && bot) {
            const unifiedApproval = await createApproval({
              rail: "rail1",
              ownerUid: wallet.ownerUid,
              ownerEmail: owner.email,
              botName: bot.botName,
              amountDisplay: `$${microUsdcToUsd(amount_usdc).toFixed(2)} USDC`,
              amountRaw: amount_usdc,
              merchantName: resource_url,
              railRef: String(tx.id),
              metadata: { recipient_address, resource_url },
            });

            return NextResponse.json({
              status: "awaiting_approval",
              approval_id: unifiedApproval.approvalId,
            }, { status: 202 });
          }

          return NextResponse.json({
            status: "awaiting_approval",
          }, { status: 202 });
        }
      }
    }

    const guardrails = guardrailsForApproval ?? await storage.privyGetGuardrails(wallet.id);

    if (guardrails) {
      const dailySpend = await storage.privyGetDailySpend(wallet.id);
      const monthlySpend = await storage.privyGetMonthlySpend(wallet.id);

      const procurementRules = await storage.getProcurementControlsByScope(wallet.ownerUid, "rail1", null);
      if (procurementRules) {
        const procDecision = evaluateProcurementControls(
          {
            allowlistedDomains: (procurementRules.allowlistedDomains as string[]) || [],
            blocklistedDomains: (procurementRules.blocklistedDomains as string[]) || [],
            allowlistedMerchants: (procurementRules.allowlistedMerchants as string[]) || [],
            blocklistedMerchants: (procurementRules.blocklistedMerchants as string[]) || [],
            allowlistedCategories: (procurementRules.allowlistedCategories as string[]) || [],
            blocklistedCategories: (procurementRules.blocklistedCategories as string[]) || [],
          },
          { domain: resource_url }
        );
        if (procDecision.action === "block") {
          return NextResponse.json({ error: procDecision.reason }, { status: 403 });
        }
      }

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
        return NextResponse.json({ error: decision.reason }, { status: 403 });
      }

      if (decision.action === "require_approval") {
        const tx = await storage.privyCreateTransaction({
          walletId: wallet.id,
          type: "x402_payment",
          amountUsdc: amount_usdc,
          recipientAddress: recipient_address,
          resourceUrl: resource_url,
          status: "requires_approval",
          balanceAfter: wallet.balanceUsdc,
        });

        const bot = await storage.getBotByBotId(botId);
        const owner = await storage.getOwnerByUid(wallet.ownerUid);
        if (owner && bot) {
          const unifiedApproval = await createApproval({
            rail: "rail1",
            ownerUid: wallet.ownerUid,
            ownerEmail: owner.email,
            botName: bot.botName,
            amountDisplay: `$${microUsdcToUsd(amount_usdc).toFixed(2)} USDC`,
            amountRaw: amount_usdc,
            merchantName: resource_url,
            railRef: String(tx.id),
            metadata: { recipient_address, resource_url },
          });

          return NextResponse.json({
            status: "awaiting_approval",
            approval_id: unifiedApproval.approvalId,
          }, { status: 202 });
        }

        return NextResponse.json({
          status: "awaiting_approval",
        }, { status: 202 });
      }
    }

    if (wallet.balanceUsdc < amount_usdc) {
      return NextResponse.json({ error: "Insufficient USDC balance" }, { status: 403 });
    }

    const nonce = generateNonce();
    const validAfter = 0;
    const validBeforeTs = valid_before || Math.floor(Date.now() / 1000) + 300;

    const typedData = buildTransferWithAuthorizationTypedData({
      from: wallet.address,
      to: recipient_address,
      value: BigInt(amount_usdc),
      validAfter,
      validBefore: validBeforeTs,
      nonce,
    });

    const signature = await signTypedData(wallet.privyWalletId, typedData);

    const xPaymentHeader = buildXPaymentHeader({
      signature,
      from: wallet.address,
      to: recipient_address,
      value: String(amount_usdc),
      validAfter,
      validBefore: validBeforeTs,
      nonce,
      chainId: 8453,
    });

    const tx = await storage.privyCreateTransaction({
      walletId: wallet.id,
      type: "x402_payment",
      amountUsdc: amount_usdc,
      recipientAddress: recipient_address,
      resourceUrl: resource_url,
      status: "pending",
      balanceAfter: wallet.balanceUsdc,
    });

    let vendorDomain: string | null = null;
    try {
      vendorDomain = new URL(resource_url).hostname;
    } catch {
      vendorDomain = resource_url;
    }

    const bot = await storage.getBotByBotId(botId);
    recordOrder({
      ownerUid: wallet.ownerUid,
      rail: "rail1",
      botId,
      botName: bot?.botName ?? null,
      walletId: wallet.id,
      transactionId: tx.id,
      status: "completed",
      vendor: vendorDomain,
      vendorDetails: { url: resource_url },
      productName: vendorDomain,
      productUrl: resource_url,
      priceCents: Math.round(microUsdcToUsd(amount_usdc) * 100),
      priceCurrency: "USD",
      metadata: { recipient_address, resource_url, amount_usdc },
    }).catch((err) => console.error("[Rail1] Order creation failed:", err));

    return NextResponse.json({
      x_payment_header: xPaymentHeader,
      signature,
    });
  } catch (error) {
    console.error("POST /api/v1/stripe-wallet/bot/sign error:", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const bot = await authenticateBot(request);
  if (!bot) {
    return NextResponse.json({ error: "Invalid or missing API key" }, { status: 401 });
  }
  return handler(request, bot.botId);
}
