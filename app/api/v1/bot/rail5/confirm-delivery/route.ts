import { NextResponse } from "next/server";
import { withBotApi } from "@/lib/agent-management/agent-api/middleware";
import { storage } from "@/server/storage";
import { RAIL5_TEST_CHECKOUT_URL } from "@/lib/rail5";
import { sendToBot } from "@/lib/agent-management/bot-messaging";
import { buildRail5TestInstructions } from "@/lib/agent-management/bot-messaging/templates";
import { randomBytes } from "crypto";

export const POST = withBotApi("/api/v1/bot/rail5/confirm-delivery", async (_request, { bot }) => {
  const card = await storage.getRail5CardByBotId(bot.botId);
  if (!card) {
    return NextResponse.json(
      { error: "no_card", message: "No Rail 5 card is linked to this bot." },
      { status: 404 }
    );
  }

  if (card.status !== "pending_delivery") {
    return NextResponse.json(
      { error: "invalid_status", message: `Card is in '${card.status}' status, not 'pending_delivery'.` },
      { status: 409 }
    );
  }

  const testToken = randomBytes(4).toString("hex");
  await storage.updateRail5Card(card.cardId, { status: "confirmed", testToken });

  try {
    await storage.deletePendingMessagesByRef(bot.botId, "rail5.card.delivered", "card_id", card.cardId);
  } catch (err) {
    console.error("[confirm-delivery] Failed to clean up pending messages:", err);
  }

  const testCheckoutUrl = `${RAIL5_TEST_CHECKOUT_URL}?t=${testToken}`;
  const testInstructions = buildRail5TestInstructions(testCheckoutUrl);

  try {
    await sendToBot(bot.botId, "rail5.test.required", {
      card_id: card.cardId,
      card_name: card.cardName,
      test_checkout_url: testCheckoutUrl,
      instructions: testInstructions,
    });
  } catch (err) {
    console.error("[confirm-delivery] Failed to send rail5.test.required event:", err);
  }

  return NextResponse.json({
    status: "confirmed",
    card_id: card.cardId,
    card_name: card.cardName,
    message: "Card confirmed. Complete a test purchase to verify your card works end-to-end.",
    test_checkout_url: testCheckoutUrl,
    test_instructions: testInstructions,
  });
});
