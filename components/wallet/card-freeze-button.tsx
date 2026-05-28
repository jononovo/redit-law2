"use client";

import { Loader2, Snowflake, Play } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CardFreezeButtonProps {
  isFrozen: boolean;
  loading?: boolean;
  onClick: () => void | Promise<void>;
}

export function CardFreezeButton({ isFrozen, loading, onClick }: CardFreezeButtonProps) {
  return (
    <Button
      variant="outline"
      onClick={onClick}
      disabled={loading}
      className={`gap-2 ${isFrozen ? "text-emerald-600 border-emerald-200" : "text-blue-600 border-blue-200"}`}
      data-testid="button-toggle-freeze"
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : isFrozen ? <Play className="w-4 h-4" /> : <Snowflake className="w-4 h-4" />}
      {isFrozen ? "Unfreeze Card" : "Freeze Card"}
    </Button>
  );
}
