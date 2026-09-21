import "server-only";

import type { User } from "@supabase/supabase-js";

import { ensureProfile, getProfileByUserId, linkPickerSession } from "@/lib/db/queries";
import { readVoterSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

type Profile = NonNullable<Awaited<ReturnType<typeof getProfileByUserId>>>;

/**
 * The fields a profile is created from, read off the Supabase user. One
 * mapping for the OAuth callback, the email-confirm route and the self-heal
 * below, so the three cannot drift on which metadata key holds the name.
 */
export function profileInputFromUser(user: User) {
  return {
    userId: user.id,
    email: user.email ?? "",
    displayName:
      (user.user_metadata?.full_name as string | undefined) ??
      (user.user_metadata?.name as string | undefined) ??
      null,
    avatarUrl: (user.user_metadata?.avatar_url as string | undefined) ?? null,
  };
}

/**
 * The signed-in user's profile, created on the spot if it does not exist.
 *
 * The auth callback creates the profile eagerly, but it is no longer the only
 * path: an entry point whose redirect never reached the callback, or a
 * callback that threw after the session was already set, left a signed-in
 * user with no row — and every page that needed one then sent them to the
 * signed-out pitch, told to sign in while signed in (ISSUES.md § 2026-09-21).
 * Any page that requires a profile calls this instead of the plain getter, so
 * a missed callback heals on the next request rather than never.
 *
 * Built to cost nothing on the common path: one select by primary key. Only a
 * miss pays the `auth.getUser()` network call, and it does the callback's
 * *both* jobs — the profile and the voter-session link — because a recovered
 * user with a handle but none of their earlier picks would have an empty
 * receipts page while looking fully set up.
 *
 * Fails closed: if the miss path cannot produce a profile it logs with the
 * user id and returns null. Callers render a signed-in fallback on null —
 * never the pitch, never a redirect to /sign-in, never a thrown error. The
 * header avatar renders on every page; an exception here would take it down
 * everywhere for that user.
 */
export async function getOrCreateProfile(userId: string): Promise<Profile | null> {
  const existing = await getProfileByUserId(userId);
  if (existing) return existing;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || user.id !== userId) {
      console.error("Profile self-heal: no user for signed-in id", { userId });
      return null;
    }

    const profile = await ensureProfile(profileInputFromUser(user));

    // First link wins, so this is a no-op when the session already belongs
    // to someone — including this same user.
    const voterSession = await readVoterSession();
    if (voterSession) await linkPickerSession(voterSession, userId);

    return profile ?? null;
  } catch (error) {
    console.error("Profile self-heal failed", { userId }, error);
    return null;
  }
}
