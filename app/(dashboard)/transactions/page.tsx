"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { RailPageTabs } from "@/components/wallet/rail-page-tabs";
import { OrdersPanel } from "@/components/wallet/orders-panel";
import { GuardrailsWizardDialog } from "@/components/onboarding/guardrails-wizard-dialog";
import { ApprovalHistoryPanel } from "@/components/wallet/approval-history-panel";

const VALID_TABS = ["orders", "approvals"];

export default function TransactionsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get("tab");
  const initialTab = tabParam && VALID_TABS.includes(tabParam) ? tabParam : "orders";
  const [activeTab, setActiveTab] = useState(initialTab);
  const [guardrailsOpen, setGuardrailsOpen] = useState(false);

  useEffect(() => {
    const tab = searchParams.get("tab");
    const nextTab = tab && VALID_TABS.includes(tab) ? tab : "orders";
    if (nextTab !== activeTab) {
      setActiveTab(nextTab);
    }
  }, [searchParams]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "orders") {
      params.delete("tab");
    } else {
      params.set("tab", tab);
    }
    const query = params.toString();
    router.replace(`/transactions${query ? `?${query}` : ""}`, { scroll: false });
  };

  return (
    <div className="flex flex-col gap-8 animate-fade-in-up">
      <div>
        <p className="text-neutral-500">View your orders and approvals.</p>
      </div>

      <RailPageTabs
        activeTab={activeTab}
        onTabChange={handleTabChange}
        testIdPrefix="transactions"
        tabs={[
          {
            id: "orders",
            label: "Orders",
            content: (
              <>
                <OrdersPanel onConfigureGuardrails={() => setGuardrailsOpen(true)} />
                <GuardrailsWizardDialog
                  open={guardrailsOpen}
                  onOpenChange={setGuardrailsOpen}
                />
              </>
            ),
          },
          {
            id: "approvals",
            label: "Approvals",
            content: <ApprovalHistoryPanel />,
          },
        ]}
      />
    </div>
  );
}
