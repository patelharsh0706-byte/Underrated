import { NextResponse } from "next/server";

import { ensureProfile, linkPickerSession } from "@/lib/db/queries";
import { profileInputFromUser } from "@/lib/receipts/profile";
import { getOrCreateVoterSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const requestedNext = searchParams.get("next");

  // Guard: must be an absolute in-app path, never protocol-relative.
  const next =
    requestedNext && requestedNext.startsWith("/") && !requestedNext.startsWith("//")
      ? requestedNext
      : null;

  if (!code) return NextResponse.redirect(`${origin}/sign-in?error=auth`);

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error("Auth callback: code exchange failed", error);
    return NextResponse.redirect(`${origin}/sign-in?error=auth`);
  }

  // The session cookies are set from here on. Whatever happens below, the
  // user IS signed in, and must not be told otherwise. One catch around the
  // whole route used to send them to /sign-in?error=auth after a successful
  // exchange — signed in, no profile, told sign-in failed. A failure here is
  // logged with the user id and healed on arrival by getOrCreateProfile
  // (see lib/receipts/profile.ts), so the redirect goes ahead regardless.
  let destination = next ?? "/receipts";
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      // The picker's public handle, derived from their email the first time
      // they sign in. Everything after this can address them by it.
      const profile = await ensureProfile(profileInputFromUser(user));

      // Everything this browser has already picked becomes theirs.
      // First link wins — a session never changes hands.
      const voterSession = await getOrCreateVoterSession();
      if (voterSession) await linkPickerSession(voterSession, user.id);

      // Land on their own receipts unless they were sent somewhere specific.
      if (!next && profile) destination = `/${profile.username}/receipts`;
    }
  } catch (setupError) {
    console.error("Auth callback: profile setup failed after sign-in", setupError);
  }

  return NextResponse.redirect(`${origin}${destination}`);
}
