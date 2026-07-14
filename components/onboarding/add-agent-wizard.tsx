"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ChoosePath } from "./steps/choose-path";
import { RegisterAgentWithCode } from "./steps/register-agent-with-code";
import { ClaimToken } from "./steps/claim-token";
import { AddCardBridge } from "./steps/add-card-bridge";
import { Rail5SetupWizardContent } from "@/components/onboarding/rail5-wizard";

export const ADD_AGENT_PAIRING_CODE_STORAGE_KEY = "creditclaw_add_agent_pairing_code";

type StepId = "choose-agent-type" | "register-agent" | "claim-token" | "add-card-bridge";

const STEPS: StepId[] = ["choose-agent-type", "register-agent", "claim-token", "add-card-bridge"];

interface AddAgentWizardState {
  agentType: string | null;
  botId: string | null;
  botName: string | null;
  bridgeReturnStep: StepId;
}

export function AddAgentWizard() {
  const router = useRouter();
  const { toast } = useToast();

  const [state, setState] = useState<AddAgentWizardState>({
    agentType: null,
    botId: null,
    botName: null,
    bridgeReturnStep: "register-agent",
  });
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [transitionClass, setTransitionClass] = useState("wizard-step-active");
  const [showCardWizard, setShowCardWizard] = useState(false);

  const [pairingCode, setPairingCode] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return sessionStorage.getItem(ADD_AGENT_PAIRING_CODE_STORAGE_KEY);
  });

  const handleCodeGenerated = useCallback((code: string) => {
    sessionStorage.setItem(ADD_AGENT_PAIRING_CODE_STORAGE_KEY, code);
    setPairingCode(code);
  }, []);

  const clearPairingCode = useCallback(() => {
    sessionStorage.removeItem(ADD_AGENT_PAIRING_CODE_STORAGE_KEY);
    setPairingCode(null);
  }, []);

  const animateTransition = useCallback((direction: "forward" | "back", callback: () => void) => {
    setTransitionClass(direction === "forward" ? "wizard-step-exit" : "wizard-step-exit-back");
    setTimeout(() => {
      callback();
      setTransitionClass(direction === "forward" ? "wizard-step-enter" : "wizard-step-enter-back");
      setTimeout(() => {
        setTransitionClass("wizard-step-active");
      }, 20);
    }, 200);
  }, []);

  const goBack = useCallback(() => {
    animateTransition("back", () => {
      setCurrentStepIndex((prev) => Math.max(prev - 1, 0));
    });
  }, [animateTransition]);

  const goToStep = useCallback((stepId: StepId, direction: "forward" | "back" = "forward") => {
    const idx = STEPS.indexOf(stepId);
    if (idx === -1) return;
    animateTransition(direction, () => {
      setCurrentStepIndex(idx);
    });
  }, [animateTransition]);

  const finishAddAgent = useCallback(() => {
    sessionStorage.removeItem(ADD_AGENT_PAIRING_CODE_STORAGE_KEY);
    router.push("/agents");
  }, [router]);

  const saveAgentPlatform = useCallback(async (botId: string) => {
    const agentType = state.agentType;
    if (!agentType) return;
    try {
      const { authFetch } = await import("@/features/platform-management/auth-fetch");
      await authFetch(`/api/v1/bots/${botId}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent_platform: agentType }),
      });
    } catch {
      // Non-blocking: the platform label can be set later from Bot Settings.
    }
  }, [state.agentType]);

  const currentStep = STEPS[currentStepIndex];
  const totalSteps = STEPS.length;

  function renderStep() {
    switch (currentStep) {
      case "choose-agent-type":
        return (
          <ChoosePath
            currentStep={currentStepIndex}
            totalSteps={totalSteps}
            onNext={(agentType) => {
              setState((s) => ({ ...s, agentType }));
              goToStep("register-agent");
            }}
          />
        );

      case "register-agent":
        return (
          <RegisterAgentWithCode
            currentStep={currentStepIndex}
            totalSteps={totalSteps}
            onBack={goBack}
            onNext={() => {
              setState((s) => ({ ...s, bridgeReturnStep: "register-agent" }));
              goToStep("add-card-bridge");
            }}
            onSkip={() => {
              clearPairingCode();
              goToStep("claim-token");
            }}
            onAgentRegistered={(botId, botName) => {
              setState((s) => ({ ...s, botId, botName, bridgeReturnStep: "register-agent" }));
              clearPairingCode();
              toast({ title: `${botName} connected`, description: "Your agent is linked to your account." });
              goToStep("add-card-bridge");
            }}
            pairingCode={pairingCode}
            onCodeGenerated={handleCodeGenerated}
            agentPlatform={state.agentType || undefined}
          />
        );

      case "claim-token":
        return (
          <ClaimToken
            currentStep={currentStepIndex}
            totalSteps={totalSteps}
            onBack={() => goToStep("register-agent", "back")}
            onNext={(botId, botName) => {
              setState((s) => ({ ...s, botId, botName, bridgeReturnStep: "claim-token" }));
              saveAgentPlatform(botId);
              goToStep("add-card-bridge");
            }}
            onSkip={() => {
              setState((s) => ({ ...s, bridgeReturnStep: "claim-token" }));
              goToStep("add-card-bridge");
            }}
          />
        );

      case "add-card-bridge":
        return (
          <AddCardBridge
            currentStep={currentStepIndex}
            totalSteps={totalSteps}
            onBack={() => goToStep(state.bridgeReturnStep, "back")}
            onNext={() => setShowCardWizard(true)}
            onSkip={finishAddAgent}
          />
        );

      default:
        return null;
    }
  }

  if (showCardWizard) {
    return (
      <Rail5SetupWizardContent
        inline
        preselectedBotId={state.botId || undefined}
        onComplete={finishAddAgent}
        onClose={finishAddAgent}
      />
    );
  }

  return (
    <>
      <style jsx global>{`
        .wizard-step-active {
          opacity: 1;
          transform: translateX(0);
          transition: opacity 0.25s ease, transform 0.25s ease;
        }
        .wizard-step-enter {
          opacity: 0;
          transform: translateX(30px);
        }
        .wizard-step-enter-back {
          opacity: 0;
          transform: translateX(-30px);
        }
        .wizard-step-exit {
          opacity: 0;
          transform: translateX(-30px);
          transition: opacity 0.15s ease, transform 0.15s ease;
        }
        .wizard-step-exit-back {
          opacity: 0;
          transform: translateX(30px);
          transition: opacity 0.15s ease, transform 0.15s ease;
        }
      `}</style>
      <div className="relative">
        <button
          onClick={finishAddAgent}
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-white/80 hover:bg-neutral-100 text-neutral-500 hover:text-neutral-900 transition-colors shadow-sm border border-neutral-200"
          aria-label="Close wizard"
          data-testid="button-close-wizard"
        >
          <X className="w-5 h-5" />
        </button>
        <div className={transitionClass}>
          {renderStep()}
        </div>
      </div>
    </>
  );
}
