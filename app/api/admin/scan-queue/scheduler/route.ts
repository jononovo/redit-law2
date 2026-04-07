import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/platform-management/auth/session";
import { startScheduler, stopScheduler, getSchedulerStatus } from "@/lib/brand-engine/scan-queue/scheduler";

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) return null;
  if (!user.flags?.includes("admin")) return null;
  return user;
}

export async function GET(_request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  return NextResponse.json(getSchedulerStatus());
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const action = body.action;

  if (action === "start") {
    const result = startScheduler();
    return NextResponse.json(result);
  }

  if (action === "stop") {
    const result = stopScheduler();
    return NextResponse.json(result);
  }

  return NextResponse.json(
    { error: "Invalid action. Use 'start' or 'stop'." },
    { status: 400 },
  );
}
