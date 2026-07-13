"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/features/platform-management/auth/auth-context";
import { useOnboardingPairing, PAIRING_CODE_STORAGE_KEY } from "./use-onboarding-pairing";
import { ChoosePath } from "./steps/choose-path";
import { RegisterAgentWithCode } from "./steps/register-agent-with-code";
import { SignInStep } from "./steps/sign-in";
import { ClaimToken } from "./steps/claim-token";
import { AddCardBridge } from "./steps/add-card-bridge";
import { Rail5SetupWizardContent } from "@/components/onboarding/rail5-wizard";
import { Loader2 } from "lucide-react";

interface WizardState {
  agentType: string | null;
  botId: string | null;
  botName: string | null;
  botConnected: boolean;
  isAuthenticated: boolean;
}

type StepId =
  | "choose-agent-type"
  | "register-agent"
  | "sign-in"
  | "claim-token"
  | "add-card-bridge";

const initialState: WizardState = {
  agentType: null,
  botId: null,
  botName: null,
  botConnected: false,
  isAuthenticated: false,
};

const STEPS: StepId[] = ["choose-agent-type", "register-agent", "sign-in", "claim-token", "add-card-bridge"];

export function OnboardingWizardV2() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const stepParam = searchParams.get("step") as StepId | null;
  const { toast } = useToast();
  const { user } = useAuth();

  const [state, setState] = useState<WizardState>(initialState);

  const [currentStepIndex, setCurrentStepIndex] = useState(() => {
    if (stepParam) {
      const idx = STEPS.indexOf(stepParam);
      if (idx !== -1) return idx;
    }
    return 0;
  });
  const [transitionClass, setTransitionClass] = useState("wizard-step-active");
  const [showCardWizard, setShowCardWizard] = useState(false);

  const activeSteps = useMemo<StepId[]>(() => STEPS, []);

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

  const goForward = useCallback(() => {
    animateTransition("forward", () => {
      setCurrentStepIndex((prev) => Math.min(prev + 1, activeSteps.length - 1));
    });
  }, [animateTransition, activeSteps.length]);

  const goBack = useCallback(() => {
    animateTransition("back", () => {
      setCurrentStepIndex((prev) => Math.max(prev - 1, 0));
    });
  }, [animateTransition]);

  const goToStep = useCallback((stepId: StepId) => {
    const idx = activeSteps.indexOf(stepId);
    if (idx === -1) return;
    animateTransition("forward", () => {
      setCurrentStepIndex(idx);
    });
  }, [activeSteps, animateTransition]);

  const finishOnboarding = useCallback(() => {
    sessionStorage.removeItem(PAIRING_CODE_STORAGE_KEY);
    import("@/features/platform-management/auth-fetch")
      .then(({ authFetch }) => authFetch("/api/v1/owners/onboarded", { method: "POST" }))
      .catch(() => {});
    router.push("/overview");
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

  const currentStep = activeSteps[currentStepIndex];
  const totalSteps = activeSteps.length;

  const { pairingCode, claiming, handleCodeGenerated, clearPairingCode } = useOnboardingPairing({
    claimEligible: currentStep === "sign-in" || currentStep === "claim-token",
    onAgentLinked: useCallback((botId: string, botName: string) => {
      setState((s) => ({ ...s, botId, botName, botConnected: true }));
      saveAgentPlatform(botId);
      goToStep("add-card-bridge");
    }, [goToStep, saveAgentPlatform]),
    onCodeAdopted: useCallback(() => {
      goToStep("add-card-bridge");
    }, [goToStep]),
    onClaimFallback: useCallback(() => {
      goToStep("claim-token");
    }, [goToStep]),
  });

  function renderStep() {
    switch (currentStep) {
      case "choose-agent-type":
        return (
          <ChoosePath
            currentStep={currentStepIndex}
            totalSteps={totalSteps}
            onNext={(agentType) => {
              setState((s) => ({ ...s, agentType }));
              goForward();
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
              if (user && pairingCode) {
                goToStep("add-card-bridge");
              } else {
                goForward();
              }
            }}
            onSkip={() => {
              clearPairingCode();
              goForward();
            }}
            onAgentRegistered={(botId, botName) => {
              if (user) {
                setState((s) => ({ ...s, botId, botName, botConnected: true }));
                saveAgentPlatform(botId);
                clearPairingCode();
                toast({ title: `${botName} connected`, description: "Your agent is linked to your account." });
                goToStep("add-card-bridge");
              } else {
                setState((s) => ({ ...s, botId, botName }));
                toast({ title: `${botName} registered`, description: "Sign in to finish linking it to your account." });
                goForward();
              }
            }}
            pairingCode={pairingCode}
            onCodeGenerated={handleCodeGenerated}
          />
        );

      case "sign-in":
        return (
          <SignInStep
            currentStep={currentStepIndex}
            totalSteps={totalSteps}
            onBack={goBack}
            onNext={() => {
              setState((s) => ({ ...s, isAuthenticated: true }));
              if (!pairingCode) {
                goForward();
              }
            }}
          />
        );

      case "claim-token":
        if (claiming) {
          return (
            <div className="flex flex-col items-center justify-center py-24 gap-3" data-testid="status-linking-agent">
              <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
              <p className="text-sm text-neutral-500">Linking your agent...</p>
            </div>
          );
        }
        return (
          <ClaimToken
            currentStep={currentStepIndex}
            totalSteps={totalSteps}
            onBack={goBack}
            onNext={(botId, botName) => {
              setState((s) => ({ ...s, botId, botName, botConnected: true }));
              saveAgentPlatform(botId);
              goForward();
            }}
            onSkip={goForward}
          />
        );

      case "add-card-bridge":
        return (
          <AddCardBridge
            currentStep={currentStepIndex}
            totalSteps={totalSteps}
            onBack={goBack}
            onNext={() => setShowCardWizard(true)}
            onSkip={finishOnboarding}
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
        onComplete={finishOnboarding}
        onClose={finishOnboarding}
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
          onClick={() => router.push("/overview")}
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
