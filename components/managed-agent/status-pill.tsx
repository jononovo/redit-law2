"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { isTerminalAgentCheckoutStatus } from "@/lib/managed-agent-checkouts";

interface CheckoutStatusPillProps {
  status: string;
  runningLabel?: string; // e.g. "Agent working" (observer) vs "running" (history)
  testId?: string;
}

// Single source for checkout status pill styling (observer + history).
export function CheckoutStatusPill({ status, runningLabel = "running", testId }: CheckoutStatusPillProps) {
  const terminal = isTerminalAgentCheckoutStatus(status);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full shrink-0",
        status === "succeeded" && "bg-green-50 text-green-700",
        status === "failed" && "bg-red-50 text-red-600",
        status === "cancelled" && "bg-neutral-100 text-neutral-500",
        !terminal && "bg-blue-50 text-blue-600",
      )}
      data-testid={testId}
    >
      {!terminal && <Loader2 className="w-3 h-3 animate-spin" />}
      {terminal ? status : runningLabel}
    </span>
  );
}
