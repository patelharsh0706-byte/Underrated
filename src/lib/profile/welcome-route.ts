import { continuesAfterProfile } from "@/lib/entry-gate";

// Someone who already finished onboarding opens /welcome (typed address, old
// link): no second run through the steps. Pure, so it's tested.

/** Finished = owns a creator AND has been through the steps once. */
export function hasFinishedOnboarding(account: { creatorId: string | null; onboardedAt: Date | null }): boolean {
  return !!account.creatorId && !!account.onboardedAt;
}

/**
 * Where a finished person goes instead: on to a waiting vote or to Arena entry /
 * demo submit when that's what brought them here, otherwise their profile.
 */
export function finishedWelcomeHref(next: string, username: string): string {
  if (next.includes("resume=1") || continuesAfterProfile(next)) return next;
  return `/c/${username}`;
}
