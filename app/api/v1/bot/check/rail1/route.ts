import { NextResponse } from "next/server";
import { withBotApi } from "@/lib/agent-management/agent-api/middleware";
import { buildRail1Detail } from "@/lib/agent-management/agent-api/status-builders";

export const GET = withBotApi("/api/v1/bot/check/rail1", async (_request, { bot }) => {
  const detail = await buildRail1Detail(bot.botId);
  return NextResponse.json(detail);
});
