"use client";

import { Shield } from "lucide-react";
import { Rail4SetupWizard } from "@/components/dashboard/rail4-setup-wizard";
import { CreditCardListPage, type CreditCardListPageConfig } from "@/components/wallet/credit-card-list-page";
import { normalizeRail4Card } from "@/components/wallet/types";

const config: CreditCardListPageConfig = {
  title: "Self-Hosted Cards",
  subtitle: "Use your own card with split-knowledge security. Neither your bot nor CreditClaw ever holds the full card number.",
  addButtonLabel: "Add New Card",
  emptyTitle: "No self-hosted cards yet.",
  emptySubtitle: "Click \"Add New Card\" above to get started.",
  apiEndpoint: "/api/v1/rail4/cards",
  railPrefix: "rail4",
  basePath: "/self-hosted",
  normalizeCards: (data: any) => (data.cards || []).map((c: any) => normalizeRail4Card(c, "/self-hosted")),
  explainer: (
    <div className="bg-gradient-to-r from-primary/5 to-purple-50 rounded-2xl border border-primary/10 p-6" data-testid="card-rail4-explainer">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Shield className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-bold text-neutral-900 mb-1">How Split-Knowledge Works</h3>
          <p className="text-sm text-neutral-600 leading-relaxed">
            Your card number is split across a payment profiles file with fake profiles. Only you know which profile is real,
            and 3 digits are never stored — you enter them during setup. CreditClaw uses obfuscation purchases
            across fake profiles to mask your real transactions.
          </p>
        </div>
      </div>
    </div>
  ),
  setupWizard: ({ open, onOpenChange, onComplete }) => (
    <Rail4SetupWizard open={open} onOpenChange={onOpenChange} onComplete={onComplete} />
  ),
  supportsBotLinking: false,
};

export default function SelfHostedPage() {
  return <CreditCardListPage config={config} />;
}
