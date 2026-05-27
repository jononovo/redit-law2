import type { ReactNode } from "react";
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
    primary: "bg-[radial-gradient(circle_at_85%_20%,rgba(255,220,180,0.30),transparent_45%),radial-gradient(circle_at_15%_15%,rgba(120,40,10,0.40),transparent_55%),radial-gradient(circle_at_85%_90%,rgba(180,60,20,0.45),transparent_55%),linear-gradient(135deg,#fb923c_0%,#f97316_45%,#c2410c_100%)]",
    dark: "bg-[radial-gradient(circle_at_85%_20%,rgba(140,140,160,0.22),transparent_45%),radial-gradient(circle_at_15%_15%,rgba(0,0,0,0.50),transparent_55%),radial-gradient(circle_at_85%_90%,rgba(0,0,0,0.55),transparent_55%),linear-gradient(135deg,#262626_0%,#171717_50%,#0a0a0a_100%)]",
    blue: "bg-[radial-gradient(circle_at_85%_20%,rgba(180,210,255,0.30),transparent_45%),radial-gradient(circle_at_15%_15%,rgba(15,25,80,0.50),transparent_55%),radial-gradient(circle_at_85%_90%,rgba(20,40,120,0.55),transparent_55%),linear-gradient(135deg,#3b82f6_0%,#2563eb_50%,#1e3a8a_100%)]",
    purple: "bg-[radial-gradient(circle_at_85%_20%,rgba(255,200,235,0.32),transparent_45%),radial-gradient(circle_at_15%_15%,rgba(110,15,80,0.50),transparent_55%),radial-gradient(circle_at_85%_90%,rgba(150,20,110,0.55),transparent_55%),linear-gradient(135deg,#f472b6_0%,#ec4899_45%,#9d174d_100%)]",
    emerald: "bg-[radial-gradient(circle_at_85%_20%,rgba(180,255,220,0.30),transparent_45%),radial-gradient(circle_at_15%_15%,rgba(4,50,40,0.50),transparent_55%),radial-gradient(circle_at_85%_90%,rgba(6,78,59,0.55),transparent_55%),linear-gradient(135deg,#10b981_0%,#059669_50%,#065f46_100%)]"
  };

  const patternOverlays: Record<string, ReactNode> = {
    primary: (
      <>
        <div className="absolute inset-0 opacity-[0.07] mix-blend-overlay pointer-events-none bg-[repeating-linear-gradient(45deg,#fff_0px,#fff_1px,transparent_1px,transparent_9px)]" />
        <div className="absolute -bottom-24 -right-24 w-72 h-72 rounded-full border border-white/10 pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full border border-white/[0.06] pointer-events-none" />
      </>
    ),
    dark: (
      <div className="absolute inset-0 opacity-[0.08] mix-blend-overlay pointer-events-none bg-[radial-gradient(circle,rgba(255,255,255,0.5)_1px,transparent_1.5px)] bg-[length:12px_12px]" />
    ),
    blue: (
      <>
        <div className="absolute inset-0 opacity-[0.10] mix-blend-overlay pointer-events-none bg-[repeating-radial-gradient(circle_at_100%_0%,transparent_0_38px,rgba(255,255,255,0.7)_38px_39px)]" />
        <div className="absolute -bottom-40 -left-40 w-[28rem] h-[28rem] rounded-full border border-white/[0.07] pointer-events-none" />
      </>
    ),
    purple: (
      <>
        <div className="absolute inset-0 opacity-[0.09] mix-blend-overlay pointer-events-none bg-[repeating-linear-gradient(0deg,#fff_0px,#fff_1px,transparent_1px,transparent_4px),repeating-linear-gradient(90deg,#fff_0px,#fff_1px,transparent_1px,transparent_4px)]" />
        <div className="absolute -bottom-16 -right-16 w-40 h-40 rotate-45 border border-white/10 pointer-events-none" />
      </>
    ),
    emerald: (
      <>
        <div className="absolute inset-0 opacity-[0.07] mix-blend-overlay pointer-events-none bg-[repeating-linear-gradient(45deg,#fff_0px,#fff_1px,transparent_1px,transparent_9px)]" />
        <div className="absolute top-3 right-3 w-3 h-3 rounded-full border border-white/15 pointer-events-none" />
        <div className="absolute top-6 right-8 w-2 h-2 rounded-full border border-white/15 pointer-events-none" />
        <div className="absolute top-2 right-10 w-1.5 h-1.5 rounded-full border border-white/15 pointer-events-none" />
      </>
    ),
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
      "relative aspect-[1.586/1] w-full max-w-[26rem] rounded-2xl p-6 text-white shadow-xl overflow-hidden flex flex-col justify-between select-none transition-all",
      gradients[color],
      frozen && "grayscale opacity-70",
      !frozen && "hover:scale-[1.02]",
      className
    )}>
      <div className="absolute inset-0 opacity-20 bg-[url('/assets/noise.svg')] mix-blend-overlay pointer-events-none" />
      {patternOverlays[color]}
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
            className="mt-2 ml-2 w-10 h-8 rounded-[15%] border border-slate-500/60 overflow-hidden relative shadow-inner bg-[repeating-linear-gradient(90deg,rgba(255,255,255,0.02)_0px,rgba(255,255,255,0.02)_1px,rgba(71,85,105,0.02)_1px,rgba(71,85,105,0.02)_2px),linear-gradient(120deg,transparent_30%,rgba(255,255,255,0.35)_40%,transparent_50%),radial-gradient(ellipse_at_28%_22%,rgba(255,255,255,0.55),transparent_60%),radial-gradient(ellipse_at_75%_85%,rgba(71,85,105,0.35),transparent_65%),linear-gradient(135deg,#f1f5f9_0%,#e2e8f0_22%,#cbd5e1_48%,#94a3b8_72%,#b6c2d0_100%)]"
          >
            <div className="absolute inset-0 rounded-[15%] shadow-[inset_0_0_0_0.5px_rgba(255,255,255,0.35)] pointer-events-none" />
            <div className="absolute top-[-5%] left-[-5%] w-[51%] h-[30%] border border-slate-600/45" />
            <div className="absolute top-[-5%] right-[-5%] w-[51%] h-[38.33%] border border-slate-600/45" />
            <div className="absolute top-[25%] left-[-5%] w-[51%] h-[25%] border border-slate-600/40" />
            <div className="absolute top-[33.33%] right-[-5%] w-[51%] h-[33.34%] border border-slate-600/40" />
            <div className="absolute top-[50%] left-[-5%] w-[51%] h-[25%] border border-slate-600/40" />
            <div className="absolute bottom-[-5%] left-[-5%] w-[51%] h-[30%] border border-slate-600/45" />
            <div className="absolute bottom-[-5%] right-[-5%] w-[51%] h-[38.33%] border border-slate-600/45" />
            <div className="absolute top-1/2 left-[47%] right-[47%] h-px -translate-y-px bg-slate-600/55" />
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
