"use client";

import { Button } from "@/components/ui/button";
import { type AgentCheckoutData } from "@/components/inhouse-agent/checkout-observer";
import { isTerminalAgentCheckoutStatus, safeHostname, extractReceiptAmountCents } from "@/lib/agent-checkouts";
import { CheckoutStatusPill } from "@/components/inhouse-agent/status-pill";

interface CheckoutHistoryProps {
  checkouts: AgentCheckoutData[];
  onOpen: (checkout: AgentCheckoutData) => void;
}




export function CheckoutHistory({ checkouts, onOpen }: CheckoutHistoryProps) {
  if (checkouts.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm" data-testid="checkout-history">
      <h2 className="text-sm font-bold text-neutral-900 px-5 pt-5">Past checkouts</h2>
      <ul className="divide-y divide-neutral-100 mt-2">
        {checkouts.map((c) => {
          const cents = extractReceiptAmountCents(c.receipt);
          const amount = cents !== null ? `$${(cents / 100).toFixed(2)}` : null;
          const running = !isTerminalAgentCheckoutStatus(c.status);
          return (
            <li
              key={c.checkout_id}
              className="flex items-center gap-3 px-5 py-3"
              data-testid={`history-row-${c.checkout_id}`}
            >
              <CheckoutStatusPill status={c.status} testId={`history-status-${c.checkout_id}`} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-neutral-900 truncate">{safeHostname(c.product_url)}</p>
                <p className="text-xs text-neutral-400 truncate">{c.request.split("\n")[0]}</p>
              </div>
              {amount && <span className="text-sm font-medium text-neutral-700 shrink-0">{amount}</span>}
              <span className="text-xs text-neutral-400 shrink-0">
                {new Date(c.created_at).toLocaleDateString()}
              </span>
              {running && (
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full shrink-0"
                  onClick={() => onOpen(c)}
                  data-testid={`button-watch-${c.checkout_id}`}
                >
                  Watch
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
