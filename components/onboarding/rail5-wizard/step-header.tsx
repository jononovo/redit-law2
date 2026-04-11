"use client";

import { type LucideIcon } from "lucide-react";
import { wt } from "@/lib/wizard-typography";

interface StepHeaderProps {
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle?: string;
  iconSize?: "sm" | "lg";
  titleTestId?: string;
}

export function StepHeader({ icon: Icon, iconBg, iconColor, title, subtitle, iconSize = "sm", titleTestId }: StepHeaderProps) {
  const sizeClasses = iconSize === "lg"
    ? "w-16 h-16 rounded-2xl"
    : "w-12 h-12 rounded-2xl";
  const iconSizeClasses = iconSize === "lg" ? "w-8 h-8" : "w-6 h-6";

  return (
    <div className="flex flex-col items-center text-center">
      <div className="flex items-center justify-center gap-3">
        <div className={`${sizeClasses} ${iconBg} flex items-center justify-center flex-shrink-0`}>
          <Icon className={`${iconSizeClasses} ${iconColor}`} />
        </div>
        <h2 className={wt.title} {...(titleTestId ? { "data-testid": titleTestId } : {})}>{title}</h2>
      </div>
      {subtitle && <p className={`${wt.subtitle} mt-1`}>{subtitle}</p>}
    </div>
  );
}
