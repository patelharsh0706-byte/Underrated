// Sign in with X — the pure rules (DATABASE.md § accounts, DECISIONS.md
// § 2026-10-04 "Sign in with X to pick"). No database here, so every rule is
// unit-tested; lib/account.ts does the reads and writes.

export interface XIdentity {
  /** X's permanent numeric user id. */
  xUserId: string;
  /** @handle without the @, as X reports it now (it can change later). */
  xUsername: string;
  xName: string | null;
  xAvatarUrl: string | null;
}

interface SupabaseUserLike {
  user_metadata?: Record<string, unknown> | null;
  identities?: { provider: string; id?: string; identity_data?: Record<string, unknown> | null }[] | null;
}

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

/** The X account behind a Supabase user, or null if it isn't an X sign-in. */
export function xIdentityFromUser(user: SupabaseUserLike): XIdentity | null {
  const identity = user.identities?.find((i) => i.provider === "x" || i.provider === "twitter");
  const data = { ...(identity?.identity_data ?? {}), ...(user.user_metadata ?? {}) };
  const xUserId = str(data.provider_id) ?? str(data.sub) ?? str(identity?.id);
  const xUsername = str(data.user_name) ?? str(data.preferred_username);
  if (!xUserId || !xUsername) return null;
  return {
    xUserId,
    xUsername: xUsername.replace(/^@/, ""),
    xName: str(data.full_name) ?? str(data.name),
    xAvatarUrl: str(data.avatar_url) ?? str(data.picture),
  };
}

export interface ClaimCandidate {
  id: string;
  username: string;
  userId: string | null;
  xUserId: string | null;
}

export interface ClaimDecision {
  creatorId: string;
  /** True on the first claim: save the X user id so the handle is never trusted again. */
  saveXUserId: boolean;
}

/**
 * Which existing creator this X account owns, if any.
 * 1. A creator already carrying this X user id — it is theirs.
 * 2. Otherwise an UNCLAIMED creator whose username is the @handle
 *    (case-insensitive) — claimed once, and the id is saved.
 * 3. Otherwise none. A claimed creator is never taken over by a handle match.
 */
export function chooseClaim(
  x: Pick<XIdentity, "xUserId" | "xUsername">,
  byXUserId: ClaimCandidate | null,
  byHandle: ClaimCandidate | null,
): ClaimDecision | null {
  if (byXUserId && byXUserId.xUserId === x.xUserId) return { creatorId: byXUserId.id, saveXUserId: false };
  if (
    byHandle &&
    byHandle.userId === null &&
    byHandle.xUserId === null &&
    byHandle.username.toLowerCase() === x.xUsername.toLowerCase()
  ) {
    return { creatorId: byHandle.id, saveXUserId: true };
  }
  return null;
}

/**
 * The value a signed-in pick stores in battles.voter_session. Every existing
 * "people deciding" / "already judged" query counts distinct voter_session,
 * so they count accounts with no rewrite (RANKING.md § Scoring).
 */
export function accountVoterKey(accountId: string): string {
  return `u:${accountId}`;
}
