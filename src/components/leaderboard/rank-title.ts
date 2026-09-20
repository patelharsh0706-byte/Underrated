export interface RankTitle {
  label: string;
  className: string;
}

/**
 * Main Character / Side Character / Plot Twist — see PRODUCT.md § Terminology
 * and RANKING.md § Main Character.
 *
 * Side Character and Plot Twist are pure *position* labels for leaderboard
 * spots #2 and #3 — no ranking logic behind them, apply on sight.
 *
 * Main Character is different: it is NOT "whoever sits in position 1 of the
 * view you're looking at". It's today's actual Daily-Heat #1 — a separate,
 * UTC-daily ranking (see RANKING.md § Main Character) that can crown a
 * different creator than the one leading All-time Aura, or the one leading a
 * single category filter. `mainCharacterId` must come from the real
 * `getTop24h()` result (rank 1, unfiltered) — passing anything else risks
 * mislabeling someone. When it doesn't match, position 1 gets no title
 * rather than a wrong one.
 */
export function rankTitleFor(
  rank: number,
  creatorId: string,
  mainCharacterId: string | null,
): RankTitle | null {
  if (rank === 1) {
    return creatorId === mainCharacterId
      ? { label: "Main Character", className: "bg-aura" }
      : null;
  }
  if (rank === 2) return { label: "Side Character", className: "bg-rank-second" };
  if (rank === 3) return { label: "Plot Twist", className: "bg-rank-third" };
  return null;
}
