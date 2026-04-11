"use client";

import { useState } from "react";
import { Bot, Clock, CheckCircle, MoreVertical, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BotSettingsDialog } from "@/components/dashboard/bot-settings-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface BotCardProps {
  botName: string;
  botId: string;
  description?: string | null;
  walletStatus: string;
  webhookStatus?: string;
  tunnelStatus?: string;
  callbackUrl?: string | null;
  createdAt: string;
  claimedAt?: string | null;
  onUpdated?: () => void;
}

export function BotCard({ botName, botId, description, walletStatus, webhookStatus, tunnelStatus, callbackUrl, createdAt, claimedAt, onUpdated }: BotCardProps) {
  const isActive = walletStatus === "active";
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div
      className="bg-white rounded-2xl border border-neutral-100 shadow-sm hover:shadow-md transition-shadow"
      data-testid={`bot-card-${botId}`}
    >
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isActive ? "bg-green-50" : "bg-neutral-100"}`}>
              <Bot className={`w-5 h-5 ${isActive ? "text-green-600" : "text-neutral-400"}`} />
            </div>
            <div>
              <h3 className="font-bold text-neutral-900">{botName}</h3>
              <p className="text-xs text-neutral-400 font-mono">{botId}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full ${
                isActive
                  ? "bg-green-50 text-green-700"
                  : "bg-amber-50 text-amber-700"
              }`}
              data-testid={`status-${botId}`}
            >
              {isActive ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
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
                  <Settings className="w-4 h-4 mr-2" /> Bot Settings
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {description && (
          <p className="text-sm text-neutral-500 mb-4 line-clamp-2">{description}</p>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-xs text-neutral-400">
            <span>Registered {new Date(createdAt).toLocaleDateString()}</span>
            {claimedAt && (
              <span>Claimed {new Date(claimedAt).toLocaleDateString()}</span>
            )}
          </div>
        </div>
      </div>

      <BotSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        botId={botId}
        botName={botName}
        callbackUrl={callbackUrl}
        webhookStatus={webhookStatus}
        tunnelStatus={tunnelStatus}
        description={description}
        onUpdated={onUpdated || (() => {})}
      />
    </div>
  );
}
