// Who may enter the Arena or submit a demo — DECISIONS.md § 2026-10-06.
// Pure, so the order of the checks is tested without a database.

export type EntryState =
  | { kind: "signed-out" }
  | { kind: "needs-profile" }
  | { kind: "profile-only"; username: string; email: string }
  | { kind: "in-arena"; username: string; email: string };

/**
 * Signed in with no `accounts` row counts as signed out: Sign in with X makes
 * the row. Sending that person to /welcome instead would bounce them straight
 * back here, since /welcome needs the row too.
 */
export function entryStateFrom(
  account: { creatorId: string | null; email: string | null } | null,
  creator: { username: string; profileOnly: boolean } | null,
): EntryState {
  if (!account) return { kind: "signed-out" };
  if (!account.creatorId || !creator) return { kind: "needs-profile" };
  const email = account.email ?? "";
  return creator.profileOnly
    ? { kind: "profile-only", username: creator.username, email }
    : { kind: "in-arena", username: creator.username, email };
}

/** Pages that "⚡ You're in." continues to, instead of opening the new profile. */
const CONTINUES_AFTER_PROFILE = ["/submit", "/demos/submit"];

export function continuesAfterProfile(next: string): boolean {
  return CONTINUES_AFTER_PROFILE.includes(next.split("?")[0]);
}

export function onboardingFor(page: string): string {
  return `/welcome?next=${encodeURIComponent(page)}`;
}
