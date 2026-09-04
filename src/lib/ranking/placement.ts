export const PLACEMENT_BATTLES_REQUIRED = 10;

/** A creator is ranked (eligible for a numeric rank/leaderboard) once they
 *  clear this many valid battles. See RANKING.md § Placement. */
export function isRanked(battlesCount: number): boolean {
  return battlesCount >= PLACEMENT_BATTLES_REQUIRED;
}
