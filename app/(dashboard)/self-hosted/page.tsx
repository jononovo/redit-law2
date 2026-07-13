"use client";

import { Lock } from "lucide-react";
import { CreditCardListPage, type CreditCardListPageConfig } from "@/components/wallet/credit-card-list-page";
import { normalizeRail5Card } from "@/components/wallet/types";

const config: CreditCardListPageConfig = {
  title: "Self-hosted Cards",
  addButtonLabel: "Add New Card",
  emptyTitle: "No self-hosted cards yet.",
  emptySubtitle: "Click \"Add New Card\" above to get started.",
  apiEndpoint: "/api/v1/rail5/cards",
  railPrefix: "rail5",
  railId: "rail5",
  basePath: "/self-hosted",
  approvalsEndpoint: "/api/v1/approvals?rail=rail5",
  approvalsDecideEndpoint: "/api/v1/approvals/decide",
  normalizeCards: (data: any) => (data.cards || []).map((c: any) => normalizeRail5Card(c, "/self-hosted")),
  explainer: {
    title: "How self-hosted cards work",
    icon: <Lock className="w-5 h-5 text-purple-600" />,
    containerClassName: "bg-gradient-to-r from-purple-50 to-blue-50 border-purple-100",
    iconWrapClassName: "bg-purple-100",
    testId: "card-rail5-explainer",
    body: (
      <>
        Your card details are encrypted in your browser and saved as a file. CreditClaw only stores the decryption key.
        At checkout, a disposable sub-agent gets the key, decrypts the file, completes the purchase, and is immediately deleted —
        so no agent ever retains your card details.
      </>
    ),
  },
  setupWizardHref: "/setup/rail5",
  supportsBotLinking: true,
};

export default function SubAgentCardsPage() {
  return <CreditCardListPage config={config} />;
}
