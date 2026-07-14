"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { MANAGED_AGENTS_ROUTE, isManagedRuntime, managedAgentRoute } from "@/lib/managed-agents";

interface ManagedAgentCardProps {
  botName: string;
  description: string | null;
  runtime: string;
  createdAt: string;
}

// Dashboard card for a managed agent. Deliberately its own component —
// BotCard models user-linked API-key agents (settings, webhooks, linking),
// none of which apply here. Styling mirrors BotCard exactly.
export function ManagedAgentCard({ botName, description, runtime, createdAt }: ManagedAgentCardProps) {
  const href = isManagedRuntime(runtime) ? managedAgentRoute(runtime) : MANAGED_AGENTS_ROUTE;
  return (
    <Link href={href} className="block h-full" data-testid="managed-agent-card">
      <div className="h-full bg-white rounded-2xl border border-neutral-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center bg-violet-50">
                <ShoppingBag className="w-5 h-5 text-violet-600" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-neutral-900 truncate">{botName}</h3>
                  <span
                    className="shrink-0 text-[10px] font-semibold uppercase tracking-wide bg-violet-50 text-violet-600 px-2 py-0.5 rounded-full"
                    data-testid="badge-managed"
                  >
                    Managed
                  </span>
                </div>
                <p className="text-xs text-neutral-400">
                  Added {new Date(createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
            <span
              className="inline-flex items-center gap-1.5 shrink-0 text-xs font-medium text-green-700"
              data-testid="status-managed-agent"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              Ready
            </span>
          </div>
          {description && (
            <p className="text-sm text-neutral-500 mt-3 line-clamp-2">{description}</p>
          )}
        </div>
      </div>
    </Link>
  );
}
