import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/platform-management/auth/session";
import { addToQueue, getQueueStats, clearCompleted, retryFailed, removeEntry } from "@/lib/brand-engine/scan-queue/process-next";

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

  const stats = await getQueueStats();
  return NextResponse.json(stats);
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  if (body.action === "clear_completed") {
    const cleared = await clearCompleted();
    return NextResponse.json({ cleared });
  }

  if (body.action === "retry_failed") {
    const retried = await retryFailed();
    return NextResponse.json({ retried });
  }

  if (body.action === "remove" && typeof body.id === "number") {
    const removed = await removeEntry(body.id);
    return NextResponse.json({ removed });
  }

  const domains: string[] = body.domains;
  const allowRescans: boolean = body.allowRescans === true;
  if (!Array.isArray(domains) || domains.length === 0) {
    return NextResponse.json(
      { error: "domains must be a non-empty array of strings" },
      { status: 400 },
    );
  }

  const result = await addToQueue(domains, allowRescans);
  return NextResponse.json(result);
}
