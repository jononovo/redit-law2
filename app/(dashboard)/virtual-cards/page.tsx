"use client";

import { CreditCard } from "lucide-react";
import { CreditCardListPage, type CreditCardListPageConfig } from "@/components/wallet/credit-card-list-page";
import { normalizeRail3Card, type Rail3CardInfo } from "@/components/wallet/types";

const config: CreditCardListPageConfig = {
  title: "Virtual Cards",
  subtitle: "Cards your agent can use at any online merchant. Powered by Crossmint.",
  addButtonLabel: "Add Virtual Card",
  emptyTitle: "No virtual cards yet",
  emptySubtitle: "Save a card so your agent can check out at any online merchant.",
  apiEndpoint: "/api/v1/rail3/cards",
  railPrefix: "rail3",
  railId: "rail3",
  basePath: "/virtual-cards",
  approvalsEndpoint: "/api/v1/approvals?rail=rail3",
  approvalsDecideEndpoint: "/api/v1/approvals/decide",
  transactionsEndpoint: "/api/v1/rail3/transactions",
  normalizeCards: (data: any) => (data.cards || []).map((c: Rail3CardInfo) => normalizeRail3Card(c, "/virtual-cards")),
  explainer: (
    <div className="bg-gradient-to-r from-orange-50 to-blue-50 rounded-2xl border border-orange-100 p-6" data-testid="card-rail3-explainer">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0">
          <CreditCard className="w-5 h-5 text-orange-600" />
        </div>
        <div>
          <h3 className="font-bold text-neutral-900 mb-1">How Virtual Cards Work</h3>
          <p className="text-sm text-neutral-600 leading-relaxed">
            Save your own Visa or Mastercard once. Crossmint vaults it and issues a one-time, merchant-locked card number for every agent purchase —
            so your real card number never leaves the vault and a leaked number can only ever charge that one merchant for that one transaction.
            You set the spending limits; Crossmint enforces them at the network level.
          </p>
        </div>
      </div>
    </div>
  ),
  setupWizardHref: "/setup/rail3",
  supportsBotLinking: true,
};

export default function VirtualCardsPage() {
  return <CreditCardListPage config={config} />;
}
