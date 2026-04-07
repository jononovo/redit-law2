import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/features/platform-management/auth/session";
import { processNextInQueue } from "@/features/brand-engine/scan-queue/process-next";
import { getSchedulerStatus } from "@/features/brand-engine/scan-queue/scheduler";

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) return null;
  if (!user.flags?.includes("admin")) return null;
  return user;
}

export async function POST(_request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const schedulerStatus = getSchedulerStatus();
  if (schedulerStatus.running || schedulerStatus.tickInProgress) {
    return NextResponse.json(
      { error: "scheduler_active", message: "Stop the scheduler before running manual scans" },
      { status: 409 },
    );
  }

  try {
    const result = await processNextInQueue();
    if (!result) {
      return NextResponse.json({ message: "Queue is empty — nothing to scan" });
    }
    return NextResponse.json(result);
  } catch (error) {
    console.error("[scan-queue/run] error:", error);
    return NextResponse.json(
      { error: "scan_failed", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
