import "server-only";

import { and, eq, getTableColumns, isNull, sql } from "drizzle-orm";
import { cookies } from "next/headers";

import { chooseClaim, xIdentityFromUser, xVoterKey, type ClaimCandidate } from "@/lib/account-claim";
import { db } from "@/lib/db";
import { entryStateFrom, type EntryState } from "@/lib/entry-gate";
import { isMockMode } from "@/lib/db/mock-data";
import { accounts, creators } from "@/lib/db/schema";
import { initialDraft } from "@/lib/profile/draft";
import { createClient } from "@/lib/supabase/server";
import { shippingUrlFrom, type XProfileData } from "@/lib/x-profile";

// Accounts made with Sign in with X — DATABASE.md § accounts. The email is
// private: nothing here ever returns it to a page.

export interface SignedInAccount {
  id: string;
  xUsername: string;
  xName: string | null;
  xAvatarUrl: string | null;
  creatorId: string | null;
}

/**
 * The account row plus the creator it owns: the one with the same X user id —
 * the only link (DATABASE.md § accounts, 2026-10-06). `creatorId` is null until
 * the free profile is finished or an existing creator is claimed.
 */
export async function loadAccount(userId: string) {
  const [row] = await db
    .select({ ...getTableColumns(accounts), creatorId: creators.id })
    .from(accounts)
    .leftJoin(creators, eq(creators.xUserId, accounts.xUserId))
    .where(eq(accounts.id, userId));
  return row ?? null;
}

/** Who is signed in (auth only, no database read) — for the frequent calls. */
export async function getSignedInUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

/** Set at "Finish profile" in PREVIEW_MOCK=1, where there is no accounts row to read. */
export const PREVIEW_PROFILE_DONE_COOKIE = "uh-profile-done";

/**
 * `voterKey` is what a pick or judgement stores in voter_session: "x:<X user
 * id>" (RANKING.md § Scoring, 2026-10-06). `creatorId`: the voter's own
 * creator, so a battle they're in never counts.
 */
export type Voter =
  | { kind: "signed-out" }
  | { kind: "needs-profile"; userId: string; voterKey: string }
  | { kind: "ok"; userId: string; voterKey: string; creatorId: string | null };

/**
 * Who may cast a counted vote — DECISIONS.md § 2026-10-05 "Onboarding v2".
 * A pick, demo judgement or profile Hype counts only from an account that owns
 * a creator row (a free profile, an Arena creator or an auto-claimed one).
 */
export async function getVoter(): Promise<Voter> {
  const userId = await getSignedInUserId();
  if (!userId) return { kind: "signed-out" };
  if (isMockMode()) {
    // Preview writes no votes, so the key only has to be stable.
    const voterKey = xVoterKey(`preview-${userId}`);
    const done = (await cookies()).get(PREVIEW_PROFILE_DONE_COOKIE)?.value === userId;
    return done ? { kind: "ok", userId, voterKey, creatorId: null } : { kind: "needs-profile", userId, voterKey };
  }
  const row = await loadAccount(userId);
  // No account row (an old session, or the sync in /auth/callback failed):
  // signed out, so the X pop-up runs again and creates it. "needs-profile"
  // here looped: /welcome needs the row too and bounced straight back.
  if (!row) return { kind: "signed-out" };
  const voterKey = xVoterKey(row.xUserId);
  return row.creatorId ? { kind: "ok", userId, voterKey, creatorId: row.creatorId } : { kind: "needs-profile", userId, voterKey };
}

/**
 * The gate in front of "Enter the Arena" (/submit) and "Submit your demo" —
 * DECISIONS.md § 2026-10-06. lib/entry-gate.ts decides; this only reads.
 */
export async function getEntryState(): Promise<EntryState> {
  const userId = await getSignedInUserId();
  if (!userId) return { kind: "signed-out" };
  if (isMockMode()) {
    // No database: the X identity from the session, the profile from the "Finish profile" cookie.
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    const x = data.user ? xIdentityFromUser(data.user) : null;
    const done = (await cookies()).get(PREVIEW_PROFILE_DONE_COOKIE)?.value === userId;
    const handle = x?.xUsername ?? "preview";
    return entryStateFrom(
      { creatorId: done ? "preview" : null, email: data.user?.email ?? null, xUsername: handle },
      done ? { username: handle.toLowerCase(), profileOnly: true, workUrl: null } : null,
    );
  }
  const account = await loadAccount(userId);
  const [creator] = account?.creatorId
    ? await db.select({ username: creators.username, profileOnly: creators.profileOnly, workUrl: creators.workUrl }).from(creators).where(eq(creators.id, account.creatorId))
    : [];
  return entryStateFrom(account ?? null, creator ?? null);
}

/** The signed-in person's account, or null when signed out (or not an X account). */
export async function getSignedInAccount(): Promise<SignedInAccount | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const row = await loadAccount(user.id);
  return row ? { id: row.id, xUsername: row.xUsername, xName: row.xName, xAvatarUrl: row.xAvatarUrl, creatorId: row.creatorId } : null;
}

/**
 * One-time prefill from X (bio, location, website) using the sign-in token.
 * Best effort: any failure — no token, X API refusal, timeout — just means
 * those fields start empty. DECISIONS.md § "Onboarding from X and profile v2".
 */
export async function fetchXProfile(providerToken: string | null | undefined): Promise<{ bio: string | null; location: string | null; url: string | null }> {
  const empty = { bio: null, location: null, url: null };
  if (!providerToken) {
    console.warn("X profile prefill skipped: no provider token in the sign-in session");
    return empty;
  }
  try {
    const res = await fetch("https://api.x.com/2/users/me?user.fields=description,location,url,entities", {
      headers: { Authorization: `Bearer ${providerToken}` },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) {
      // Visible in the server log — X refuses this call on some app tiers.
      console.warn("X profile prefill refused:", res.status, (await res.text()).slice(0, 200));
      return empty;
    }
    const body = (await res.json()) as { data?: XProfileData & { location?: string } };
    const d = body.data ?? {};
    return {
      bio: d.description?.trim() || null,
      location: d.location?.trim() || null,
      // Website field, else the first link in the bio (lib/x-profile.ts).
      url: shippingUrlFrom(d),
    };
  } catch {
    return empty;
  }
}

/** The X prefill as a draft; a link X sent that isn't a valid URL is dropped, never fatal. */
function prefillDraft(p: { bio: string | null; location: string | null; url: string | null }) {
  try {
    return initialDraft({ xBio: p.bio, xLocation: p.location, xUrl: p.url });
  } catch {
    return initialDraft({ xBio: p.bio, xLocation: p.location });
  }
}

/**
 * Called from /auth/callback after X sign-in: creates or refreshes the account
 * row, then auto-claims an existing creator (lib/account-claim.ts § chooseClaim).
 * One transaction, so a claim can never half-apply.
 */
export async function syncAccountFromUser(
  user: Parameters<typeof xIdentityFromUser>[0] & { id: string; email?: string | null },
  providerToken?: string | null,
): Promise<{ id: string; creatorId: string | null; onboarded: boolean } | null> {
  const x = xIdentityFromUser(user);
  if (!x) return null;
  const [existing] = await db.select({ id: accounts.id }).from(accounts).where(eq(accounts.id, user.id));
  const prefill = existing ? null : await fetchXProfile(providerToken);

  return db.transaction(async (tx) => {
    const [account] = await tx
      .insert(accounts)
      .values({
        id: user.id,
        xUserId: x.xUserId,
        xUsername: x.xUsername,
        xName: x.xName,
        xAvatarUrl: x.xAvatarUrl,
        email: user.email ?? null,
        // The one-time X prefill goes straight into the draft — the only
        // place it lives (DATABASE.md § accounts, 2026-10-06).
        draft: prefill ? prefillDraft(prefill) : null,
      })
      .onConflictDoUpdate({
        target: accounts.id,
        set: { xUsername: x.xUsername, xName: x.xName, xAvatarUrl: x.xAvatarUrl },
      })
      .returning({ id: accounts.id, onboardedAt: accounts.onboardedAt });
    const onboarded = !!account.onboardedAt;

    // The X user id is the link: a creator carrying it is already theirs.
    const pick = { id: creators.id, username: creators.username, xUserId: creators.xUserId };
    const [byXUserId] = await tx.select(pick).from(creators).where(eq(creators.xUserId, x.xUserId));
    const [byHandle] = byXUserId
      ? []
      : await tx
          .select(pick)
          .from(creators)
          .where(and(sql`lower(${creators.username}) = ${x.xUsername.toLowerCase()}`, isNull(creators.xUserId)));
    const decision = chooseClaim(x, (byXUserId as ClaimCandidate) ?? null, (byHandle as ClaimCandidate) ?? null);
    if (!decision) return { id: account.id, creatorId: null, onboarded };

    // First claim by @handle: saving the X user id IS the claim.
    if (decision.saveXUserId) {
      await tx.update(creators).set({ xUserId: x.xUserId }).where(and(eq(creators.id, decision.creatorId), isNull(creators.xUserId)));
    }
    return { id: account.id, creatorId: decision.creatorId, onboarded };
  });
}
