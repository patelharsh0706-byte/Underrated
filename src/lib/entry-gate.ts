// Who may enter the Arena or submit a demo — DECISIONS.md § 2026-10-06.
// Pure, so the order of the checks is tested without a database.

export type EntryState =
  | { kind: "signed-out" }
  | { kind: "needs-profile" }
  | ({ kind: "profile-only" } & Signed)
  | ({ kind: "in-arena" } & Signed);

/** What the pages fill in for a signed-in person with a finished profile. */
interface Signed {
  username: string;
  email: string;
  /** The X handle they signed in with — /submit shows it, locked. */
  handle: string;
  /** Their profile's project link ("" when they have none). */
  projectUrl: string;
}

/**
 * Signed in with no `accounts` row counts as signed out: Sign in with X makes
 * the row. Sending that person to /welcome instead would bounce them straight
 * back here, since /welcome needs the row too.
 */
export function entryStateFrom(
  account: { creatorId: string | null; email: string | null; xUsername: string } | null,
  creator: { username: string; profileOnly: boolean; workUrl: string | null } | null,
): EntryState {
  if (!account) return { kind: "signed-out" };
  if (!account.creatorId || !creator) return { kind: "needs-profile" };
  const signed: Signed = { username: creator.username, email: account.email ?? "", handle: account.xUsername, projectUrl: creator.workUrl ?? "" };
  return creator.profileOnly ? { kind: "profile-only", ...signed } : { kind: "in-arena", ...signed };
}

/** Pages that "⚡ You're in." continues to, instead of opening the new profile. */
const CONTINUES_AFTER_PROFILE = ["/submit", "/demos/submit"];

export function continuesAfterProfile(next: string): boolean {
  return CONTINUES_AFTER_PROFILE.includes(next.split("?")[0]);
}

export function onboardingFor(page: string): string {
  return `/welcome?next=${encodeURIComponent(page)}`;
}
