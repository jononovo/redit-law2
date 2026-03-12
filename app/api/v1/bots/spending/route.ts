import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { storage } from "@/server/storage";
import { GUARDRAIL_DEFAULTS, PROCUREMENT_DEFAULTS } from "@/lib/guardrails/defaults";
import { upsertRail4GuardrailsSchema } from "@/shared/schema";

export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const botId = searchParams.get("bot_id");
    if (!botId) {
      return NextResponse.json({ error: "bot_id is required" }, { status: 400 });
    }

    const bot = await storage.getBotByBotId(botId);
    if (!bot || bot.ownerUid !== session.uid) {
      return NextResponse.json({ error: "Bot not found" }, { status: 404 });
    }

    const rail4Cards = await storage.getRail4CardsByBotId(botId);
    const activeCard = rail4Cards.find(c => c.status === "active");

    let guardrailData;
    if (activeCard) {
      const guard = await storage.getRail4Guardrails(activeCard.cardId);
      guardrailData = {
        card_id: activeCard.cardId,
        approval_mode: guard?.approvalMode ?? GUARDRAIL_DEFAULTS.rail4.approvalMode,
        per_transaction_usd: (guard?.maxPerTxCents ?? GUARDRAIL_DEFAULTS.rail4.maxPerTxCents) / 100,
        daily_usd: (guard?.dailyBudgetCents ?? GUARDRAIL_DEFAULTS.rail4.dailyBudgetCents) / 100,
        monthly_usd: (guard?.monthlyBudgetCents ?? GUARDRAIL_DEFAULTS.rail4.monthlyBudgetCents) / 100,
        ask_approval_above_usd: ((guard?.requireApprovalAbove ?? GUARDRAIL_DEFAULTS.rail4.requireApprovalAbove) ?? 500) / 100,
        recurring_allowed: guard?.recurringAllowed ?? GUARDRAIL_DEFAULTS.rail4.recurringAllowed,
        notes: guard?.notes ?? null,
      };
    } else {
      guardrailData = {
        card_id: null,
        approval_mode: GUARDRAIL_DEFAULTS.rail4.approvalMode,
        per_transaction_usd: GUARDRAIL_DEFAULTS.rail4.maxPerTxCents / 100,
        daily_usd: GUARDRAIL_DEFAULTS.rail4.dailyBudgetCents / 100,
        monthly_usd: GUARDRAIL_DEFAULTS.rail4.monthlyBudgetCents / 100,
        ask_approval_above_usd: (GUARDRAIL_DEFAULTS.rail4.requireApprovalAbove ?? 500) / 100,
        recurring_allowed: GUARDRAIL_DEFAULTS.rail4.recurringAllowed,
        notes: null,
      };
    }

    const procRules = await storage.getProcurementControlsByScope(session.uid, "rail4", null);

    return NextResponse.json({
      bot_id: botId,
      ...guardrailData,
      approved_categories: (procRules?.allowlistedCategories as string[]) || [],
      blocked_categories: (procRules?.blocklistedCategories as string[]) || PROCUREMENT_DEFAULTS.blockedCategories,
    });
  } catch (error: any) {
    console.error("Get spending permissions failed:", error?.message || error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const botId = body.bot_id;
    if (!botId) {
      return NextResponse.json({ error: "bot_id is required" }, { status: 400 });
    }

    const bot = await storage.getBotByBotId(botId);
    if (!bot || bot.ownerUid !== session.uid) {
      return NextResponse.json({ error: "Bot not found" }, { status: 404 });
    }

    const rail4Cards = await storage.getRail4CardsByBotId(botId);
    const activeCard = rail4Cards.find(c => c.status === "active");
    if (!activeCard) {
      return NextResponse.json({ error: "No active Rail 4 card for this bot" }, { status: 404 });
    }

    const guardData: Record<string, any> = {};
    if (body.approval_mode !== undefined) guardData.approvalMode = body.approval_mode;
    if (body.per_transaction_usd !== undefined) guardData.maxPerTxCents = Math.round(body.per_transaction_usd * 100);
    if (body.daily_usd !== undefined) guardData.dailyBudgetCents = Math.round(body.daily_usd * 100);
    if (body.monthly_usd !== undefined) guardData.monthlyBudgetCents = Math.round(body.monthly_usd * 100);
    if (body.ask_approval_above_usd !== undefined) guardData.requireApprovalAbove = Math.round(body.ask_approval_above_usd * 100);
    if (body.recurring_allowed !== undefined) guardData.recurringAllowed = body.recurring_allowed;
    if (body.notes !== undefined) guardData.notes = body.notes;

    const updated = await storage.upsertRail4Guardrails(activeCard.cardId, guardData);

    if (body.approved_categories !== undefined || body.blocked_categories !== undefined) {
      const procData: Record<string, any> = {};
      if (body.approved_categories !== undefined) procData.allowlistedCategories = body.approved_categories;
      if (body.blocked_categories !== undefined) procData.blocklistedCategories = body.blocked_categories;
      await storage.upsertProcurementControls(session.uid, "rail4", null, procData);
    }

    const procRules = await storage.getProcurementControlsByScope(session.uid, "rail4", null);

    return NextResponse.json({
      bot_id: botId,
      card_id: activeCard.cardId,
      approval_mode: updated.approvalMode,
      per_transaction_usd: updated.maxPerTxCents / 100,
      daily_usd: updated.dailyBudgetCents / 100,
      monthly_usd: updated.monthlyBudgetCents / 100,
      ask_approval_above_usd: (updated.requireApprovalAbove ?? 500) / 100,
      approved_categories: (procRules?.allowlistedCategories as string[]) || [],
      blocked_categories: (procRules?.blocklistedCategories as string[]) || PROCUREMENT_DEFAULTS.blockedCategories,
      recurring_allowed: updated.recurringAllowed,
      notes: updated.notes,
    });
  } catch (error: any) {
    console.error("Update spending permissions failed:", error?.message || error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
