import { NextRequest, NextResponse } from "next/server";
import { withBotApi } from "@/features/platform-management/agent-management/agent-api/middleware";
import { storage } from "@/server/storage";
import { buildShippingFile } from "@/features/agent-interaction/shipping/build-shipping-file";

export const GET = withBotApi("bot.shipping-addresses", async (_request: NextRequest, ctx) => {
  if (!ctx.bot.ownerUid) {
    return NextResponse.json({ error: "bot_not_claimed", message: "This bot has not been claimed by an owner yet." }, { status: 422 });
  }

  const addresses = await storage.getShippingAddressesByOwner(ctx.bot.ownerUid);
  const shippingMd = buildShippingFile(addresses);

  return NextResponse.json({
    file_content: shippingMd,
    suggested_path: ".creditclaw/shipping.md",
    address_count: addresses.length,
    has_default: addresses.some((a) => a.isDefault),
  });
});
