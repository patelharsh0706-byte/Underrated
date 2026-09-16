export interface SpotForReceipt {
  rankAtSpot: number | null;
  currentRank: number | null;
  isActive: boolean;
  createdAt: Date;
  name: string;
  username: string;
}

export function climbOf(rankAtSpot: number | null, currentRank: number | null): number {
  if (!rankAtSpot || !currentRank) return -Infinity;
  return rankAtSpot - currentRank;
}

/**
 * Pick the best spot from a list (max climb, ties go to newest).
 * Excludes spots with null ranks or inactive creators.
 */
export function pickBestSpot(spots: SpotForReceipt[]): SpotForReceipt | undefined {
  if (spots.length === 0) return undefined;

  // Filter: must have a rank at spot and be active
  const validSpots = spots.filter((s) => s.rankAtSpot !== null && s.isActive);
  if (validSpots.length === 0) return undefined;

  // Compute climbs
  const withClimb = validSpots.map((s) => ({
    ...s,
    climb: climbOf(s.rankAtSpot, s.currentRank),
  }));

  // Sort: max climb desc, then newest first
  withClimb.sort((a, b) => {
    if (b.climb !== a.climb) return b.climb - a.climb;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  // Drop the climb property and return
  const best = withClimb[0];
  const { climb, ...rest } = best;
  return rest;
}
