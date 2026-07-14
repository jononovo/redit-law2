"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authFetch } from "@/features/platform-management/auth-fetch";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { UserActionModal } from "@/components/inhouse-agent/user-action-modal";
import { isTerminalAgentCheckoutStatus, formatMmSs } from "@/lib/agent-checkouts";
import { CheckoutStatusPill } from "@/components/inhouse-agent/status-pill";

// snake_case shape returned by /api/v1/agent-checkouts (serializeAgentCheckout).
export interface AgentCheckoutData {
  checkout_id: string;
  status: string;
  card_id: string;
  product_url: string;
  request: string;
  merchant_context: string | null;
  max_cost_cents: number | null;
  last_event: string | null;
  receipt: unknown;
  created_at: string;
  updated_at: string;
}

export interface PendingUserAction {
  id: string;
  response_schema: unknown;
  expires_at: string | null;
  card_action_unmappable?: boolean;
}

// Re-export for sibling components that consume checkout rows.
export { isTerminalAgentCheckoutStatus as isTerminalStatus };

type PollPayload = AgentCheckoutData & { pending_user_action: PendingUserAction | null };


interface CheckoutObserverProps {
  checkout: AgentCheckoutData;
  onExit: () => void;
}

export function CheckoutObserver({ checkout, onExit }: CheckoutObserverProps) {
  const { toast } = useToast();
  const [current, setCurrent] = useState<AgentCheckoutData>(checkout);
  const [events, setEvents] = useState<string[]>(checkout.last_event ? [checkout.last_event] : []);
  const [pendingAction, setPendingAction] = useState<PendingUserAction | null>(null);
  const [unmappable, setUnmappable] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  // Suppress reopening a modal the user dismissed (or already answered) for the same action id.
  const dismissedActionRef = useRef<string | null>(null);

  const checkoutId = checkout.checkout_id;
  const terminal = isTerminalAgentCheckoutStatus(current.status);

  const appendEvent = useCallback((event: string) => {
    setEvents((prev) => (prev[prev.length - 1] === event ? prev : [...prev, event]));
  }, []);

  // Poll every 2s while non-terminal. 401 bearer_required (Firebase not yet
  // hydrated) and transient failures are ignored — the next tick retries.
  useEffect(() => {
    if (terminal) return;
    let stopped = false;
    const tick = async () => {
      try {
        const res = await authFetch(`/api/v1/agent-checkouts/${checkoutId}`);
        const body: unknown = await res.json();
        if (stopped || !res.ok) return;
        const { pending_user_action: pa, ...row } = body as PollPayload;
        setCurrent(row);
        if (row.last_event) appendEvent(row.last_event);
        if (pa && pa.card_action_unmappable) {
          setUnmappable(true);
          setPendingAction(null);
        } else if (pa) {
          setUnmappable(false);
          if (dismissedActionRef.current !== pa.id) {
            setPendingAction((prev) => (prev && prev.id === pa.id ? prev : pa));
          }
        } else {
          setUnmappable(false);
          setPendingAction(null);
        }
      } catch {}
    };
    tick();
    const interval = setInterval(tick, 2000);
    return () => {
      stopped = true;
      clearInterval(interval);
    };
  }, [checkoutId, terminal, appendEvent]);

  useEffect(() => {
    const createdMs = new Date(checkout.created_at).getTime();
    const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - createdMs) / 1000)));
    tick();
    if (terminal) return;
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [checkout.created_at, terminal]);

  const handleCancel = async () => {
    if (!window.confirm("Cancel this checkout? The agent will stop working on it.")) return;
    setCancelling(true);
    try {
      const res = await authFetch(`/api/v1/agent-checkouts/${checkoutId}`, { method: "DELETE" });
      const body = (await res.json()) as AgentCheckoutData & { error?: string; message?: string };
      if (res.ok) {
        setCurrent(body);
        setPendingAction(null);
      } else {
        toast({
          title: "Could not cancel",
          description: body.message || body.error || "Try again in a moment.",
          variant: "destructive",
        });
      }
    } catch {
      toast({ title: "Network error", description: "Could not cancel — try again.", variant: "destructive" });
    } finally {
      setCancelling(false);
    }
  };

  const handleActionSubmit = async (values: Record<string, unknown>) => {
    if (!pendingAction) return;
    const actionId = pendingAction.id;
    try {
      const res = await authFetch(`/api/v1/agent-checkouts/${checkoutId}/actions/${actionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values }),
      });
      const body = (await res.json()) as AgentCheckoutData & { error?: string; message?: string };
      if (!res.ok) {
        toast({
          title: "Could not send your answer",
          description: body.message || body.error || "Try again.",
          variant: "destructive",
        });
        return;
      }
      dismissedActionRef.current = actionId;
      setPendingAction(null);
      setCurrent(body);
      if (body.last_event) appendEvent(body.last_event);
    } catch {
      toast({ title: "Network error", description: "Could not send your answer — try again.", variant: "destructive" });
    }
  };

  return (
    <div className="flex flex-col gap-6" data-testid="checkout-observer">
      <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-5" data-testid="checkout-instruction-banner">
        <p className="text-sm text-neutral-700 italic whitespace-pre-line">&ldquo;{current.request}&rdquo;</p>
        <p className="text-xs font-mono text-neutral-400 mt-2">{current.checkout_id}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)] gap-6 items-start">
        <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-5 flex flex-col gap-4" data-testid="checkout-progress-panel">
          <h2 className="text-sm font-bold text-neutral-900">Progress</h2>

          <div className="self-start">
            <CheckoutStatusPill status={current.status} runningLabel="Agent working" testId="pill-checkout-status" />
          </div>

          <p className="text-xs font-mono text-neutral-400" data-testid="text-checkout-elapsed">
            {formatMmSs(elapsed)}
          </p>

          {current.last_event && (
            <p className="text-sm text-neutral-600" data-testid="text-checkout-last-event">
              {current.last_event}
            </p>
          )}

          {events.length > 0 && (
            <ul className="flex flex-col gap-2 border-t border-neutral-100 pt-3" data-testid="checkout-event-timeline">
              {events.map((event, i) => (
                <li key={i} className="flex items-start gap-2 text-xs">
                  <span
                    className={cn(
                      "w-1.5 h-1.5 rounded-full mt-1 shrink-0",
                      i === events.length - 1 && !terminal ? "bg-blue-500" : "bg-neutral-300"
                    )}
                  />
                  <span className={i === events.length - 1 ? "text-neutral-700" : "text-neutral-400"}>{event}</span>
                </li>
              ))}
            </ul>
          )}

          {!terminal && (
            <Button
              variant="outline"
              className="w-full text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
              onClick={handleCancel}
              disabled={cancelling}
              data-testid="button-cancel-checkout"
            >
              {cancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : "Cancel checkout"}
            </Button>
          )}
        </div>

        <div className="flex flex-col gap-4 min-w-0">
          {unmappable && !terminal && (
            <div
              className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"
              data-testid="notice-card-action-unmappable"
            >
              The agent asked for payment in a format I don&apos;t recognize — cancel and try again, or contact support.
            </div>
          )}

          {current.status === "succeeded" ? (
            <div className="rounded-2xl border border-green-200 bg-green-50 p-6" data-testid="panel-checkout-succeeded">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <h3 className="font-bold text-neutral-900">Checkout complete</h3>
              </div>
              {current.last_event && <p className="text-sm text-neutral-600 mt-2">{current.last_event}</p>}
              {current.receipt != null && (
                <pre
                  className="mt-4 bg-white border border-green-100 rounded-xl p-4 text-xs font-mono overflow-x-auto"
                  data-testid="text-checkout-receipt"
                >
                  {JSON.stringify(current.receipt, null, 2)}
                </pre>
              )}
              <Button className="mt-4 rounded-full bg-primary hover:bg-primary/90" onClick={onExit} data-testid="button-checkout-done">
                Done
              </Button>
            </div>
          ) : terminal ? (
            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-6" data-testid="panel-checkout-ended">
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-neutral-400" />
                <h3 className="font-bold text-neutral-900">
                  {current.status === "failed" ? "Checkout failed" : "Checkout cancelled"}
                </h3>
              </div>
              {current.last_event && <p className="text-sm text-neutral-600 mt-2">{current.last_event}</p>}
              <Button variant="outline" className="mt-4 rounded-full" onClick={onExit} data-testid="button-checkout-back">
                Back
              </Button>
            </div>
          ) : (
            <div
              className="rounded-2xl border border-neutral-100 shadow-sm overflow-hidden bg-neutral-950 flex flex-col"
              data-testid="checkout-viewport"
            >
              <div className="flex items-center gap-2 px-4 py-3 bg-neutral-900 border-b border-neutral-800">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
                <span className="ml-2 text-xs text-neutral-400 font-medium">Agent browser session</span>
              </div>
              {/* A live stream / iframe drops into this body once the payload exposes one. */}
              <div className="flex-1 min-h-[420px] p-6 flex flex-col">
                <div className="flex-1 flex flex-col gap-2 overflow-y-auto">
                  {events.length === 0 ? (
                    <p className="text-sm font-mono text-neutral-500">Waiting for the agent&apos;s first event…</p>
                  ) : (
                    events.map((event, i) => (
                      <p
                        key={i}
                        className={cn("text-sm font-mono", i === events.length - 1 ? "text-neutral-200" : "text-neutral-500")}
                      >
                        {event}
                      </p>
                    ))
                  )}
                </div>
                <p className="text-xs text-neutral-600 mt-6 text-center">Live session view coming soon</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {pendingAction && !terminal && (
        <UserActionModal
          action={{
            id: pendingAction.id,
            response_schema: pendingAction.response_schema,
            expires_at: pendingAction.expires_at,
          }}
          onSubmit={handleActionSubmit}
          onCancel={() => {
            dismissedActionRef.current = pendingAction.id;
            setPendingAction(null);
          }}
        />
      )}
    </div>
  );
}
