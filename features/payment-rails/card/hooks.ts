"use client";

import { useState, useEffect, useRef } from "react";

export interface CardFieldErrors {
  number?: boolean;
  month?: boolean;
  year?: boolean;
  cvv?: boolean;
  name?: boolean;
}

export function useTemporaryValid(filled: boolean, delayMs = 5000): boolean {
  const [showValid, setShowValid] = useState(false);
  const prevFilled = useRef(false);

  useEffect(() => {
    if (filled && !prevFilled.current) {
      setShowValid(true);
      const timer = setTimeout(() => setShowValid(false), delayMs);
      prevFilled.current = true;
      return () => clearTimeout(timer);
    }
    if (!filled) {
      prevFilled.current = false;
      setShowValid(false);
    }
  }, [filled, delayMs]);

  return showValid;
}
