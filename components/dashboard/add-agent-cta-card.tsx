"use client";

import Link from "next/link";
import { Plus } from "lucide-react";

// Skeleton/CTA card shown next to the in-house agent when the owner has no
// external agents yet — the in-house agent must not read as "you're done".
export function AddAgentCtaCard() {
  return (
    <Link href="/add-agent" className="block h-full" data-testid="card-add-agent-cta">
      <div className="h-full min-h-[140px] rounded-2xl border-2 border-dashed border-neutral-200 bg-neutral-50/50 hover:border-primary/40 hover:bg-primary/5 transition-colors flex flex-col items-center justify-center gap-2 p-5 cursor-pointer">
        <div className="w-10 h-10 rounded-xl bg-white border border-neutral-200 flex items-center justify-center">
          <Plus className="w-5 h-5 text-neutral-400" />
        </div>
        <p className="font-semibold text-neutral-700 text-sm">Add your own agent</p>
        <p className="text-xs text-neutral-400 text-center">Connect Claude Code, OpenClaw, or any agent</p>
      </div>
    </Link>
  );
}
