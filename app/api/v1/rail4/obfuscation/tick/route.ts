import { NextRequest, NextResponse } from "next/server";
import { tickAllActiveCards } from "@/lib/obfuscation-engine/scheduler";

export async function POST(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "server_misconfigured", message: "CRON_SECRET not set" }, { status: 500 });
  }

  const auth = request.headers.get("authorization");
  if (!auth || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const result = await tickAllActiveCards();

  return NextResponse.json({
    processed: result.processed,
    events_created: result.eventsCreated,
    details: result.details,
  });
}
