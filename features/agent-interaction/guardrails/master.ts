import { storage } from "@/server/storage";
import { evaluateGuardrails } from "./evaluate";
import type { GuardrailDecision } from "./types";

export function centsToMicroUsdc(cents: number): number {
  return cents * 10_000;
}

export function microUsdcToUsd(microUsdc: number): number {
  return microUsdc / 1_000_000;
}

export type MasterGuardrailDecision =
  | { action: "allow" }
  | { action: "block"; reason: string }
  | { action: "skip"; reason: string };

export async function evaluateMasterGuardrails(
  ownerUid: string | null | undefined,
  amountMicroUsdc: number,
): Promise<MasterGuardrailDecision> {
  if (!ownerUid) {
    return { action: "skip", reason: "No ownerUid — bot not claimed" };
  }

  const config = await storage.getMasterGuardrails(ownerUid);
  if (!config || !config.enabled) {
    return { action: "skip", reason: "Master guardrails not configured or disabled" };
  }

  const dailySpend = await storage.getMasterDailySpend(ownerUid);
  const monthlySpend = await storage.getMasterMonthlySpend(ownerUid);

  const decision: GuardrailDecision = evaluateGuardrails(
    {
      maxPerTxUsdc: config.maxPerTxUsdc,
      dailyBudgetUsdc: config.dailyBudgetUsdc,
      monthlyBudgetUsdc: config.monthlyBudgetUsdc,
      requireApprovalAbove: null,
      autoPauseOnZero: false,
    },
    { amountUsdc: amountMicroUsdc },
    { dailyUsdc: dailySpend.total, monthlyUsdc: monthlySpend.total },
  );

  if (decision.action === "require_approval") {
    return { action: "allow" };
  }

  if (decision.action === "block") {
    return { action: "block", reason: `Master budget: ${decision.reason}` };
  }

  return { action: "allow" };
}
