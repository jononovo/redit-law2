"use client";

import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { wt } from "@/lib/wizard-typography";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { authFetch } from "@/lib/platform-management/auth-fetch";
import { ApprovalMode, type ApprovalModeValue } from "./steps/approval-mode";
import { ApprovalThreshold } from "./steps/approval-threshold";
import { ApprovedCategories } from "./steps/approved-categories";
import { BlockedCategories } from "./steps/blocked-categories";
import { SpecialInstructions } from "./steps/special-instructions";

interface GuardrailsWizardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface GuardrailsState {
  approvalMode: ApprovalModeValue;
  thresholdCents: number;
  approvedCategories: string[];
  blockedCategories: string[];
  notes: string;
}

const DEFAULT_STATE: GuardrailsState = {
  approvalMode: "ask_for_everything",
  thresholdCents: 2500,
  approvedCategories: [],
  blockedCategories: ["gambling", "adult_content", "cryptocurrency", "cash_advances"],
  notes: "",
};

function DialogWizardStep({
  title,
  subtitle,
  currentStep,
  totalSteps,
  onBack,
  showBack = true,
  children,
}: {
  title: string;
  subtitle?: string;
  currentStep: number;
  totalSteps: number;
  onBack?: () => void;
  showBack?: boolean;
  children: React.ReactNode;
}) {
  const progress = ((currentStep + 1) / totalSteps) * 100;

  return (
    <div className="flex flex-col">
      <div className="w-full bg-neutral-200 h-1.5 rounded-t-lg -mt-6 -mx-6 mb-6" style={{ width: "calc(100% + 48px)" }}>
        <div
          className="h-full bg-primary rounded-r-full"
          style={{ width: `${progress}%`, transition: "width 0.4s ease" }}
        />
      </div>

      {showBack && onBack && (
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-neutral-400 hover:text-neutral-600 mb-6 text-sm cursor-pointer"
          data-testid="button-guardrails-back"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      )}

      <h2 className={`${wt.title} mb-1`}>{title}</h2>
      {subtitle && <p className={`${wt.subtitle} mb-6`}>{subtitle}</p>}
      {!subtitle && <div className="mb-6" />}

      {children}
    </div>
  );
}

export function GuardrailsWizardDialog({ open, onOpenChange }: GuardrailsWizardDialogProps) {
  const [step, setStep] = useState(0);
  const [state, setState] = useState<GuardrailsState>(DEFAULT_STATE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const loadExisting = useCallback(async () => {
    try {
      const [masterRes, procRes] = await Promise.all([
        authFetch("/api/v1/master-guardrails"),
        authFetch("/api/v1/procurement-controls"),
      ]);
      let approvalMode = DEFAULT_STATE.approvalMode;
      let thresholdCents = DEFAULT_STATE.thresholdCents;
      if (masterRes.ok) {
        const masterData = await masterRes.json();
        const cfg = masterData.config || masterData;
        if (cfg.approval_mode) approvalMode = cfg.approval_mode;
        if (cfg.require_approval_above != null) thresholdCents = cfg.require_approval_above;
      }
      let approvedCategories = DEFAULT_STATE.approvedCategories;
      let blockedCategories = DEFAULT_STATE.blockedCategories;
      let notes = DEFAULT_STATE.notes;
      if (procRes.ok) {
        const procData = await procRes.json();
        const master = (procData.controls || []).find((c: any) => c.scope === "master");
        if (master) {
          approvedCategories = master.allowlistedCategories || approvedCategories;
          blockedCategories = master.blocklistedCategories || blockedCategories;
          notes = master.notes || notes;
        }
      }
      setState({ approvalMode, thresholdCents, approvedCategories, blockedCategories, notes });
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      setStep(0);
      setSaved(false);
      setLoading(true);
      loadExisting();
    }
  }, [open, loadExisting]);

  const showThreshold = state.approvalMode === "auto_approve_under_threshold";
  const steps = ["approval-mode", ...(showThreshold ? ["approval-threshold"] : []), "approved-categories", "blocked-categories", "special-instructions"];
  const totalSteps = steps.length;

  const goBack = () => setStep((s) => Math.max(0, s - 1));

  async function handleSave(finalNotes?: string) {
    setSaving(true);
    try {
      const notesValue = finalNotes !== undefined ? finalNotes : state.notes;
      await Promise.all([
        authFetch("/api/v1/master-guardrails", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            approval_mode: state.approvalMode,
            require_approval_above: showThreshold ? state.thresholdCents : null,
          }),
        }),
        authFetch("/api/v1/procurement-controls", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scope: "master",
            allowlisted_categories: state.approvedCategories,
            blocklisted_categories: state.blockedCategories,
            notes: notesValue || null,
          }),
        }),
      ]);
      setSaved(true);
      setTimeout(() => onOpenChange(false), 1500);
    } catch {} finally {
      setSaving(false);
    }
  }

  function renderStep() {
    const currentStepId = steps[step];

    switch (currentStepId) {
      case "approval-mode":
        return (
          <ApprovalMode
            currentStep={step}
            totalSteps={totalSteps}
            onBack={goBack}
            onNext={(mode) => {
              setState((s) => ({ ...s, approvalMode: mode }));
              setStep((s) => s + 1);
            }}
            defaultMode={state.approvalMode}
            Wrapper={DialogWizardStep}
          />
        );

      case "approval-threshold":
        return (
          <ApprovalThreshold
            currentStep={step}
            totalSteps={totalSteps}
            onBack={goBack}
            onNext={(cents) => {
              setState((s) => ({ ...s, thresholdCents: cents }));
              setStep((s) => s + 1);
            }}
            defaultCents={state.thresholdCents}
            Wrapper={DialogWizardStep}
          />
        );

      case "approved-categories":
        return (
          <ApprovedCategories
            currentStep={step}
            totalSteps={totalSteps}
            onBack={goBack}
            onNext={(approved) => {
              setState((s) => ({ ...s, approvedCategories: approved }));
              setStep((s) => s + 1);
            }}
            defaultApproved={state.approvedCategories}
            Wrapper={DialogWizardStep}
          />
        );

      case "blocked-categories":
        return (
          <BlockedCategories
            currentStep={step}
            totalSteps={totalSteps}
            onBack={goBack}
            onNext={(blocked) => {
              setState((s) => ({ ...s, blockedCategories: blocked }));
              setStep((s) => s + 1);
            }}
            defaultBlocked={state.blockedCategories}
            Wrapper={DialogWizardStep}
          />
        );

      case "special-instructions":
        return (
          <SpecialInstructions
            currentStep={step}
            totalSteps={totalSteps}
            onBack={goBack}
            onNext={(notes) => {
              setState((s) => ({ ...s, notes }));
              handleSave(notes);
            }}
            defaultNotes={state.notes}
            Wrapper={DialogWizardStep}
          />
        );

      default:
        return null;
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-lg max-h-[85vh] overflow-y-auto"
        data-testid="guardrails-wizard-dialog"
      >
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
          </div>
        ) : saving ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <p className="text-sm text-neutral-500">Saving your guardrails...</p>
          </div>
        ) : saved ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3" data-testid="guardrails-saved">
            <CheckCircle2 className="w-12 h-12 text-green-500" />
            <p className="font-semibold text-neutral-900">Guardrails saved</p>
            <p className="text-sm text-neutral-500">Your ordering controls are now active.</p>
          </div>
        ) : (
          renderStep()
        )}
      </DialogContent>
    </Dialog>
  );
}
