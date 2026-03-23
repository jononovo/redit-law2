"use client";

import { Loader2, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import type { BotInfo } from "@/components/wallet/types";

interface LinkBotDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemName: string;
  bots: BotInfo[];
  selectedBotId: string;
  onBotIdChange: (botId: string) => void;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  itemType?: "card" | "wallet";
  testIdPrefix?: string;
}

export function LinkBotDialog({
  open,
  onOpenChange,
  itemName,
  bots,
  selectedBotId,
  onBotIdChange,
  loading,
  onConfirm,
  onCancel,
  itemType = "wallet",
  testIdPrefix = "",
}: LinkBotDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogTitle className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-blue-500" />
          Link Agent to {itemType === "card" ? "Card" : "Wallet"}
        </DialogTitle>
        <DialogDescription className="text-neutral-600">
          Select a bot to link to <span className="font-semibold text-neutral-900">"{itemName}"</span>. The bot will be able to use this {itemType} for {itemType === "card" ? "purchases" : "transactions"}.
        </DialogDescription>
        <div className="space-y-4 mt-4">
          <div>
            <Label>Select Bot</Label>
            <select
              className="w-full mt-1.5 border rounded-lg px-3 py-2 text-sm bg-white"
              value={selectedBotId}
              onChange={(e) => onBotIdChange(e.target.value)}
              data-testid={`${testIdPrefix}select-bot-link`}
            >
              <option value="">Choose a bot...</option>
              {bots.map((bot) => (
                <option key={bot.bot_id} value={bot.bot_id}>{bot.bot_name}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onCancel} disabled={loading} data-testid={`${testIdPrefix}button-link-cancel`}>
              Cancel
            </Button>
            <Button
              onClick={onConfirm}
              disabled={!selectedBotId || loading}
              className="bg-primary hover:bg-primary/90"
              data-testid={`${testIdPrefix}button-link-confirm`}
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Link Bot
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
