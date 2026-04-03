"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { SCAN_STAGES, type ScanProgressStatus } from "@/components/scan-progress";

export interface ScanResult {
  domain: string;
  slug: string;
  name: string;
  score: number;
  label: string;
}

export function useDomainScan(opts?: { initialDomain?: string }) {
  const [domain, setDomain] = useState(opts?.initialDomain ?? "");
  const [status, setStatus] = useState<ScanProgressStatus>("idle");
  const [currentStage, setCurrentStage] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [result, setResult] = useState<ScanResult | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearTimer();
      abortRef.current?.abort();
    };
  }, [clearTimer]);

  const totalStages = SCAN_STAGES.length;
  const scanDurationStages = totalStages - 1;

  const triggerScan = useCallback(async (domainOverride?: string) => {
    const target = (domainOverride ?? domain).trim();
    if (!target || target.length < 3 || !target.includes(".")) {
      setCurrentStage(0);
      setResult(null);
      setErrorMsg("Enter a valid domain (e.g. allbirds.com)");
      setStatus("error");
      return;
    }

    abortRef.current?.abort();
    clearTimer();

    const thisRequestId = ++requestIdRef.current;
    const controller = new AbortController();
    abortRef.current = controller;

    setStatus("scanning");
    setCurrentStage(0);
    setErrorMsg("");
    setResult(null);

    let tick = 0;
    timerRef.current = setInterval(() => {
      tick++;
      if (tick < scanDurationStages) {
        setCurrentStage(tick);
      } else {
        clearTimer();
      }
    }, 900);

    try {
      const res = await fetch("/api/v1/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: target }),
        signal: controller.signal,
      });

      if (requestIdRef.current !== thisRequestId) return;

      let data: Record<string, unknown>;
      try {
        data = await res.json();
      } catch {
        throw new Error("Invalid response from server.");
      }

      clearTimer();

      if (!res.ok) {
        setErrorMsg((data.message as string) || "Something went wrong. Try again.");
        setStatus("error");
        return;
      }

      setCurrentStage(totalStages - 1);
      setResult({
        domain: data.domain as string,
        slug: data.slug as string,
        name: data.name as string,
        score: data.score as number,
        label: data.label as string,
      });
      setStatus("done");
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      if (requestIdRef.current !== thisRequestId) return;
      clearTimer();
      setErrorMsg(
        err instanceof Error && err.message
          ? err.message
          : "Network error. Check your connection and try again.",
      );
      setStatus("error");
    }
  }, [domain, clearTimer, scanDurationStages, totalStages]);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    clearTimer();
    setStatus("idle");
    setCurrentStage(0);
    setErrorMsg("");
    setResult(null);
  }, [clearTimer]);

  return {
    domain,
    setDomain,
    status,
    currentStage,
    errorMsg,
    result,
    triggerScan,
    reset,
  };
}
