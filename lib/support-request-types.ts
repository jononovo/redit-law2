export type FeedbackRequestType = "bug" | "feature" | "billing" | "technical" | "general";

export const feedbackRequestTypeLabels: Record<FeedbackRequestType, string> = {
  bug: "Bug Report",
  feature: "Feature Request",
  billing: "Billing Question",
  technical: "Technical Support",
  general: "General Feedback",
};

export const supportRequestTypesByFeedbackType: Record<
  FeedbackRequestType,
  { id: string; label: string }[]
> = {
  bug: [
    { id: "payments_cards", label: "Payments & cards" },
    { id: "wallets_balances", label: "Wallets & balances" },
    { id: "agent_connection", label: "Agent connection / webhooks" },
    { id: "dashboard_ui", label: "Dashboard UI" },
    { id: "onboarding_signin", label: "Onboarding & sign-in" },
    { id: "other", label: "Other" },
  ],
  feature: [
    { id: "new_payment_rail", label: "New payment rail" },
    { id: "agent_integrations", label: "Agent integrations" },
    { id: "spending_controls", label: "Spending controls" },
    { id: "dashboard_tools", label: "Dashboard tools" },
    { id: "notifications", label: "Notifications" },
    { id: "other", label: "Other" },
  ],
  billing: [
    { id: "charges_fees", label: "Charges & fees" },
    { id: "refunds", label: "Refunds" },
    { id: "limits", label: "Limits" },
    { id: "statements_invoices", label: "Statements & invoices" },
    { id: "account_plan", label: "Account / plan" },
    { id: "other", label: "Other" },
  ],
  technical: [
    { id: "agent_setup", label: "Setting up my agent" },
    { id: "claiming_pairing", label: "Claiming / pairing" },
    { id: "virtual_cards", label: "Virtual cards" },
    { id: "usdc_wallet", label: "USDC wallet" },
    { id: "api_skills", label: "API & skills" },
    { id: "other", label: "Other" },
  ],
  general: [
    { id: "praise", label: "Praise" },
    { id: "design_ux", label: "Design / UX" },
    { id: "copy_clarity", label: "Copy & clarity" },
    { id: "missing_capability", label: "Missing capability" },
    { id: "confusing_flow", label: "Confusing flow" },
    { id: "other", label: "Other" },
  ],
};

export function supportRequestTypeLabel(
  requestType: FeedbackRequestType,
  supportRequestTypeId: string
): string | null {
  const match = supportRequestTypesByFeedbackType[requestType]?.find(
    (entry) => entry.id === supportRequestTypeId
  );
  return match ? match.label : null;
}
