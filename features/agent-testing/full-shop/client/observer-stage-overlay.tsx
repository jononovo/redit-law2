"use client";

import { useState, useEffect } from "react";
import { useShopTest } from "./shop-test-context";
import { FULL_SHOP_STAGES, STAGE_LABELS } from "../shared/constants";
import type { DerivedStageGate } from "../shared/types";

type StageStatus = "pending" | "active" | "passed" | "inaccurate";

const FIELD_DISPLAY_LABELS: Record<string, string> = {
  searchQuery: "Search query",
  product: "Product",
  color: "Color",
  size: "Size",
  quantity: "Quantity",
  fullName: "Full name",
  street: "Street",
  city: "City",
  state: "State",
  zip: "ZIP code",
  shippingMethod: "Shipping",
  paymentMethod: "Payment method",
  cardholderName: "Cardholder",
  cardNumber: "Card number",
  expiryMonth: "Exp. month",
  expiryYear: "Exp. year",
  cvv: "CVV",
  billingZip: "Billing ZIP",
  termsChecked: "Terms accepted",
};

const STAGE_DESCRIPTIONS: Record<string, string> = {
  page_arrival: "Arrive at homepage",
  add_to_cart: "Click Add to Cart",
  cart_review: "Review cart contents",
};

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

function maskSensitive(field: string, value: string): string {
  if (field === "cardNumber" && value.length >= 8) {
    const digits = value.replace(/\D/g, "");
    return `•••• ${digits.slice(-4)}`;
  }
  if (field === "cvv") return "***";
  return value;
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch {
    return "";
  }
}

function getLastTriggeredEvent(gate: DerivedStageGate): { label: string; timestamp: string } | null {
  const fields = Object.entries(gate.fieldMatches);
  if (fields.length === 0) {
    if (gate.eventCount > 0 && gate.completedAt) {
      return {
        label: STAGE_DESCRIPTIONS[gate.stage] ?? "Stage reached",
        timestamp: gate.completedAt,
      };
    }
    return null;
  }

  let latest: { field: string; ts: string; match: boolean; actual: string } | null = null;
  for (const [field, result] of fields) {
    if (result.timestamp && (!latest || new Date(result.timestamp).getTime() > new Date(latest.ts).getTime())) {
      latest = { field, ts: result.timestamp, match: result.match, actual: result.actual };
    }
  }

  if (!latest) return null;

  const displayLabel = FIELD_DISPLAY_LABELS[latest.field] ?? latest.field;
  const displayValue = maskSensitive(latest.field, latest.actual);

  const label = latest.actual
    ? `${displayLabel}: "${displayValue}"`
    : `${displayLabel}: waiting...`;

  return { label, timestamp: latest.ts };
}

function StageIcon({ status }: { status: StageStatus }) {
  switch (status) {
    case "passed":
      return (
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: "hsla(142, 71%, 45%, 0.15)" }}
        >
          <svg className="w-3.5 h-3.5" style={{ color: "hsl(142, 71%, 45%)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      );
    case "inaccurate":
      return (
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: "hsla(10, 85%, 55%, 0.12)" }}
        >
          <svg className="w-3.5 h-3.5" style={{ color: "hsl(10, 85%, 55%)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01" />
          </svg>
        </div>
      );
    case "active":
      return (
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: "hsla(10, 85%, 55%, 0.12)" }}
        >
          <span
            className="block w-3 h-3 rounded-full animate-pulse"
            style={{ backgroundColor: "hsl(10, 85%, 55%)" }}
          />
        </div>
      );
    default:
      return (
        <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
          <span
            className="block w-3 h-3 rounded-full"
            style={{ border: "2px solid hsl(222, 10%, 75%)" }}
          />
        </div>
      );
  }
}

function StageRow({
  stage,
  gate,
  status,
  isLast,
  isExpanded,
  onToggle,
}: {
  stage: string;
  gate: DerivedStageGate | undefined;
  status: StageStatus;
  isLast: boolean;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const label = STAGE_LABELS[stage as keyof typeof STAGE_LABELS];

  const labelColor =
    status === "passed"
      ? "hsl(142, 50%, 30%)"
      : status === "inaccurate"
        ? "hsl(10, 70%, 40%)"
        : status === "active"
          ? "hsl(222, 47%, 11%)"
          : "hsl(222, 10%, 55%)";

  const hasDetails = gate && gate.eventCount > 0;
  const lastEvent = gate ? getLastTriggeredEvent(gate) : null;

  return (
    <div data-testid={`stage-row-${stage}`}>
      <button
        onClick={onToggle}
        className="flex items-center gap-3 w-full text-left group relative py-0.5"
        data-testid={`button-stage-toggle-${stage}`}
      >
        <div className="flex flex-col items-center">
          <StageIcon status={status} />
          {!isLast && (
            <div
              className="w-px h-4 mt-0.5"
              style={{
                backgroundColor:
                  status === "pending" ? "hsl(222, 10%, 85%)" : "hsl(222, 10%, 70%)",
              }}
            />
          )}
        </div>
        <span
          className="text-sm leading-5 flex-1"
          style={{
            color: labelColor,
            fontWeight: status === "active" || status === "passed" || status === "inaccurate" ? 600 : 400,
          }}
        >
          {label}
        </span>
        <svg
          className={`w-3.5 h-3.5 transition-transform duration-200 flex-shrink-0 ${isExpanded ? "rotate-90" : ""}`}
          style={{
            color: status === "pending" ? "hsl(222, 10%, 70%)" : "hsl(222, 47%, 40%)",
          }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {isExpanded && (
        <div
          className="ml-6 mt-1 mb-2 pl-4 rounded-lg py-2 px-3"
          style={{
            backgroundColor: "hsl(210, 40%, 96%)",
            borderLeft: "3px solid hsl(220, 10%, 30%)",
          }}
        >
          {STAGE_DESCRIPTIONS[stage] ? (
            <p className="text-xs italic" style={{ color: "hsl(222, 47%, 40%)" }}>
              {STAGE_DESCRIPTIONS[stage]}
            </p>
          ) : gate ? (
            <div className="space-y-1">
              {Object.entries(gate.expectedValues).map(([field, expected]) => {
                const match = gate.fieldMatches[field];
                const displayLabel = FIELD_DISPLAY_LABELS[field] ?? field;
                const displayExpected = maskSensitive(field, expected);
                return (
                  <div
                    key={field}
                    className="text-xs flex items-start gap-1.5"
                    data-testid={`stage-field-${stage}-${field}`}
                  >
                    <span style={{ color: "hsl(222, 47%, 40%)" }}>{displayLabel}:</span>
                    <span style={{ color: "hsl(222, 47%, 25%)" }}>{displayExpected}</span>
                    {match && match.actual && (
                      match.match ? (
                        <svg className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: "hsl(142, 71%, 45%)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: "hsl(10, 85%, 55%)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs italic" style={{ color: "hsl(222, 10%, 55%)" }}>Not reached yet</p>
          )}

          {hasDetails && lastEvent && (
            <div
              className="mt-2 pt-2 text-xs"
              style={{ borderTop: "1px solid hsl(222, 10%, 85%)" }}
              data-testid={`stage-last-event-${stage}`}
            >
              <div className="flex items-start gap-1.5">
                {status === "passed" ? (
                  <svg className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color: "hsl(142, 71%, 45%)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                ) : status === "inaccurate" ? (
                  <svg className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color: "hsl(10, 85%, 55%)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01" />
                  </svg>
                ) : (
                  <span
                    className="block w-2 h-2 rounded-full mt-1 flex-shrink-0 animate-pulse"
                    style={{ backgroundColor: "hsl(10, 85%, 55%)" }}
                  />
                )}
                <span className="flex-1" style={{ color: "hsl(222, 47%, 35%)" }}>{lastEvent.label}</span>
              </div>
              <div
                className="mt-1 tabular-nums"
                style={{ color: "hsl(222, 10%, 55%)", fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", marginLeft: "18px" }}
              >
                {formatTime(lastEvent.timestamp)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ObserverStageOverlay() {
  const { isObserver, stageGates, currentStage, testStatus } = useShopTest();
  const [isExpanded, setIsExpanded] = useState(true);
  const [expandedStage, setExpandedStage] = useState<string | null>(FULL_SHOP_STAGES[0]);

  useEffect(() => {
    if (currentStage) setExpandedStage(currentStage);
  }, [currentStage]);

  if (!isObserver) return null;

  const isComplete = testStatus === "scored" || testStatus === "submitted";

  const toggleStage = (stage: string) => {
    setExpandedStage(stage);
  };

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        data-testid="button-expand-overlay"
        className="fixed left-0 top-1/2 -translate-y-1/2 z-50 px-2 py-5 transition-all"
        style={{
          backgroundColor: "rgba(255, 255, 255, 0.85)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderRadius: "0 16px 16px 0",
          boxShadow: "4px 4px 20px hsla(220, 15%, 15%, 0.15), 0 2px 8px hsla(220, 10%, 30%, 0.1)",
          border: "1px solid hsla(222, 10%, 85%, 0.6)",
          borderLeftWidth: 0,
        }}
      >
        <svg className="w-4 h-4" style={{ color: "hsl(220, 10%, 30%)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    );
  }

  return (
    <div
      data-testid="observer-stage-overlay"
      className="fixed left-0 top-1/2 -translate-y-1/2 z-50 overflow-hidden transition-all duration-300"
      style={{
        width: 260,
        backgroundColor: "rgba(255, 255, 255, 0.88)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderRadius: "0 16px 16px 0",
        boxShadow: "6px 6px 30px hsla(220, 15%, 15%, 0.12), 0 4px 12px hsla(220, 10%, 30%, 0.08)",
        border: "1px solid hsla(222, 10%, 85%, 0.5)",
        borderLeftWidth: 0,
      }}
    >
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{
          backgroundColor: "hsl(220, 15%, 15%)",
          borderRadius: "0 16px 0 0",
        }}
      >
        <span
          className="text-white text-xs font-bold tracking-wider uppercase"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          Agent Progress
        </span>
        <button
          onClick={() => setIsExpanded(false)}
          data-testid="button-collapse-overlay"
          className="text-white/80 hover:text-white transition-colors w-7 h-7 flex items-center justify-center rounded-full"
          style={{ backgroundColor: "rgba(255,255,255,0.15)" }}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      <div className="px-4 py-3">
        {FULL_SHOP_STAGES.map((stage, idx) => {
          const gate = stageGates.find((g) => g.stage === stage);
          return (
            <StageRow
              key={stage}
              stage={stage}
              gate={gate}
              status={getStageStatus(stage, stageGates, isComplete ? null : currentStage)}
              isLast={idx === FULL_SHOP_STAGES.length - 1}
              isExpanded={expandedStage === stage}
              onToggle={() => toggleStage(stage)}
            />
          );
        })}
      </div>

      {isComplete && (
        <div
          className="px-4 py-2.5 text-center"
          style={{
            borderTop: "1px solid hsl(222, 10%, 90%)",
            background: "hsla(142, 71%, 45%, 0.06)",
          }}
          data-testid="overlay-test-complete"
        >
          <span
            className="text-xs font-semibold"
            style={{ color: "hsl(142, 71%, 45%)" }}
          >
            Test Complete
          </span>
        </div>
      )}
    </div>
  );
}
