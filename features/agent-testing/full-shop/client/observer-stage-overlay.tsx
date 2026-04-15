"use client";

import { useState } from "react";
import { useShopTest } from "./shop-test-context";
import { FULL_SHOP_STAGES, STAGE_LABELS } from "../shared/constants";
import type { DerivedStageGate } from "../shared/types";

type StageStatus = "pending" | "active" | "passed" | "inaccurate";

function getStageStatus(
  stage: string,
  gates: DerivedStageGate[],
  currentStage: string | null,
): StageStatus {
  const gate = gates.find((g) => g.stage === stage);

  if (!gate || gate.eventCount === 0) return "pending";
  if (stage === currentStage) return "active";
  if (gate.stagePassed) return "passed";
  return "inaccurate";
}

function StageIcon({ status }: { status: StageStatus }) {
  switch (status) {
    case "passed":
      return (
        <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
          <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      );
    case "inaccurate":
      return (
        <div className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
          <svg className="w-3 h-3 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01" />
          </svg>
        </div>
      );
    case "active":
      return (
        <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
          <span
            className="block w-3 h-3 rounded-full animate-pulse"
            style={{ backgroundColor: "hsl(10, 85%, 55%)" }}
          />
        </div>
      );
    default:
      return (
        <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
          <span className="block w-2.5 h-2.5 rounded-full border-2 border-gray-300" />
        </div>
      );
  }
}

function StageRow({
  stage,
  label,
  status,
  isLast,
}: {
  stage: string;
  label: string;
  status: StageStatus;
  isLast: boolean;
}) {
  const labelColor =
    status === "active"
      ? "text-gray-900 font-semibold"
      : status === "pending"
        ? "text-gray-400"
        : "text-gray-700";

  return (
    <div className="flex items-start gap-3 relative" data-testid={`stage-row-${stage}`}>
      <div className="flex flex-col items-center">
        <StageIcon status={status} />
        {!isLast && (
          <div
            className={`w-px h-5 mt-0.5 ${
              status === "pending" ? "bg-gray-200" : "bg-gray-300"
            }`}
          />
        )}
      </div>
      <span className={`text-sm leading-5 ${labelColor}`}>{label}</span>
    </div>
  );
}

export function ObserverStageOverlay() {
  const { isObserver, stageGates, currentStage, testStatus } = useShopTest();
  const [isExpanded, setIsExpanded] = useState(true);

  if (!isObserver) return null;

  const isComplete = testStatus === "scored" || testStatus === "submitted";

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        data-testid="button-expand-overlay"
        className="fixed left-0 top-1/2 -translate-y-1/2 z-50 bg-white shadow-lg rounded-r-lg px-1.5 py-4 hover:bg-gray-50 transition-colors border border-l-0 border-gray-200"
        style={{ borderLeftColor: "hsl(260, 90%, 65%)", borderLeftWidth: 3 }}
      >
        <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    );
  }

  return (
    <div
      data-testid="observer-stage-overlay"
      className="fixed left-0 top-1/2 -translate-y-1/2 z-50 bg-white shadow-lg rounded-r-xl overflow-hidden border border-l-0 border-gray-200 transition-all duration-300"
      style={{ width: 220 }}
    >
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{ backgroundColor: "hsl(260, 90%, 65%)" }}
      >
        <span className="text-white text-xs font-semibold tracking-wide uppercase">
          Agent Progress
        </span>
        <button
          onClick={() => setIsExpanded(false)}
          data-testid="button-collapse-overlay"
          className="text-white/80 hover:text-white transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      <div className="px-4 py-3">
        {FULL_SHOP_STAGES.map((stage, idx) => (
          <StageRow
            key={stage}
            stage={stage}
            label={STAGE_LABELS[stage]}
            status={getStageStatus(stage, stageGates, isComplete ? null : currentStage)}
            isLast={idx === FULL_SHOP_STAGES.length - 1}
          />
        ))}
      </div>

      {isComplete && (
        <div
          className="px-4 py-2 border-t border-gray-100 text-center"
          data-testid="overlay-test-complete"
        >
          <span className="text-xs font-medium text-green-600">Test Complete</span>
        </div>
      )}
    </div>
  );
}
