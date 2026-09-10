/**
 * One row on the leaderboard board, normalized from either ranking source —
 * `getLeaderboard()` (all-time Aura) or `getTop24h()` (Daily Heat). `metric`
 * carries whichever number that scope ranks on (Aura or Daily Heat), so the
 * podium/table components don't need to know which source they got.
 */
export interface BoardEntry {
  id: string;
  username: string;
  name: string;
  avatarUrl: string | null;
  bio: string | null;
  category: string | null;
  metric: number;
}

export interface RankedEntry extends BoardEntry {
  rank: number;
}
