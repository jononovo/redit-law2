import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/server/storage";
import { crossmintBotPurchaseSchema } from "@/shared/schema";
import { authenticateBot } from "@/lib/agent-management/auth";
import { evaluateGuardrails } from "@/lib/guardrails/evaluate";
import { evaluateProcurementControls } from "@/lib/procurement-controls/evaluate";
import { evaluateMasterGuardrails } from "@/lib/guardrails/master";
import { usdToMicroUsdc } from "@/lib/rail2/client";
import { createApproval } from "@/lib/approvals/service";

async function handler(request: NextRequest, botId: string) {
  try {
    const body = await request.json();
    const parsed = crossmintBotPurchaseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
    }

    const { merchant, product_id, quantity, product_name, estimated_price_usd } = parsed.data;
    let { shipping_address } = parsed.data;

    const wallet = await storage.crossmintGetWalletByBotId(botId);
    if (!wallet) {
      return NextResponse.json({ error: "No Card Wallet found for this bot" }, { status: 404 });
    }

    if (!shipping_address) {
      const defaultAddr = await storage.getDefaultShippingAddress(wallet.ownerUid);
      if (defaultAddr) {
        shipping_address = {
          name: defaultAddr.name,
          line1: defaultAddr.line1,
          line2: defaultAddr.line2 ?? undefined,
          city: defaultAddr.city,
          state: defaultAddr.state,
          zip: defaultAddr.postalCode,
          country: defaultAddr.country,
        };
      }
    }

    if (!shipping_address) {
      return NextResponse.json({ error: "Shipping address required. Provide one in the request or set a default address." }, { status: 400 });
    }

    if (wallet.status !== "active") {
      return NextResponse.json({ error: "Wallet is paused", status: wallet.status }, { status: 403 });
    }

    const estimatedAmountUsdc = estimated_price_usd
      ? usdToMicroUsdc(estimated_price_usd * (quantity || 1))
      : 0;

    const masterDecision = await evaluateMasterGuardrails(wallet.ownerUid, estimatedAmountUsdc);
    if (masterDecision.action === "block") {
      return NextResponse.json({ error: "guardrail_violation", reason: masterDecision.reason }, { status: 403 });
    }

    const guardrails = await storage.crossmintGetGuardrails(wallet.id);
    if (!guardrails) {
      return NextResponse.json({ error: "Guardrails not configured" }, { status: 500 });
    }

    const productLocator = `${merchant}:${product_id}`;

    const dailySpend = await storage.crossmintGetDailySpend(wallet.id);
    const monthlySpend = await storage.crossmintGetMonthlySpend(wallet.id);

    const procurementRules = await storage.getProcurementControlsByScope(wallet.ownerUid, "rail2", null);
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
        { merchant }
      );
      if (procDecision.action === "block") {
        return NextResponse.json({ error: "guardrail_violation", reason: procDecision.reason }, { status: 403 });
      }
    }

    const approvalMode = guardrails.approvalMode ?? "ask_for_everything";

    const decision = evaluateGuardrails(
      {
        maxPerTxUsdc: guardrails.maxPerTxUsdc,
        dailyBudgetUsdc: guardrails.dailyBudgetUsdc,
        monthlyBudgetUsdc: guardrails.monthlyBudgetUsdc,
        requireApprovalAbove: guardrails.requireApprovalAbove,
        autoPauseOnZero: guardrails.autoPauseOnZero,
      },
      { amountUsdc: estimatedAmountUsdc },
      { dailyUsdc: dailySpend, monthlyUsdc: monthlySpend }
    );

    if (decision.action === "block") {
      return NextResponse.json({ error: "guardrail_violation", reason: decision.reason }, { status: 403 });
    }

    const needsApproval =
      approvalMode === "ask_for_everything" ||
      decision.action === "require_approval";

    if (!needsApproval) {
      const tx = await storage.crossmintCreateTransaction({
        walletId: wallet.id,
        type: "purchase",
        amountUsdc: estimatedAmountUsdc,
        productLocator,
        productName: product_name || productLocator,
        quantity: quantity || 1,
        shippingAddress: shipping_address,
        status: "confirmed",
        orderStatus: "processing",
        balanceAfter: wallet.balanceUsdc,
      });

      try {
        const { createPurchaseOrder } = await import("@/lib/procurement/crossmint-worldstore/purchase");
        const bot = await storage.getBotByBotId(botId);
        const owner = await storage.getOwnerByUid(wallet.ownerUid);
        const ownerEmail = owner?.email || bot?.ownerEmail || "";

        const result = await createPurchaseOrder({
          merchant,
          productId: product_id,
          walletAddress: wallet.address,
          ownerEmail,
          shippingAddress: {
            name: shipping_address.name,
            line1: shipping_address.line1,
            line2: shipping_address.line2,
            city: shipping_address.city,
            state: shipping_address.state,
            postalCode: shipping_address.zip,
            country: shipping_address.country,
          },
          quantity: quantity || 1,
        });

        await storage.crossmintUpdateTransaction(tx.id, {
          crossmintOrderId: result.orderId,
          status: "confirmed",
          orderStatus: "processing",
        });

        try {
          const { recordOrder } = await import("@/lib/orders/create");
          const { toShippingAddressFields } = await import("@/lib/orders/address-utils");
          const convertedAddr = toShippingAddressFields(shipping_address as any);
          await recordOrder({
            ownerUid: wallet.ownerUid,
            rail: "rail2",
            botId,
            botName: bot?.botName ?? null,
            walletId: wallet.id,
            transactionId: tx.id,
            externalOrderId: result.orderId,
            status: "processing",
            vendor: merchant,
            productName: product_name || productLocator,
            productUrl: productLocator,
            sku: productLocator,
            quantity: quantity || 1,
            priceCents: result.pricing?.totalCents ?? (estimated_price_usd ? Math.round(estimated_price_usd * (quantity || 1) * 100) : null),
            priceCurrency: "USD",
            taxesCents: result.pricing?.taxCents ?? null,
            shippingPriceCents: result.pricing?.shippingCents ?? null,
            shippingType: "standard",
            shippingAddress: convertedAddr,
            metadata: { source: "auto-approved" },
          });
        } catch (orderErr) {
          console.error("[Rail2] Order record creation failed (non-fatal):", orderErr);
        }

        if (bot) {
          const { fireWebhook } = await import("@/lib/webhooks");
          fireWebhook(bot, "purchase.approved", {
            transaction_id: tx.id,
            order_id: result.orderId,
            product_name: tx.productName,
            product_locator: productLocator,
            amount_usdc: estimatedAmountUsdc,
          }).catch(() => {});
        }

        return NextResponse.json({
          status: "auto_approved",
          transaction_id: tx.id,
          order_id: result.orderId,
          product_name: tx.productName,
          product_locator: productLocator,
          estimated_total_usd: estimated_price_usd ? estimated_price_usd * (quantity || 1) : null,
        });
      } catch (purchaseError) {
        console.error("[Rail2] Auto-approved purchase order creation failed:", purchaseError);
        await storage.crossmintUpdateTransaction(tx.id, { status: "failed" });
        return NextResponse.json({ error: "Purchase order creation failed" }, { status: 500 });
      }
    }

    const tx = await storage.crossmintCreateTransaction({
      walletId: wallet.id,
      type: "purchase",
      amountUsdc: estimatedAmountUsdc,
      productLocator,
      productName: product_name || productLocator,
      quantity: quantity || 1,
      shippingAddress: shipping_address,
      status: "requires_approval",
      orderStatus: "pending",
      balanceAfter: wallet.balanceUsdc,
    });

    const bot = await storage.getBotByBotId(botId);
    const owner = await storage.getOwnerByUid(wallet.ownerUid);
    const totalUsd = estimated_price_usd ? estimated_price_usd * (quantity || 1) : 0;

    if (owner && bot) {
      const unifiedApproval = await createApproval({
        rail: "rail2",
        ownerUid: wallet.ownerUid,
        ownerEmail: owner.email,
        botName: bot.botName,
        amountDisplay: totalUsd > 0 ? `$${totalUsd.toFixed(2)}` : "Price TBD",
        amountRaw: estimatedAmountUsdc,
        merchantName: merchant,
        itemName: product_name || productLocator,
        railRef: String(tx.id),
        metadata: { productLocator, product_name: product_name || productLocator, quantity: quantity || 1, shipping_address },
      });

      return NextResponse.json({
        status: "awaiting_approval",
        approval_id: unifiedApproval.approvalId,
        transaction_id: tx.id,
        product_name: tx.productName,
        product_locator: productLocator,
        estimated_total_usd: totalUsd > 0 ? totalUsd : null,
        expires_at: unifiedApproval.expiresAt,
      }, { status: 202 });
    }

    return NextResponse.json({
      status: "awaiting_approval",
      transaction_id: tx.id,
      product_name: tx.productName,
      product_locator: productLocator,
      estimated_total_usd: totalUsd > 0 ? totalUsd : null,
    }, { status: 202 });
  } catch (error) {
    console.error("POST /api/v1/card-wallet/bot/purchase error:", error);
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
