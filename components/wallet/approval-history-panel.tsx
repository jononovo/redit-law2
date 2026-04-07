"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Shield, Filter, CheckCircle2, XCircle, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/wallet/status-badge";
import { useAuth } from "@/features/platform-management/auth/auth-context";
import { authFetch } from "@/features/platform-management/auth-fetch";
import { useToast } from "@/hooks/use-toast";
import type { UnifiedApproval } from "@/shared/schema";

const RAIL_LABELS: Record<string, string> = {
  rail1: "Crypto Wallet",
  rail2: "Card Wallet",
  rail5: "Sub-Agent",
};

const RAIL_COLORS: Record<string, string> = {
  rail1: "bg-blue-50 text-blue-700",
  rail2: "bg-purple-50 text-purple-700",
  rail5: "bg-emerald-50 text-emerald-700",
};

function isPending(approval: UnifiedApproval): boolean {
  if (approval.status !== "pending") return false;
  return new Date(approval.expiresAt) > new Date();
}

interface ApprovalHistoryPanelProps {
  defaultRail?: string;
  onPendingCount?: (count: number) => void;
  onDecisionComplete?: () => void;
}

export function ApprovalHistoryPanel({ defaultRail, onPendingCount, onDecisionComplete }: ApprovalHistoryPanelProps = {}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [approvals, setApprovals] = useState<UnifiedApproval[]>([]);
  const [loading, setLoading] = useState(true);

  const [railFilter, setRailFilter] = useState(defaultRail || "all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [botFilter, setBotFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [botNames, setBotNames] = useState<string[]>([]);

  const fetchApprovals = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (railFilter !== "all") params.set("rail", railFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (botFilter !== "all") params.set("bot_name", botFilter);
      if (dateFrom) params.set("date_from", dateFrom);
      if (dateTo) params.set("date_to", dateTo);

      const res = await authFetch(`/api/v1/approvals/history?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        const list: UnifiedApproval[] = data.approvals || [];
        setApprovals(list);

        const names = [...new Set(list.map((a: UnifiedApproval) => a.botName).filter(Boolean))];
        setBotNames(names);

        if (onPendingCount) {
          const pendingCount = list.filter(isPending).length;
          onPendingCount(pendingCount);
        }
      }
    } catch {} finally {
      setLoading(false);
    }
  }, [railFilter, statusFilter, botFilter, dateFrom, dateTo, onPendingCount]);

  useEffect(() => {
    if (user) {
      setLoading(true);
      fetchApprovals();
    }
  }, [user, fetchApprovals]);

  const handleDecide = useCallback(async (approvalId: string, decision: "approve" | "reject") => {
    try {
      const res = await authFetch("/api/v1/approvals/decide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approval_id: approvalId, decision }),
      });
      if (res.ok) {
        toast({ title: decision === "approve" ? "Approved" : "Rejected" });
        fetchApprovals();
        onDecisionComplete?.();
      } else {
        const data = await res.json();
        toast({ title: "Error", description: data.error || "Failed to process decision", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
  }, [fetchApprovals, toast, onDecisionComplete]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20" data-testid="loader-approval-history">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="approval-history-panel">
      <div className="bg-white rounded-xl border border-neutral-100 p-4" data-testid="approval-history-filters">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-neutral-400" />
          <span className="text-sm font-medium text-neutral-700">Filters</span>
        </div>
        <div className={`grid grid-cols-1 sm:grid-cols-2 ${defaultRail ? "lg:grid-cols-4" : "lg:grid-cols-5"} gap-3`}>
          {!defaultRail && (
            <div>
              <Label className="text-xs text-neutral-500">Rail</Label>
              <Select value={railFilter} onValueChange={setRailFilter}>
                <SelectTrigger data-testid="select-approval-rail-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Rails</SelectItem>
                  <SelectItem value="rail1">Crypto Wallet</SelectItem>
                  <SelectItem value="rail2">Card Wallet</SelectItem>
                  <SelectItem value="rail5">Sub-Agent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label className="text-xs text-neutral-500">Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger data-testid="select-approval-status-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="denied">Denied</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs text-neutral-500">Bot</Label>
            <Select value={botFilter} onValueChange={setBotFilter}>
              <SelectTrigger data-testid="select-approval-bot-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Bots</SelectItem>
                {botNames.map((name) => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs text-neutral-500">From</Label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              data-testid="input-approval-date-from"
            />
          </div>

          <div>
            <Label className="text-xs text-neutral-500">To</Label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              data-testid="input-approval-date-to"
            />
          </div>
        </div>
      </div>

      {approvals.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-neutral-100" data-testid="text-no-approval-history">
          <Shield className="w-12 h-12 mx-auto text-neutral-300 mb-4" />
          <h3 className="text-lg font-semibold text-neutral-700">No approvals found</h3>
          <p className="text-sm text-neutral-500 mt-1">Approval requests will appear here when your bots request spending authorization</p>
        </div>
      ) : (
        <div className="space-y-3" data-testid="approval-history-list">
          {approvals.map((a) => (
            <div
              key={a.approvalId}
              className="bg-white rounded-xl border border-neutral-100 p-4"
              data-testid={`card-approval-history-${a.approvalId}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
                    <Package className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-medium text-sm text-neutral-900" data-testid={`text-approval-amount-${a.approvalId}`}>
                      {a.amountDisplay}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {a.merchantName && (
                        <span className="text-xs text-neutral-500" data-testid={`text-approval-merchant-${a.approvalId}`}>
                          {a.merchantName}{a.itemName ? ` — ${a.itemName}` : ""}
                        </span>
                      )}
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${RAIL_COLORS[a.rail] || "bg-neutral-50 text-neutral-700"}`} data-testid={`badge-approval-rail-${a.approvalId}`}>
                        {RAIL_LABELS[a.rail] || a.rail}
                      </span>
                      {a.botName && (
                        <span className="text-xs text-neutral-400" data-testid={`text-approval-bot-${a.approvalId}`}>
                          via {a.botName}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {isPending(a) ? (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => handleDecide(a.approvalId, "reject")}
                        data-testid={`button-reject-${a.approvalId}`}
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => handleDecide(a.approvalId, "approve")}
                        data-testid={`button-approve-${a.approvalId}`}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-1" />
                        Approve
                      </Button>
                    </div>
                  ) : (
                    <StatusBadge status={a.status} />
                  )}
                  <div className="text-right">
                    <p className="text-xs text-neutral-400" data-testid={`text-approval-created-${a.approvalId}`}>
                      {new Date(a.createdAt).toLocaleDateString()} {new Date(a.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                    {a.decidedAt && (
                      <p className="text-xs text-neutral-400 mt-0.5" data-testid={`text-approval-decided-${a.approvalId}`}>
                        Decided {new Date(a.decidedAt).toLocaleDateString()} {new Date(a.decidedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
