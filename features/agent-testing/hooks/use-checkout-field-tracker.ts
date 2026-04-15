"use client";

import { useEffect, useRef, useCallback } from "react";
import { FIELD_TESTID_MAP, EVENT_BATCH_INTERVAL_MS, INPUT_DEBOUNCE_MS } from "../constants";
import type { FieldEventInput } from "../types";

interface UseCheckoutFieldTrackerOptions {
  testId: string | null;
  enabled: boolean;
}

export function useCheckoutFieldTracker({ testId, enabled }: UseCheckoutFieldTrackerOptions) {
  const eventsBuffer = useRef<FieldEventInput[]>([]);
  const sequenceRef = useRef(0);
  const flushTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputDebounceTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const sentPageLoad = useRef(false);

  const nextSeq = useCallback(() => ++sequenceRef.current, []);

  const pushEvent = useCallback(
    (eventType: string, fieldName: string | null, valueLength: number = 0) => {
      if (!testId) return;
      eventsBuffer.current.push({
        event_type: eventType,
        field_name: fieldName as any,
        value_length: valueLength,
        sequence_num: nextSeq(),
        event_timestamp: new Date().toISOString(),
      });
    },
    [testId, nextSeq],
  );

  const flush = useCallback(async () => {
    if (!testId || eventsBuffer.current.length === 0) return;

    const batch = [...eventsBuffer.current];
    eventsBuffer.current = [];

    try {
      const res = await fetch(`/api/v1/agent-testing/tests/${testId}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ events: batch }),
      });
      if (!res.ok && res.status !== 429 && res.status !== 410) {
        eventsBuffer.current.unshift(...batch);
      }
    } catch {
      eventsBuffer.current.unshift(...batch);
    }
  }, [testId]);

  const flushBeacon = useCallback(() => {
    if (!testId || eventsBuffer.current.length === 0) return;
    const batch = [...eventsBuffer.current];
    eventsBuffer.current = [];
    try {
      navigator.sendBeacon(
        `/api/v1/agent-testing/tests/${testId}/events`,
        JSON.stringify({ events: batch }),
      );
    } catch {}
  }, [testId]);

  useEffect(() => {
    if (!enabled || !testId) return;

    if (!sentPageLoad.current) {
      pushEvent("page_load", null);
      sentPageLoad.current = true;
      flush();
    }

    const handleFocus = (e: FocusEvent) => {
      const el = e.target as HTMLElement;
      const testid = el.getAttribute("data-testid");
      if (!testid) return;
      const fieldName = FIELD_TESTID_MAP[testid];
      if (!fieldName) return;
      pushEvent("focus", fieldName);
    };

    const handleBlur = (e: FocusEvent) => {
      const el = e.target as HTMLElement;
      const testid = el.getAttribute("data-testid");
      if (!testid) return;
      const fieldName = FIELD_TESTID_MAP[testid];
      if (!fieldName) return;
      const value = (el as HTMLInputElement).value ?? "";
      pushEvent("blur", fieldName, value.length);
    };

    const handleInput = (e: Event) => {
      const el = e.target as HTMLInputElement;
      const testid = el.getAttribute("data-testid");
      if (!testid) return;
      const fieldName = FIELD_TESTID_MAP[testid];
      if (!fieldName) return;

      const existing = inputDebounceTimers.current.get(fieldName);
      if (existing) clearTimeout(existing);

      inputDebounceTimers.current.set(
        fieldName,
        setTimeout(() => {
          const value = el.value ?? "";
          if (value.length === 0) {
            pushEvent("clear", fieldName, 0);
          } else {
            pushEvent("input", fieldName, value.length);
          }
          inputDebounceTimers.current.delete(fieldName);
        }, INPUT_DEBOUNCE_MS),
      );
    };

    const handleSelectChange = (e: Event) => {
      const el = e.target as HTMLElement;
      const trigger = el.closest("[data-testid]");
      if (!trigger) return;
      const testid = trigger.getAttribute("data-testid");
      if (!testid) return;
      const fieldName = FIELD_TESTID_MAP[testid];
      if (fieldName) {
        pushEvent("select", fieldName, 2);
      }
    };

    document.addEventListener("focusin", handleFocus, true);
    document.addEventListener("focusout", handleBlur, true);
    document.addEventListener("input", handleInput, true);
    document.addEventListener("change", handleSelectChange, true);

    flushTimerRef.current = setInterval(flush, EVENT_BATCH_INTERVAL_MS);

    const handleBeforeUnload = () => flushBeacon();
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      document.removeEventListener("focusin", handleFocus, true);
      document.removeEventListener("focusout", handleBlur, true);
      document.removeEventListener("input", handleInput, true);
      document.removeEventListener("change", handleSelectChange, true);
      window.removeEventListener("beforeunload", handleBeforeUnload);

      if (flushTimerRef.current) clearInterval(flushTimerRef.current);

      for (const timer of inputDebounceTimers.current.values()) {
        clearTimeout(timer);
      }
      inputDebounceTimers.current.clear();

      flush();
    };
  }, [enabled, testId, pushEvent, flush, flushBeacon]);

  const sendSubmitClick = useCallback(() => {
    pushEvent("submit_click", null);
    flush();
  }, [pushEvent, flush]);

  return { sendSubmitClick, flush };
}
