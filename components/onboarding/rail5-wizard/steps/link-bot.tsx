"use client";

import { Loader2, ArrowRight, Bot, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { wt } from "@/lib/wizard-typography";
import { StepHeader } from "../step-header";
import { type BotOption } from "../types";

interface LinkBotProps {
  bots: BotOption[];
  selectedBotId: string;
  setSelectedBotId: (v: string) => void;
  botsLoading: boolean;
  botsFetched: boolean;
  setBotsFetched: (v: boolean) => void;
  loading: boolean;
  onSkip: () => void;
  onLink: () => void;
}

export function LinkBot({
  bots, selectedBotId, setSelectedBotId,
  botsLoading, botsFetched, setBotsFetched,
  loading, onSkip, onLink,
}: LinkBotProps) {
  return (
    <div className="space-y-6" data-testid="r5-step-bot">
      <StepHeader icon={Bot} iconBg="bg-blue-50" iconColor="text-blue-600" title="Link a Bot" tooltip="Choose which bot can use this card for purchases." />

      {botsLoading && (
        <div className="flex flex-col items-center justify-center py-4 gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
          <p className="text-xs text-neutral-400">Loading your bots...</p>
        </div>
      )}

      {!botsLoading && botsFetched && bots.length === 0 && (
        <div className="text-center py-4 space-y-2">
          <p className="text-sm text-neutral-500">No bots found. You can link one later from the card settings.</p>
          <Button variant="ghost" size="sm" onClick={() => { setBotsFetched(false); }} data-testid="button-r5-retry-bots">
            Retry
          </Button>
        </div>
      )}

      {!botsLoading && bots.length > 0 && (
        <div className="space-y-2">
          {bots.map((bot) => (
            <button
              key={bot.bot_id}
              onClick={() => setSelectedBotId(bot.bot_id === selectedBotId ? "" : bot.bot_id)}
              className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                selectedBotId === bot.bot_id
                  ? "border-primary bg-primary/5"
                  : "border-neutral-100 hover:border-neutral-200"
              }`}
              data-testid={`button-r5-select-bot-${bot.bot_id}`}
            >
              <div className="flex items-center gap-3">
                <Bot className={`w-5 h-5 ${selectedBotId === bot.bot_id ? "text-primary" : "text-neutral-500"}`} />
                <div>
                  <p className="font-medium text-neutral-900 text-sm">{bot.bot_name}</p>
                  <p className="text-xs text-neutral-400">{bot.bot_id}</p>
                </div>
                {selectedBotId === bot.bot_id && (
                  <CheckCircle2 className="w-5 h-5 text-primary ml-auto" />
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-3">
        <Button variant="outline" onClick={onSkip} className={`flex-1 ${wt.secondaryButton}`} data-testid="button-r5-skip-bot">
          Skip for Now
        </Button>
        <Button
          onClick={onLink}
          disabled={loading || botsLoading || (!selectedBotId && bots.length > 0)}
          className={`flex-1 ${wt.primaryButton} gap-2`}
          data-testid="button-r5-link-bot"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
          {selectedBotId ? "Link & Continue" : bots.length === 0 ? "Continue" : "Select a Bot"}
        </Button>
      </div>
    </div>
  );
}
