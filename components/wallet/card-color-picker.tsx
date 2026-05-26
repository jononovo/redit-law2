"use client";

import { CARD_COLORS, resolveCardColor, type CardColor } from "@/components/wallet/types";

const SWATCH_BG: Record<CardColor, string> = {
  purple: "bg-purple-600",
  dark: "bg-neutral-800",
  blue: "bg-blue-600",
  emerald: "bg-emerald-600",
  primary: "bg-orange-600",
};

interface CardColorPickerProps {
  color: string | null | undefined;
  cardId: string;
  disabled?: boolean;
  onChange: (color: CardColor) => void | Promise<void>;
}

export function CardColorPicker({ color, cardId, disabled, onChange }: CardColorPickerProps) {
  const current = resolveCardColor(color, cardId);
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-neutral-500 font-medium">Card Color</span>
      <div className="flex items-center gap-2">
        {CARD_COLORS.map((c) => {
          const active = current === c;
          return (
            <button
              key={c}
              type="button"
              disabled={disabled}
              onClick={() => onChange(c)}
              className={`w-7 h-7 rounded-full transition-all ${SWATCH_BG[c]} ${active ? "ring-2 ring-offset-2 ring-neutral-400 scale-110" : "opacity-60 hover:opacity-100"}`}
              data-testid={`color-picker-${c}`}
            />
          );
        })}
      </div>
    </div>
  );
}
