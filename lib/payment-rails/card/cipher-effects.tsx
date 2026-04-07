"use client";

import { useState, useEffect } from "react";

export const CIPHER_GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&*!?∆§≈∂ƒ©˙≤≥÷×πøΩ√∫µ".split("");

export function useCipherScramble(text: string, active: boolean, delayOffset: number = 0, preserveLastN: number = 0) {
  const [display, setDisplay] = useState(text);
  const [settled, setSettled] = useState(false);
  const scrambleDuration = 1200;

  useEffect(() => {
    if (!active) {
      setDisplay(text);
      setSettled(false);
      return;
    }
    if (!text || text.trim().length === 0) {
      setDisplay("");
      setSettled(true);
      return;
    }
    let frame: number;
    let start: number | null = null;

    const chars = text.split("");

    const preserved = new Set<number>();
    if (preserveLastN > 0) {
      let count = 0;
      for (let i = chars.length - 1; i >= 0 && count < preserveLastN; i--) {
        if (chars[i] !== " ") {
          preserved.add(i);
          count++;
        }
      }
    }

    const charStaggerEnd = chars.length > 1 ? 300 : 0;
    const charDelays = chars.map((_, i) => delayOffset + (i / Math.max(chars.length - 1, 1)) * charStaggerEnd);
    const maxDelay = Math.max(0, ...charDelays);
    const totalDuration = maxDelay + scrambleDuration;

    const finalChars = chars.map((ch, i) =>
      ch === " " || preserved.has(i) ? ch : CIPHER_GLYPHS[Math.floor(Math.random() * CIPHER_GLYPHS.length)]
    );

    function tick(ts: number) {
      if (!start) start = ts;
      const elapsed = ts - start;

      const result = chars.map((original, i) => {
        if (original === " " || preserved.has(i)) return original;
        const charElapsed = elapsed - charDelays[i];
        if (charElapsed > scrambleDuration) return finalChars[i];
        return CIPHER_GLYPHS[Math.floor(Math.random() * CIPHER_GLYPHS.length)];
      });

      setDisplay(result.join(""));

      if (elapsed < totalDuration + 50) {
        frame = requestAnimationFrame(tick);
      } else {
        setDisplay(finalChars.join(""));
        setSettled(true);
      }
    }

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, text, delayOffset, preserveLastN]);

  return { display, settled };
}
