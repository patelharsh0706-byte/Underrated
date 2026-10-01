// Underhyped Demos ranking — RANKING.md § Demos. A filter, then a sort:
// at least 20 judges to be ranked; then % underhyped (highest first), with
// more judges breaking a tie. No invented score, no Aura, clicks never count.

export const MIN_JUDGES = 20;

export interface DemoTally {
  id: string;
  judges: number;
  underhyped: number;
}

export type RankedDemo<T extends DemoTally> = T & { rank: number; pct: number };
export type UnrankedDemo<T extends DemoTally> = T & { pct: number; needs: number };

export function pctUnderhyped(d: DemoTally): number {
  return d.judges > 0 ? Math.round((d.underhyped / d.judges) * 100) : 0;
}

export function rankDemos<T extends DemoTally>(demos: readonly T[]): { ranked: RankedDemo<T>[]; unranked: UnrankedDemo<T>[] } {
  const ranked = demos
    .filter((d) => d.judges >= MIN_JUDGES)
    .sort((a, b) => b.underhyped / b.judges - a.underhyped / a.judges || b.judges - a.judges)
    .map((d, i) => ({ ...d, rank: i + 1, pct: pctUnderhyped(d) }));

  const unranked = demos
    .filter((d) => d.judges < MIN_JUDGES)
    .sort((a, b) => b.judges - a.judges)
    .map((d) => ({ ...d, pct: pctUnderhyped(d), needs: MIN_JUDGES - d.judges }));

  return { ranked, unranked };
}

/**
 * Judging queue — RANKING.md § Demos: demos this visitor hasn't judged,
 * fewest 7-day judges first (so new demos reach 20 quickly), then newest.
 */
export function queueOrder<T extends { id: string; judges: number; createdAt: string }>(all: readonly T[], judged: readonly string[]): string[] {
  const seen = new Set(judged);
  return all
    .filter((d) => !seen.has(d.id))
    .sort((a, b) => a.judges - b.judges || b.createdAt.localeCompare(a.createdAt))
    .map((d) => d.id);
}
