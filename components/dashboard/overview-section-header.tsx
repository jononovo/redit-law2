import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import type { ReactNode } from "react";

interface OverviewSectionHeaderProps {
  title: string;
  seeAllHref: string;
  seeAllTestId: string;
  showSeeAll?: boolean;
  tooltip?: string;
  meta?: ReactNode;
  className?: string;
}

export function OverviewSectionHeader({
  title,
  seeAllHref,
  seeAllTestId,
  showSeeAll = true,
  tooltip,
  meta,
  className = "mb-4",
}: OverviewSectionHeaderProps) {
  return (
    <div className={`flex items-center justify-between ${className}`}>
      <div className="flex items-baseline gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-neutral-900">{title}</h2>
          {tooltip && <InfoTooltip text={tooltip} />}
        </div>
        {meta}
      </div>
      {showSeeAll && (
        <Link
          href={seeAllHref}
          className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-700 transition-colors"
          data-testid={seeAllTestId}
        >
          See all <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      )}
    </div>
  );
}
