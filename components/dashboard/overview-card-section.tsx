import { Loader2 } from "lucide-react";
import { OverviewSectionHeader } from "./overview-section-header";
import { CardRow, CardRowItem } from "./card-row";
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
        emptyState ? <CardRowItem>{emptyState}</CardRowItem> : null
      ) : (
        <CardRow>
          {items.slice(0, MAX_CARDS_PER_SECTION).map(({ key, content }) => (
            <CardRowItem key={key}>{content}</CardRowItem>
          ))}
        </CardRow>
      )}
    </div>
  );
}
