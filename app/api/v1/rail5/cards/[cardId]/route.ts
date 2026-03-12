import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { storage } from "@/server/storage";
import { fireRailsUpdated } from "@/lib/webhooks";
import { z } from "zod";

const patchSchema = z.object({
  card_name: z.string().min(1).max(200).optional(),
  bot_id: z.string().min(1).max(200).nullable().optional(),
  spending_limit_cents: z.number().int().min(100).max(10000000).optional(),
  daily_limit_cents: z.number().int().min(100).max(10000000).optional(),
  monthly_limit_cents: z.number().int().min(100).max(100000000).optional(),
  human_approval_above_cents: z.number().int().min(0).max(10000000).optional(),
  approval_mode: z.enum(["ask_for_everything", "auto_approve_under_threshold", "auto_approve_by_category"]).optional(),
  recurring_allowed: z.boolean().optional(),
  notes: z.string().max(2000).nullable().optional(),
  status: z.enum(["active", "frozen"]).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ cardId: string }> }
) {
  const user = await getSessionUser(request);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { cardId } = await params;

  const card = await storage.getRail5CardByCardId(cardId);
  if (!card) {
    return NextResponse.json({ error: "card_not_found" }, { status: 404 });
  }

  if (card.ownerUid !== user.uid) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_error", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const updates: Record<string, unknown> = {};
  const data = parsed.data;

  if (data.card_name !== undefined) updates.cardName = data.card_name;
  if (data.bot_id !== undefined) updates.botId = data.bot_id;
  const guardrailUpdates: Record<string, unknown> = {};
  if (data.spending_limit_cents !== undefined) guardrailUpdates.maxPerTxCents = data.spending_limit_cents;
  if (data.daily_limit_cents !== undefined) guardrailUpdates.dailyBudgetCents = data.daily_limit_cents;
  if (data.monthly_limit_cents !== undefined) guardrailUpdates.monthlyBudgetCents = data.monthly_limit_cents;
  if (data.human_approval_above_cents !== undefined) guardrailUpdates.requireApprovalAbove = data.human_approval_above_cents;
  if (data.approval_mode !== undefined) guardrailUpdates.approvalMode = data.approval_mode;
  if (data.recurring_allowed !== undefined) guardrailUpdates.recurringAllowed = data.recurring_allowed;
  if (data.notes !== undefined) guardrailUpdates.notes = data.notes;

  if (data.status !== undefined) {
    if (card.status === "pending_setup" || card.status === "pending_delivery") {
      return NextResponse.json({ error: "cannot_change_status", message: "Card must be set up and delivered before changing status." }, { status: 400 });
    }
    if (data.status === "active" && card.status === "frozen") {
      const checkouts = await storage.getRail5CheckoutsByCardId(cardId, 50);
      const hasCompleted = checkouts.some((c) => c.status === "completed");
      updates.status = hasCompleted ? "active" : "confirmed";
    } else {
      updates.status = data.status;
    }
  }

  if (Object.keys(updates).length === 0 && Object.keys(guardrailUpdates).length === 0) {
    return NextResponse.json({ error: "no_updates", message: "No valid fields to update." }, { status: 400 });
  }

  const updated = Object.keys(updates).length > 0
    ? await storage.updateRail5Card(cardId, updates)
    : card;

  if (Object.keys(guardrailUpdates).length > 0) {
    await storage.upsertRail5Guardrails(cardId, guardrailUpdates);
  }

  if (data.bot_id !== undefined) {
    const targetBotId = data.bot_id || card.botId;
    if (targetBotId) {
      const bot = await storage.getBotByBotId(targetBotId);
      if (bot) {
        const action = data.bot_id ? "card_linked" as const : "card_removed" as const;
        fireRailsUpdated(bot, action, "rail5", { card_id: cardId }).catch(() => {});
      }
    }
  }

  if (data.status !== undefined && (data.status === "frozen" || data.status === "active")) {
    const botId = updated!.botId;
    if (botId) {
      const bot = await storage.getBotByBotId(botId);
      if (bot) {
        const action = data.status === "frozen" ? "card_frozen" as const : "card_unfrozen" as const;
        fireRailsUpdated(bot, action, "rail5", { card_id: cardId }).catch(() => {});
      }
    }
  }

  const guard = await storage.getRail5Guardrails(cardId);
  const { GUARDRAIL_DEFAULTS } = await import("@/lib/guardrails/defaults");

  return NextResponse.json({
    card_id: updated!.cardId,
    card_name: updated!.cardName,
    card_brand: updated!.cardBrand,
    card_last4: updated!.cardLast4,
    status: updated!.status,
    bot_id: updated!.botId || null,
    spending_limit_cents: guard?.maxPerTxCents ?? GUARDRAIL_DEFAULTS.rail5.maxPerTxCents,
    daily_limit_cents: guard?.dailyBudgetCents ?? GUARDRAIL_DEFAULTS.rail5.dailyBudgetCents,
    monthly_limit_cents: guard?.monthlyBudgetCents ?? GUARDRAIL_DEFAULTS.rail5.monthlyBudgetCents,
    human_approval_above_cents: guard?.requireApprovalAbove ?? GUARDRAIL_DEFAULTS.rail5.requireApprovalAbove,
    approval_mode: guard?.approvalMode ?? GUARDRAIL_DEFAULTS.rail5.approvalMode,
    recurring_allowed: guard?.recurringAllowed ?? GUARDRAIL_DEFAULTS.rail5.recurringAllowed,
    notes: guard?.notes ?? null,
    created_at: updated!.createdAt.toISOString(),
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ cardId: string }> }
) {
  const user = await getSessionUser(request);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { cardId } = await params;

  const card = await storage.getRail5CardByCardId(cardId);
  if (!card) {
    return NextResponse.json({ error: "card_not_found" }, { status: 404 });
  }

  if (card.ownerUid !== user.uid) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const checkouts = await storage.getRail5CheckoutsByCardId(card.cardId, 50);

  const guard = await storage.getRail5Guardrails(card.cardId);
  const { GUARDRAIL_DEFAULTS } = await import("@/lib/guardrails/defaults");

  return NextResponse.json({
    card_id: card.cardId,
    card_name: card.cardName,
    card_brand: card.cardBrand,
    card_last4: card.cardLast4,
    status: card.status,
    bot_id: card.botId || null,
    spending_limit_cents: guard?.maxPerTxCents ?? GUARDRAIL_DEFAULTS.rail5.maxPerTxCents,
    daily_limit_cents: guard?.dailyBudgetCents ?? GUARDRAIL_DEFAULTS.rail5.dailyBudgetCents,
    monthly_limit_cents: guard?.monthlyBudgetCents ?? GUARDRAIL_DEFAULTS.rail5.monthlyBudgetCents,
    human_approval_above_cents: guard?.requireApprovalAbove ?? GUARDRAIL_DEFAULTS.rail5.requireApprovalAbove,
    approval_mode: guard?.approvalMode ?? GUARDRAIL_DEFAULTS.rail5.approvalMode,
    recurring_allowed: guard?.recurringAllowed ?? GUARDRAIL_DEFAULTS.rail5.recurringAllowed,
    notes: guard?.notes ?? null,
    created_at: card.createdAt.toISOString(),
    checkouts: checkouts.map((c) => ({
      checkout_id: c.checkoutId,
      merchant_name: c.merchantName,
      item_name: c.itemName,
      amount_cents: c.amountCents,
      status: c.status,
      key_delivered: c.keyDelivered,
      confirmed_at: c.confirmedAt?.toISOString() || null,
      created_at: c.createdAt.toISOString(),
    })),
  });
}
