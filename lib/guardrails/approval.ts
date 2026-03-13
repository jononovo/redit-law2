import { storage } from "@/server/storage";
import { GUARDRAIL_DEFAULTS } from "./defaults";

export type ApprovalDecision =
  | { action: "allow"; reason: string }
  | { action: "require_approval"; reason: string }
  | { action: "block"; reason: string };

export async function evaluateApprovalDecision(
  ownerUid: string,
  amountCents: number,
): Promise<ApprovalDecision> {
  const config = await storage.getMasterGuardrails(ownerUid);

  const approvalMode = config?.approvalMode ?? GUARDRAIL_DEFAULTS.master.approvalMode;
  const requireApprovalAbove = config?.requireApprovalAbove ?? GUARDRAIL_DEFAULTS.master.requireApprovalAbove;

  if (approvalMode === "ask_for_everything") {
    return { action: "require_approval", reason: "Owner requires approval for all transactions." };
  }

  if (approvalMode === "auto_approve_under_threshold") {
    if (requireApprovalAbove !== null && requireApprovalAbove !== undefined) {
      if (amountCents >= requireApprovalAbove) {
        return {
          action: "require_approval",
          reason: `Amount $${(amountCents / 100).toFixed(2)} exceeds approval threshold of $${(requireApprovalAbove / 100).toFixed(2)}.`,
        };
      }
    }
    return { action: "allow", reason: "Amount is below approval threshold." };
  }

  return { action: "allow", reason: "Approval mode allows this transaction." };
}
