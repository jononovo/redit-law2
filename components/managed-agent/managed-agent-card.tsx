"use client";

import { useRouter } from "next/navigation";
import { LayoutDashboard, ShoppingBag, ShoppingCart } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { MANAGED_AGENTS_ROUTE, isManagedRuntime, managedAgentRoute } from "@/lib/managed-agents";

interface ManagedAgentCardProps {
  botName: string;
  description: string | null;
  runtime: string;
  createdAt: string;
}

// Dashboard card for a managed agent. Deliberately its own component —
// BotCard models user-linked API-key agents (settings, webhooks, linking),
// none of which apply here. Styling mirrors BotCard exactly. The whole card
// opens the agent's dashboard; the corner icon buttons make the two main
// actions discoverable (card-as-div + stopPropagation because nested <a>
// inside <Link> is invalid HTML).
export function ManagedAgentCard({ botName, description, runtime, createdAt }: ManagedAgentCardProps) {
  const router = useRouter();
  const href = isManagedRuntime(runtime) ? managedAgentRoute(runtime) : MANAGED_AGENTS_ROUTE;

  const actions = [
    { icon: ShoppingCart, label: "New checkout", href: `${href}/new`, testId: "button-card-new-checkout" },
    { icon: LayoutDashboard, label: "Open dashboard", href, testId: "button-card-dashboard" },
  ];

  return (
    <div
      onClick={() => router.push(href)}
      className="h-full bg-white rounded-2xl border border-neutral-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
      data-testid="managed-agent-card"
    >
      <div className="p-5 h-full">
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
          {/* Actions live top-right, same spot as BotCard's menu — keeps the
              card grammar consistent and the bottom edge tight. */}
          <div className="flex items-center gap-1.5 shrink-0">
            {actions.map(({ icon: Icon, label, href: actionHref, testId }) => (
              <Tooltip key={testId}>
                <TooltipTrigger asChild>
                  <button
                    aria-label={label}
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(actionHref);
                    }}
                    className="w-8 h-8 rounded-[6px] bg-neutral-50 flex items-center justify-center text-neutral-500 hover:text-violet-600 hover:bg-violet-50 transition-colors"
                    data-testid={testId}
                  >
                    <Icon className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs bg-white text-neutral-700 border border-neutral-200 shadow-md">
                  {label}
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </div>
        {description && (
          <p className="text-sm text-neutral-500 mt-3 line-clamp-2">{description}</p>
        )}
      </div>
    </div>
  );
}
