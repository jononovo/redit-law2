"use client";

import { useRef } from "react";
import { useShopTest } from "./shop-test-context";

export type OverlayCard = "awaiting_agent" | "approval_required" | null;

const TERMINAL_STATUSES = new Set(["scored", "submitted", "timed_out"]);

export function useObserverOverlay(): OverlayCard {
  const { isObserver, isLoading, testStatus, agentEventCount } = useShopTest();
  const dismissedAtRef = useRef<number | null>(null);

  if (!isObserver || isLoading || TERMINAL_STATUSES.has(testStatus)) {
    return null;
  }

  if (agentEventCount === 0) {
    return "awaiting_agent";
  }

  if (dismissedAtRef.current !== null && agentEventCount > dismissedAtRef.current) {
    return null;
  }

  if (testStatus === "awaiting_approval") {
    if (dismissedAtRef.current === null) {
      dismissedAtRef.current = agentEventCount;
    }
    return "approval_required";
  }

  dismissedAtRef.current = null;
  return null;
}
