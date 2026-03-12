import { NextResponse } from "next/server";
import { withBotApi } from "@/lib/agent-management/agent-api/middleware";
import { storage } from "@/server/storage";
import { unifiedCheckoutSchema, type ProfilePermission } from "@/shared/schema";
import { fireWebhook } from "@/lib/webhooks";
import { notifyPurchase, notifyBalanceLow, notifySuspicious } from "@/lib/notifications";
import { recordOrganicEvent, incrementObfuscationCount } from "@/lib/obfuscation-engine/state-machine";
import { completeObfuscationEvent } from "@/lib/obfuscation-engine/events";
import { getWindowStart } from "@/lib/rail4/allowance";
import type { FakeProfile } from "@/lib/rail4/obfuscation";
import { randomBytes } from "crypto";
import { evaluateMasterGuardrails, centsToMicroUsdc } from "@/lib/guardrails/master";
import { evaluateCardGuardrails } from "@/lib/guardrails/evaluate";
import { GUARDRAIL_DEFAULTS } from "@/lib/guardrails/defaults";
import { recordOrder } from "@/lib/orders/create";

export const POST = withBotApi("/api/v1/bot/merchant/checkout", async (request, { bot }) => {
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

  const parsed = unifiedCheckoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_error", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { profile_index, merchant_name, merchant_url, item_name, amount_cents, category, task_id, card_id } = parsed.data;

  let card;
  if (card_id) {
    card = await storage.getRail4CardByCardId(card_id);
    if (!card || card.botId !== bot.botId) {
      return NextResponse.json(
        { error: "card_not_found", message: "Card not found or not linked to this bot." },
        { status: 404 }
      );
    }
  } else {
    const botCards = await storage.getRail4CardsByBotId(bot.botId);
    const activeCards = botCards.filter(c => c.status === "active");
    if (activeCards.length === 0) {
      return NextResponse.json(
        { error: "card_not_active", message: "No active self-hosted card found for this bot." },
        { status: 403 }
      );
    }
    if (activeCards.length > 1) {
      return NextResponse.json(
        { error: "card_id_required", message: "This bot has multiple active cards. Specify card_id in your request.", cards: activeCards.map(c => ({ card_id: c.cardId, card_name: c.cardName })) },
        { status: 400 }
      );
    }
    card = activeCards[0];
  }

  if (!card || card.status !== "active") {
    return NextResponse.json(
      { error: "card_not_active", message: "Self-hosted card is not active for this bot." },
      { status: 403 }
    );
  }

  const rail4Guard = await storage.getRail4Guardrails(card.cardId);
  const cardRules = {
    maxPerTxCents: rail4Guard?.maxPerTxCents ?? GUARDRAIL_DEFAULTS.rail4.maxPerTxCents,
    dailyBudgetCents: rail4Guard?.dailyBudgetCents ?? GUARDRAIL_DEFAULTS.rail4.dailyBudgetCents,
    monthlyBudgetCents: rail4Guard?.monthlyBudgetCents ?? GUARDRAIL_DEFAULTS.rail4.monthlyBudgetCents,
    requireApprovalAbove: rail4Guard?.requireApprovalAbove ?? GUARDRAIL_DEFAULTS.rail4.requireApprovalAbove,
    autoPauseOnZero: rail4Guard?.autoPauseOnZero ?? GUARDRAIL_DEFAULTS.rail4.autoPauseOnZero,
  };

  const approvalMode = rail4Guard?.approvalMode ?? GUARDRAIL_DEFAULTS.rail4.approvalMode;

  let cardRequiresApproval = false;

  if (approvalMode === "ask_for_everything") {
    cardRequiresApproval = true;
  } else {
    const dailySpendCents = await storage.getRail4DailySpendCents(card.cardId);
    const monthlySpendCents = await storage.getRail4MonthlySpendCents(card.cardId);

    const cardDecision = evaluateCardGuardrails(
      cardRules,
      { amountCents: amount_cents },
      { dailyCents: dailySpendCents, monthlyCents: monthlySpendCents }
    );

    if (cardDecision.action === "block") {
      return NextResponse.json({
        approved: false,
        error: "card_guardrail_violation",
        message: cardDecision.reason,
      }, { status: 403 });
    }

    if (cardDecision.action === "require_approval") {
      cardRequiresApproval = true;
    }
  }

  const permissions: ProfilePermission[] = card.profilePermissions
    ? JSON.parse(card.profilePermissions)
    : [];
  const profilePerm = permissions.find(p => p.profile_index === profile_index);
  if (!profilePerm) {
    return NextResponse.json(
      { error: "invalid_profile", message: "No permissions found for this profile." },
      { status: 400 }
    );
  }

  const isRealProfile = profile_index === card.realProfileIndex;

  if (isRealProfile) {
    const masterDecision = await evaluateMasterGuardrails(card.ownerUid, centsToMicroUsdc(amount_cents));
    if (masterDecision.action === "block") {
      return NextResponse.json({
        approved: false,
        error: "master_budget_exceeded",
        profile_index,
        merchant_name,
        amount_usd: amount_cents / 100,
        message: masterDecision.reason,
      }, { status: 403 });
    }
  }

  const windowStart = getWindowStart(profilePerm.allowance_duration);
  const usage = await storage.getProfileAllowanceUsage(card.cardId, profile_index, windowStart);
  const currentSpent = usage?.spentCents || 0;
  const allowanceCents = Math.round(profilePerm.allowance_value * 100);

  if (currentSpent + amount_cents > allowanceCents) {
    return NextResponse.json({
      approved: false,
      error: "allowance_exceeded",
      profile_index,
      merchant_name,
      amount_usd: amount_cents / 100,
      allowance_usd: profilePerm.allowance_value,
      spent_usd: currentSpent / 100,
      remaining_usd: (allowanceCents - currentSpent) / 100,
      message: `This purchase would exceed the ${profilePerm.allowance_duration} allowance for this profile.`,
    }, { status: 403 });
  }

  if (isRealProfile) {
    return handleRealCheckout(bot, card, profilePerm, parsed.data, windowStart, usage, cardRequiresApproval);
  } else {
    return handleFakeCheckout(bot, card, profilePerm, parsed.data, windowStart, usage);
  }
});

async function handleFakeCheckout(
  bot: any,
  card: any,
  perm: ProfilePermission,
  data: { profile_index: number; merchant_name: string; merchant_url: string; item_name: string; amount_cents: number; category?: string; task_id?: string },
  windowStart: Date,
  usage: any,
) {
  const fakeProfiles: FakeProfile[] = JSON.parse(card.fakeProfilesJson);
  const fakeProfile = fakeProfiles.find(f => f.profileIndex === data.profile_index);
  if (!fakeProfile) {
    return NextResponse.json({ error: "profile_not_found" }, { status: 400 });
  }

  const confirmationId = "chk_" + randomBytes(6).toString("hex");

  if (data.task_id) {
    const eventId = parseInt(data.task_id.replace("task_", ""), 10);
    if (!isNaN(eventId)) {
      const completed = await completeObfuscationEvent(eventId);
      if (!completed) {
        await storage.createObfuscationEvent({
          cardId: card.cardId,
          botId: bot.botId,
          profileIndex: data.profile_index,
          merchantName: data.merchant_name,
          merchantSlug: data.merchant_url.replace("/merchant/", ""),
          itemName: data.item_name,
          amountCents: data.amount_cents,
          status: "completed",
          confirmationId,
          occurredAt: new Date(),
        });
        await incrementObfuscationCount(card.cardId);
      }
    }
  } else {
    await storage.createObfuscationEvent({
      cardId: card.cardId,
      botId: bot.botId,
      profileIndex: data.profile_index,
      merchantName: data.merchant_name,
      merchantSlug: data.merchant_url.replace("/merchant/", ""),
      itemName: data.item_name,
      amountCents: data.amount_cents,
      status: "completed",
      confirmationId,
      occurredAt: new Date(),
    });
    await incrementObfuscationCount(card.cardId);
  }

  await storage.upsertProfileAllowanceUsage(
    card.cardId,
    data.profile_index,
    windowStart,
    data.amount_cents,
    false,
  );

  return NextResponse.json({
    approved: true,
    missing_digits: fakeProfile.fakeMissingDigits,
    expiry_month: fakeProfile.fakeExpiryMonth,
    expiry_year: fakeProfile.fakeExpiryYear,
    confirmation_id: confirmationId,
    profile_index: data.profile_index,
    merchant_name: data.merchant_name,
    amount_usd: data.amount_cents / 100,
    message: "Checkout approved. Enter the provided card details to complete your purchase.",
  });
}

async function handleRealCheckout(
  bot: any,
  card: any,
  perm: ProfilePermission,
  data: { profile_index: number; merchant_name: string; merchant_url: string; item_name: string; amount_cents: number; category?: string },
  windowStart: Date,
  usage: any,
  cardRequiresApproval: boolean,
) {
  const wallet = await storage.getWalletByBotId(bot.botId);
  if (!wallet) {
    return NextResponse.json(
      { error: "no_wallet", message: "No wallet found for this bot." },
      { status: 404 }
    );
  }

  if (wallet.isFrozen) {
    fireWebhook(bot, "wallet.spend.declined", {
      reason: "wallet_frozen",
      amount_usd: data.amount_cents / 100,
      merchant: data.merchant_name,
    }).catch(() => {});
    if (bot.ownerUid) {
      notifySuspicious(bot.ownerUid, bot.ownerEmail, bot.botName, bot.botId, "Wallet is frozen", data.amount_cents, data.merchant_name).catch(() => {});
    }
    return NextResponse.json({
      approved: false,
      error: "wallet_frozen",
      profile_index: data.profile_index,
      merchant_name: data.merchant_name,
      amount_usd: data.amount_cents / 100,
      message: "This wallet is frozen by the owner.",
    }, { status: 403 });
  }

  if (wallet.balanceCents < data.amount_cents) {
    fireWebhook(bot, "wallet.spend.declined", {
      reason: "insufficient_funds",
      amount_usd: data.amount_cents / 100,
      balance_usd: wallet.balanceCents / 100,
      merchant: data.merchant_name,
    }).catch(() => {});
    return NextResponse.json({
      approved: false,
      error: "insufficient_funds",
      profile_index: data.profile_index,
      merchant_name: data.merchant_name,
      amount_usd: data.amount_cents / 100,
      balance_usd: wallet.balanceCents / 100,
      message: "Insufficient wallet balance.",
    }, { status: 402 });
  }

  const exemptLimitCents = Math.round(perm.confirmation_exempt_limit * 100);
  const exemptUsed = usage?.exemptUsed || false;
  let needsHumanConfirmation = false;

  if (cardRequiresApproval) {
    needsHumanConfirmation = true;
  } else if (perm.human_permission_required === "all") {
    needsHumanConfirmation = true;
  } else if (perm.human_permission_required === "above_exempt") {
    if (data.amount_cents <= exemptLimitCents && !exemptUsed) {
      needsHumanConfirmation = false;
    } else {
      needsHumanConfirmation = true;
    }
  }

  if (needsHumanConfirmation) {
    const { createHmac } = await import("crypto");
    const confirmationId = "chk_" + randomBytes(6).toString("hex");
    const hmacSecret = process.env.CONFIRMATION_HMAC_SECRET || process.env.CRON_SECRET;
    if (!hmacSecret) {
      console.error("CRITICAL: CONFIRMATION_HMAC_SECRET or CRON_SECRET must be set");
      return NextResponse.json({ error: "server_config_error", message: "Server is not properly configured for approvals." }, { status: 500 });
    }
    const hmacToken = createHmac("sha256", hmacSecret).update(confirmationId).digest("hex");
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await storage.createCheckoutConfirmation({
      confirmationId,
      cardId: card.cardId,
      botId: bot.botId,
      profileIndex: data.profile_index,
      amountCents: data.amount_cents,
      merchantName: data.merchant_name,
      merchantUrl: data.merchant_url,
      itemName: data.item_name,
      category: data.category || undefined,
      status: "pending",
      hmacToken,
      expiresAt,
    });

    if (bot.ownerUid) {
      const { createApproval } = await import("@/lib/approvals/service");
      createApproval({
        rail: "rail4",
        ownerUid: bot.ownerUid,
        ownerEmail: bot.ownerEmail,
        botName: bot.botName,
        amountDisplay: `$${(data.amount_cents / 100).toFixed(2)}`,
        amountRaw: data.amount_cents,
        merchantName: data.merchant_name,
        itemName: data.item_name,
        railRef: confirmationId,
        metadata: { cardId: card.cardId, profileIndex: data.profile_index, merchantUrl: data.merchant_url, category: data.category },
      }).catch((err: any) => {
        console.error("[Rail4] Unified approval email failed:", err);
      });

      const { notifyOwner } = await import("@/lib/notifications");
      notifyOwner({
        ownerUid: bot.ownerUid,
        ownerEmail: bot.ownerEmail,
        type: "purchase",
        title: `${bot.botName} needs purchase approval`,
        body: `${bot.botName} wants to spend $${(data.amount_cents / 100).toFixed(2)} at ${data.merchant_name} for "${data.item_name}". Check your email to approve or deny.`,
        botId: bot.botId,
      }).catch(() => {});
    }

    return NextResponse.json({
      approved: false,
      status: "pending_confirmation",
      confirmation_id: confirmationId,
      profile_index: data.profile_index,
      merchant_name: data.merchant_name,
      amount_usd: data.amount_cents / 100,
      expires_at: expiresAt.toISOString(),
      message: "This purchase requires owner approval. Poll /api/v1/bot/merchant/checkout/status to check the result.",
    }, { status: 202 });
  }

  const updated = await storage.debitWallet(wallet.id, data.amount_cents);
  if (!updated) {
    return NextResponse.json({
      approved: false,
      error: "debit_failed",
      message: "Failed to debit wallet.",
    }, { status: 409 });
  }

  const tx = await storage.createTransaction({
    walletId: wallet.id,
    type: "purchase",
    amountCents: data.amount_cents,
    description: `${data.merchant_name}: ${data.item_name}`,
    balanceAfter: updated.balanceCents,
  });

  const confirmationId = "chk_" + tx.id;

  const isExemptPurchase = perm.human_permission_required === "above_exempt"
    && data.amount_cents <= exemptLimitCents
    && !exemptUsed;

  await storage.upsertProfileAllowanceUsage(
    card.cardId,
    data.profile_index,
    windowStart,
    data.amount_cents,
    isExemptPurchase,
  );

  fireWebhook(bot, "wallet.spend.authorized", {
    transaction_id: tx.id,
    amount_usd: data.amount_cents / 100,
    merchant: data.merchant_name,
    category: data.category || undefined,
    new_balance_usd: updated.balanceCents / 100,
  }).catch(() => {});

  if (bot.ownerUid) {
    notifyPurchase(bot.ownerUid, bot.ownerEmail, bot.botName, bot.botId, data.amount_cents, data.merchant_name, updated.balanceCents).catch(() => {});
  }

  const LOW_BALANCE_THRESHOLD_CENTS = 500;
  if (updated.balanceCents < LOW_BALANCE_THRESHOLD_CENTS && updated.balanceCents + data.amount_cents >= LOW_BALANCE_THRESHOLD_CENTS) {
    fireWebhook(bot, "wallet.balance.low", {
      balance_usd: updated.balanceCents / 100,
      threshold_usd: LOW_BALANCE_THRESHOLD_CENTS / 100,
    }).catch(() => {});
    if (bot.ownerUid) {
      notifyBalanceLow(bot.ownerUid, bot.ownerEmail, bot.botName, bot.botId, updated.balanceCents).catch(() => {});
    }
  }

  await recordOrganicEvent(card.cardId);

  recordOrder({
    ownerUid: bot.ownerUid!,
    rail: "rail4",
    botId: bot.botId,
    botName: bot.botName,
    cardId: card.cardId,
    transactionId: tx.id,
    status: "completed",
    vendor: data.merchant_name,
    vendorDetails: { url: data.merchant_url, category: data.category || undefined },
    productName: data.item_name,
    priceCents: data.amount_cents,
    priceCurrency: "USD",
    metadata: { confirmationId, profileIndex: data.profile_index },
  }).catch((err) => {
    console.error("[Rail4] Failed to record order:", err);
  });

  return NextResponse.json({
    approved: true,
    missing_digits: card.missingDigitsValue,
    expiry_month: card.expiryMonth,
    expiry_year: card.expiryYear,
    confirmation_id: confirmationId,
    profile_index: data.profile_index,
    merchant_name: data.merchant_name,
    amount_usd: data.amount_cents / 100,
    message: "Checkout approved. Enter the provided card details to complete your purchase.",
  });
}
