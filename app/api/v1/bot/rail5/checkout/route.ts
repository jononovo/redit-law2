import { NextResponse } from "next/server";
import { withBotApi } from "@/lib/agent-management/agent-api/middleware";
import { storage } from "@/server/storage";
import { rail5CheckoutRequestSchema } from "@/shared/schema";
import { generateRail5CheckoutId, buildSpawnPayload, buildCheckoutSteps } from "@/lib/rail5";
import { evaluateMasterGuardrails, centsToMicroUsdc } from "@/lib/guardrails/master";
import { evaluateCardGuardrails } from "@/lib/guardrails/evaluate";
import { GUARDRAIL_DEFAULTS } from "@/lib/guardrails/defaults";
import { recordOrder } from "@/lib/orders/create";

export const POST = withBotApi("/api/v1/bot/rail5/checkout", async (request, { bot }) => {
  if (bot.walletStatus !== "active") {
    return NextResponse.json(
      { error: "wallet_not_active", message: "Wallet is not active." },
      { status: 403 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = rail5CheckoutRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_error", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { merchant_name, merchant_url, item_name, amount_cents, category } = parsed.data;

  const card = await storage.getRail5CardByBotId(bot.botId);
  if (!card) {
    return NextResponse.json(
      { error: "no_card", message: "No Rail 5 card linked to this bot." },
      { status: 404 }
    );
  }

  if (!["confirmed", "active"].includes(card.status)) {
    return NextResponse.json(
      { error: "card_not_active", message: `Card is ${card.status}. Cannot checkout.` },
      { status: 403 }
    );
  }

  const guardrails = await storage.getRail5Guardrails(card.cardId);
  const approvalMode = guardrails?.approvalMode ?? GUARDRAIL_DEFAULTS.rail5.approvalMode;
  const rules = {
    maxPerTxCents: guardrails?.maxPerTxCents ?? GUARDRAIL_DEFAULTS.rail5.maxPerTxCents,
    dailyBudgetCents: guardrails?.dailyBudgetCents ?? GUARDRAIL_DEFAULTS.rail5.dailyBudgetCents,
    monthlyBudgetCents: guardrails?.monthlyBudgetCents ?? GUARDRAIL_DEFAULTS.rail5.monthlyBudgetCents,
    requireApprovalAbove: guardrails?.requireApprovalAbove ?? GUARDRAIL_DEFAULTS.rail5.requireApprovalAbove,
    autoPauseOnZero: guardrails?.autoPauseOnZero ?? GUARDRAIL_DEFAULTS.rail5.autoPauseOnZero,
  };

  const masterDecision = await evaluateMasterGuardrails(card.ownerUid, centsToMicroUsdc(amount_cents));
  if (masterDecision.action === "block") {
    return NextResponse.json(
      { error: "master_guardrail", message: masterDecision.reason },
      { status: 403 }
    );
  }

  if (approvalMode === "ask_for_everything") {
    const checkoutId = generateRail5CheckoutId();
    const wallet = await storage.getWalletByOwnerUid(card.ownerUid);
    const walletBalance = wallet?.balanceCents ?? null;

    await storage.createRail5Checkout({
      checkoutId,
      cardId: card.cardId,
      botId: bot.botId,
      ownerUid: card.ownerUid,
      merchantName: merchant_name,
      merchantUrl: merchant_url,
      itemName: item_name,
      amountCents: amount_cents,
      category: category || undefined,
      status: "pending_approval",
      balanceAfter: walletBalance,
    });

    const owner = await storage.getOwnerByUid(card.ownerUid);
    if (owner) {
      const { notifyOwner } = await import("@/lib/notifications");
      await notifyOwner({
        ownerUid: card.ownerUid,
        ownerEmail: owner.email,
        type: "purchase",
        title: `Approval needed: $${(amount_cents / 100).toFixed(2)} at ${merchant_name}`,
        body: `Your bot wants to spend $${(amount_cents / 100).toFixed(2)} at ${merchant_name} for "${item_name}". Approval mode requires all purchases to be approved.`,
        botId: bot.botId,
      }).catch(() => {});

      const { createApproval } = await import("@/lib/approvals/service");
      createApproval({
        rail: "rail5",
        ownerUid: card.ownerUid,
        ownerEmail: owner.email,
        botName: bot.botName,
        amountDisplay: `$${(amount_cents / 100).toFixed(2)}`,
        amountRaw: amount_cents,
        merchantName: merchant_name,
        itemName: item_name,
        railRef: checkoutId,
        metadata: { cardId: card.cardId, merchantUrl: merchant_url, category },
      }).catch((err) => {
        console.error("[Rail5] Unified approval email failed:", err);
      });
    }

    return NextResponse.json({
      approved: false,
      status: "pending_approval",
      checkout_id: checkoutId,
      message: "Approval mode requires all purchases to be approved. Owner notified.",
    });
  }

  const dailySpend = await storage.getRail5DailySpendCents(card.cardId);
  const monthlySpend = await storage.getRail5MonthlySpendCents(card.cardId);

  const decision = evaluateCardGuardrails(
    rules,
    { amountCents: amount_cents },
    { dailyCents: dailySpend, monthlyCents: monthlySpend }
  );

  if (decision.action === "block") {
    return NextResponse.json(
      { error: "guardrail_violation", message: decision.reason },
      { status: 403 }
    );
  }

  const checkoutId = generateRail5CheckoutId();
  const wallet = await storage.getWalletByOwnerUid(card.ownerUid);
  const walletBalance = wallet?.balanceCents ?? null;

  if (decision.action === "require_approval") {
    await storage.createRail5Checkout({
      checkoutId,
      cardId: card.cardId,
      botId: bot.botId,
      ownerUid: card.ownerUid,
      merchantName: merchant_name,
      merchantUrl: merchant_url,
      itemName: item_name,
      amountCents: amount_cents,
      category: category || undefined,
      status: "pending_approval",
      balanceAfter: walletBalance,
    });

    const owner = await storage.getOwnerByUid(card.ownerUid);
    if (owner) {
      const { notifyOwner } = await import("@/lib/notifications");
      await notifyOwner({
        ownerUid: card.ownerUid,
        ownerEmail: owner.email,
        type: "purchase",
        title: `Approval needed: $${(amount_cents / 100).toFixed(2)} at ${merchant_name}`,
        body: `Your bot wants to spend $${(amount_cents / 100).toFixed(2)} at ${merchant_name} for "${item_name}". This exceeds your approval threshold.`,
        botId: bot.botId,
      }).catch(() => {});

      const { createApproval } = await import("@/lib/approvals/service");
      createApproval({
        rail: "rail5",
        ownerUid: card.ownerUid,
        ownerEmail: owner.email,
        botName: bot.botName,
        amountDisplay: `$${(amount_cents / 100).toFixed(2)}`,
        amountRaw: amount_cents,
        merchantName: merchant_name,
        itemName: item_name,
        railRef: checkoutId,
        metadata: { cardId: card.cardId, merchantUrl: merchant_url, category },
      }).catch((err) => {
        console.error("[Rail5] Unified approval email failed:", err);
      });
    }

    return NextResponse.json({
      approved: false,
      status: "pending_approval",
      checkout_id: checkoutId,
      message: `${decision.reason}. Owner notified.`,
    });
  }

  await storage.createRail5Checkout({
    checkoutId,
    cardId: card.cardId,
    botId: bot.botId,
    ownerUid: card.ownerUid,
    merchantName: merchant_name,
    merchantUrl: merchant_url,
    itemName: item_name,
    amountCents: amount_cents,
    category: category || undefined,
    status: "approved",
    balanceAfter: walletBalance,
  });

  const encryptedFilename = `Card-${card.cardName.replace(/[^a-zA-Z0-9-_]/g, "-")}-${card.cardLast4}.md`;

  const checkoutStepParams = {
    checkoutId,
    merchantName: merchant_name,
    merchantUrl: merchant_url,
    itemName: item_name,
    amountCents: amount_cents,
    encryptedFilename,
  };

  const spawnPayload = buildSpawnPayload(checkoutStepParams);
  const checkoutSteps = buildCheckoutSteps(checkoutStepParams);

  recordOrder({
    ownerUid: card.ownerUid,
    rail: "rail5",
    botId: bot.botId,
    botName: bot.botName,
    cardId: card.cardId,
    status: "completed",
    vendor: merchant_name,
    vendorDetails: { url: merchant_url, category: category || undefined },
    productName: item_name,
    priceCents: amount_cents,
    priceCurrency: "USD",
    metadata: { checkoutId },
  }).catch((err) => {
    console.error("[Rail5] Failed to record order:", err);
  });

  return NextResponse.json({
    approved: true,
    checkout_id: checkoutId,
    checkout_steps: checkoutSteps,
    spawn_payload: spawnPayload,
  });
});
