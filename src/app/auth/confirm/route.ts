import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { finishSignIn } from "@/lib/receipts/profile";
import { safeNextPath } from "@/lib/supabase/callback-url";
import { createClient } from "@/lib/supabase/server";

/**
 * Email OTP / magic-link sign-in.
 *
 * The OAuth callback next door handles the PKCE `code` exchange; email links
 * arrive as a `token_hash` + `type` instead and need `verifyOtp`. Everything
 * after that — profile, voter session, where to land, how a late failure is
 * treated — is finishSignIn, shared with the callback so the two routes stay
 * deliberately symmetrical.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  if (!tokenHash || !type) return NextResponse.redirect(`${origin}/sign-in?error=auth`);

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
  if (error) {
    console.error("Auth confirm: OTP verification failed", error);
    return NextResponse.redirect(`${origin}/sign-in?error=auth`);
  }

  const next = safeNextPath(searchParams.get("next"), "") || null;
  return NextResponse.redirect(`${origin}${await finishSignIn(supabase, next)}`);
}
