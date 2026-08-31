export const START_AURA = 1500;
export const K = 24;

/** Expected score for a player rated `ratingA` against one rated `ratingB`. */
export function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + 10 ** ((ratingB - ratingA) / 400));
}

export interface EloUpdate {
  delta: number;
  winnerAfter: number;
  loserAfter: number;
}

/**
 * Computes the Aura change for a single battle. The delta is computed once
 * and applied symmetrically so the pool's total Aura never drifts.
 */
export function computeEloUpdate(winnerRating: number, loserRating: number): EloUpdate {
  const expectedWinner = expectedScore(winnerRating, loserRating);
  const delta = Math.round(K * (1 - expectedWinner));
  return {
    delta,
    winnerAfter: winnerRating + delta,
    loserAfter: loserRating - delta,
  };
}
