import { NextResponse } from "next/server";
import { withBotApi } from "@/features/platform-management/agent-management/agent-api/middleware";
import { storage } from "@/server/storage";
import { lookupIssuer } from "@/features/payment-rails/card/bin-lookup";

export const GET = withBotApi("/api/v1/bot/rail3/cards", async (_request, { bot }) => {
  const cards = await storage.getRail3CardsByBotId(bot.botId);
  if (cards.length === 0) return NextResponse.json({ cards: [] });

  const pmIds = [...new Set(cards.map((c) => c.paymentMethodId))];
  const pmLookup = new Map<string, Awaited<ReturnType<typeof storage.getRail3PaymentMethodById>>>();
  await Promise.all(
    pmIds.map(async (id) => {
      const pm = await storage.getRail3PaymentMethodById(id);
      pmLookup.set(id, pm);
    })
  );

  return NextResponse.json({
    cards: cards.map((c) => {
      const pm = pmLookup.get(c.paymentMethodId);
      return {
        card_id: c.cardId,
        card_name: c.cardName,
        category: c.category,
        card_brand: pm?.cardBrand || null,
        card_last4: pm?.cardLast4 || null,
        issuer_name: pm?.cardFirst6 ? (lookupIssuer(pm.cardFirst6) || null) : null,
        status: c.status,
        is_frozen: c.isFrozen,
        intent_mode: c.intentMode,
        limit_amount_cents: c.limitAmountCents,
        limit_period: c.limitPeriod,
        // Minted card credentials — saved at issuance so agents can use the
        // card in any checkout. Null until the owner mints them in the UI.
        card_number: c.isFrozen ? null : c.cardNumber || null,
        card_expiration_month: c.isFrozen ? null : c.cardExpirationMonth || null,
        card_expiration_year: c.isFrozen ? null : c.cardExpirationYear || null,
        card_cvc: c.isFrozen ? null : c.cardCvc || null,
        credential_expires_at: c.credentialExpiresAt?.toISOString() ?? null,
      };
    }),
  });
});
