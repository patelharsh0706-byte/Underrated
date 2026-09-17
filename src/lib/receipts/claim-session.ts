import "server-only";

import { cookies } from "next/headers";

import { getUserId, hasAuthCookie } from "@/lib/auth";
import { linkPickerSession } from "@/lib/db/queries";

/** Marks that the voter session named in its value is already linked. */
const LINKED_COOKIE = "underhyped_linked";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/**
 * Make sure the browser's voter session belongs to the signed-in account.
 *
 * The auth callback links whatever session existed at login, but that is not
 * enough on its own: a picker who is already signed in never passes through
 * the callback again. A second device, or the same device after its cookie is
 * cleared, would keep playing under a session nobody owns, and those battles
 * would silently never appear on their receipts. One account is meant to own
 * every session it has ever played from.
 *
 * Called on the pick path, so it is built to cost nothing on the common path:
 * - already linked (marker cookie matches) — no auth check, no query
 * - no Supabase auth cookie at all — no auth check, no query
 *
 * Which leaves exactly one insert per device per account, the first time a
 * signed-in picker makes a pick.
 */
export async function claimVoterSession(voterSession: string): Promise<void> {
  const cookieStore = await cookies();

  if (cookieStore.get(LINKED_COOKIE)?.value === voterSession) return;

  if (!(await hasAuthCookie())) return;

  const userId = await getUserId();
  if (!userId) return;

  // First link wins, so this is a no-op if the session already belongs to
  // someone — including this same user.
  await linkPickerSession(voterSession, userId);

  cookieStore.set(LINKED_COOKIE, voterSession, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: ONE_YEAR_SECONDS,
    path: "/",
  });
}
