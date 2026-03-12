import { NextResponse } from "next/server";
import { withBotApi } from "@/lib/agent-management/agent-api/middleware";
import { buildRail5Detail } from "@/lib/agent-management/agent-api/status-builders";

export const GET = withBotApi("/api/v1/bot/check/rail5", async (_request, { bot }) => {
  const detail = await buildRail5Detail(bot.botId);
  return NextResponse.json(detail);
});
