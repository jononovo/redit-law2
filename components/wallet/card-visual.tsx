import { cn } from "@/lib/utils";
import { Snowflake } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface CardVisualProps {
  color?: "primary" | "dark" | "blue" | "purple";
  last4?: string;
  expiry?: string;
  holder?: string;
  holderLabel?: string;
  balance?: string;
  balanceLabel?: string;
  balanceTooltip?: string;
  frozen?: boolean;
  className?: string;
  line1?: string;
  line2?: string;
  status?: string;
  brand?: string;
  bottomRightLabel?: string;
  bottomRightValue?: string;
}

const BRAND_DISPLAY: Record<string, string> = {
  visa: "VISA",
  mastercard: "MC",
  amex: "AMEX",
  discover: "DISC",
};

export function CardVisual({
  color = "primary",
  last4 = "••••",
  expiry = "••/••",
  holder = "OPENCLAW AGENT 01",
  holderLabel = "Card Name",
  balance = "$0.00",
  balanceLabel = "Current Balance",
  balanceTooltip,
  frozen = false,
  className,
  line1,
  line2,
  status,
  brand,
  bottomRightLabel,
  bottomRightValue,
}: CardVisualProps) {

  const gradients = {
    primary: "bg-gradient-to-br from-primary to-orange-600",
    dark: "bg-gradient-to-br from-neutral-900 to-neutral-800",
    blue: "bg-gradient-to-br from-blue-500 to-blue-700",
    purple: "bg-gradient-to-br from-purple-500 to-purple-700"
  };

  const statusColors: Record<string, string> = {
    active: "bg-emerald-500/20 text-emerald-100 border-emerald-300/30",
    pending_setup: "bg-amber-500/20 text-amber-100 border-amber-300/30",
    pending_delivery: "bg-orange-500/20 text-orange-100 border-orange-300/30",
    confirmed: "bg-teal-500/20 text-teal-100 border-teal-300/30",
    awaiting_bot: "bg-violet-500/20 text-violet-100 border-violet-300/30",
    frozen: "bg-blue-500/20 text-blue-100 border-blue-300/30",
    paused: "bg-blue-500/20 text-blue-100 border-blue-300/30",
  };

  const statusLabels: Record<string, string> = {
    active: "Active",
    pending_setup: "Pending Setup",
    pending_delivery: "Ready to Test",
    confirmed: "Confirmed",
    awaiting_bot: "Awaiting Bot",
    frozen: "Frozen",
    paused: "Paused",
  };

  const displayStatus = frozen ? "frozen" : status;
  const statusStyle = displayStatus ? statusColors[displayStatus] || "bg-white/20 text-white/90 border-white/30" : null;
  const statusLabel = displayStatus ? (statusLabels[displayStatus] || displayStatus) : null;
  const brandDisplay = brand ? (BRAND_DISPLAY[brand.toLowerCase()] || brand.toUpperCase()) : null;

  const hasBottomRight = expiry || brandDisplay || bottomRightLabel;

  return (
    <div className={cn(
      "relative aspect-[1.586/1] rounded-2xl p-6 text-white shadow-xl overflow-hidden flex flex-col justify-between select-none transition-all",
      gradients[color],
      frozen && "grayscale opacity-70",
      !frozen && "hover:scale-[1.02]",
      className
    )}>
      <div className="absolute inset-0 opacity-20 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay pointer-events-none" />
      <div className="absolute -top-[100%] -left-[100%] w-[300%] h-[300%] bg-gradient-to-br from-white/20 via-transparent to-transparent rotate-45 pointer-events-none" />

      {frozen && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/20 backdrop-blur-[1px]">
          <div className="flex items-center gap-2 bg-white/90 text-neutral-800 px-4 py-2 rounded-full shadow-lg font-bold text-sm">
            <Snowflake className="w-4 h-4 text-blue-500" />
            FROZEN
          </div>
        </div>
      )}

      <div className="relative z-10 flex justify-between items-start">
        <div className="flex flex-col">
          {line1 && (
            <span className="text-[10px] font-medium opacity-70 uppercase tracking-wider mb-0.5" data-testid="text-card-line1">{line1}</span>
          )}
          {line2 && (
            <span className="text-[10px] font-medium opacity-70 uppercase tracking-wider mb-1" data-testid="text-card-line2">{line2}</span>
          )}
          {balanceTooltip ? (
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="cursor-help">
                    <span className="text-xs font-medium opacity-80 uppercase tracking-wider mb-1 block" data-testid="text-balance-label">{balanceLabel}</span>
                    <span className="text-2xl font-bold font-mono tracking-tight block" data-testid="text-balance-value">{balance}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="bg-black/90 text-white text-[11px] whitespace-pre-line max-w-[220px] border-white/10" data-testid="tooltip-balance">
                  {balanceTooltip}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <>
              <span className="text-xs font-medium opacity-80 uppercase tracking-wider mb-1" data-testid="text-balance-label">{balanceLabel}</span>
              <span className="text-2xl font-bold font-mono tracking-tight" data-testid="text-balance-value">{balance}</span>
            </>
          )}
          <div className="mt-2 w-10 h-6 rounded bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center">
            <div className="w-6 h-4 border border-white/40 rounded-[2px] relative overflow-hidden">
              <div className="absolute top-1 left-0 w-full h-[1px] bg-white/40" />
              <div className="absolute bottom-1 left-0 w-full h-[1px] bg-white/40" />
              <div className="absolute left-2 top-0 h-full w-[1px] bg-white/40" />
            </div>
          </div>
        </div>
        {statusLabel && (
          <span
            className={cn(
              "text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full border backdrop-blur-sm",
              statusStyle
            )}
            data-testid="text-card-status"
          >
            {statusLabel}
          </span>
        )}
      </div>

      <div className="relative z-10">
        <div className="flex items-end justify-between">
          <div className="flex flex-col gap-4">
            <div className="flex gap-3 text-lg font-mono tracking-widest opacity-90" data-testid="text-card-number">
              <span>····</span>
              <span>····</span>
              <span>····</span>
              <span>{last4}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase opacity-70 tracking-wider">{holderLabel}</span>
              <span className="text-sm font-medium uppercase tracking-wide">{holder}</span>
            </div>
          </div>

          {hasBottomRight && (
            <div className="flex flex-col items-end">
              {bottomRightLabel ? (
                <>
                  <span className="text-[10px] uppercase opacity-70 tracking-wider">{bottomRightLabel}</span>
                  <span className="text-sm font-mono">{bottomRightValue}</span>
                </>
              ) : (
                <>
                  <span className="text-[10px] uppercase opacity-70 tracking-wider">Expires</span>
                  <span className="text-sm font-mono">{expiry}</span>
                </>
              )}
              {brandDisplay && (
                <div className="mt-2 text-xl font-bold italic tracking-tighter opacity-90">{brandDisplay}</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
