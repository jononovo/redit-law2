"use client";

import { useRef, useCallback, useEffect } from "react";
import {
  OBSERVER_POLL_INTERVAL_FAST_MS,
  OBSERVER_POLL_INTERVAL_SLOW_MS,
  OBSERVER_IDLE_THRESHOLD,
} from "../shared/constants";
import type { PolledEvent } from "../shared/types";

interface PollerOptions {
  testId: string;
  ownerToken: string;
  enabled: boolean;
  onEvents: (events: PolledEvent[]) => void;
  onStatusChange?: (status: string) => void;
  onTimeout?: () => void;
  initialSeqNum?: number;
}

export function useEventPoller({
  testId,
  ownerToken,
  enabled,
  onEvents,
  onStatusChange,
  onTimeout,
  initialSeqNum = -1,
}: PollerOptions) {
  const lastSeqNum = useRef(initialSeqNum);
  const idleCount = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRef = useRef(enabled);
  activeRef.current = enabled;
  const pollInFlightRef = useRef(false);

  const onEventsRef = useRef(onEvents);
  onEventsRef.current = onEvents;
  const onStatusChangeRef = useRef(onStatusChange);
  onStatusChangeRef.current = onStatusChange;
  const onTimeoutRef = useRef(onTimeout);
  onTimeoutRef.current = onTimeout;

  const poll = useCallback(async () => {
    if (!activeRef.current) return;
    if (pollInFlightRef.current) return;
    pollInFlightRef.current = true;

    try {
      const url = `/api/v1/agent-testing/tests/${testId}/events?since=${lastSeqNum.current}&observe=${ownerToken}`;
      const res = await fetch(url);
      if (res.status === 410) {
        activeRef.current = false;
        onTimeoutRef.current?.();
        return;
      }
      if (!res.ok) return;

      const data = await res.json();
      const events: PolledEvent[] = data.events ?? [];

      if (data.status) {
        onStatusChangeRef.current?.(data.status);
      }

      if (events.length > 0) {
        lastSeqNum.current = events[events.length - 1].sequence_num;
        idleCount.current = 0;
        onEventsRef.current(events);
      } else {
        idleCount.current++;
      }
    } catch (err) {
      console.error("[poller] error:", err);
    } finally {
      pollInFlightRef.current = false;
    }

    if (!activeRef.current) return;

    const interval =
      idleCount.current >= OBSERVER_IDLE_THRESHOLD
        ? OBSERVER_POLL_INTERVAL_SLOW_MS
        : OBSERVER_POLL_INTERVAL_FAST_MS;

    timerRef.current = setTimeout(poll, interval);
  }, [testId, ownerToken]);

  const immediateRefresh = useCallback(() => {
    if (!activeRef.current) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    idleCount.current = 0;
    poll();
  }, [poll]);

  useEffect(() => {
    if (!enabled) return;
    activeRef.current = true;
    timerRef.current = setTimeout(poll, OBSERVER_POLL_INTERVAL_FAST_MS);

    function handleVisibility() {
      if (document.visibilityState === "visible") {
        immediateRefresh();
      }
    }

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      activeRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [enabled, poll, immediateRefresh]);

  const updateSeqNum = useCallback((seq: number) => {
    lastSeqNum.current = seq;
  }, []);

  return { updateSeqNum };
}
