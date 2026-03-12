"use client";

import { useState } from "react";
import { Bot, Clock, CheckCircle, Shield, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SpendingEditor } from "@/components/dashboard/spending-editor";

interface BotCardProps {
  botName: string;
  botId: string;
  description?: string | null;
  walletStatus: string;
  createdAt: string;
  claimedAt?: string | null;
}

export function BotCard({ botName, botId, description, walletStatus, createdAt, claimedAt }: BotCardProps) {
  const isActive = walletStatus === "active";
  const [spendingOpen, setSpendingOpen] = useState(false);

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
          {isActive && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs gap-1.5 text-neutral-500 hover:text-neutral-900"
              onClick={() => setSpendingOpen(!spendingOpen)}
              data-testid={`button-spending-${botId}`}
            >
              <Shield className="w-3.5 h-3.5" />
              Spending Rules
              {spendingOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </Button>
          )}
        </div>
      </div>

      {spendingOpen && isActive && (
        <div className="border-t border-neutral-100 p-6">
          <SpendingEditor botId={botId} botName={botName} />
        </div>
      )}
    </div>
  );
}
