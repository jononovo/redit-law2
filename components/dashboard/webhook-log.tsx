"use client";

import { useEffect, useState } from "react";
import { Webhook, Loader2, CheckCircle2, XCircle, Clock, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Delivery {
  id: number;
  bot_id: string;
  bot_name: string;
  event_type: string;
  status: string;
  attempts: number;
  max_attempts: number;
  response_status: number | null;
  response_body: string | null;
  last_attempt_at: string | null;
  next_retry_at: string | null;
  created_at: string;
}

function eventLabel(eventType: string): string {
  const map: Record<string, string> = {
    "wallet.activated": "Wallet Activated",
    "wallet.topup.completed": "Top-up Completed",
    "wallet.spend.authorized": "Purchase Approved",
    "wallet.spend.declined": "Purchase Declined",
    "wallet.balance.low": "Balance Low",
  };
  return map[eventType] || eventType;
}

function statusIcon(status: string) {
  if (status === "success") return <CheckCircle2 className="w-4 h-4 text-green-500" />;
  if (status === "pending") return <Clock className="w-4 h-4 text-amber-500" />;
  return <XCircle className="w-4 h-4 text-red-500" />;
}

function statusBadge(status: string) {
  if (status === "success") return "bg-green-50 text-green-700";
  if (status === "pending") return "bg-amber-50 text-amber-700";
  return "bg-red-50 text-red-700";
}

function eventBadge(eventType: string) {
  if (eventType.includes("authorized") || eventType.includes("activated") || eventType.includes("completed"))
    return "bg-blue-50 text-blue-700";
  if (eventType.includes("declined") || eventType.includes("low"))
    return "bg-orange-50 text-orange-700";
  return "bg-neutral-50 text-neutral-700";
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function DeliveryRow({ delivery }: { delivery: Delivery }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div data-testid={`webhook-delivery-${delivery.id}`}>
      <div
        className="flex items-center gap-3 px-4 py-3 hover:bg-neutral-50 transition-colors cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        {statusIcon(delivery.status)}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-neutral-900 truncate">{delivery.bot_name}</span>
            <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${eventBadge(delivery.event_type)}`}>
              {eventLabel(delivery.event_type)}
            </span>
            <span className={`text-xs px-1.5 py-0.5 rounded ${statusBadge(delivery.status)}`}>
              {delivery.status}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-neutral-400">
              {delivery.attempts}/{delivery.max_attempts} attempts
            </span>
            {delivery.response_status && (
              <span className="text-xs text-neutral-400">
                HTTP {delivery.response_status}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-neutral-400">{timeAgo(delivery.created_at)}</span>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-neutral-300" />
          ) : (
            <ChevronDown className="w-4 h-4 text-neutral-300" />
          )}
        </div>
      </div>
      {expanded && (
        <div className="px-4 pb-3 space-y-2">
          {delivery.response_body && (
            <div className="bg-neutral-50 rounded-lg p-3">
              <p className="text-xs font-medium text-neutral-500 mb-1">Response</p>
              <pre className="text-xs text-neutral-600 whitespace-pre-wrap break-words font-mono">
                {delivery.response_body}
              </pre>
            </div>
          )}
          {delivery.next_retry_at && delivery.status === "pending" && (
            <p className="text-xs text-amber-600">
              Next retry: {new Date(delivery.next_retry_at).toLocaleString()}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function WebhookLog() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);

  async function fetchDeliveries() {
    try {
      const res = await fetch("/api/v1/webhooks");
      if (res.ok) {
        const data = await res.json();
        setDeliveries(data.deliveries || []);
      }
    } catch {} finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDeliveries();
  }, []);

  async function handleRetry() {
    setRetrying(true);
    try {
      await fetch("/api/v1/webhooks/retry-pending", { method: "POST" });
      await fetchDeliveries();
    } catch {} finally {
      setRetrying(false);
    }
  }

  const hasPending = deliveries.some((d) => d.status === "pending" || d.status === "failed");

  return (
    <div data-testid="section-webhook-log">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Webhook className="w-5 h-5 text-neutral-400" />
          <h2 className="text-lg font-bold text-neutral-900">Webhook Deliveries</h2>
        </div>
        {hasPending && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleRetry}
            disabled={retrying}
            className="rounded-xl gap-2 text-xs"
            data-testid="button-retry-webhooks"
          >
            {retrying ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            Retry Failed
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />
        </div>
      ) : deliveries.length === 0 ? (
        <div className="bg-white rounded-xl border border-neutral-100 shadow-sm p-8 text-center">
          <Webhook className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
          <p className="text-sm text-neutral-500">No webhook deliveries yet.</p>
          <p className="text-xs text-neutral-400 mt-1">When events are sent to your bots, deliveries will appear here.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-neutral-100 shadow-sm divide-y divide-neutral-50 overflow-hidden">
          {deliveries.slice(0, 20).map((d) => (
            <DeliveryRow key={d.id} delivery={d} />
          ))}
        </div>
      )}
    </div>
  );
}
