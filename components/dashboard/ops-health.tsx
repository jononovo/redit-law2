"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle, AlertTriangle, Loader2, RefreshCw, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ReconciliationResult {
  wallet_id: number;
  bot_id: string;
  ledger_balance_usd: string;
  stored_balance_usd: string;
  diff_usd: string;
  status: string;
}

interface ReconciliationResponse {
  status: string;
  message: string;
  results: ReconciliationResult[];
  mismatches: number;
  checked: number;
}

interface WebhookHealthResponse {
  failed_24h: number;
  status: string;
  checked_bots: number;
}

export function OpsHealth() {
  const [reconResult, setReconResult] = useState<ReconciliationResponse | null>(null);
  const [reconRunning, setReconRunning] = useState(false);
  const [reconError, setReconError] = useState<string | null>(null);

  const { data: webhookHealth } = useQuery<WebhookHealthResponse>({
    queryKey: ["webhook-health"],
    queryFn: async () => {
      const res = await fetch("/api/v1/webhooks/health");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    refetchInterval: 60000,
  });

  async function runReconciliation() {
    setReconRunning(true);
    setReconError(null);
    try {
      const res = await fetch("/api/v1/admin/reconciliation/run", { method: "POST" });
      if (!res.ok) throw new Error("Reconciliation failed");
      const data = await res.json();
      setReconResult(data);
    } catch {
      setReconError("Failed to run reconciliation.");
    } finally {
      setReconRunning(false);
    }
  }

  return (
    <div>
      <h2 className="text-lg font-bold text-neutral-900 mb-4">Operational Health</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-neutral-100 shadow-sm p-5" data-testid="card-webhook-health">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-neutral-500">Webhook Deliveries (24h)</span>
            {webhookHealth ? (
              webhookHealth.failed_24h === 0 ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-500" />
              )
            ) : null}
          </div>
          {webhookHealth ? (
            <>
              <h3
                className={`text-2xl font-bold tracking-tight ${webhookHealth.failed_24h === 0 ? "text-green-600" : "text-amber-600"}`}
                data-testid="text-webhook-failed-count"
              >
                {webhookHealth.failed_24h === 0 ? "All Healthy" : `${webhookHealth.failed_24h} Failed`}
              </h3>
              <p className="text-xs text-neutral-400 mt-1">
                {webhookHealth.checked_bots} bot{webhookHealth.checked_bots !== 1 ? "s" : ""} monitored
              </p>
            </>
          ) : (
            <p className="text-sm text-neutral-400">Loading...</p>
          )}
        </div>

        <div className="bg-white rounded-xl border border-neutral-100 shadow-sm p-5" data-testid="card-reconciliation">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-neutral-500">Wallet Reconciliation</span>
            <Shield className="w-5 h-5 text-neutral-300" />
          </div>
          {reconResult ? (
            <>
              <h3
                className={`text-2xl font-bold tracking-tight ${reconResult.mismatches === 0 ? "text-green-600" : "text-red-600"}`}
                data-testid="text-reconciliation-status"
              >
                {reconResult.mismatches === 0 ? "All Match" : `${reconResult.mismatches} Mismatch`}
              </h3>
              <p className="text-xs text-neutral-400 mt-1">
                {reconResult.checked} wallet{reconResult.checked !== 1 ? "s" : ""} checked
              </p>
              {reconResult.mismatches > 0 && (
                <div className="mt-3 space-y-1">
                  {reconResult.results
                    .filter((r) => r.status === "mismatch")
                    .map((r) => (
                      <div key={r.wallet_id} className="text-xs bg-red-50 text-red-700 px-2 py-1 rounded" data-testid={`text-mismatch-${r.wallet_id}`}>
                        Bot {r.bot_id}: ledger ${r.ledger_balance_usd} vs stored ${r.stored_balance_usd} (diff ${r.diff_usd})
                      </div>
                    ))}
                </div>
              )}
            </>
          ) : reconError ? (
            <p className="text-sm text-red-500" data-testid="text-reconciliation-error">{reconError}</p>
          ) : (
            <p className="text-sm text-neutral-400">Run to verify wallet balances match the transaction ledger.</p>
          )}
          <Button
            variant="outline"
            size="sm"
            className="mt-3 rounded-lg gap-2 text-xs"
            onClick={runReconciliation}
            disabled={reconRunning}
            data-testid="button-run-reconciliation"
          >
            {reconRunning ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
            {reconRunning ? "Running..." : "Run Reconciliation"}
          </Button>
        </div>
      </div>
    </div>
  );
}
