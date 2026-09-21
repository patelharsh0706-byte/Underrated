import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { ensureProfile, linkPickerSession } from "@/lib/db/queries";
import { profileInputFromUser } from "@/lib/receipts/profile";
import { getOrCreateVoterSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

/**
 * Email OTP / magic-link sign-in.
 *
 * The OAuth callback next door handles the PKCE `code` exchange; email links
 * arrive as a `token_hash` + `type` instead and need `verifyOtp`. Same work
 * afterwards — create the profile, claim the browser's voter session, land on
 * their receipts — so the two routes stay deliberately symmetrical, including
 * how they treat a failure after the session is already set.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const requestedNext = searchParams.get("next");

  const next =
    requestedNext && requestedNext.startsWith("/") && !requestedNext.startsWith("//")
      ? requestedNext
      : null;

  if (!tokenHash || !type) return NextResponse.redirect(`${origin}/sign-in?error=auth`);

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
  if (error) {
    console.error("Auth confirm: OTP verification failed", error);
    return NextResponse.redirect(`${origin}/sign-in?error=auth`);
  }

  // Signed in from here on — see the same note in auth/callback/route.ts.
  let destination = next ?? "/receipts";
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const profile = await ensureProfile(profileInputFromUser(user));

      const voterSession = await getOrCreateVoterSession();
      if (voterSession) await linkPickerSession(voterSession, user.id);

      if (!next && profile) destination = `/${profile.username}/receipts`;
    }
  } catch (setupError) {
    console.error("Auth confirm: profile setup failed after sign-in", setupError);
  }

  return NextResponse.redirect(`${origin}${destination}`);
}
