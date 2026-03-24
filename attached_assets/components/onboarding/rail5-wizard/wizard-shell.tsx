"use client";

import { ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StepIndicator } from "./step-indicator";
import { TOTAL_STEPS } from "./types";

interface WizardShellProps {
  inline: boolean;
  step: number;
  showExitConfirm: boolean;
  onRequestClose: () => void;
  onConfirmExit: () => void;
  onDismissExit: () => void;
  children: ReactNode;
}

export function WizardShell({
  inline, step, showExitConfirm,
  onRequestClose, onConfirmExit, onDismissExit,
  children,
}: WizardShellProps) {
  const closeButton = (
    <button
      type="button"
      onClick={onRequestClose}
      className={inline
        ? "fixed top-4 right-4 z-20 p-2 rounded-full bg-white/80 hover:bg-neutral-100 text-neutral-500 hover:text-neutral-900 transition-colors shadow-sm border border-neutral-200 cursor-pointer"
        : "absolute -right-4 -top-4 z-20 p-2 rounded-full bg-white/80 hover:bg-neutral-100 text-neutral-500 hover:text-neutral-900 transition-colors shadow-sm border border-neutral-200 cursor-pointer"
      }
      data-testid="button-r5-close"
    >
      <X className="w-5 h-5" />
      <span className="sr-only">Close</span>
    </button>
  );

  const content = (
    <>
      {!inline && closeButton}

      {showExitConfirm && (
        <div className="absolute inset-0 z-50 bg-white/95 rounded-lg flex items-center justify-center p-8">
          <div className="text-center space-y-4 max-w-sm">
            <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mx-auto">
              <X className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-neutral-900">Exit Card Setup?</h3>
            <p className="text-sm text-neutral-500">Your progress will be lost. Are you sure you want to exit?</p>
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={onDismissExit}
                className="flex-1"
                data-testid="button-r5-continue-setup"
              >
                Continue Setup
              </Button>
              <Button
                onClick={onConfirmExit}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                data-testid="button-r5-confirm-exit"
              >
                Exit
              </Button>
            </div>
          </div>
        </div>
      )}

      {step < TOTAL_STEPS && <StepIndicator current={step} total={TOTAL_STEPS} />}

      {children}
    </>
  );

  if (inline) {
    return (
      <div className="min-h-screen flex flex-col bg-neutral-50 relative">
        {closeButton}
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="w-full max-w-2xl relative">
            {content}
          </div>
        </div>
      </div>
    );
  }

  return <div className="relative">{content}</div>;
}
