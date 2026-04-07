import { NextResponse } from "next/server";
import { withBotApi } from "@/features/platform-management/agent-management/agent-api/middleware";
import { buildRail2Detail } from "@/features/platform-management/agent-management/agent-api/status-builders";

export const GET = withBotApi("/api/v1/bot/check/rail2", async (_request, { bot }) => {
  const detail = await buildRail2Detail(bot.botId);
  return NextResponse.json(detail);
});
