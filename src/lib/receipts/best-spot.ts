export interface SpotForReceipt {
  rankAtSpot: number | null;
  currentRank: number | null;
  auraAtSpot: number;
  isActive: boolean;
  createdAt: Date;
  name: string;
  username: string;
}

/** A spot that actually has two ranks to compare — what the page can brag about. */
export type BestSpot = SpotForReceipt & { rankAtSpot: number; currentRank: number };

/** Places climbed since the spot. -Infinity when either end is unknown, so an
 * incomparable spot always sorts last. */
export function climbOf(rankAtSpot: number | null, currentRank: number | null): number {
  if (!rankAtSpot || !currentRank) return -Infinity;
  return rankAtSpot - currentRank;
}

/**
 * The spot worth showing: the biggest climb, ties to the newest.
 *
 * Excluded, because none of them are a receipt:
 * - either rank unknown — a creator spotted during placement has no "at #47"
 * - the creator is no longer active
 * - the creator has not actually climbed (a flat or falling rank is not a call)
 */
export function pickBestSpot(spots: SpotForReceipt[]): BestSpot | undefined {
  const candidates = spots.filter(
    (s): s is BestSpot =>
      s.isActive &&
      s.rankAtSpot !== null &&
      s.currentRank !== null &&
      climbOf(s.rankAtSpot, s.currentRank) > 0,
  );

  if (candidates.length === 0) return undefined;

  return candidates.reduce((best, s) => {
    const diff = climbOf(s.rankAtSpot, s.currentRank) - climbOf(best.rankAtSpot, best.currentRank);
    if (diff > 0) return s;
    if (diff === 0 && s.createdAt.getTime() > best.createdAt.getTime()) return s;
    return best;
  });
}
