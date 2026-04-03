"use client";

import { Check, Loader2, Circle } from "lucide-react";

export interface ScanStage {
  label: string;
}

export const SCAN_STAGES: ScanStage[] = [
  { label: "Resolving domain" },
  { label: "Exploring site structure" },
  { label: "Analyzing agent readiness" },
  { label: "Classifying brand & categories" },
  { label: "Scoring discoverability" },
  { label: "Checking checkout & reliability" },
  { label: "Building metadata & skill.json" },
  { label: "Generating SKILL.md" },
  { label: "Complete" },
];

export type ScanProgressStatus = "idle" | "scanning" | "done" | "error";

interface ScanProgressProps {
  status: ScanProgressStatus;
  currentStage: number;
  errorMessage?: string;
}

export function ScanProgress({ status, currentStage, errorMessage }: ScanProgressProps) {
  if (status === "idle") return null;

  return (
    <div className="mt-4 space-y-0" data-testid="scan-progress">
      {SCAN_STAGES.map((stage, i) => {
        const isLast = i === SCAN_STAGES.length - 1;

        let state: "done" | "active" | "pending" | "error" = "pending";
        if (status === "done") {
          state = "done";
        } else if (status === "error") {
          if (i < currentStage) state = "done";
          else if (i === currentStage) state = "error";
          else state = "pending";
        } else {
          if (i < currentStage) state = "done";
          else if (i === currentStage) state = "active";
          else state = "pending";
        }

        if (isLast && status !== "done") {
          if (status === "error") state = "pending";
          else state = "pending";
        }

        return (
          <div key={i} className="flex items-center gap-3" data-testid={`scan-stage-${i}`}>
            <div className="flex flex-col items-center w-5">
              <div className="flex items-center justify-center w-5 h-5">
                {state === "done" && (
                  <Check className="w-3.5 h-3.5 text-emerald-400" strokeWidth={3} />
                )}
                {state === "active" && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-current opacity-80" />
                )}
                {state === "error" && (
                  <Circle className="w-2.5 h-2.5 fill-red-400 text-red-400" />
                )}
                {state === "pending" && (
                  <Circle className="w-2 h-2 fill-current text-current opacity-20" />
                )}
              </div>
              {!isLast && (
                <div className={`w-px h-4 ${state === "done" ? "bg-emerald-400/30" : "bg-current opacity-10"}`} />
              )}
            </div>

            <span
              className={`text-sm font-medium leading-5 ${
                state === "done"
                  ? "text-current opacity-60"
                  : state === "active"
                  ? "text-current opacity-100"
                  : state === "error"
                  ? "text-red-400"
                  : "text-current opacity-25"
              }`}
            >
              {isLast && status === "done" ? (
                <span className="text-emerald-400 font-bold">{stage.label}</span>
              ) : (
                stage.label
              )}
            </span>
          </div>
        );
      })}

      {status === "error" && errorMessage && (
        <p className="text-sm font-mono text-red-400 mt-2 pl-8" data-testid="text-scan-error">
          {errorMessage}
        </p>
      )}
    </div>
  );
}

