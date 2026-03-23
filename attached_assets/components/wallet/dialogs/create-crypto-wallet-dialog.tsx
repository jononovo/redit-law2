"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { authFetch } from "@/lib/auth-fetch";
import { useToast } from "@/hooks/use-toast";
import type { BotInfo } from "@/components/wallet/types";

export interface CreateCryptoWalletDialogConfig {
  title: string;
  description: string;
  endpoint: string;
  buttonLabel: string;
  buttonIcon?: React.ReactNode;
  successMessage: string;
  successDescription?: string;
}

interface CreateCryptoWalletDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bots: BotInfo[];
  config: CreateCryptoWalletDialogConfig;
  onCreated: () => void;
}

export function CreateCryptoWalletDialog({
  open,
  onOpenChange,
  bots,
  config,
  onCreated,
}: CreateCryptoWalletDialogProps) {
  const { toast } = useToast();
  const [selectedBotId, setSelectedBotId] = useState("");
  const [creating, setCreating] = useState(false);

  async function handleCreate() {
    if (!selectedBotId) return;
    setCreating(true);
    try {
      const res = await authFetch(config.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bot_id: selectedBotId }),
      });
      if (res.ok) {
        toast({ title: config.successMessage, description: config.successDescription });
        onOpenChange(false);
        setSelectedBotId("");
        onCreated();
      } else {
        const err = await res.json();
        toast({ title: "Error", description: err.error || "Failed to create wallet", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Something went wrong", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setSelectedBotId(""); }}>
      <DialogContent className="sm:max-w-md">
        <DialogTitle>{config.title}</DialogTitle>
        <DialogDescription>{config.description}</DialogDescription>
        <div className="space-y-4 mt-4">
          <div>
            <Label>Select Bot</Label>
            <select
              className="w-full mt-1.5 border rounded-lg px-3 py-2 text-sm bg-white"
              value={selectedBotId}
              onChange={(e) => setSelectedBotId(e.target.value)}
              data-testid="select-bot-create"
            >
              <option value="">Choose a bot...</option>
              {bots.map((bot) => (
                <option key={bot.bot_id} value={bot.bot_id}>{bot.bot_name}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-create">
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!selectedBotId || creating}
              className="bg-primary hover:bg-primary/90"
              data-testid="button-confirm-create"
            >
              {creating && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {config.buttonIcon && !creating && <span className="mr-2">{config.buttonIcon}</span>}
              {config.buttonLabel}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
