"use client";

import { Loader2, Unlink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface UnlinkBotDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  botName: string;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  itemType?: "card" | "wallet";
  testIdPrefix?: string;
}

export function UnlinkBotDialog({
  open,
  onOpenChange,
  botName,
  loading,
  onConfirm,
  onCancel,
  itemType = "wallet",
  testIdPrefix = "",
}: UnlinkBotDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogTitle className="flex items-center gap-2">
          <Unlink className="w-5 h-5 text-red-500" />
          Unlink Bot
        </DialogTitle>
        <DialogDescription className="text-neutral-600">
          Are you sure you want to unlink <span className="font-semibold text-neutral-900">"{botName}"</span> from this {itemType}? The bot will no longer be able to use this {itemType} for {itemType === "card" ? "purchases" : "transactions"}.
        </DialogDescription>
        <div className="flex justify-end gap-3 mt-4">
          <Button variant="outline" onClick={onCancel} disabled={loading} data-testid={`${testIdPrefix}button-unlink-cancel`}>
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700 text-white"
            data-testid={`${testIdPrefix}button-unlink-confirm`}
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Unlink Bot
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
