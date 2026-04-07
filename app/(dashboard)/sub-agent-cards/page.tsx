"use client";

import { Lock } from "lucide-react";
import { CreditCardListPage, type CreditCardListPageConfig } from "@/components/wallet/credit-card-list-page";
import { normalizeRail5Card } from "@/components/wallet/types";

const config: CreditCardListPageConfig = {
  title: "Sub-Agent Cards",
  subtitle: "Encrypted cards for autonomous bot purchases. CreditClaw never sees your card — only the decryption key.",
  addButtonLabel: "Add New Card",
  emptyTitle: "No sub-agent cards yet.",
  emptySubtitle: "Click \"Add New Card\" above to get started.",
  apiEndpoint: "/api/v1/rail5/cards",
  railPrefix: "rail5",
  railId: "rail5",
  basePath: "/sub-agent-cards",
  approvalsEndpoint: "/api/v1/approvals?rail=rail5",
  approvalsDecideEndpoint: "/api/v1/approvals/decide",
  normalizeCards: (data: any) => (data.cards || []).map((c: any) => normalizeRail5Card(c, "/sub-agent-cards")),
  explainer: (
    <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl border border-purple-100 p-6" data-testid="card-rail5-explainer">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
          <Lock className="w-5 h-5 text-purple-600" />
        </div>
        <div>
          <h3 className="font-bold text-neutral-900 mb-1">How Sub-Agent Cards Work</h3>
          <p className="text-sm text-neutral-600 leading-relaxed">
            Your card details are encrypted in your browser and saved as a file. CreditClaw only stores the decryption key.
            At checkout, a disposable sub-agent gets the key, decrypts the file, completes the purchase, and is immediately deleted —
            so no agent ever retains your card details.
          </p>
        </div>
      </div>
    </div>
  ),
  setupWizardHref: "/setup/rail5",
  supportsBotLinking: true,
};

export default function SubAgentCardsPage() {
  return <CreditCardListPage config={config} />;
}
