"use client";

import { Loader2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { PaymentMethodDef } from "../types";

interface PaymentMethodSelectorProps {
  methods: PaymentMethodDef[];
  onSelect: (methodId: string) => void;
  loading?: string;
  disabled?: boolean;
  disabledMethods?: string[];
}

export function PaymentMethodSelector({
  methods,
  onSelect,
  loading,
  disabled,
  disabledMethods = [],
}: PaymentMethodSelectorProps) {
  if (methods.length === 0) {
    return (
      <div className="text-center py-6 text-neutral-400 text-sm">
        No payment methods available
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex flex-col gap-3" data-testid="payment-method-selector">
        {methods.map((method) => {
          const isLoading = loading === method.id;
          const isMethodDisabled = disabledMethods.includes(method.id);
          const isDisabled = disabled || isMethodDisabled || (!!loading && !isLoading);
          const tooltipText = isMethodDisabled && method.minAmount
            ? `Requires minimum $${method.minAmount.toFixed(2)}`
            : null;

          const button = (
            <button
              key={method.id}
              onClick={() => onSelect(method.id)}
              disabled={isDisabled}
              className={`
                w-full flex items-center gap-4 px-5 py-4 rounded-xl border-2 transition-all cursor-pointer
                ${isLoading
                  ? "border-[#E8735A] bg-[#E8735A]/5"
                  : "border-neutral-200 hover:border-[#E8735A] hover:bg-neutral-50"
                }
                ${isDisabled && !isLoading ? "opacity-50 cursor-not-allowed" : ""}
              `}
              data-testid={`payment-method-${method.id}`}
            >
              <span className="text-2xl flex-shrink-0">{method.iconEmoji}</span>

              <div className="flex-1 text-left">
                <span className="font-bold text-neutral-900">{method.label}</span>
                <p className="text-xs text-neutral-400 mt-0.5">{method.subtitle}</p>
              </div>

              {isLoading && (
                <Loader2 className="w-5 h-5 animate-spin text-[#E8735A] flex-shrink-0" />
              )}
            </button>
          );

          if (tooltipText) {
            return (
              <Tooltip key={method.id}>
                <TooltipTrigger asChild>
                  <div>
                    {button}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{tooltipText}</p>
                </TooltipContent>
              </Tooltip>
            );
          }

          return button;
        })}
      </div>
    </TooltipProvider>
  );
}
