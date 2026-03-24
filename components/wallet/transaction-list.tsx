"use client";

import { ArrowUpRight, ArrowDownLeft, ArrowLeftRight, CheckCircle2, Clock, XCircle } from "lucide-react";

export interface TransactionRow {
  id: number;
  type: string;
  amount_display: string;
  balance_after_display: string | null;
  status: string;
  created_at: string;
  resource_url?: string | null;
  metadata?: {
    direction?: "inbound" | "outbound";
    counterparty_address?: string;
    [key: string]: any;
  } | null;
}

interface TransactionListProps {
  transactions: TransactionRow[];
  emptyIcon?: React.ReactNode;
  emptyMessage?: string;
  testIdPrefix?: string;
}

function statusIcon(status: string) {
  switch (status) {
    case "confirmed": return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    case "pending": return <Clock className="w-4 h-4 text-amber-500" />;
    case "failed": return <XCircle className="w-4 h-4 text-red-500" />;
    default: return <Clock className="w-4 h-4 text-neutral-400" />;
  }
}

function txIcon(type: string, direction?: string) {
  if (type === "transfer") {
    return direction === "inbound"
      ? <ArrowDownLeft className="w-4 h-4 text-emerald-500" />
      : <ArrowUpRight className="w-4 h-4 text-red-500" />;
  }
  if (type === "deposit") return <ArrowDownLeft className="w-4 h-4 text-emerald-500" />;
  if (type === "reconciliation") return <ArrowLeftRight className="w-4 h-4 text-amber-500" />;
  return <ArrowUpRight className="w-4 h-4 text-blue-500" />;
}

function txLabel(type: string, direction?: string) {
  if (type === "transfer") {
    return direction === "inbound" ? "Transfer in" : "Transfer out";
  }
  return type.replace(/_/g, " ");
}

export function TransactionList({ transactions, emptyIcon, emptyMessage = "No transactions yet", testIdPrefix = "tx" }: TransactionListProps) {
  if (transactions.length === 0) {
    return (
      <div className="text-center py-16" data-testid={`text-no-${testIdPrefix}`}>
        {emptyIcon || <ArrowUpRight className="w-10 h-10 text-neutral-300 mx-auto mb-3" />}
        <p className="text-neutral-400">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-neutral-50 text-neutral-500 text-xs uppercase tracking-wider">
          <tr>
            <th className="text-left px-6 py-3">Type</th>
            <th className="text-left px-6 py-3">Amount</th>
            <th className="text-left px-6 py-3">Balance</th>
            <th className="text-left px-6 py-3">Details</th>
            <th className="text-left px-6 py-3">Status</th>
            <th className="text-left px-6 py-3">Date</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-50">
          {transactions.map((tx) => {
            const direction = tx.metadata?.direction;
            return (
              <tr key={tx.id} className="hover:bg-neutral-50/50" data-testid={`row-${testIdPrefix}-${tx.id}`}>
                <td className="px-6 py-4 flex items-center gap-2">
                  {txIcon(tx.type, direction)}
                  <span className="font-medium capitalize">{txLabel(tx.type, direction)}</span>
                </td>
                <td className={`px-6 py-4 font-semibold ${tx.type === "transfer" ? (direction === "inbound" ? "text-emerald-600" : "text-red-600") : ""}`}>
                  {tx.type === "transfer" ? (direction === "inbound" ? "+" : "−") : ""}{tx.amount_display}
                </td>
                <td className="px-6 py-4 text-neutral-500" data-testid={`text-balance-after-${tx.id}`}>{tx.balance_after_display || "—"}</td>
                <td className="px-6 py-4 text-neutral-500 truncate max-w-[200px]">
                  {tx.type === "transfer" && tx.metadata?.counterparty_address
                    ? `${tx.metadata.counterparty_address.slice(0, 6)}...${tx.metadata.counterparty_address.slice(-4)}`
                    : tx.resource_url || "—"}
                </td>
                <td className="px-6 py-4">
                  <span className="flex items-center gap-1.5">
                    {statusIcon(tx.status)}
                    <span className="capitalize">{tx.status}</span>
                  </span>
                </td>
                <td className="px-6 py-4 text-neutral-500">{new Date(tx.created_at).toLocaleDateString()}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
