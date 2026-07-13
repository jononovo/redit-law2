"use client";

import { useState } from "react";
import { Bot, MoreVertical, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BotSettingsDialog } from "@/components/dashboard/bot-settings-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { agentPlatformLabel } from "@/lib/agent-platforms";

interface BotCardProps {
  botName: string;
  botId: string;
  agentPlatform?: string | null;
  description?: string | null;
  walletStatus: string;
  webhookStatus?: string;
  tunnelStatus?: string;
  callbackUrl?: string | null;
  createdAt: string;
  claimedAt?: string | null;
  onUpdated?: () => void;
}

export function BotCard({ botName, botId, agentPlatform, description, walletStatus, webhookStatus, tunnelStatus, callbackUrl, createdAt, claimedAt, onUpdated }: BotCardProps) {
  const isActive = walletStatus === "active";
  const [settingsOpen, setSettingsOpen] = useState(false);
  const platformLabel = agentPlatformLabel(agentPlatform);

  return (
    <div
      className="bg-white rounded-2xl border border-neutral-100 shadow-sm hover:shadow-md transition-shadow"
      data-testid={`bot-card-${botId}`}
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center ${isActive ? "bg-primary/10" : "bg-neutral-100"}`}>
              <Bot className={`w-5 h-5 ${isActive ? "text-primary" : "text-neutral-400"}`} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-neutral-900 truncate">{botName}</h3>
                {platformLabel && (
                  <span
                    className="shrink-0 text-[10px] font-semibold uppercase tracking-wide border border-neutral-200 text-neutral-500 px-2 py-0.5 rounded-full"
                    data-testid={`badge-platform-${botId}`}
                  >
                    {platformLabel}
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-400 font-mono truncate">{botId}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                isActive ? "text-green-700" : "text-amber-700"
              }`}
              data-testid={`status-${botId}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-green-500" : "bg-amber-500"}`} />
              {isActive ? "Active" : "Pending"}
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-neutral-400 hover:text-neutral-600 cursor-pointer"
                  data-testid={`button-more-${botId}`}
                >
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setSettingsOpen(true)} data-testid={`menu-settings-${botId}`}>
                  <Settings className="w-4 h-4 mr-2" /> Agent Settings
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {description && (
          <p className="text-sm text-neutral-500 mt-3 line-clamp-2">{description}</p>
        )}

        <div className="flex items-center gap-4 text-xs text-neutral-400 mt-4 pt-3 border-t border-neutral-100">
          <span>Registered {new Date(createdAt).toLocaleDateString()}</span>
          {claimedAt && (
            <span>Claimed {new Date(claimedAt).toLocaleDateString()}</span>
          )}
        </div>
      </div>

      <BotSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        botId={botId}
        botName={botName}
        agentPlatform={agentPlatform}
        callbackUrl={callbackUrl}
        webhookStatus={webhookStatus}
        tunnelStatus={tunnelStatus}
        description={description}
        onUpdated={onUpdated || (() => {})}
      />
    </div>
  );
}
