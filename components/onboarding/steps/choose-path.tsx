"use client";

import { WizardStep } from "../wizard-step";
import { wt } from "@/lib/wizard-typography";
import { AGENT_PLATFORMS } from "@/lib/agent-platforms";
import { Zap, Bot, Monitor, Terminal, Code, Send, type LucideIcon } from "lucide-react";

interface ChoosePathProps {
  currentStep: number;
  totalSteps: number;
  onNext: (agentType: string) => void;
}

const platformIcons: Record<string, LucideIcon> = {
  claude_code: Terminal,
  claude_cowork: Bot,
  codex: Code,
  openclaw: Zap,
  hermes: Send,
  agent: Bot,
  application: Monitor,
};

const agentTypes = AGENT_PLATFORMS.map((p) => ({
  id: p.id,
  label: p.onboardingLabel,
  icon: platformIcons[p.id] || Bot,
  enabled: true,
}));

export function ChoosePath({ currentStep, totalSteps, onNext }: ChoosePathProps) {
  return (
    <WizardStep
      title="What kind of agent are you connecting?"
      currentStep={currentStep}
      totalSteps={totalSteps}
      showBack={false}
    >
      <div className="space-y-3">
        {agentTypes.map((type) => {
          const Icon = type.icon;
          return (
            <button
              key={type.id}
              onClick={() => type.enabled && onNext(type.id)}
              className={`w-full px-5 py-2 rounded-2xl border-2 text-left transition-all ${
                type.enabled
                  ? "border-neutral-200 bg-white hover:border-primary hover:bg-primary/5 cursor-pointer"
                  : "border-neutral-100 bg-neutral-50 opacity-60 cursor-not-allowed"
              }`}
              disabled={!type.enabled}
              data-testid={`option-${type.id}`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  type.enabled ? "bg-neutral-100" : "bg-neutral-100/50"
                }`}>
                  <Icon className={`w-5 h-5 ${type.enabled ? "text-neutral-500" : "text-neutral-400"}`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className={`font-semibold ${wt.body} ${type.enabled ? "text-neutral-900" : "text-neutral-500"}`}>
                      {type.label}
                    </p>
                    {!type.enabled && (
                      <span
                        className="text-[10px] font-semibold uppercase tracking-wide bg-neutral-200 text-neutral-500 px-2 py-0.5 rounded-full"
                        data-testid={`badge-coming-soon-${type.id}`}
                      >
                        Coming soon
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </WizardStep>
  );
}
