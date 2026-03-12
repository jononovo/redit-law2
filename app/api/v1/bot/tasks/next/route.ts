import { NextResponse } from "next/server";
import { withBotApi } from "@/lib/agent-management/agent-api/middleware";
import { storage } from "@/server/storage";
import { getPendingEventsForBot, createObfuscationEvent } from "@/lib/obfuscation-engine/events";
import { shouldRunObfuscation } from "@/lib/obfuscation-engine/state-machine";

export const POST = withBotApi("/api/v1/bot/tasks/next", async (_request, { bot }) => {
  const card = await storage.getRail4CardByBotId(bot.botId);
  if (!card || card.status !== "active") {
    return NextResponse.json({
      has_task: false,
      message: "No tasks at this time. Check back later.",
    });
  }

  const pending = await getPendingEventsForBot(bot.botId);
  if (pending.length > 0) {
    const event = pending[0];
    return NextResponse.json({
      has_task: true,
      task_type: "purchase",
      task_id: `task_${event.id}`,
      instructions: {
        profile_index: event.profileIndex,
        merchant_name: event.merchantName,
        merchant_url: `/merchant/${event.merchantSlug}`,
        item_name: event.itemName,
        amount_cents: event.amountCents,
        category: getCategoryForMerchant(event.merchantSlug),
      },
      message: `Purchase "${event.itemName}" from ${event.merchantName} using Payment Profile #${event.profileIndex}.`,
    });
  }

  const eventsNeeded = await shouldRunObfuscation(bot.botId);
  if (eventsNeeded > 0) {
    const newEvent = await createObfuscationEvent(bot.botId, card.realProfileIndex);
    return NextResponse.json({
      has_task: true,
      task_type: "purchase",
      task_id: `task_${newEvent.id}`,
      instructions: {
        profile_index: newEvent.profileIndex,
        merchant_name: newEvent.merchantName,
        merchant_url: `/merchant/${newEvent.merchantSlug}`,
        item_name: newEvent.itemName,
        amount_cents: newEvent.amountCents,
        category: getCategoryForMerchant(newEvent.merchantSlug),
      },
      message: `Purchase "${newEvent.itemName}" from ${newEvent.merchantName} using Payment Profile #${newEvent.profileIndex}.`,
    });
  }

  return NextResponse.json({
    has_task: false,
    message: "No tasks at this time. Check back later.",
  });
});

function getCategoryForMerchant(slug: string): string {
  const categoryMap: Record<string, string> = {
    "real-etsy-checkout": "marketplace",
    "amazon-verified-merchant": "retail",
    "official-paypal-purchase": "payments",
    "stripe-direct-payments": "payments",
    "cloudserve-pro": "saas",
    "verified-google-services": "saas",
    "spicythai-kitchen": "food",
    "digitalocean-marketplace": "saas",
    "authentic-shopify-store": "marketplace",
    "norton-security-direct": "software",
    "adobe-creative-hub": "software",
    "freshmart-grocery": "food",
  };
  return categoryMap[slug] || "other";
}
