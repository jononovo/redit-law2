"use client";

import { useState } from "react";
import { Bot, Copy, Check } from "lucide-react";
import { formatPairingCodeForDisplay } from "@/features/platform-management/agent-management/pairing-code-format";

interface PendingPairingCardProps {
  code: string;
  expiresAt: string;
}

export function PendingPairingCard({ code, expiresAt }: PendingPairingCardProps) {
  const [copied, setCopied] = useState(false);

  function handleCopyInstructions() {
    const displayCode = formatPairingCodeForDisplay(code);
    navigator.clipboard.writeText(`Register at creditclaw.com/SKILL.md\nUse code: ${displayCode}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      className="bg-white rounded-2xl border border-dashed border-neutral-200 shadow-sm"
      data-testid={`pending-pairing-card-${code}`}
    >
      <div className="p-5">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center bg-neutral-100">
            <Bot className="w-5 h-5 text-neutral-400" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-neutral-900">Waiting for agent</h3>
            <p className="text-xs text-neutral-400 font-mono">Pairing code {formatPairingCodeForDisplay(code)}</p>
          </div>
        </div>

        <p className="text-sm text-neutral-500 mt-3">
          Your agent hasn&apos;t connected yet. Have it register with this pairing code to finish setup.
        </p>

        <div className="flex items-center justify-between gap-4 text-xs text-neutral-400 mt-4 pt-3 border-t border-neutral-100">
          <span>Code expires {new Date(expiresAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
          <button
            onClick={handleCopyInstructions}
            className="inline-flex items-center gap-1.5 font-medium text-neutral-500 hover:text-neutral-700 transition-colors cursor-pointer"
            data-testid={`button-copy-instructions-${code}`}
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copied" : "Copy instructions"}
          </button>
        </div>
      </div>
    </div>
  );
}
