"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CardVisual } from "./card-visual";
import { CreditCardActionBar } from "./credit-card-action-bar";
import type { NormalizedCard } from "./types";

interface CreditCardItemProps {
  card: NormalizedCard;
  onFreeze: () => void;
  onAddAgent?: () => void;
  onUnlinkBot?: () => void;
  onCopyCardId: () => void;
  onDelete: () => void;
}

export function CreditCardItem({
  card,
  onFreeze,
  onAddAgent,
  onUnlinkBot,
  onCopyCardId,
  onDelete,
}: CreditCardItemProps) {
  const router = useRouter();

  return (
    <div className="flex flex-col gap-4 w-full" data-testid={`card-item-${card.card_id}`}>
      <Link
        href={card.detailPath}
        className="block cursor-pointer rounded-2xl transition hover:brightness-105 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
        data-testid={`link-card-${card.card_id}`}
      >
        <CardVisual
          color={card.card_color}
          balance={card.balance}
          balanceLabel={card.balanceLabel}
          balanceTooltip={card.balanceTooltip || undefined}
          last4={card.last4}
          holder={card.card_name.toUpperCase()}
          frozen={card.is_frozen}
          expiry="••/••"
          line1={card.line1 || undefined}
          line2={card.line2 || undefined}
          status={card.status}
          brand={card.brand || undefined}
          issuer={card.issuer || undefined}
          numberCaption={card.numberCaption || undefined}
        />
      </Link>

      <CreditCardActionBar
        card={card}
        onManage={() => router.push(card.detailPath)}
        onFreeze={onFreeze}
        onAddAgent={onAddAgent}
        onUnlinkBot={onUnlinkBot}
        onCopyCardId={onCopyCardId}
        onDelete={onDelete}
      />
    </div>
  );
}
