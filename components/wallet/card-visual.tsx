import { cn } from "@/lib/utils";
import { Snowflake } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface CardVisualProps {
  color?: "primary" | "dark" | "blue" | "purple" | "emerald";
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
  issuer?: string;
  bottomRightLabel?: string;
  bottomRightValue?: string;
  numberCaption?: string;
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
  issuer,
  bottomRightLabel,
  bottomRightValue,
  numberCaption,
}: CardVisualProps) {

  const gradients = {
    primary: "bg-gradient-to-br from-primary to-orange-600",
    dark: "bg-gradient-to-br from-neutral-900 to-neutral-800",
    blue: "bg-gradient-to-br from-blue-500 to-blue-700",
    purple: "bg-gradient-to-br from-purple-500 to-purple-700",
    emerald: "bg-gradient-to-br from-emerald-500 to-emerald-700"
  };

  const statusColors: Record<string, string> = {
    active: "bg-emerald-500/20 text-emerald-100 border-emerald-300/30",
    pending_setup: "bg-amber-500/20 text-amber-100 border-amber-300/30",      // rail5
    pending_delivery: "bg-orange-500/20 text-orange-100 border-orange-300/30", // rail5
    confirmed: "bg-teal-500/20 text-teal-100 border-teal-300/30",             // rail5
    awaiting_bot: "bg-violet-500/20 text-violet-100 border-violet-300/30",
    "requires-verification": "bg-amber-500/20 text-amber-100 border-amber-300/30", // rail3
    expired: "bg-neutral-500/20 text-neutral-100 border-neutral-300/30",            // rail3
    revoked: "bg-red-500/20 text-red-100 border-red-300/30",                        // rail3
    frozen: "bg-blue-500/20 text-blue-100 border-blue-300/30",                // synthesized when is_frozen
  };

  const statusLabels: Record<string, string> = {
    active: "Active",
    pending_setup: "Pending Setup",
    pending_delivery: "Ready to Test",
    confirmed: "Confirmed",
    awaiting_bot: "Awaiting Bot",
    "requires-verification": "Awaiting Authorization",
    expired: "Expired",
    revoked: "Revoked",
    frozen: "Frozen",
  };

  const displayStatus = frozen ? "frozen" : status;
  const statusStyle = displayStatus ? statusColors[displayStatus] || "bg-white/20 text-white/90 border-white/30" : null;
  const statusLabel = displayStatus ? (statusLabels[displayStatus] || displayStatus) : null;
  const brandDisplay = brand ? (BRAND_DISPLAY[brand.toLowerCase()] || brand.toUpperCase()) : null;

  const hasBottomRight = expiry || brandDisplay || bottomRightLabel;

  return (
    <div className={cn(
      "relative aspect-[1.586/1] w-full rounded-2xl p-6 text-white shadow-xl overflow-hidden flex flex-col justify-between select-none transition-all",
      gradients[color],
      frozen && "grayscale opacity-70",
      !frozen && "hover:scale-[1.02]",
      className
    )}>
      <div className="absolute inset-0 opacity-20 bg-[url('/assets/noise.svg')] mix-blend-overlay pointer-events-none" />
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
          <div
            aria-hidden
            className="mt-2 w-10 h-7 rounded-[15%] border border-slate-500/60 overflow-hidden relative shadow-inner bg-[radial-gradient(ellipse_at_28%_22%,rgba(255,255,255,0.55),transparent_60%),radial-gradient(ellipse_at_75%_85%,rgba(71,85,105,0.35),transparent_65%),linear-gradient(155deg,#f1f5f9_0%,#e2e8f0_22%,#cbd5e1_48%,#94a3b8_72%,#b6c2d0_100%)]"
          >
            <div className="absolute inset-0 rounded-[15%] shadow-[inset_0_0_0_0.5px_rgba(255,255,255,0.35)] pointer-events-none" />
            <div className="absolute top-[10%] left-[10%] w-[28%] h-[18%] rounded-[20%] bg-slate-600/35" />
            <div className="absolute top-[10%] right-[10%] w-[28%] h-[18%] rounded-[20%] bg-slate-600/35" />
            <div className="absolute top-[32%] left-[10%] w-[28%] h-[18%] rounded-[20%] bg-slate-600/30" />
            <div className="absolute top-[32%] right-[10%] w-[28%] h-[18%] rounded-[20%] bg-slate-600/30" />
            <div className="absolute bottom-[32%] left-[10%] w-[28%] h-[18%] rounded-[20%] bg-slate-600/30" />
            <div className="absolute bottom-[32%] right-[10%] w-[28%] h-[18%] rounded-[20%] bg-slate-600/30" />
            <div className="absolute bottom-[10%] left-[10%] w-[28%] h-[18%] rounded-[20%] bg-slate-600/35" />
            <div className="absolute bottom-[10%] right-[10%] w-[28%] h-[18%] rounded-[20%] bg-slate-600/35" />
            <div className="absolute top-1/2 left-0 -translate-y-1/2 w-full h-[14%] bg-[linear-gradient(90deg,transparent_0%,rgba(51,65,85,0.5)_25%,rgba(51,65,85,0.55)_75%,transparent_100%)]" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[20%] h-[32%] rounded-[2px] bg-slate-700/55 shadow-[inset_0_0_0_0.5px_rgba(255,255,255,0.2)]" />
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
            <div className="flex flex-col gap-0.5">
              {numberCaption && (
                <span className="text-[10px] font-medium uppercase tracking-wider opacity-70" data-testid="text-card-number-caption">
                  {numberCaption}
                </span>
              )}
              <div className="flex gap-3 text-lg font-mono tracking-widest opacity-90" data-testid="text-card-number">
                <span>····</span>
                <span>····</span>
                <span>····</span>
                <span>{last4}</span>
              </div>
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
                <div className="mt-2 text-xl font-bold italic tracking-tighter opacity-90" data-testid="text-card-brand">{brandDisplay}</div>
              )}
              {issuer && (
                <div className="text-[10px] font-medium uppercase tracking-wider opacity-70 mt-0.5" data-testid="text-card-issuer">{issuer}</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
