"use client";

import { Bot } from "lucide-react";

interface PendingPairingCardProps {
  code: string;
  expiresAt: string;
}

export function PendingPairingCard({ code, expiresAt }: PendingPairingCardProps) {
  return (
    <div
      className="bg-white rounded-2xl border border-dashed border-neutral-200 shadow-sm"
      data-testid={`pending-pairing-card-${code}`}
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center bg-neutral-100">
              <Bot className="w-5 h-5 text-neutral-400" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-neutral-900">Waiting for agent</h3>
              <p className="text-xs text-neutral-400 font-mono">Pairing code {code}</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 shrink-0" data-testid={`status-pairing-${code}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Not connected
          </span>
        </div>

        <p className="text-sm text-neutral-500 mt-3">
          Your agent hasn&apos;t connected yet. Have it register with this pairing code to finish setup.
        </p>

        <div className="flex items-center gap-4 text-xs text-neutral-400 mt-4 pt-3 border-t border-neutral-100">
          <span>Code expires {new Date(expiresAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
        </div>
      </div>
    </div>
  );
}
