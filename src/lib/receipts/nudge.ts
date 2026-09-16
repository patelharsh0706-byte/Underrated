export const RECEIPTS_NUDGE_AT = 5;
export const RECEIPTS_NUDGE_AGAIN_AT = 25;

/**
 * Determine if Receipts nudge should be shown.
 *
 * Rules:
 * - Hide if signed in (already has Receipts)
 * - Show at 5 picks, hide at 4
 * - Show again at 25 picks if dismissed at 5
 * - Hide if dismissed less than 20 picks ago
 */
export function shouldShowReceiptsNudge(
  sessionPicks: number,
  isSignedIn: boolean,
  dismissedAtPicks: number | null,
): boolean {
  if (isSignedIn) return false;
  if (!sessionPicks) return false;

  if (dismissedAtPicks !== null) {
    // Show again at +20 from dismissal
    if (sessionPicks < dismissedAtPicks + 20) return false;
  }

  return sessionPicks >= RECEIPTS_NUDGE_AT;
}
