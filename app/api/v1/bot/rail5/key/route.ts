import { NextResponse } from "next/server";
import { withBotApi } from "@/lib/agent-management/agent-api/middleware";
import { storage } from "@/server/storage";

export const POST = withBotApi("/api/v1/bot/rail5/key", async (request, { bot }) => {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const checkoutId = body?.checkout_id;
  if (!checkoutId || typeof checkoutId !== "string") {
    return NextResponse.json(
      { error: "validation_error", message: "checkout_id is required." },
      { status: 400 }
    );
  }

  const checkout = await storage.getRail5CheckoutById(checkoutId);
  if (!checkout) {
    return NextResponse.json(
      { error: "not_found", message: "Checkout not found." },
      { status: 404 }
    );
  }

  if (checkout.botId !== bot.botId) {
    return NextResponse.json(
      { error: "forbidden", message: "This checkout does not belong to your bot." },
      { status: 403 }
    );
  }

  if (checkout.status !== "approved") {
    return NextResponse.json(
      { error: "checkout_not_approved", message: `Checkout status is "${checkout.status}". Key can only be delivered for approved checkouts.` },
      { status: 403 }
    );
  }

  if (checkout.keyDelivered) {
    return NextResponse.json(
      { error: "key_already_delivered", message: "Decryption key has already been delivered for this checkout. Keys are single-use." },
      { status: 409 }
    );
  }

  const card = await storage.getRail5CardByCardId(checkout.cardId);
  if (!card || !card.encryptedKeyHex || !card.encryptedIvHex || !card.encryptedTagHex) {
    return NextResponse.json(
      { error: "card_error", message: "Card encryption material not found." },
      { status: 500 }
    );
  }

  await storage.updateRail5Checkout(checkoutId, { keyDelivered: true });

  return NextResponse.json({
    key_hex: card.encryptedKeyHex,
    iv_hex: card.encryptedIvHex,
    tag_hex: card.encryptedTagHex,
  });
});
