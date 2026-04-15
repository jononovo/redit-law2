import { NextRequest, NextResponse } from "next/server";
import { getCachedLeaderboardEntries } from "@/features/agent-testing/leaderboard/leaderboard-cache";

export async function GET(request: NextRequest) {
  try {
    const limitParam = request.nextUrl.searchParams.get("limit");
    const limit = limitParam ? parseInt(limitParam, 10) : 10;

    if (isNaN(limit) || limit < 1) {
      return NextResponse.json({ error: "Invalid limit parameter" }, { status: 400 });
    }

    const result = await getCachedLeaderboardEntries(limit);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[leaderboard] Failed to fetch leaderboard:", error);
    return NextResponse.json({ error: "Failed to fetch leaderboard" }, { status: 500 });
  }
}
