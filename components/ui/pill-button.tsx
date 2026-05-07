"use client";

interface PillButtonProps {
  label: string;
  active: boolean;
  onClick: () => void;
  testId: string;
}

export function PillButton({ label, active, onClick, testId }: PillButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center rounded-none px-3 py-1.5 text-xs font-mono font-medium whitespace-nowrap transition-colors border ${
        active
          ? "bg-white text-neutral-950 border-white"
          : "bg-transparent text-neutral-500 border-neutral-800 hover:text-white hover:border-neutral-600"
      }`}
      data-testid={testId}
    >
      {label}
    </button>
  );
}
