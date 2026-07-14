"use client";

import Link from "next/link";
import { type AgentCheckoutData } from "@/components/managed-agent/checkout-observer";
import { isTerminalAgentCheckoutStatus, safeHostname, extractReceiptAmountCents } from "@/lib/managed-agent-checkouts";
import { CheckoutStatusPill } from "@/components/managed-agent/status-pill";

interface CheckoutHistoryProps {
  checkouts: AgentCheckoutData[];
  runsBasePath: string; // e.g. /managed-agents/jennifer/runs
}

// The agent's runs. Every row links to that run's own page (live observance
// for running, receipt view for terminal).
export function CheckoutHistory({ checkouts, runsBasePath }: CheckoutHistoryProps) {
  return (
    <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm" data-testid="checkout-history">
      <h2 className="text-sm font-bold text-neutral-900 px-5 pt-5">Runs</h2>
      {checkouts.length === 0 ? (
        <p className="text-sm text-neutral-400 px-5 py-4" data-testid="text-no-runs">
          No runs yet — start one with "New checkout".
        </p>
      ) : (
        <ul className="divide-y divide-neutral-100 mt-2">
          {checkouts.map((c) => {
            const cents = extractReceiptAmountCents(c.receipt);
            const amount = cents !== null ? `$${(cents / 100).toFixed(2)}` : null;
            const running = !isTerminalAgentCheckoutStatus(c.status);
            return (
              <li key={c.checkout_id} data-testid={`history-row-${c.checkout_id}`}>
                <Link
                  href={`${runsBasePath}/${c.checkout_id}`}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-neutral-50 transition-colors"
                  data-testid={`link-run-${c.checkout_id}`}
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
                  <span
                    className="text-xs font-semibold text-neutral-400 shrink-0"
                    data-testid={`text-open-run-${c.checkout_id}`}
                  >
                    {running ? "Watch →" : "View →"}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
