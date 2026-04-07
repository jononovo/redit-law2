import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { storage } from "@/server/storage";
import { upsertMasterGuardrailsSchema } from "@/shared/schema";
import { microUsdcToUsd } from "@/lib/guardrails/master";
import { GUARDRAIL_DEFAULTS } from "@/lib/guardrails/defaults";

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const config = await storage.getMasterGuardrails(user.uid);
    const dailySpend = await storage.getMasterDailySpend(user.uid);
    const monthlySpend = await storage.getMasterMonthlySpend(user.uid);

    return NextResponse.json({
      config: config ? {
        max_per_tx_usdc: config.maxPerTxUsdc,
        daily_budget_usdc: config.dailyBudgetUsdc,
        monthly_budget_usdc: config.monthlyBudgetUsdc,
        approval_mode: config.approvalMode,
        require_approval_above: config.requireApprovalAbove,
        enabled: config.enabled,
      } : {
        max_per_tx_usdc: GUARDRAIL_DEFAULTS.master.maxPerTxUsdc,
        daily_budget_usdc: GUARDRAIL_DEFAULTS.master.dailyBudgetUsdc,
        monthly_budget_usdc: GUARDRAIL_DEFAULTS.master.monthlyBudgetUsdc,
        approval_mode: GUARDRAIL_DEFAULTS.master.approvalMode,
        require_approval_above: GUARDRAIL_DEFAULTS.master.requireApprovalAbove,
        enabled: false,
      },
      spend: {
        daily: {
          rail1_usd: microUsdcToUsd(dailySpend.rail1),
          rail2_usd: microUsdcToUsd(dailySpend.rail2),
          rail5_usd: microUsdcToUsd(dailySpend.rail5),
          total_usd: microUsdcToUsd(dailySpend.total),
        },
        monthly: {
          rail1_usd: microUsdcToUsd(monthlySpend.rail1),
          rail2_usd: microUsdcToUsd(monthlySpend.rail2),
          rail5_usd: microUsdcToUsd(monthlySpend.rail5),
          total_usd: microUsdcToUsd(monthlySpend.total),
        },
      },
    });
  } catch (error) {
    console.error("GET /api/v1/master-guardrails error:", error);
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
    const parsed = upsertMasterGuardrailsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    if (parsed.data.max_per_tx_usdc !== undefined) data.maxPerTxUsdc = parsed.data.max_per_tx_usdc;
    if (parsed.data.daily_budget_usdc !== undefined) data.dailyBudgetUsdc = parsed.data.daily_budget_usdc;
    if (parsed.data.monthly_budget_usdc !== undefined) data.monthlyBudgetUsdc = parsed.data.monthly_budget_usdc;
    if (parsed.data.approval_mode !== undefined) data.approvalMode = parsed.data.approval_mode;
    if (parsed.data.require_approval_above !== undefined) data.requireApprovalAbove = parsed.data.require_approval_above;
    if (parsed.data.enabled !== undefined) data.enabled = parsed.data.enabled;

    const config = await storage.upsertMasterGuardrails(user.uid, data);

    return NextResponse.json({
      config: {
        max_per_tx_usdc: config.maxPerTxUsdc,
        daily_budget_usdc: config.dailyBudgetUsdc,
        monthly_budget_usdc: config.monthlyBudgetUsdc,
        approval_mode: config.approvalMode,
        require_approval_above: config.requireApprovalAbove,
        enabled: config.enabled,
      },
    });
  } catch (error) {
    console.error("POST /api/v1/master-guardrails error:", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
