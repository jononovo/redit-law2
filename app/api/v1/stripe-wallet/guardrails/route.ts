import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { storage } from "@/server/storage";
import { setPrivyGuardrailsSchema } from "@/shared/schema";

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const walletId = request.nextUrl.searchParams.get("wallet_id");
    if (!walletId) {
      return NextResponse.json({ error: "wallet_id is required" }, { status: 400 });
    }

    const wallet = await storage.privyGetWalletById(Number(walletId));
    if (!wallet || wallet.ownerUid !== user.uid) {
      return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
    }

    const [guardrails, procControls] = await Promise.all([
      storage.privyGetGuardrails(wallet.id),
      storage.getProcurementControlsByScope(user.uid, "rail1"),
    ]);

    return NextResponse.json({
      guardrails: guardrails ? {
        ...guardrails,
        allowlistedDomains: procControls?.allowlistedDomains ?? [],
        blocklistedDomains: procControls?.blocklistedDomains ?? [],
      } : null,
    });
  } catch (error) {
    console.error("GET /api/v1/stripe-wallet/guardrails error:", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = setPrivyGuardrailsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
    }

    const { wallet_id, ...guardrailData } = parsed.data;

    const wallet = await storage.privyGetWalletById(wallet_id);
    if (!wallet || wallet.ownerUid !== user.uid) {
      return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = { updatedBy: user.uid };
    if (guardrailData.max_per_tx_usdc !== undefined) updateData.maxPerTxUsdc = guardrailData.max_per_tx_usdc;
    if (guardrailData.daily_budget_usdc !== undefined) updateData.dailyBudgetUsdc = guardrailData.daily_budget_usdc;
    if (guardrailData.monthly_budget_usdc !== undefined) updateData.monthlyBudgetUsdc = guardrailData.monthly_budget_usdc;
    if (guardrailData.require_approval_above !== undefined) updateData.requireApprovalAbove = guardrailData.require_approval_above;
    if (guardrailData.approval_mode !== undefined) updateData.approvalMode = guardrailData.approval_mode;
    if (guardrailData.recurring_allowed !== undefined) updateData.recurringAllowed = guardrailData.recurring_allowed;
    if (guardrailData.auto_pause_on_zero !== undefined) updateData.autoPauseOnZero = guardrailData.auto_pause_on_zero;
    if (guardrailData.notes !== undefined) updateData.notes = guardrailData.notes;

    const guardrails = await storage.privyUpsertGuardrails(wallet_id, updateData);
    return NextResponse.json({ guardrails });
  } catch (error) {
    console.error("POST /api/v1/stripe-wallet/guardrails error:", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
