import { Loader2 } from "lucide-react";
import { OverviewSectionHeader } from "./overview-section-header";
import type { ReactNode } from "react";

const MAX_CARDS_PER_SECTION = 3;

interface OverviewCardSectionProps {
  title: string;
  seeAllHref: string;
  seeAllTestId: string;
  showSeeAll?: boolean;
  tooltip?: string;
  meta?: ReactNode;
  testId?: string;
  loading?: boolean;
  items: { key: string; content: ReactNode }[];
  emptyState?: ReactNode;
}

export function OverviewCardSection({
  title,
  seeAllHref,
  seeAllTestId,
  showSeeAll = true,
  tooltip,
  meta,
  testId,
  loading = false,
  items,
  emptyState,
}: OverviewCardSectionProps) {
  return (
    <div data-testid={testId}>
      <OverviewSectionHeader
        title={title}
        seeAllHref={seeAllHref}
        seeAllTestId={seeAllTestId}
        showSeeAll={showSeeAll}
        tooltip={tooltip}
        meta={meta}
        className="mb-3"
      />
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
        </div>
      ) : items.length === 0 ? (
        emptyState ? <div className="w-full max-w-[26rem]">{emptyState}</div> : null
      ) : (
        <div className="flex flex-wrap gap-4">
          {items.slice(0, MAX_CARDS_PER_SECTION).map(({ key, content }) => (
            <div key={key} className="w-full max-w-[26rem]">
              {content}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
