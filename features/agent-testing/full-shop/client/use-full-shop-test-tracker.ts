"use client";

import { useRef, useCallback } from "react";
import {
  FULL_SHOP_EVENT_BATCH_INTERVAL_MS,
  STAGE_NUMBERS,
  type FullShopStage,
} from "../shared/constants";
import type { FullShopFieldEvent } from "../shared/types";

interface TrackerOptions {
  testId: string;
  enabled: boolean;
}

export function useFullShopTestTracker({ testId, enabled }: TrackerOptions) {
  const buffer = useRef<FullShopFieldEvent[]>([]);
  const seqCounter = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentStageRef = useRef<string>("page_arrival");
  const currentPageRef = useRef<string>("");
  const stagesCompletedRef = useRef(0);

  const flush = useCallback(async () => {
    if (buffer.current.length === 0) return;
    const batch = buffer.current.splice(0);

    const stageNum = STAGE_NUMBERS[currentStageRef.current as FullShopStage] ?? 0;

    try {
      await fetch(`/api/v1/agent-testing/tests/${testId}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          events: batch,
          current_stage_number: stageNum,
          stages_completed: stagesCompletedRef.current,
          current_page: currentPageRef.current,
        }),
      });
    } catch (err) {
      console.error("[tracker] flush error:", err);
      buffer.current.unshift(...batch);
    }
  }, [testId]);

  const scheduleFlush = useCallback(() => {
    if (timerRef.current) return;
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      flush();
    }, FULL_SHOP_EVENT_BATCH_INTERVAL_MS);
  }, [flush]);

  const trackEvent = useCallback(
    (
      eventType: string,
      stage: string,
      fieldName: string | null = null,
      valueSnapshot: string | null = null,
      valueLength: number = 0,
    ) => {
      if (!enabled) return;

      const event: FullShopFieldEvent = {
        stage,
        event_type: eventType,
        field_name: fieldName,
        value_snapshot: valueSnapshot,
        value_length: valueLength,
        sequence_num: seqCounter.current++,
        event_timestamp: new Date().toISOString(),
      };

      currentStageRef.current = stage;
      buffer.current.push(event);
      scheduleFlush();
    },
    [enabled, scheduleFlush],
  );

  const setCurrentPage = useCallback((page: string) => {
    currentPageRef.current = page;
  }, []);

  const advanceStage = useCallback((stage: string) => {
    currentStageRef.current = stage;
    const stageNum = STAGE_NUMBERS[stage as FullShopStage] ?? 0;
    if (stageNum > stagesCompletedRef.current) {
      stagesCompletedRef.current = stageNum;
    }
  }, []);

  const forceFlush = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    await flush();
  }, [flush]);

  return { trackEvent, flush: forceFlush, setCurrentPage, advanceStage };
}
