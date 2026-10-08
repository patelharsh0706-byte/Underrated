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

/**
 * The X account behind a Supabase user, or null if it isn't an X sign-in.
 *
 * Read ONLY from the X identity record, which Supabase writes from X's OAuth
 * response. Never from `user_metadata`: any client can set that with the
 * public key (sign-up / updateUser options.data), so trusting it let an email
 * or Google sign-up claim any X user id — someone else's profile and votes
 * (security review, 2026-10-08; DECISIONS.md).
 */
export function xIdentityFromUser(user: SupabaseUserLike): XIdentity | null {
  const identity = user.identities?.find((i) => i.provider === "x" || i.provider === "twitter");
  if (!identity) return null;
  const data = identity.identity_data ?? {};
  const xUserId = str(identity.id) ?? str(data.provider_id) ?? str(data.sub);
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
  xUserId: string | null;
}

/**
 * Which existing creator this X account owns: only the one whose stored X
 * user id equals the account's — never a match by @handle or username, which
 * can be wrong or reused (DECISIONS.md § 2026-10-06). Null: no creator yet.
 */
export function chooseClaim(x: Pick<XIdentity, "xUserId">, byXUserId: ClaimCandidate | null): string | null {
  return byXUserId && byXUserId.xUserId === x.xUserId ? byXUserId.id : null;
}

/**
 * The value a signed-in pick or demo judgement stores in voter_session: the X
 * person, so a recreated sign-in account can't judge the same pair again.
 * Every "people deciding" / "already judged" query counts distinct
 * voter_session, so they count X people with no rewrite (RANKING.md § Scoring).
 */
export function xVoterKey(xUserId: string): string {
  return `x:${xUserId}`;
}
