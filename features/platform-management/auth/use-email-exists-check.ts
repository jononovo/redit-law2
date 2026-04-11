"use client";

import { useState, useEffect, useRef } from "react";

function emailLooksValid(email: string): boolean {
  const trimmed = email.trim().toLowerCase();
  const atIndex = trimmed.indexOf("@");
  if (atIndex < 1) return false;
  const domain = trimmed.slice(atIndex + 1);
  return domain.includes(".");
}

export function useEmailExistsCheck(email: string) {
  const [exists, setExists] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const normalizedEmail = email.trim().toLowerCase();

  useEffect(() => {
    if (!emailLooksValid(normalizedEmail)) {
      setExists(null);
      setChecking(false);
      return;
    }

    setChecking(true);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (abortRef.current) abortRef.current.abort();

    debounceRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch(
          `/api/auth/check-email?email=${encodeURIComponent(normalizedEmail)}`,
          { signal: controller.signal }
        );
        if (res.ok && !controller.signal.aborted) {
          const data = await res.json();
          setExists(data.exists);
        }
      } catch (err: any) {
        if (err?.name !== "AbortError") {
          setExists(null);
        }
      } finally {
        if (!controller.signal.aborted) {
          setChecking(false);
        }
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [normalizedEmail]);

  return { exists, checking, emailLooksValid: emailLooksValid(normalizedEmail) };
}
