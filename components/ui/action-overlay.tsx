"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ActionOverlayProps {
  open: boolean;
  children: ReactNode;
  className?: string;
}

export function ActionOverlay({ open, children, className }: ActionOverlayProps) {
  if (!open) return null;

  return (
    <div
      data-testid="action-overlay"
      className={cn(
        "fixed inset-0 z-[45] flex items-center justify-center",
        "bg-black/60 backdrop-blur-sm",
        "animate-in fade-in-0 duration-300",
        className,
      )}
    >
      {children}
    </div>
  );
}
