import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { storage } from "@/server/storage";
import { getWindowStart, getNextWindowStart } from "@/lib/rail4/allowance";
import type { ProfilePermission } from "@/shared/schema";

export async function GET(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const cards = await storage.getRail4CardsByOwnerUid(user.uid);

  const result = await Promise.all(cards.map(async (c) => {
    const base = {
      card_id: c.cardId,
      card_name: c.cardName || "Untitled Card",
      use_case: c.useCase || null,
      status: c.status,
      bot_id: c.botId || null,
      created_at: c.createdAt.toISOString(),
      allowance: null as null | {
        value: number;
        currency: string;
        duration: string;
        spent_cents: number;
        remaining_cents: number;
        resets_at: string;
      },
    };

    if (c.status === "active" && c.profilePermissions) {
      try {
        const permissions: ProfilePermission[] = JSON.parse(c.profilePermissions);
        const realPerm = permissions.find(p => p.profile_index === c.realProfileIndex);
        if (realPerm) {
          const windowStart = getWindowStart(realPerm.allowance_duration);
          const usage = await storage.getProfileAllowanceUsage(c.cardId, c.realProfileIndex, windowStart);
          const spentCents = usage?.spentCents || 0;
          const allowanceCents = Math.round(realPerm.allowance_value * 100);
          const resetsAt = getNextWindowStart(realPerm.allowance_duration);

          base.allowance = {
            value: realPerm.allowance_value,
            currency: realPerm.allowance_currency || "USD",
            duration: realPerm.allowance_duration,
            spent_cents: spentCents,
            remaining_cents: allowanceCents - spentCents,
            resets_at: resetsAt.toISOString(),
          };
        }
      } catch {}
    }

    return base;
  }));

  return NextResponse.json({ cards: result });
}
