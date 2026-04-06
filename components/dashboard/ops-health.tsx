"use client";

import { useQuery } from "@tanstack/react-query";
import { CheckCircle, AlertTriangle } from "lucide-react";

interface WebhookHealthResponse {
  failed_24h: number;
  status: string;
  checked_bots: number;
}

export function OpsHealth() {
  const { data: webhookHealth } = useQuery<WebhookHealthResponse>({
    queryKey: ["webhook-health"],
    queryFn: async () => {
      const res = await fetch("/api/v1/webhooks/health");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    refetchInterval: 60000,
  });

  return (
    <div>
      <h2 className="text-lg font-bold text-neutral-900 mb-4">Operational Health</h2>
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
    </div>
  );
}
