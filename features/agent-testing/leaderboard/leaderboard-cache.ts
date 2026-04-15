import { db } from "@/server/db";
import { agentTestSessions, bots } from "@/shared/schema";
import { eq, and, desc, isNotNull, sql } from "drizzle-orm";
import type { LeaderboardEntry } from "./leaderboard-types";

const CACHE_TTL_MS = 60 * 60 * 1000;
const MAX_CACHED_ROWS = 50;

let cachedEntries: LeaderboardEntry[] = [];
let cachedAt: number = 0;

function buildDisplayNameFromBotNameAndId(botName: string, botId: string): string {
  const suffix = botId.slice(-3);
  return `${botName}-${suffix}`;
}

function buildDisplayNameFromOwnerToken(ownerToken: string): string {
  const cleaned = ownerToken.replace(/^otk_/, "");
  return `agent-${cleaned.slice(-6)}`;
}

function deduplicateToBestScorePerAgent(
  rows: { score: number | null; grade: string | null; submittedAt: Date | null; botId: string | null; ownerToken: string | null; botName: string | null }[]
): { score: number | null; grade: string | null; submittedAt: Date | null; botId: string | null; ownerToken: string | null; botName: string | null }[] {
  const bestByAgent = new Map<string, typeof rows[number]>();

  for (const row of rows) {
    const agentKey = row.botId || row.ownerToken || `unknown-${Math.random()}`;
    const existing = bestByAgent.get(agentKey);
    if (!existing || (row.score ?? 0) > (existing.score ?? 0)) {
      bestByAgent.set(agentKey, row);
    }
  }

  return Array.from(bestByAgent.values()).sort((a, b) => {
    const scoreDiff = (b.score ?? 0) - (a.score ?? 0);
    if (scoreDiff !== 0) return scoreDiff;
    const timeA = a.submittedAt?.getTime() ?? 0;
    const timeB = b.submittedAt?.getTime() ?? 0;
    return timeB - timeA;
  });
}

export async function fetchLeaderboardFromDatabase(): Promise<LeaderboardEntry[]> {
  const rows = await db
    .select({
      score: agentTestSessions.score,
      grade: agentTestSessions.grade,
      submittedAt: agentTestSessions.submittedAt,
      botId: agentTestSessions.botId,
      ownerToken: agentTestSessions.ownerToken,
      botName: bots.botName,
    })
    .from(agentTestSessions)
    .leftJoin(bots, eq(agentTestSessions.botId, bots.botId))
    .where(
      and(
        eq(agentTestSessions.status, "scored"),
        eq(agentTestSessions.testType, "full_shop"),
        isNotNull(agentTestSessions.score),
      ),
    )
    .orderBy(desc(agentTestSessions.score), desc(agentTestSessions.submittedAt))
    .limit(200);

  const deduplicated = deduplicateToBestScorePerAgent(rows);

  return deduplicated.slice(0, MAX_CACHED_ROWS).map((row, index) => {
    let displayName: string;
    if (row.botName && row.botId) {
      displayName = buildDisplayNameFromBotNameAndId(row.botName, row.botId);
    } else if (row.ownerToken) {
      displayName = buildDisplayNameFromOwnerToken(row.ownerToken);
    } else {
      displayName = "Unknown Agent";
    }

    return {
      rank: index + 1,
      displayName,
      score: row.score ?? 0,
      grade: row.grade ?? "F",
      completedAt: row.submittedAt?.toISOString() ?? "",
    };
  });
}

export async function getCachedLeaderboardEntries(limit: number): Promise<{ entries: LeaderboardEntry[]; cachedAt: string }> {
  const now = Date.now();
  if (now - cachedAt > CACHE_TTL_MS || cachedEntries.length === 0) {
    cachedEntries = await fetchLeaderboardFromDatabase();
    cachedAt = now;
  }

  const clampedLimit = Math.min(Math.max(limit, 1), MAX_CACHED_ROWS);
  return {
    entries: cachedEntries.slice(0, clampedLimit),
    cachedAt: new Date(cachedAt).toISOString(),
  };
}
