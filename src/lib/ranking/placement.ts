export const PLACEMENT_BATTLES_REQUIRED = 10;
export const PLACEMENT_VOTERS_REQUIRED = 3;

/**
 * A creator is ranked (eligible for a numeric rank/leaderboard) once they have
 * both enough battles and enough different people judging them. `voterCount`
 * is distinct voter sessions across every battle they appeared in, won or
 * lost. Both conditions must hold — see RANKING.md § Placement.
 */
export function isRanked(battlesCount: number, voterCount: number): boolean {
  return battlesCount >= PLACEMENT_BATTLES_REQUIRED && voterCount >= PLACEMENT_VOTERS_REQUIRED;
}

/**
 * Whether this battle gives a slot to an unranked creator. Alternates on the
 * voter's own battle count so nobody sees two forced placement pairings in a
 * row — a coin flip would still produce streaks, which is the thing being
 * fixed. See RANKING.md § Pairing.
 */
export function isPlacementTurn(voterBattlesCount: number): boolean {
  return voterBattlesCount % 2 === 0;
}
