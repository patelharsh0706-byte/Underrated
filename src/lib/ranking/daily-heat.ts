export const DAILY_HEAT_BATTLES_REQUIRED = 5;
export const DAILY_HEAT_VOTERS_REQUIRED = 4;

/**
 * Whether a creator is eligible for the Daily Heat board, and so for the Main
 * Character crown. Both floors are same-day.
 *
 * Battles alone measure volume, not agreement — one session can produce eight
 * battles in minutes. The voter floor makes the crown mean several different
 * people rated you highly today. See RANKING.md § Main Character.
 */
export function isDailyHeatEligible(battlesToday: number, votersToday: number): boolean {
  return (
    battlesToday >= DAILY_HEAT_BATTLES_REQUIRED && votersToday >= DAILY_HEAT_VOTERS_REQUIRED
  );
}

/** Daily Heat = wins today − losses today. See RANKING.md § Main Character. */
export function dailyHeat(winsToday: number, lossesToday: number): number {
  return winsToday - lossesToday;
}
