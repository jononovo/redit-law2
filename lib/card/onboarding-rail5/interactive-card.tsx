"use client";

import { useState, useEffect, useRef } from "react";
import { detectCardBrand, getMaxDigits, formatCardNumber, getCardPlaceholder, type CardBrand } from "@/lib/card/card-brand";
import { useTemporaryValid, type CardFieldErrors } from "@/lib/card/hooks";
import { useCipherScramble } from "@/lib/card/cipher-effects";
import { BrandLogo } from "@/lib/card/brand-logo";
import "@/lib/card/card.css";

export function Rail5InteractiveCard({
  cardNumber,
  onCardNumberChange,
  expiryMonth,
  expiryYear,
  onExpiryMonthChange,
  onExpiryYearChange,
  cvv,
  onCvvChange,
  holderName,
  onHolderNameChange,
  detectedBrand,
  errors = {},
  isEncrypting = false,
}: {
  cardNumber: string;
  onCardNumberChange: (val: string) => void;
  expiryMonth: string;
  expiryYear: string;
  onExpiryMonthChange: (val: string) => void;
  onExpiryYearChange: (val: string) => void;
  cvv: string;
  onCvvChange: (val: string) => void;
  holderName: string;
  onHolderNameChange: (val: string) => void;
  detectedBrand: CardBrand;
  errors?: CardFieldErrors;
  isEncrypting?: boolean;
}) {
  const numberRef = useRef<HTMLInputElement>(null);
  const cvvRef = useRef<HTMLInputElement>(null);
  const holderRef = useRef<HTMLInputElement>(null);
  const monthRef = useRef<HTMLSelectElement>(null);
  const yearRef = useRef<HTMLSelectElement>(null);
  const [numberFocused, setNumberFocused] = useState(false);

  const cleanNumber = cardNumber.replace(/\s/g, "");
  const formatted = formatCardNumber(cleanNumber, detectedBrand);

  const numberCipher = useCipherScramble(formatted, isEncrypting, 0, 4);
  const expiryCipher = useCipherScramble(`${expiryMonth}/${expiryYear}`, isEncrypting, 150);
  const cvvCipher = useCipherScramble("•".repeat(cvv.length || 3), isEncrypting, 250);
  const holderCipher = useCipherScramble(holderName.toUpperCase(), isEncrypting, 350);

  useEffect(() => {
    if (!isEncrypting) numberRef.current?.focus();
  }, [isEncrypting]);

  const MONTHS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
  const currentYear = new Date().getFullYear();
  const YEARS = Array.from({ length: 12 }, (_, i) => String(currentYear + i));

  const expectedDigits = getMaxDigits(detectedBrand);
  const minCvv = detectedBrand === "amex" ? 4 : 3;
  const monthFilled = !!expiryMonth;
  const yearFilled = !!expiryYear;
  const cvvFilled = cvv.length >= minCvv;
  const nameFilled = !!holderName.trim();
  const numberFilled = cleanNumber.length === expectedDigits;

  const numberValid = useTemporaryValid(numberFilled);
  const monthValid = useTemporaryValid(monthFilled);
  const yearValid = useTemporaryValid(yearFilled);
  const cvvValid = useTemporaryValid(cvvFilled);
  const nameValid = useTemporaryValid(nameFilled);

  function fieldClass(error?: boolean, valid?: boolean, focused?: boolean) {
    if (error) return "card-field card-field-error";
    if (valid) return "card-field card-field-valid";
    if (focused) return "card-field card-field-focused";
    return "card-field";
  }

  return (
    <div className="relative mx-auto w-full" style={{ maxWidth: 520 }}>
      <div
        className={`relative w-full rounded-2xl overflow-hidden shadow-2xl ${isEncrypting ? "pointer-events-none" : ""}`}
        style={{
          aspectRatio: "1.586",
          background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 40%, #0f3460 100%)",
        }}
        data-testid="r5-interactive-card"
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: [
              "radial-gradient(circle at 15% 60%, rgba(255,255,255,0.06) 0%, transparent 45%)",
              "radial-gradient(circle at 85% 25%, rgba(255,255,255,0.05) 0%, transparent 40%)",
              "radial-gradient(ellipse at 50% 0%, rgba(100,140,255,0.07) 0%, transparent 60%)",
              "linear-gradient(125deg, transparent 30%, rgba(255,255,255,0.04) 45%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 55%, transparent 70%)",
            ].join(", "),
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{
            backgroundImage: "repeating-linear-gradient(135deg, transparent, transparent 40px, rgba(255,255,255,0.5) 40px, rgba(255,255,255,0.5) 41px)",
          }}
        />

        <div className="relative h-full flex flex-col p-6">
          <div className="flex items-start justify-end">
            <BrandLogo brand={detectedBrand} />
          </div>

          <div className="flex-1 flex flex-col items-start justify-center">
            <div className="w-12 h-9 rounded-[3px] bg-gradient-to-br from-amber-200 to-amber-400 mb-3 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 bottom-0 left-[25%] w-px bg-amber-700/40" />
              <div className="absolute top-0 bottom-0 left-[50%] w-px bg-amber-700/40" />
              <div className="absolute top-0 bottom-0 left-[72%] w-px bg-amber-700/40" />
              <div className="absolute top-0 bottom-0 left-[88%] w-px bg-amber-700/40" />
              <div className="absolute left-0 right-0 top-[30%] h-px bg-amber-700/40" />
              <div className="absolute left-0 right-0 top-[65%] h-px bg-amber-700/40" />
            </div>

            {/* Card Number */}
            <div
              className={`relative w-4/5 pb-1 cursor-text ${fieldClass(errors.number, numberValid, numberFocused)}`}
              onClick={() => numberRef.current?.focus()}
            >
              <input
                ref={numberRef}
                type="text"
                inputMode="numeric"
                value={formatted}
                onFocus={() => setNumberFocused(true)}
                onBlur={() => setNumberFocused(false)}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, "");
                  const brand = detectCardBrand(digits);
                  onCardNumberChange(digits.slice(0, getMaxDigits(brand)));
                }}
                className="absolute inset-0 opacity-0 w-full h-full z-10"
                data-testid="input-r5-card-number"
                autoComplete="off"
              />
              <div className="font-mono text-2xl tracking-[0.15em] flex items-center pointer-events-none" aria-hidden="true">
                {isEncrypting ? (
                  <span className="text-white">{numberCipher.display}</span>
                ) : (() => {
                  const placeholder = getCardPlaceholder(detectedBrand);
                  let cursorPos = formatted.length;
                  while (cursorPos < placeholder.length && placeholder[cursorPos] === " ") cursorPos++;
                  return placeholder.split("").map((ch, i) => {
                    if (ch === " ") return <span key={i} className="w-3" />;
                    const showCursor = numberFocused && !numberFilled && i === cursorPos;
                    const typed = i < formatted.length && formatted[i] !== " " ? formatted[i] : null;
                    return (
                      <span key={i} className="relative inline-block">
                        {showCursor && (
                          <span
                            className="absolute -left-px top-0 w-[2px] h-full bg-white"
                            style={{ animation: "blink 1s step-end infinite" }}
                          />
                        )}
                        <span className={typed ? "text-white" : "text-white/25"}>
                          {typed || "0"}
                        </span>
                      </span>
                    );
                  });
                })()}
              </div>
            </div>

            {/* Expires + CVV row */}
            <div className="flex items-end justify-end gap-3 mt-3 w-full">
              <div>
                <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Expires</p>
                {isEncrypting ? (
                  <div className={`text-white text-sm font-medium pb-0.5 ${fieldClass()}`}>
                    {expiryCipher.display}
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <select
                      ref={monthRef}
                      value={expiryMonth}
                      onChange={(e) => onExpiryMonthChange(e.target.value)}
                      className={`bg-transparent text-white text-sm font-medium text-center focus:outline-none appearance-none cursor-pointer px-1 pb-0.5 ${fieldClass(errors.month, monthValid)}`}
                      data-testid="select-r5-exp-month"
                    >
                      <option value="" className="bg-neutral-800 text-white">MM</option>
                      {MONTHS.map(m => <option key={m} value={m} className="bg-neutral-800 text-white">{m}</option>)}
                    </select>
                    <span className="text-white/40 text-sm">/</span>
                    <select
                      ref={yearRef}
                      value={expiryYear}
                      onChange={(e) => onExpiryYearChange(e.target.value)}
                      className={`bg-transparent text-white text-sm font-medium text-center focus:outline-none appearance-none cursor-pointer px-1 pb-0.5 ${fieldClass(errors.year, yearValid)}`}
                      data-testid="select-r5-exp-year"
                    >
                      <option value="" className="bg-neutral-800 text-white">YYYY</option>
                      {YEARS.map(y => <option key={y} value={y} className="bg-neutral-800 text-white">{y}</option>)}
                    </select>
                  </div>
                )}
              </div>

              <div>
                <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1">CVV</p>
                {isEncrypting ? (
                  <div className={`w-14 text-white text-sm font-mono text-center pb-0.5 ${fieldClass()}`}>
                    {cvvCipher.display}
                  </div>
                ) : (
                  <input
                    ref={cvvRef}
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={cvv}
                    onChange={(e) => onCvvChange(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    placeholder="•••"
                    className={`w-14 bg-transparent text-white text-sm font-mono text-center placeholder:text-white/25 focus:outline-none pb-0.5 ${fieldClass(errors.cvv, cvvValid)}`}
                    data-testid="input-r5-cvv"
                    autoComplete="off"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Cardholder */}
          <div className="mt-auto">
            <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Cardholder</p>
            {isEncrypting ? (
              <div className={`w-3/4 text-white text-base font-medium uppercase tracking-wider pb-0.5 ${fieldClass()}`}>
                {holderCipher.display}
              </div>
            ) : (
              <input
                ref={holderRef}
                type="text"
                value={holderName}
                onChange={(e) => onHolderNameChange(e.target.value)}
                placeholder="Full Name"
                className={`w-3/4 bg-transparent text-white text-base font-medium placeholder:text-white/25 focus:outline-none uppercase tracking-wider pb-0.5 ${fieldClass(errors.name, nameValid)}`}
                data-testid="input-r5-holder"
                autoComplete="off"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
