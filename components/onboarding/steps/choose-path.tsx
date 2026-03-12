"use client";

import { WizardStep } from "../wizard-step";
import { wt } from "@/lib/wizard-typography";
import { Zap, Bot, Monitor } from "lucide-react";

interface ChoosePathProps {
  currentStep: number;
  totalSteps: number;
  onNext: (agentType: string) => void;
}

const agentTypes = [
  {
    id: "openclaw",
    label: "OpenClaw",
    description: "Write permissions, a webhook is helpful too. Not required.",
    icon: Zap,
    enabled: true,
  },
  {
    id: "agent",
    label: "Agent",
    description: "No write permissions.",
    icon: Bot,
    enabled: false,
  },
  {
    id: "application",
    label: "Application",
    description: "One-time setup of card & webhook.",
    icon: Monitor,
    enabled: false,
  },
];

export function ChoosePath({ currentStep, totalSteps, onNext }: ChoosePathProps) {
  return (
    <WizardStep
      title="What kind of agent are you connecting?"
      subtitle="Choose your agent type"
      currentStep={currentStep}
      totalSteps={totalSteps}
      showBack={false}
    >
      <div className="space-y-4">
        {agentTypes.map((type) => {
          const Icon = type.icon;
          return (
            <button
              key={type.id}
              onClick={() => type.enabled && onNext(type.id)}
              className={`w-full p-6 rounded-2xl border-2 text-left transition-all ${
                type.enabled
                  ? "border-neutral-200 bg-white hover:border-primary hover:bg-primary/5 cursor-pointer"
                  : "border-neutral-100 bg-neutral-50 opacity-60 cursor-not-allowed"
              }`}
              disabled={!type.enabled}
              data-testid={`option-${type.id}`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  type.enabled ? "bg-neutral-100" : "bg-neutral-100/50"
                }`}>
                  <Icon className={`w-6 h-6 ${type.enabled ? "text-neutral-500" : "text-neutral-400"}`} />
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
                  <p className={`${wt.bodySmall} mt-1 ${type.enabled ? "text-neutral-500" : "text-neutral-400"}`}>
                    {type.description}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </WizardStep>
  );
}
