"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { ChoosePath } from "./steps/choose-path";
import { RegisterBot } from "./steps/register-bot";
import { SignInStep } from "./steps/sign-in";
import { ClaimToken } from "./steps/claim-token";
import { AddCardBridge } from "./steps/add-card-bridge";
import { Rail5SetupWizardContent } from "@/components/onboarding/rail5-wizard";

interface WizardState {
  agentType: string | null;
  botId: string | null;
  botName: string | null;
  botConnected: boolean;
  isAuthenticated: boolean;
}

type StepId =
  | "choose-agent-type"
  | "register-bot"
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

const STEPS: StepId[] = ["choose-agent-type", "register-bot", "sign-in", "claim-token", "add-card-bridge"];

export function OnboardingWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const stepParam = searchParams.get("step") as StepId | null;

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

  const finishOnboarding = useCallback(() => {
    fetch("/api/v1/owners/onboarded", { method: "POST" }).catch(() => {});
    router.push("/overview");
  }, [router]);

  useEffect(() => {
    setCurrentStepIndex((prev) => Math.min(prev, activeSteps.length - 1));
  }, [activeSteps.length]);

  const currentStep = activeSteps[currentStepIndex];
  const totalSteps = activeSteps.length;

  useEffect(() => {
    if (state.botConnected && currentStep === "claim-token") {
      goForward();
    }
  }, [state.botConnected, currentStep, goForward]);

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

      case "register-bot":
        return (
          <RegisterBot
            currentStep={currentStepIndex}
            totalSteps={totalSteps}
            onBack={goBack}
            onNext={goForward}
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
              goForward();
            }}
          />
        );

      case "claim-token":
        return (
          <ClaimToken
            currentStep={currentStepIndex}
            totalSteps={totalSteps}
            onBack={goBack}
            onNext={(botId, botName) => {
              setState((s) => ({ ...s, botId, botName, botConnected: true }));
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
