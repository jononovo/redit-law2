"use client";

import { type LucideIcon } from "lucide-react";
import { wt } from "@/lib/wizard-typography";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface StepHeaderProps {
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  title: string;
  tooltip?: string;
  iconSize?: "sm" | "lg";
  titleTestId?: string;
}

export function StepHeader({ icon: Icon, iconBg, iconColor, title, tooltip, iconSize = "sm", titleTestId }: StepHeaderProps) {
  const sizeClasses = iconSize === "lg"
    ? "w-16 h-16 rounded-2xl"
    : "w-12 h-12 rounded-2xl";
  const iconSizeClasses = iconSize === "lg" ? "w-8 h-8" : "w-6 h-6";

  const headerContent = (
    <div className={`flex items-center justify-center gap-3${tooltip ? " cursor-help" : ""}`}>
      <div className={`${sizeClasses} ${iconBg} flex items-center justify-center flex-shrink-0`}>
        <Icon className={`${iconSizeClasses} ${iconColor}`} />
      </div>
      <h2 className={`${wt.title}${tooltip ? " decoration-dotted underline underline-offset-4 decoration-neutral-300" : ""}`} {...(titleTestId ? { "data-testid": titleTestId } : {})}>{title}</h2>
    </div>
  );

  if (tooltip) {
    return (
      <div className="flex flex-col items-center text-center">
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              {headerContent}
            </TooltipTrigger>
            <TooltipContent
              side="bottom"
              className="max-w-[280px] text-sm leading-relaxed bg-white text-neutral-600 border border-neutral-200 shadow-md"
            >
              {tooltip}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center text-center">
      {headerContent}
    </div>
  );
}
