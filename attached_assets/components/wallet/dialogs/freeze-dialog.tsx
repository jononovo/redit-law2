"use client";

import { Loader2, Snowflake, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface FreezeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemName: string;
  isFrozen: boolean;
  loading: boolean;
  onConfirm: () => void;
  itemType?: "card" | "wallet";
}

export function FreezeDialog({
  open,
  onOpenChange,
  itemName,
  isFrozen,
  loading,
  onConfirm,
  itemType = "card",
}: FreezeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogTitle className="flex items-center gap-2">
          {isFrozen ? (
            <><Play className="w-5 h-5 text-emerald-600" /> Unfreeze {itemType === "card" ? "Card" : "Wallet"}</>
          ) : (
            <><Snowflake className="w-5 h-5 text-blue-500" /> Freeze {itemType === "card" ? "Card" : "Wallet"}</>
          )}
        </DialogTitle>
        <DialogDescription className="text-neutral-600">
          {isFrozen
            ? `Are you sure you want to unfreeze "${itemName}"? Transactions will be allowed again.`
            : `Are you sure you want to freeze "${itemName}"? All transactions will be blocked until you unfreeze it.`
          }
        </DialogDescription>
        <div className="flex justify-end gap-3 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading} data-testid="button-freeze-cancel">
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={loading}
            className={isFrozen ? "bg-emerald-600 hover:bg-emerald-700" : "bg-blue-600 hover:bg-blue-700"}
            data-testid="button-freeze-confirm"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            {isFrozen ? "Unfreeze" : "Freeze"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
