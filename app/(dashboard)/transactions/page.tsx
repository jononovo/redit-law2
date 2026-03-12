"use client";

import { useEffect, useState, useCallback } from "react";
import { ArrowUpRight, ArrowDownLeft, Loader2, Receipt } from "lucide-react";
import { RailPageTabs } from "@/components/wallet/rail-page-tabs";
import { OrdersPanel } from "@/components/wallet/orders-panel";
import { GuardrailsWizardDialog } from "@/components/onboarding/guardrails-wizard-dialog";
import { ApprovalList, type ApprovalRow } from "@/components/wallet/approval-list";
import { authFetch } from "@/lib/auth-fetch";
import { useToast } from "@/hooks/use-toast";

interface TransactionData {
  id: number;
  type: string;
  amount_cents: number;
  amount: string;
  balance_after: number | null;
  balance_after_display: string | null;
  description: string | null;
  created_at: string;
}

function TransactionsTab() {
  const [transactions, setTransactions] = useState<TransactionData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTransactions() {
      try {
        const res = await fetch("/api/v1/wallet/transactions");
        if (res.ok) {
          const data = await res.json();
          setTransactions(data.transactions || []);
        }
      } catch {} finally {
        setLoading(false);
      }
    }
    fetchTransactions();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-12 text-center" data-testid="empty-transactions">
        <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center mx-auto mb-4">
          <Receipt className="w-8 h-8 text-neutral-400" />
        </div>
        <h3 className="font-bold text-neutral-900 text-lg mb-2">No transactions yet</h3>
        <p className="text-sm text-neutral-500 max-w-sm mx-auto">
          Once you fund your wallet or your bot makes purchases, transactions will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-neutral-100">
            <th className="text-left text-xs font-medium text-neutral-500 uppercase tracking-wider px-6 py-4">Type</th>
            <th className="text-left text-xs font-medium text-neutral-500 uppercase tracking-wider px-6 py-4">Description</th>
            <th className="text-right text-xs font-medium text-neutral-500 uppercase tracking-wider px-6 py-4">Amount</th>
            <th className="text-right text-xs font-medium text-neutral-500 uppercase tracking-wider px-6 py-4">Balance</th>
            <th className="text-right text-xs font-medium text-neutral-500 uppercase tracking-wider px-6 py-4">Date</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx) => (
            <tr key={tx.id} className="border-b border-neutral-50 hover:bg-neutral-50/50 transition-colors" data-testid={`transaction-row-${tx.id}`}>
              <td className="px-6 py-4">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    tx.type === "topup" ? "bg-green-50" : tx.type === "refund" ? "bg-blue-50" : "bg-red-50"
                  }`}>
                    {tx.type === "topup" ? (
                      <ArrowDownLeft className="w-4 h-4 text-green-600" />
                    ) : (
                      <ArrowUpRight className="w-4 h-4 text-red-600" />
                    )}
                  </div>
                  <span className="text-sm font-medium text-neutral-900 capitalize">{tx.type}</span>
                </div>
              </td>
              <td className="px-6 py-4">
                <span className="text-sm text-neutral-500">{tx.description || "—"}</span>
              </td>
              <td className="px-6 py-4 text-right">
                <span className={`text-sm font-semibold ${
                  tx.type === "topup" || tx.type === "refund" ? "text-green-600" : "text-red-600"
                }`}>
                  {tx.type === "topup" || tx.type === "refund" ? "+" : "-"}{tx.amount}
                </span>
              </td>
              <td className="px-6 py-4 text-right">
                <span className="text-sm text-neutral-500">{tx.balance_after_display || "—"}</span>
              </td>
              <td className="px-6 py-4 text-right">
                <span className="text-sm text-neutral-400">
                  {new Date(tx.created_at).toLocaleDateString()} {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ApprovalsTab() {
  const { toast } = useToast();
  const [approvals, setApprovals] = useState<ApprovalRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchApprovals = useCallback(async () => {
    try {
      const res = await authFetch("/api/v1/approvals");
      if (res.ok) {
        const data = await res.json();
        setApprovals(data.approvals || []);
      }
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApprovals();
  }, [fetchApprovals]);

  const handleDecide = useCallback(async (id: number | string, decision: "approve" | "reject") => {
    try {
      const res = await authFetch("/api/v1/approvals/decide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approval_id: id, decision }),
      });
      if (res.ok) {
        toast({ title: decision === "approve" ? "Approved" : "Rejected" });
        fetchApprovals();
      } else {
        const data = await res.json();
        toast({ title: "Error", description: data.error || "Failed to process decision", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
  }, [fetchApprovals, toast]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-neutral-400" data-testid="loader-approvals" />
      </div>
    );
  }

  return (
    <ApprovalList
      approvals={approvals}
      onDecide={handleDecide}
      showRailBadge
      testIdPrefix="unified-approval"
    />
  );
}

export default function TransactionsPage() {
  const [activeTab, setActiveTab] = useState("transactions");
  const [guardrailsOpen, setGuardrailsOpen] = useState(false);

  return (
    <div className="flex flex-col gap-8 animate-fade-in-up">
      <div>
        <p className="text-neutral-500">View your wallet transactions, orders, and approvals.</p>
      </div>

      <RailPageTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        testIdPrefix="transactions"
        tabs={[
          {
            id: "transactions",
            label: "Transactions",
            content: <TransactionsTab />,
          },
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
            content: <ApprovalsTab />,
          },
        ]}
      />
    </div>
  );
}
