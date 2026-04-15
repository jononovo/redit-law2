import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/server/storage";
import { getSessionUser } from "@/features/platform-management/auth/session";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ cardId: string }> },
) {
  const user = await getSessionUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { cardId } = await params;
  const tests = await storage.getAgentTestsByCardId(cardId);

  const ownedTests = tests.filter((t) => t.ownerUid === user.uid);

  return NextResponse.json({
    tests: ownedTests.map((t) => ({
      test_id: t.testId,
      status: t.status,
      score: t.score,
      grade: t.grade,
      created_at: t.createdAt.toISOString(),
    })),
  });
}
