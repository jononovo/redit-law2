"use client";

import { useCallback, useEffect, useState } from "react";
import { CreditCard } from "lucide-react";
import { CreditCardListPage, type CreditCardListPageConfig } from "@/components/wallet/credit-card-list-page";
import { normalizeRail3Card, type Rail3CardInfo, type Rail3PaymentMethodInfo } from "@/components/wallet/types";
import { authFetch } from "@/features/platform-management/auth-fetch";
import { useAuth } from "@/features/platform-management/auth/auth-context";
import { PaymentMethodsStrip } from "@/components/wallet/rail3/payment-methods-strip";
import { AddCardDialog } from "@/components/wallet/rail3/add-card-dialog";
import { Rail3SyncButton } from "@/components/wallet/rail3/sync-button";

export default function VirtualCardsPage() {
  const { user } = useAuth();
  const [paymentMethods, setPaymentMethods] = useState<Rail3PaymentMethodInfo[]>([]);
  const [pmLoading, setPmLoading] = useState(true);
  const [cardListRefreshKey, setCardListRefreshKey] = useState(0);

  const fetchPaymentMethods = useCallback(async () => {
    try {
      const res = await authFetch("/api/v1/rail3/payment-methods");
      if (!res.ok) return;
      const json = await res.json();
      setPaymentMethods(json.payment_methods || []);
    } finally {
      setPmLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchPaymentMethods();
  }, [user, fetchPaymentMethods]);

  const config: CreditCardListPageConfig = {
    title: "Virtual Cards",
    subtitle: "Cards your agent can use at any online merchant. Powered by Crossmint.",
    addButtonLabel: "Add Virtual Card",
    emptyTitle: "No virtual cards yet",
    emptySubtitle: paymentMethods.length === 0
      ? "Save a real card first, then create a virtual card on top of it."
      : "Create a virtual card on one of your saved real cards.",
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
              Save your own Visa or Mastercard once. Crossmint vaults it, then issues a one-time, merchant-locked card number for every agent purchase.
              Create as many virtual cards as you want on top of one real card — each is a separate spending permission you can tune per agent or per category.
            </p>
          </div>
        </div>
      </div>
    ),
    headerSection: (
      <div className="space-y-4">
        <div className="flex justify-end">
          <Rail3SyncButton
            onSynced={() => {
              fetchPaymentMethods();
              setCardListRefreshKey((k) => k + 1);
            }}
          />
        </div>
        <PaymentMethodsStrip
          paymentMethods={paymentMethods}
          loading={pmLoading}
          onChange={fetchPaymentMethods}
        />
      </div>
    ),
    refreshKey: cardListRefreshKey,
    setupWizard: ({ open, onOpenChange, onComplete }) => (
      <AddCardDialog
        open={open}
        onOpenChange={onOpenChange}
        paymentMethods={paymentMethods}
        onComplete={() => { onComplete(); fetchPaymentMethods(); }}
      />
    ),
    supportsBotLinking: true,
  };

  return <CreditCardListPage config={config} />;
}
