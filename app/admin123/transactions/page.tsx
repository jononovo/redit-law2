"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationPrevious,
  PaginationNext,
  PaginationLink,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import { StatusBadge } from "@/components/wallet/status-badge";
import { Activity } from "lucide-react";

interface AdminTransaction {
  id: number;
  rail: string;
  type: string;
  amount: string;
  description: string | null;
  status: string;
  createdAt: string;
  ownerEmail: string;
  botId: string | null;
}

interface TransactionsResponse {
  transactions: AdminTransaction[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

const railLabels: Record<string, string> = {
  core: "Core",
  rail1: "Stripe",
  rail2: "Shop",
  rail4: "Card (SK)",
  rail5: "Card (Enc)",
};

function buildPageNumbers(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "ellipsis")[] = [1];
  if (current > 3) pages.push("ellipsis");
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
    pages.push(i);
  }
  if (current < total - 2) pages.push("ellipsis");
  pages.push(total);
  return pages;
}

export default function AdminTransactionsPage() {
  const [data, setData] = useState<TransactionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const fetchPage = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/admin/transactions?page=${p}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const json: TransactionsResponse = await res.json();
      setData(json);
      setPage(p);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPage(1);
  }, [fetchPage]);

  return (
    <>
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <Activity className="w-5 h-5 text-neutral-900" />
          <h1 className="text-xl font-bold text-neutral-900" data-testid="text-admin-transactions-title">
            All Transactions
          </h1>
        </div>
        <p className="text-neutral-500 text-sm" data-testid="text-admin-transactions-description">
          Cross-platform transaction ledger across all users and rails.
          {data && !loading && (
            <span className="ml-2 text-neutral-400">
              {data.total.toLocaleString()} total
            </span>
          )}
        </p>
      </div>

      <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[140px] text-xs">Date</TableHead>
              <TableHead className="w-[70px] text-xs">Rail</TableHead>
              <TableHead className="w-[90px] text-xs">Type</TableHead>
              <TableHead className="text-xs">Owner</TableHead>
              <TableHead className="text-xs">Bot</TableHead>
              <TableHead className="text-xs">Description</TableHead>
              <TableHead className="w-[90px] text-xs text-right">Amount</TableHead>
              <TableHead className="w-[90px] text-xs">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-neutral-400 text-sm">
                  Loading...
                </TableCell>
              </TableRow>
            ) : !data || data.transactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-neutral-400 text-sm">
                  No transactions found.
                </TableCell>
              </TableRow>
            ) : (
              data.transactions.map((tx, i) => (
                <TableRow key={`${tx.rail}-${tx.id}-${i}`} data-testid={`row-transaction-${tx.rail}-${tx.id}`}>
                  <TableCell className="text-xs text-neutral-500 whitespace-nowrap">
                    {new Date(tx.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "2-digit",
                    })}{" "}
                    <span className="text-neutral-400">
                      {new Date(tx.createdAt).toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-500">
                      {railLabels[tx.rail] || tx.rail}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-neutral-600">
                    {tx.type}
                  </TableCell>
                  <TableCell className="text-xs text-neutral-600 max-w-[180px] truncate" title={tx.ownerEmail}>
                    {tx.ownerEmail}
                  </TableCell>
                  <TableCell className="text-xs text-neutral-500 max-w-[120px] truncate font-mono" title={tx.botId || ""}>
                    {tx.botId || "—"}
                  </TableCell>
                  <TableCell className="text-xs text-neutral-500 max-w-[160px] truncate" title={tx.description || ""}>
                    {tx.description || "—"}
                  </TableCell>
                  <TableCell className="text-xs text-right font-medium text-neutral-900 whitespace-nowrap">
                    {tx.amount}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={tx.status} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {data && data.totalPages > 1 && (
        <div className="mt-4">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={(e) => { e.preventDefault(); if (page > 1) fetchPage(page - 1); }}
                  className={page <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  data-testid="button-pagination-prev"
                />
              </PaginationItem>
              {buildPageNumbers(page, data.totalPages).map((p, i) =>
                p === "ellipsis" ? (
                  <PaginationItem key={`ellipsis-${i}`}>
                    <PaginationEllipsis />
                  </PaginationItem>
                ) : (
                  <PaginationItem key={p}>
                    <PaginationLink
                      isActive={p === page}
                      onClick={(e) => { e.preventDefault(); fetchPage(p); }}
                      className="cursor-pointer"
                      data-testid={`button-pagination-${p}`}
                    >
                      {p}
                    </PaginationLink>
                  </PaginationItem>
                )
              )}
              <PaginationItem>
                <PaginationNext
                  onClick={(e) => { e.preventDefault(); if (page < data.totalPages) fetchPage(page + 1); }}
                  className={page >= data.totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  data-testid="button-pagination-next"
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </>
  );
}
