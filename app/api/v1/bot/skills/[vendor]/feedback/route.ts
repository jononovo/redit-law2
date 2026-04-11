import { NextRequest, NextResponse } from "next/server";
import { authenticateBot } from "@/features/platform-management/agent-management/auth";
import { getCurrentUser } from "@/features/platform-management/auth/session";
import { storage } from "@/server/storage";
import { insertBrandFeedbackSchema } from "@/shared/schema";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ vendor: string }> }
) {
  const { vendor: slug } = await params;

  const brand = await storage.getBrandBySlug(slug);
  if (!brand) {
    return NextResponse.json({ error: "Brand not found" }, { status: 404 });
  }

  let source = "anonymous_agent";
  let authenticated = false;
  let botId: string | null = null;
  let reviewerUid: string | null = null;

  const bot = await authenticateBot(request);
  if (bot) {
    source = "agent";
    authenticated = true;
    botId = bot.botId;
  } else {
    const user = await getCurrentUser();
    if (user) {
      source = "human";
      authenticated = true;
      reviewerUid = user.uid;
    }
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const normalized = {
    brandSlug: slug,
    searchAccuracy: body.search_accuracy ?? body.searchAccuracy,
    stockReliability: body.stock_reliability ?? body.stockReliability,
    checkoutCompletion: body.checkout_completion ?? body.checkoutCompletion,
    checkoutMethod: body.checkout_method ?? body.checkoutMethod,
    outcome: body.outcome,
    comment: body.comment,
  };

  const parsed = insertBrandFeedbackSchema.safeParse(normalized);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  if (authenticated && botId) {
    const recent = await storage.getRecentFeedbackByBot(slug, botId, 1);
    if (recent) {
      return NextResponse.json(
        { error: "Rate limited — max 1 feedback per brand per bot per hour" },
        { status: 429 }
      );
    }
  }

  if (!authenticated) {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      ?? request.headers.get("x-real-ip")
      ?? "unknown";
    const recentAnon = await storage.getBrandFeedback(slug, 10);
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentFromIp = recentAnon.filter(
      f => !f.authenticated && f.source === "anonymous_agent" && f.createdAt >= oneHourAgo
    );
    if (recentFromIp.length >= 5) {
      return NextResponse.json(
        { error: "Rate limited — max 5 anonymous feedback per brand per hour" },
        { status: 429 }
      );
    }
  }

  await storage.createBrandFeedback({
    ...parsed.data,
    source,
    authenticated,
    botId,
    reviewerUid,
  });

  return NextResponse.json({
    received: true,
    brand_slug: slug,
    message: "Thanks — this feedback improves the skill for all agents.",
  });
}
