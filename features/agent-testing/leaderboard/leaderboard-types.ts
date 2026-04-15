export interface LeaderboardEntry {
  rank: number;
  displayName: string;
  score: number;
  grade: string;
  completedAt: string;
}

export interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  cachedAt: string;
}
