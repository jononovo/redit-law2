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

  const onEventsRef = useRef(onEvents);
  onEventsRef.current = onEvents;
  const onStatusChangeRef = useRef(onStatusChange);
  onStatusChangeRef.current = onStatusChange;
  const onTimeoutRef = useRef(onTimeout);
  onTimeoutRef.current = onTimeout;

  const poll = useCallback(async () => {
    if (!activeRef.current) return;

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
    }

    if (!activeRef.current) return;

    const interval =
      idleCount.current >= OBSERVER_IDLE_THRESHOLD
        ? OBSERVER_POLL_INTERVAL_SLOW_MS
        : OBSERVER_POLL_INTERVAL_FAST_MS;

    timerRef.current = setTimeout(poll, interval);
  }, [testId, ownerToken]);

  useEffect(() => {
    if (!enabled) return;
    timerRef.current = setTimeout(poll, OBSERVER_POLL_INTERVAL_FAST_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [enabled, poll]);

  const updateSeqNum = useCallback((seq: number) => {
    lastSeqNum.current = seq;
  }, []);

  return { updateSeqNum };
}
