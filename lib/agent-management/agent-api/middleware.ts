import { NextRequest, NextResponse } from "next/server";
import { authenticateBot } from "@/lib/agent-management/auth";
import { checkBotRateLimit } from "@/lib/agent-management/rate-limit";
import { storage } from "@/server/storage";
import { retryPendingWebhooksForBot } from "@/lib/webhooks";
import type { Bot } from "@/shared/schema";

const lastRetryCheck = new Map<string, number>();
const RETRY_CHECK_INTERVAL_MS = 60 * 1000;

interface BotApiContext {
  bot: Bot;
  ip: string;
}

type BotApiHandler = (request: NextRequest, ctx: BotApiContext) => Promise<NextResponse>;

export function withBotApi(endpoint: string, handler: BotApiHandler) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const startTime = Date.now();
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const userAgent = request.headers.get("user-agent") || null;
    let botId = "unknown";
    let statusCode = 500;
    let errorCode: string | null = null;

    try {
      const bot = await authenticateBot(request);
      if (!bot) {
        statusCode = 401;
        errorCode = "unauthorized";
        return NextResponse.json(
          { error: "unauthorized", message: "Invalid API key" },
          { status: 401 }
        );
      }

      botId = bot.botId;

      const rateCheck = checkBotRateLimit(bot.botId, endpoint);
      if (!rateCheck.allowed) {
        statusCode = 429;
        errorCode = "rate_limited";
        return NextResponse.json(
          { error: "rate_limited", message: "Too many requests. Slow down.", retry_after_seconds: rateCheck.retryAfterSeconds },
          { status: 429 }
        );
      }

      const response = await handler(request, { bot, ip });
      statusCode = response.status;

      if (statusCode >= 400) {
        try {
          const body = await response.clone().json();
          errorCode = body.error || null;
        } catch {}
      }

      return response;
    } catch (error: any) {
      console.error(`Bot API error [${endpoint}]:`, error?.message || error);
      statusCode = 500;
      errorCode = "internal_error";
      return NextResponse.json(
        { error: "internal_error", message: "An unexpected error occurred." },
        { status: 500 }
      );
    } finally {
      const responseTimeMs = Date.now() - startTime;
      storage.createAccessLog({
        botId,
        endpoint,
        method: request.method,
        statusCode,
        ip,
        userAgent,
        responseTimeMs,
        errorCode,
      });

      if (botId !== "unknown") {
        const now = Date.now();
        const lastCheck = lastRetryCheck.get(botId) || 0;
        if (now - lastCheck > RETRY_CHECK_INTERVAL_MS) {
          lastRetryCheck.set(botId, now);
          retryPendingWebhooksForBot(botId).catch(() => {});
        }
      }
    }
  };
}
